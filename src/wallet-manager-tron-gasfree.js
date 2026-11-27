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

import WalletManager, { DisposalError, InvalidSignerError, ValueError } from '@tetherto/wdk-wallet'

import WalletManagerTron, { WalletAccountReadOnlyTron } from '@tetherto/wdk-wallet-tron'

import { SeedSignerTron } from '@tetherto/wdk-wallet-tron/signers'

import WalletAccountTronGasfree from './wallet-account-tron-gasfree.js'

/** @typedef {import('tronweb').TronWeb} TronWeb */

/** @typedef {import('@tetherto/wdk-wallet').NoSuchElementError} NoSuchElementError */

/** @typedef {import('@tetherto/wdk-wallet-tron').FeeRates} FeeRates */

/** @typedef {import('@tetherto/wdk-wallet-tron/signers').ISignerTron} ISignerTron */
/** @typedef {import('@tetherto/wdk-wallet-tron/signers').PrivateKeySignerTron} PrivateKeySignerTron */

/** @typedef {import('./wallet-account-tron-gasfree.js').TronGasfreeWalletConfig} TronGasfreeWalletConfig */

/** @extends {WalletManager<ISignerTron>} */
export default class WalletManagerTronGasfree extends WalletManager {
  /**
   * Creates a new wallet manager for the tron blockchain that implements gasfree features, from a default signer.
   *
   * The default signer must be derivable (it must be able to derive child accounts);
   * non-derivable signers (e.g. private-key signers) are not allowed as the default but
   * may be registered by name via {@link addSigner}.
   * **Warning:** the signer is kept exactly as given, not cloned. Disposing it directly breaks
   * further account derivation, and the manager never disposes a signer you supplied.
   *
   * @overload
   * @param {ISignerTron} signer - The default root signer.
   * @param {TronGasfreeWalletConfig} config - The configuration object.
   * @throws {InvalidSignerError} If the default signer does not support account derivation.
   */

  /**
   * Creates a new wallet manager for the tron blockchain that implements gasfree features, from a seed.
   *
   * The manager wraps the seed in a {@link SeedSignerTron} at "m/44'/195'", owns it, and wipes it on
   * {@link dispose}. The seed itself is not kept.
   *
   * @overload
   * @param {string | Uint8Array} seed - A [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
   * @param {TronGasfreeWalletConfig} config - The configuration object.
   * @throws {ValueError} If the seed is not a valid seed or BIP-39 seed phrase.
   */
  constructor (seedOrSigner, config) {
    const isSeed = typeof seedOrSigner === 'string' || seedOrSigner instanceof Uint8Array

    super(isSeed ? new SeedSignerTron(seedOrSigner) : seedOrSigner, config)

    /**
     * If true, disposes the default signer on calls to the 'dispose' method.
     *
     * @protected
     * @type {boolean}
     */
    this._shouldWipeDefaultSignerOnDisposal = isSeed

    /**
     * The tron gasfree wallet configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    this._config = config

    try {
      /**
       * The tron web client.
       *
       * @protected
       * @type {TronWeb | undefined}
       */
      this._tronWeb = WalletAccountReadOnlyTron.initializeProvider(config)
    } catch (error) {
      if (isSeed) this._defaultSigner.dispose()

      throw error
    }
  }

  /**
   * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @example
   * // Returns the account with derivation path m/44'/195'/0'/0/1
   * const account = await wallet.getAccount(1);
   * @overload
   * @param {number} [index] - The index of the account to get (default: 0).
   * @param {Object} [options] - Account options.
   * @param {string} [options.signerName] - The name of a signer registered via `addSigner`. Omit to use the default signer.
   * @returns {Promise<WalletAccountTronGasfree>} The account.
   * @throws {ValueError} If the index is not an integer between 0 and 2^31 - 1.
   * @throws {NoSuchElementError} If a signer name is given but no signer is registered with that name.
   * @throws {InvalidSignerError} If the signer doesn't support account derivation.
   * @throws {DisposalError} If the wallet manager or the signer has been disposed.
   */

  /**
   * Returns the wallet account backed by a registered signer, without further derivation.
   * Use it for non-derivable signers, such as {@link PrivateKeySignerTron}.
   *
   * @example
   * wallet.addSigner('treasury', new PrivateKeySignerTron(privateKey))
   * const account = await wallet.getAccount('treasury');
   * @overload
   * @param {string} signerName - The signer name registered via {@link addSigner}.
   * @returns {Promise<WalletAccountTronGasfree>} The account.
   * @throws {NoSuchElementError} If no signer is registered with the given name.
   * @throws {DisposalError} If the wallet manager or the given signer has been disposed.
   */
  async getAccount (indexOrSignerName = 0, options = {}) {
    if (typeof indexOrSignerName === 'string') {
      const signerName = indexOrSignerName

      if (this.disposed) {
        throw new DisposalError('The wallet manager has been disposed.')
      }

      if (!this._accounts[signerName]) {
        const signer = this.getSigner(signerName)

        if (signer.disposed) {
          throw new DisposalError('The given signer has been disposed.')
        }

        this._accounts[signerName] = new WalletAccountTronGasfree(signer, this._accountConfig())
      }

      return this._accounts[signerName]
    }

    if (!Number.isInteger(indexOrSignerName) || indexOrSignerName < 0 || indexOrSignerName >= 2 ** 31) {
      throw new ValueError('The index must be an integer between 0 and 2^31 - 1.')
    }

    return await this.getAccountByPath(`0'/0/${indexOrSignerName}`, options)
  }

  /**
   * Returns the wallet account at a specific BIP-44 derivation path.
   *
   * @example
   * // Returns the account with derivation path m/44'/195'/0'/0/1
   * const account = await wallet.getAccountByPath("0'/0/1");
   * @param {string} path - The derivation path (e.g. "0'/0/0").
   * @param {Object} [options] - Account options.
   * @param {string} [options.signerName] - The name of a signer registered via `addSigner`. Omit to use the default signer.
   * @returns {Promise<WalletAccountTronGasfree>} The account.
   * @throws {ValueError} If the path is not valid.
   * @throws {NoSuchElementError} If a signer name is given but no signer is registered with that name.
   * @throws {InvalidSignerError} If the signer doesn't support account derivation.
   * @throws {DisposalError} If the wallet manager or the signer has been disposed.
   */
  async getAccountByPath (path, options = {}) {
    if (this.disposed) {
      throw new DisposalError('The wallet manager has been disposed.')
    }

    const { signerName } = options
    const key = signerName === undefined ? path : `${signerName}:${path}`

    if (!this._accounts[key]) {
      const rootSigner = this.getSigner(signerName)

      if (!rootSigner.isDerivable) {
        throw new InvalidSignerError('The signer does not support account derivation.')
      }

      const signer = await rootSigner.derive(path)

      if (this._accounts[key]) {
        signer.dispose()
      } else {
        try {
          this._accounts[key] = new WalletAccountTronGasfree(signer, { ...this._accountConfig(), shouldWipeSignerOnDisposal: true })
        } catch (error) {
          signer.dispose()

          throw error
        }
      }
    }

    return this._accounts[key]
  }

  /**
   * Disposes all wallet accounts, clearing secret material from memory, including accounts whose signer does not expose
   * its keys. The default signer is disposed too if the manager created it from a seed; signers you supplied, as the
   * default or via {@link addSigner}, are never disposed. Calling it again has no effect.
   */
  dispose () {
    if (this.disposed) {
      return
    }

    for (const account of Object.values(this._accounts)) {
      account.dispose()
    }

    if (this._shouldWipeDefaultSignerOnDisposal) {
      this._defaultSigner.dispose()
    }

    super.dispose()
  }

  /**
   * Builds the account config, injecting the manager's shared tron web client so accounts
   * reuse it instead of opening their own.
   *
   * @private
   * @returns {TronGasfreeWalletConfig} The account configuration.
   */
  _accountConfig () {
    return { ...this._config, provider: this._tronWeb }
  }

  /**
   * Returns the current fee rates.
   *
   * @returns {Promise<FeeRates>} The fee rates (in suns).
   */
  async getFeeRates () {
    if (!this._tronWeb) {
      throw new Error('The wallet must be connected to tron web to get fee rates.')
    }

    const chainParameters = await this._tronWeb.trx.getChainParameters()
    const getTransactionFee = chainParameters.find(({ key }) => key === 'getTransactionFee')
    const fee = BigInt(getTransactionFee.value)

    return {
      normal: fee * WalletManagerTron._FEE_RATE_NORMAL_MULTIPLIER / 100n,
      fast: fee * WalletManagerTron._FEE_RATE_FAST_MULTIPLIER / 100n
    }
  }
}
