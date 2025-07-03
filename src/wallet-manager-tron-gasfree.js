// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'

import WalletManagerTron from '@wdk/wallet-tron'

import WalletAccountTronGasfree from './wallet-account-tron-gasfree.js'

/** @typedef {import('./wallet-account-tron-gasfree.js').TronGasfreeWalletConfig} TronGasfreeWalletConfig */

export default class WalletManagerTronGasfree extends WalletManagerTron {
  /**
   * Creates a new wallet manager for the tron blockchain that implements gasless features.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {TronGasfreeWalletConfig} [config] - The configuration object.
   */
  constructor (seed, config) {
    super(seed, config)

    /**
     * The tron gasless wallet configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    this._config = config
  }

  /**
   * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @example
   * // Returns the account with derivation path m/44'/195'/0'/0/1
   * const account = await wallet.getAccount(1);
   * @param {number} [index] - The index of the account to get (default: 0).
   * @returns {Promise<WalletAccountTronGasfree>} The account.
   */
  async getAccount (index = 0) {
    return await this.getAccountByPath(`0'/0/${index}`)
  }

  /**
   * Returns the wallet account at a specific BIP-44 derivation path.
   *
   * @example
   * // Returns the account with derivation path m/44'/195'/0'/0/1
   * const account = await wallet.getAccountByPath("0'/0/1");
   * @param {string} path - The derivation path (e.g. "0'/0/0").
   * @returns {Promise<WalletAccountTronGasfree>} The account.
   */
  async getAccountByPath (path) {
    if (!this._accounts[path]) {
      const account = new WalletAccountTronGasfree(this.seed, path, this._config)

      this._accounts[path] = account
    }

    return this._accounts[path]
  }
}
