/**
 * @file UCORE
 * @desc These methods facilitate interactions with the UCORE token smart
 *     contract.
 */

import { ethers } from 'ethers';
import * as eth from './eth';
import { netId } from './helpers';
import { address, abi } from './constants';
import { sign } from './EIP712';
import {
  CallOptions,
  TrxResponse,
  Signature,
  EIP712Domain,
  DelegateTypes,
  DelegateSignatureMessage,
  Provider,
} from './types';
import { BigNumber } from '@ethersproject/bignumber/lib/bignumber';

const keccak256 = ethers.utils.keccak256;

/**
 * Applies the EIP-55 checksum to an Ethereum address.
 *
 * @param {string} _address The Ethereum address to apply the checksum.
 *
 * @returns {string} Returns a string of the Ethereum address.
 */
function toChecksumAddress(_address) {
  const chars = _address.toLowerCase().substring(2).split('');
  const expanded = new Uint8Array(40);

  for (let i = 0; i < 40; i++) {
    expanded[i] = chars[i].charCodeAt(0);
  }

  const hash = keccak256(expanded);
  let ret = '';

  for (let i = 0; i < _address.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      ret += _address[i].toUpperCase();
    } else {
      ret += _address[i];
    }
  }

  return ret;
}

/**
 * Get the balance of UCORE tokens held by an address.
 *
 * @param {string} _address The address in which to find the UCORE balance.
 * @param {Provider | string} [_provider] An Ethers.js provider or valid network
 *     name string.
 *
 * @returns {string} Returns a string of the numeric balance of UCORE. The value
 *     is scaled up by 18 decimal places.
 *
 * @example
 *
 * ```
 * (async function () {
 *   const bal = await Ucore.ucore.getUcoreBalance('0x2775b1c75658Be0F640272CCb8c72ac986009e38');
 *   console.log('Balance', bal);
 * })().catch(console.error);
 * ```
 */
export async function getUcoreBalance(
  _address: string,
  _provider : Provider | string='mainnet'
) : Promise<string> {
  const provider = await eth._createProvider({ provider: _provider });
  const net = await eth.getProviderNetwork(provider);

  const errorPrefix = 'Ucore [getUcoreBalance] | ';

  if (typeof _address !== 'string') {
    throw Error(errorPrefix + 'Argument `_address` must be a string.');
  }

  try {
    _address = toChecksumAddress(_address);
  } catch(e) {
    throw Error(errorPrefix + 'Argument `_address` must be a valid Ethereum address.');
  }

  const ucoreAddress = address[net.name].UCORE;
  const parameters = [ _address ];
  const trxOptions: CallOptions = {
    _ucoreProvider: provider,
    abi: abi.UCORE,
  };

  const result = await eth.read(ucoreAddress, 'balanceOf', parameters, trxOptions);
  return result.toString();
}

/**
 * Get the amount of UCORE tokens accrued but not yet claimed by an address.
 *
 * @param {string} _address The address in which to find the UCORE accrued.
 * @param {Provider | string} [_provider] An Ethers.js provider or valid network
 *     name string.
 *
 * @returns {string} Returns a string of the numeric accruement of UCORE. The
 *     value is scaled up by 18 decimal places.
 *
 * @example
 *
 * ```
 * (async function () {
 *   const acc = await Ucore.ucore.getUcoreAccrued('0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5');
 *   console.log('Accrued', acc);
 * })().catch(console.error);
 * ```
 */
export async function getUcoreAccrued(
  _address: string,
  _provider : Provider | string='mainnet'
) : Promise<string> {
  const provider = await eth._createProvider({ provider: _provider });
  const net = await eth.getProviderNetwork(provider);

  const errorPrefix = 'Ucore [getUcoreAccrued] | ';

  if (typeof _address !== 'string') {
    throw Error(errorPrefix + 'Argument `_address` must be a string.');
  }

  try {
    _address = toChecksumAddress(_address);
  } catch(e) {
    throw Error(errorPrefix + 'Argument `_address` must be a valid Ethereum address.');
  }

  const lensAddress = address[net.name].UcoreLens;
  const ucoreAddress = address[net.name].UCORE;
  const controllerAddress = address[net.name].Controller;
  const parameters = [ ucoreAddress, controllerAddress, _address ];
  const trxOptions: CallOptions = {
    _ucoreProvider: provider,
    abi: abi.UcoreLens,
  };

  const result = await eth.read(lensAddress, 'getXVSBalanceMetadataExt', parameters, trxOptions);
  return result.allocated.toString();
}

/**
 * Create a transaction to claim accrued UCORE tokens for the user.
 *
 * @param {CallOptions} [options] Options to set for a transaction and Ethers.js
 *     method overrides.
 *
 * @returns {object} Returns an Ethers.js transaction object of the vote
 *     transaction.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 * 
 * (async function() {
 * 
 *   console.log('Claiming Ucore...');
 *   const trx = await ucore.claimUcore();
 *   console.log('Ethers.js transaction object', trx);
 * 
 * })().catch(console.error);
 * ```
 */
export async function claimUcore(
  options: CallOptions = {}
) : Promise<TrxResponse> {
  await netId(this);

  try {
    let userAddress = this._provider.address;
    if (!userAddress && this._provider.getAddress) {
      userAddress = await this._provider.getAddress();
    }

    const controllerAddress = address[this._network.name].Controller;
    const trxOptions: CallOptions = {
      ...options,
      _ucoreProvider: this._provider,
      abi: abi.Controller,
    };
    const parameters = [ userAddress ];
    const method = 'claimUcore(address)';

    return eth.trx(controllerAddress, method, parameters, trxOptions);
  } catch(e) {
    const errorPrefix = 'Ucore [claimUcore] | ';
    e.message = errorPrefix + e.message;
    return e;
  }
}

/**
 * Create a transaction to delegate Ucore Governance voting rights to an
 *     address.
 *
 * @param {string} _address The address in which to delegate voting rights to.
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {object} Returns an Ethers.js transaction object of the vote
 *     transaction.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 * 
 * (async function() {
 *   const delegateTx = await ucore.delegate('0xa0df350d2637096571F7A701CBc1C5fdE30dF76A');
 *   console.log('Ethers.js transaction object', delegateTx);
 * })().catch(console.error);
 * ```
 */
export async function delegate(
  _address: string,
  options: CallOptions = {}
) : Promise<TrxResponse> {
  await netId(this);

  const errorPrefix = 'Ucore [delegate] | ';

  if (typeof _address !== 'string') {
    throw Error(errorPrefix + 'Argument `_address` must be a string.');
  }

  try {
    _address = toChecksumAddress(_address);
  } catch(e) {
    throw Error(errorPrefix + 'Argument `_address` must be a valid Ethereum address.');
  }

  const ucoreAddress = address[this._network.name].UCORE;
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.UCORE,
  };
  const parameters = [ _address ];
  const method = 'delegate';

  return eth.trx(ucoreAddress, method, parameters, trxOptions);
}

/**
 * Delegate voting rights in Ucore Governance using an EIP-712 signature.
 *
 * @param {string} _address The address to delegate the user's voting rights to.
 * @param {number} nonce The contract state required to match the signature.
 *     This can be retrieved from the UCORE contract's public nonces mapping.
 * @param {number} expiry The time at which to expire the signature. A block 
 *     timestamp as seconds since the unix epoch.
 * @param {object} signature An object that contains the v, r, and, s values of
 *     an EIP-712 signature.
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {object} Returns an Ethers.js transaction object of the vote
 *     transaction.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 * 
 * (async function() {
 *   const delegateTx = await ucore.delegateBySig(
 *     '0xa0df350d2637096571F7A701CBc1C5fdE30dF76A',
 *     42,
 *     9999999999,
 *     {
 *       v: '0x1b',
 *       r: '0x130dbca2fafa07424c033b4479687cc1deeb65f08809e3ab397988cc4c6f2e78',
 *       s: '0x1debeb8250262f23906b1177161f0c7c9aa3641e8bff5b6f5c88a6bb78d5d8cd'
 *     }
 *   );
 *   console.log('Ethers.js transaction object', delegateTx);
 * })().catch(console.error);
 * ```
 */
export async function delegateBySig(
  _address: string,
  nonce: number,
  expiry: number,
  signature: Signature = { v: '', r: '', s: '' },
  options: CallOptions = {}
) : Promise<TrxResponse> {
  await netId(this);

  const errorPrefix = 'Ucore [delegateBySig] | ';

  if (typeof _address !== 'string') {
    throw Error(errorPrefix + 'Argument `_address` must be a string.');
  }

  try {
    _address = toChecksumAddress(_address);
  } catch(e) {
    throw Error(errorPrefix + 'Argument `_address` must be a valid Ethereum address.');
  }

  if (typeof nonce !== 'number') {
    throw Error(errorPrefix + 'Argument `nonce` must be an integer.');
  }

  if (typeof expiry !== 'number') {
    throw Error(errorPrefix + 'Argument `expiry` must be an integer.');
  }

  if (
    !Object.isExtensible(signature) ||
    !signature.v ||
    !signature.r ||
    !signature.s
  ) {
    throw Error(errorPrefix + 'Argument `signature` must be an object that ' + 
      'contains the v, r, and s pieces of an EIP-712 signature.');
  }

  const ucoreAddress = address[this._network.name].UCORE;
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.UCORE,
  };
  const { v, r, s } = signature;
  const parameters = [ _address, nonce, expiry, v, r, s ];
  const method = 'delegateBySig';

  return eth.trx(ucoreAddress, method, parameters, trxOptions);
}

/**
 * Create a delegate signature for Ucore Governance using EIP-712. The
 *     signature can be created without burning gas. Anyone can post it to the
 *     blockchain using the `delegateBySig` method, which does have gas costs.
 *
 * @param {string} delegatee The address to delegate the user's voting rights
 *     to.
 * @param {number} [expiry] The time at which to expire the signature. A block 
 *     timestamp as seconds since the unix epoch. Defaults to `10e9`.
 *
 * @returns {object} Returns an object that contains the `v`, `r`, and `s` 
 *     components of an Ethereum signature as hexadecimal strings.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * (async () => {
 *
 *   const delegateSignature = await ucore.createDelegateSignature('0xa0df350d2637096571F7A701CBc1C5fdE30dF76A');
 *   console.log('delegateSignature', delegateSignature);
 *
 * })().catch(console.error);
 * ```
 */
export async function createDelegateSignature(
  delegatee: string,
  expiry = 10e9
) : Promise<Signature> {
  await netId(this);

  const provider = this._provider;
  const ucoreAddress = address[this._network.name].UCORE;
  const chainId = this._network.id;
  let userAddress = this._provider.address;

  if (!userAddress && this._provider.getAddress) {
    userAddress = await this._provider.getAddress();
  }

  const originalProvider = this._originalProvider;

  const nonce = +(await eth.read(
    ucoreAddress,
    'function nonces(address) returns (uint)',
    [ userAddress ],
    { provider: originalProvider }
  )).toString();

  const domain: EIP712Domain = {
    name: 'Ucore',
    chainId,
    verifyingContract: ucoreAddress
  };

  const primaryType = 'Delegation';

  const message: DelegateSignatureMessage = { delegatee, nonce, expiry };

  const types: DelegateTypes = {
    EIP712Domain: [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' },
    ],
    Delegation: [
      { name: 'delegatee', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'expiry', type: 'uint256' }
    ]
  };

  const signer = provider.getSigner ? provider.getSigner() : provider;

  const signature = await sign(domain, primaryType, message, types, signer);

  return signature;
}

/**
 * Get the mintable UAI amount of address.
 *
 * @param {string} _address The address in which to get mintable UAI amount.
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {string} Returns a string of the numeric amount of mintable UAI. The
 *     value is scaled up by 18 decimal places.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * (async () => {
 * 
 *   const amount = await ucore.getMintableUAI('0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5');
 *   console.log('MintableUAI amount', amount);
 *
 * })().catch(console.error);
 * ```
 */
export async function getMintableUAI(
  _address: string,
  options: CallOptions = {}
) : Promise<string> {
  const errorPrefix = 'Ucore [getMintableUAI] | ';

  if (typeof _address !== 'string') {
    throw Error(errorPrefix + 'Argument `_address` must be a string.');
  }

  try {
    _address = toChecksumAddress(_address);
  } catch(e) {
    throw Error(errorPrefix + 'Argument `_address` must be a valid Ethereum address.');
  }

  const controllerAddress = address[this._network.name].Controller;
  const parameters = [ _address ];
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.Controller,
  };

  const result = await eth.read(controllerAddress, 'getMintableUAI', parameters, trxOptions);
  if (result.length > 1 && result[0].toString() === "0") {
    return result[1].toString();
  } else {
    throw Error(errorPrefix + 'Contract error occured');
  }
}

/**
 * Get the UAI mint rate.
 *
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {string} Returns a string of the numeric UAI mint rate.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * (async () => {
 * 
 *   const rate = await ucore.getUAIMintRate();
 *   console.log('UAI mint rate', rate);
 *
 * })().catch(console.error);
 * ```
 */
export async function getUAIMintRate(
  options: CallOptions = {}
) : Promise<string> {
  const controllerAddress = address[this._network.name].Controller;
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.Controller,
  };

  const result = await eth.read(controllerAddress, 'getUAIMintRate', [], trxOptions);
  return result.toString();
}

/**
 * Get the mintUAIGuardianPaused.
 *
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {boolean} Returns a string of the boolean mintUAIGuardianPaused.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * (async () => {
 * 
 *   const _mintUAIGuardianPaused = await ucore.mintUAIGuardianPaused();
 *   console.log('mintUAIGuardianPaused', _mintUAIGuardianPaused);
 *
 * })().catch(console.error);
 * ```
 */
export async function mintUAIGuardianPaused(
  options: CallOptions = {}
) : Promise<string> {
  const controllerAddress = address[this._network.name].Controller;
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.Controller,
  };

  const result = await eth.read(controllerAddress, 'mintUAIGuardianPaused', [], trxOptions);
  return result;
}

/**
 * Get the repayUAIGuardianPaused.
 *
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {boolean} Returns a string of the boolean repayUAIGuardianPaused.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * (async () => {
 * 
 *   const _repayUAIGuardianPaused = await ucore.repayUAIGuardianPaused();
 *   console.log('repayUAIGuardianPaused', _repayUAIGuardianPaused);
 *
 * })().catch(console.error);
 * ```
 */
export async function repayUAIGuardianPaused(
  options: CallOptions = {}
) : Promise<string> {
  const controllerAddress = address[this._network.name].Controller;
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.Controller,
  };

  const result = await eth.read(controllerAddress, 'repayUAIGuardianPaused', [], trxOptions);
  return result;
}

/**
 * Get the minted UAI amount of the address.
 *
 * @param {string} _address The address in which to get the minted UAI amount.
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {string} Returns a string of the numeric amount of minted UAI. The
 *     value is scaled up by 18 decimal places.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * (async () => {
 * 
 *   const amount = await ucore.mintedUAIOf('0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5');
 *   console.log('Minted UAI amount', amount);
 *
 * })().catch(console.error);
 * ```
 */
export async function mintedUAIOf(
  _address: string,
  options: CallOptions = {}
) : Promise<string> {
  const errorPrefix = 'Ucore [mintedUAIOf] | ';

  if (typeof _address !== 'string') {
    throw Error(errorPrefix + 'Argument `_address` must be a string.');
  }

  try {
    _address = toChecksumAddress(_address);
  } catch(e) {
    throw Error(errorPrefix + 'Argument `_address` must be a valid Ethereum address.');
  }

  const controllerAddress = address[this._network.name].Controller;
  const parameters = [ _address ];
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.Controller,
  };

  const result = await eth.read(controllerAddress, 'mintedUAIOf', parameters, trxOptions);
  return result.toString();
}

/**
 * Get the minted UAI amount of the address.
 *
 * @param {string} _address The address in which to get the minted UAI amount.
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {string} Returns a string of the numeric amount of minted UAI. The
 *     value is scaled up by 18 decimal places.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * (async () => {
 * 
 *   const amount = await ucore.mintedUAIs('0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5');
 *   console.log('Minted UAI amount', amount);
 *
 * })().catch(console.error);
 * ```
 */
export async function mintedUAIs(
  _address: string,
  options: CallOptions = {}
) : Promise<string> {
  const errorPrefix = 'Ucore [mintedUAIs] | ';

  if (typeof _address !== 'string') {
    throw Error(errorPrefix + 'Argument `_address` must be a string.');
  }

  try {
    _address = toChecksumAddress(_address);
  } catch(e) {
    throw Error(errorPrefix + 'Argument `_address` must be a valid Ethereum address.');
  }

  const controllerAddress = address[this._network.name].Controller;
  const parameters = [ _address ];
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.Controller,
  };

  const result = await eth.read(controllerAddress, 'mintedUAIs', parameters, trxOptions);
  return result.toString();
}

/**
 * Get the uaiController.
 *
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {string} Returns a string of the uaiController address.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * (async () => {
 * 
 *   const uaiControllerAddress = await ucore.uaiController();
 *   console.log('uaiControllerAddress', uaiControllerAddress);
 *
 * })().catch(console.error);
 * ```
 */
export async function uaiController(
  options: CallOptions = {}
) : Promise<string> {
  const controllerAddress = address[this._network.name].Controller;
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.Controller,
  };

  const result = await eth.read(controllerAddress, 'uaiController', [], trxOptions);
  return result;
}

/**
 * Get the uaiMintRate.
 *
 * @param {CallOptions} [options] Options to set for `eth_call`, optional ABI
 *     (as JSON object), and Ethers.js method overrides. The ABI can be a string
 *     of the single intended method, an array of many methods, or a JSON object
 *     of the ABI generated by a Solidity compiler.
 *
 * @returns {string} Returns a string of the numeric uaiMintRate.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * (async () => {
 * 
 *   const uaiMintRate = await ucore.uaiMintRate();
 *   console.log('uaiMintRate', uaiMintRate);
 *
 * })().catch(console.error);
 * ```
 */
export async function uaiMintRate(
  options: CallOptions = {}
) : Promise<string> {
  const controllerAddress = address[this._network.name].Controller;
  const trxOptions: CallOptions = {
    ...options,
    _ucoreProvider: this._provider,
    abi: abi.Controller,
  };

  const result = await eth.read(controllerAddress, 'uaiMintRate', [], trxOptions);
  return result.toString();
}

/**
 * Mint UAI in the Ucore Protocol.
 *
 * @param {number | string | BigNumber} mintUAIAmount A string, number, or BigNumber
 *     object of the amount of an asset to mintUAI. Use the `mantissa` boolean in
 *     the `options` parameter to indicate if this value is scaled up (so there 
 *     are no decimals) or in its natural scale.
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the 
 *     transaction.
 *
 * @returns {object} Returns an Ethers.js transaction object of the mintUAI
 *     transaction.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * // const trxOptions = { gasLimit: 250000, mantissa: false };
 * 
 * (async function() {
 * 
 *   console.log('Minting UAI in the Ucore Protocol...');
 *   const trx = await ucore.mintUAI(1);
 *   console.log('Ethers.js transaction object', trx);
 * 
 * })().catch(console.error);
 * ```
 */
export async function mintUAI(
  mintUAIAmount: string | number | BigNumber,
  options: CallOptions = {}
) : Promise<TrxResponse> {
  await netId(this);
  const errorPrefix = 'Ucore [mintUAI] | ';

  if (
    typeof mintUAIAmount !== 'number' &&
    typeof mintUAIAmount !== 'string' &&
    !ethers.BigNumber.isBigNumber(mintUAIAmount)
  ) {
    throw Error(errorPrefix + 'Argument `amount` must be a string, number, or BigNumber.');
  }

  if (!options.mantissa) {
    mintUAIAmount = +mintUAIAmount;
    mintUAIAmount = mintUAIAmount * Math.pow(10, 18);
  }

  mintUAIAmount = ethers.BigNumber.from(mintUAIAmount.toString());

  try {
    const controllerAddress = address[this._network.name].Controller;
    const trxOptions: CallOptions = {
      ...options,
      _ucoreProvider: this._provider,
      abi: abi.Controller,
    };
    const parameters = [ mintUAIAmount ];

    return eth.trx(controllerAddress, 'mintUAI', parameters, trxOptions);
  } catch(e) {
    const errorPrefix = 'Ucore [mintUAI] | ';
    e.message = errorPrefix + e.message;
    return e;
  }
}

/**
 * Repay UAI in the Ucore Protocol.
 *
 * @param {number | string | BigNumber} repayUAIAmount A string, number, or BigNumber
 *     object of the amount of an asset to repay. Use the `mantissa` boolean in
 *     the `options` parameter to indicate if this value is scaled up (so there 
 *     are no decimals) or in its natural scale.
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the 
 *     transaction.
 *
 * @returns {object} Returns an Ethers.js transaction object of the repayUAI
 *     transaction.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 *
 * // const trxOptions = { gasLimit: 250000, mantissa: false };
 * 
 * (async function() {
 * 
 *   console.log('Repaying UAI in the Ucore Protocol...');
 *   const trx = await ucore.repayUAI(1);
 *   console.log('Ethers.js transaction object', trx);
 * 
 * })().catch(console.error);
 * ```
 */
export async function repayUAI(
  repayUAIAmount: string | number | BigNumber,
  options: CallOptions = {}
) : Promise<TrxResponse> {
  await netId(this);
  const errorPrefix = 'Ucore [mintUAI] | ';

  if (
    typeof repayUAIAmount !== 'number' &&
    typeof repayUAIAmount !== 'string' &&
    !ethers.BigNumber.isBigNumber(repayUAIAmount)
  ) {
    throw Error(errorPrefix + 'Argument `amount` must be a string, number, or BigNumber.');
  }

  if (!options.mantissa) {
    repayUAIAmount = +repayUAIAmount;
    repayUAIAmount = repayUAIAmount * Math.pow(10, 18);
  }

  repayUAIAmount = ethers.BigNumber.from(repayUAIAmount.toString());

  try {
    const controllerAddress = address[this._network.name].Controller;
    const trxOptions: CallOptions = {
      ...options,
      _ucoreProvider: this._provider,
      abi: abi.Controller,
    };
    const parameters = [ repayUAIAmount ];

    return eth.trx(controllerAddress, 'repayUAI', parameters, trxOptions);
  } catch(e) {
    const errorPrefix = 'Ucore [repayUAI] | ';
    e.message = errorPrefix + e.message;
    return e;
  }
}
