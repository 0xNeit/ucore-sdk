/**
 * @file Ucore
 * @desc This file defines the constructor of the `Ucore` class.
 * @hidden
 */

import { ethers } from 'ethers';
import * as eth from './eth';
import * as util from './util';
import * as controller from './controller';
import * as vToken from './vToken';
import * as priceFeed from './priceFeed';
import * as comp from './ucore';
import * as gov from './gov';
import { constants, decimals } from './constants';
import { Provider, UcoreOptions, UcoreInstance } from './types';

// Turn off Ethers.js warnings
ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.ERROR);

/**
 * Creates an instance of the Ucore.js SDK.
 *
 * @param {Provider | string} [provider] Optional Ethereum network provider.
 *     Defaults to Ethers.js fallback mainnet provider.
 * @param {object} [options] Optional provider options.
 *
 * @example
 * ```
 * var ucore = new Ucore(window.ethereum); // web browser
 * 
 * var ucore = new Ucore('http://127.0.0.1:8545'); // HTTP provider
 * 
 * var ucore = new Ucore(); // Uses Ethers.js fallback mainnet (for testing only)
 * 
 * var ucore = new Ucore('testnet'); // Uses Ethers.js fallback (for testing only)
 * 
 * // Init with private key (server side)
 * var ucore = new Ucore('https://mainnet.infura.io/v3/_your_project_id_', {
 *   privateKey: '0x_your_private_key_', // preferably with environment variable
 * });
 * 
 * // Init with HD mnemonic (server side)
 * var ucore = new Ucore('mainnet' {
 *   mnemonic: 'clutch captain shoe...', // preferably with environment variable
 * });
 * ```
 *
 * @returns {object} Returns an instance of the Ucore.js SDK.
 */
const Ucore = function(
  provider: Provider | string = 'mainnet', options: UcoreOptions = {}
) : UcoreInstance {
  const originalProvider = provider;

  options.provider = provider || options.provider;
  provider = eth._createProvider(options);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance: any = {
    _originalProvider: originalProvider,
    _provider: provider,
    ...controller,
    ...vToken,
    ...priceFeed,
    ...gov,
    claimUcore: comp.claimUcore,
    delegate: comp.delegate,
    delegateBySig: comp.delegateBySig,
    createDelegateSignature: comp.createDelegateSignature,
    getMintableVAI: comp.getMintableVAI,
    getVAIMintRate: comp.getVAIMintRate,
    mintVAIGuardianPaused: comp.mintVAIGuardianPaused,
    repayVAIGuardianPaused: comp.repayVAIGuardianPaused,
    mintedVAIOf: comp.mintedVAIOf,
    mintedVAIs: comp.mintedVAIs,
    vaiController: comp.vaiController,
    vaiMintRate: comp.vaiMintRate,
    mintVAI: comp.mintVAI,
    repayVAI: comp.repayVAI,
  };

  // Instance needs to know which network the provider connects to, so it can
  //     use the correct contract addresses.
  instance._networkPromise = eth.getProviderNetwork(provider).then((network) => {    
    instance.decimals = decimals;
    if (network.id === 56 || network.name === "mainnet") {
      instance.decimals.USDC = 18;
      instance.decimals.USDT = 18;
    }
    delete instance._networkPromise;
    instance._network = network;
  });

  return instance;
};

Ucore.eth = eth;
Ucore.util = util;
Ucore._ethers = ethers;
Ucore.decimals = decimals;
Ucore.ucore = {
  getUcoreBalance: comp.getUcoreBalance,
  getUcoreAccrued: comp.getUcoreAccrued,
};
Object.assign(Ucore, constants);

export = Ucore;
