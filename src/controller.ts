/**
 * @file Controller
 * @desc These methods facilitate interactions with the Controller smart
 *     contract.
 */

import * as eth from './eth';
import { netId } from './helpers';
import { address, abi, vTokens } from './constants';
import { CallOptions, TrxResponse } from './types';

/**
 * Enters the user's address into Ucore Protocol markets.
 *
 * @param {any[]} markets An array of strings of markets to enter, meaning use
 *     those supplied assets as collateral.
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the 
 *     transaction. A passed `gasLimit` will be used in both the `approve` (if 
 *     not supressed) and `mint` transactions.
 *
 * @returns {object} Returns an Ethers.js transaction object of the enterMarkets
 *     transaction.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 * 
 * (async function () {
 *   const trx = await ucore.enterMarkets(Ucore.SXP); // Use [] for multiple
 *   console.log('Ethers.js transaction object', trx);
 * })().catch(console.error);
 * ```
 */
export async function enterMarkets(
  markets: string | string[] = [],
  options: CallOptions = {}
) : Promise<TrxResponse> {
  await netId(this);
  const errorPrefix = 'Ucore [enterMarkets] | ';

  if (typeof markets === 'string') {
    markets = [ markets ];
  }

  if (!Array.isArray(markets)) {
    throw Error(errorPrefix + 'Argument `markets` must be an array or string.');
  }

  const addresses = [];
  for (let i = 0; i < markets.length; i++) {
    if (markets[i][0] !== 'v') {
      markets[i] = 'v' + markets[i];
    }

    if (!vTokens.includes(markets[i])) {
      throw Error(errorPrefix + 'Provided market `' + markets[i] + '` is not a recognized vToken.');
    }

    addresses.push(address[this._network.name][markets[i]]);
  }
  const controllerAddress = address[this._network.name].Controller;
  const parameters = [ addresses ];

  const trxOptions: CallOptions = {
    _ucoreProvider: this._provider,
    abi: abi.Controller,
    ...options
  };

  return eth.trx(controllerAddress, 'enterMarkets', parameters, trxOptions);
}

/**
 * Exits the user's address from a Ucore Protocol market.
 *
 * @param {string} market A string of the symbol of the market to exit.
 * @param {CallOptions} [options] Call options and Ethers.js overrides for the 
 *     transaction. A passed `gasLimit` will be used in both the `approve` (if 
 *     not supressed) and `mint` transactions.
 *
 * @returns {object} Returns an Ethers.js transaction object of the exitMarket
 *     transaction.
 *
 * @example
 *
 * ```
 * const ucore = new Ucore(window.ethereum);
 * 
 * (async function () {
 *   const trx = await ucore.exitMarket(Ucore.SXP);
 *   console.log('Ethers.js transaction object', trx);
 * })().catch(console.error);
 * ```
 */
export async function exitMarket(
  market: string,
  options: CallOptions = {}
) : Promise<TrxResponse> {
  await netId(this);
  const errorPrefix = 'Ucore [exitMarkets] | ';

  if (typeof market !== 'string' || market === '') {
    throw Error(errorPrefix + 'Argument `market` must be a string of a vToken market name.');
  }

  if (market[0] !== 'v') {
    market = 'v' + market;
  }

  if (!vTokens.includes(market)) {
    throw Error(errorPrefix + 'Provided market `' + market + '` is not a recognized vToken.');
  }

  const vTokenAddress = address[this._network.name][market];

  const controllerAddress = address[this._network.name].Controller;
  const parameters = [ vTokenAddress ];

  const trxOptions: CallOptions = {
    _ucoreProvider: this._provider,
    abi: abi.Controller,
    ...options
  };

  return eth.trx(controllerAddress, 'exitMarket', parameters, trxOptions);
}
