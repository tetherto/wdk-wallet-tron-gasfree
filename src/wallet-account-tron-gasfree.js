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

import { DisposalError, UnsupportedOperationError } from '@tetherto/wdk-wallet'

import { PrivateKeySignerTron, SeedSignerTron } from '@tetherto/wdk-wallet-tron/signers'

import { secp256k1 } from '@noble/curves/secp256k1'

import { utils as TronWebUtils } from 'tronweb'

import WalletAccountReadOnlyTronGasfree from './wallet-account-read-only-tron-gasfree.js'

/** @typedef {import('@tetherto/wdk-wallet').IWalletAccount} IWalletAccount */
/** @typedef {import('@tetherto/wdk-wallet').ValueError} ValueError */

/** @typedef {import('@tetherto/wdk-wallet-tron').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet-tron').SignerOptions} SignerOptions */

/** @typedef {import('@tetherto/wdk-wallet-tron').TronTransaction} TronTransaction */
/** @typedef {import('@tetherto/wdk-wallet-tron').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-tron').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-tron').TransferResult} TransferResult */
/** @typedef {import('@tetherto/wdk-wallet-tron').TronActivationFee} TronActivationFee */

/** @typedef {import('@tetherto/wdk-wallet-tron').TronTransactionReceipt } TronTransactionReceipt */

/** @typedef {import('@tetherto/wdk-wallet-tron/signers').ISignerTron} ISignerTron */

/** @typedef {import('./wallet-account-read-only-tron-gasfree.js').TronGasfreeWalletConfig} TronGasfreeWalletConfig */

const PERMIT_712_TYPES = {
  PermitTransfer: [
    { name: 'token', type: 'address' },
    { name: 'serviceProvider', type: 'address' },
    { name: 'user', type: 'address' },
    { name: 'receiver', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'maxFee', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'version', type: 'uint256' },
    { name: 'nonce', type: 'uint256' }
  ]
}

const TOKEN_TRANSFER_DEADLINE = 300

const TOKEN_TRANSFER_SIGNATURE_VERSION = 1

const BIP_44_TRON_DERIVATION_PATH_PREFIX = "m/44'/195'"

const DEFAULT_ACCOUNT_PATH = "0'/0/0"

/** @implements {IWalletAccount} */
export default class WalletAccountTronGasfree extends WalletAccountReadOnlyTronGasfree {
  /**
   * Creates a new tron gasfree wallet account from a signer.
   *
   * The signer is wiped on {@link dispose} only if `shouldWipeSignerOnDisposal` is set.
   *
   * @overload
   * @param {ISignerTron} signer - The tron signer, derived to an account path.
   * @param {TronGasfreeWalletConfig & SignerOptions} config - The configuration object.
   */

  /**
   * Creates a new tron gasfree wallet account from a seed.
   *
   * @overload
   * @param {string | Uint8Array} seed - A [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
   * @param {string} path - The BIP-44 derivation path, relative to "m/44'/195'" (e.g. "0'/0/0").
   * @param {TronGasfreeWalletConfig} config - The configuration object.
   * @throws {ValueError} If the seed or the path is not valid.
   */

  /**
   * Creates the first tron gasfree wallet account (m/44'/195'/0'/0/0) from a seed.
   *
   * @overload
   * @param {string | Uint8Array} seed - A [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
   * @param {TronGasfreeWalletConfig} config - The configuration object.
   * @throws {ValueError} If the seed is not a valid seed or BIP-39 seed phrase.
   */
  constructor (seedOrSigner, pathOrConfig, config) {
    const isSeed = typeof seedOrSigner === 'string' || seedOrSigner instanceof Uint8Array
    const hasPath = typeof pathOrConfig === 'string'
    const [signer, configuration] = isSeed
      ? [
          new SeedSignerTron(seedOrSigner, `${BIP_44_TRON_DERIVATION_PATH_PREFIX}/${hasPath ? pathOrConfig : DEFAULT_ACCOUNT_PATH}`),
          hasPath ? config : pathOrConfig
        ]
      : [seedOrSigner, pathOrConfig]

    try {
      super(undefined, configuration)
    } catch (error) {
      if (isSeed) signer.dispose()

      throw error
    }

    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    this._config = configuration

    /** @private */
    this._signer = signer

    /**
     * If true, disposes the signer on calls to the 'dispose' method.
     *
     * @protected
     * @type {boolean}
     */
    this._shouldWipeSignerOnDisposal = isSeed || Boolean(configuration.shouldWipeSignerOnDisposal)

    /** @private */
    this._disposed = false
  }

  /**
   * Creates a new tron gasfree wallet account from a raw private key. The account owns the signer it creates
   * and wipes it on {@link dispose}.
   *
   * @param {string | Uint8Array} privateKey - The raw private key (hex string with or without 0x, or 32 bytes).
   * @param {TronGasfreeWalletConfig} config - The configuration object.
   * @returns {WalletAccountTronGasfree} The wallet account.
   * @throws {ValueError} If the private key is not valid.
   */
  static fromPrivateKey (privateKey, config) {
    const signer = new PrivateKeySignerTron(privateKey)

    try {
      return new WalletAccountTronGasfree(signer, { ...config, shouldWipeSignerOnDisposal: true })
    } catch (error) {
      signer.dispose()

      throw error
    }
  }

  /**
   * True if the wallet account has been disposed.
   *
   * @type {boolean}
   */
  get disposed () {
    return this._disposed
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)),
   * or null for an account backed by a non-HD signer.
   *
   * @type {string | null}
   */
  get path () {
    return this._signer.path
  }

  /**
   * The account's key pair.
   *
   * The uint8 arrays are the signer's own, so any external change will reflect to the signer's internal representation. For this reason,
   * it's strongly recommended to treat the key pair as a read-only view of the keys. While it's still technically possible to alter their
   * content, client code should never do so.
   *
   * Null if the account's signer does not expose key material.
   *
   * @type {KeyPair | null}
   */
  get keyPair () {
    return this._signer.keyPair
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   * @throws {DisposalError} If the wallet account or its signer has been disposed.
   */
  async sign (message) {
    this._guardDisposed()

    return await this._signer.sign(message)
  }

  /**
   * Signs a transaction.
   *
   * @param {TronTransaction} tx - The transaction.
   * @returns {Promise<never>} Never resolves; always throws.
   */
  async signTransaction (tx) {
    throw new Error("Method 'signTransaction(tx)' not supported on tron gasfree.")
  }

  /**
   * Sends a transaction.
   *
   * @param {TronTransaction} tx - The transaction.
   * @returns {Promise<TransactionResult>} The transaction's result.
   */
  async sendTransaction (tx) {
    throw new Error("Method 'sendTransaction(tx)' not supported on tron gasfree.")
  }

  /**
   * Transfers a token to another address, paying gas fees with the transferred token.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @param {Object} [config] - A configuration object containing additional options.
   * @param {number | bigint} [config.transferMaxFee] - The maximum fee amount for the transfer operation (default: the `transferMaxFee` the wallet was configured with).
   * @returns {Promise<TransferResult & TronActivationFee>} The transfer's result.
   * @throws {Error} If the transfer's cost exceeds the maximum transfer fee option.
   * @throws {DisposalError} If the wallet account or its signer has been disposed.
   * @throws {UnsupportedOperationError} If the account's signer does not expose its private key.
   */
  async transfer ({ token, recipient, amount }, config) {
    this._guardDisposed()

    this._getTypedDataSigningKey()

    const { transferMaxFee = this._config.transferMaxFee } = config ?? {}

    const address = await this._getOwnerAddress()

    const gasFreeAccount = await this._getGasfreeAccount()

    const { fee: feeEstimate } = await this._quoteTransferWithAccount(gasFreeAccount, { token })

    if (transferMaxFee !== undefined && feeEstimate > BigInt(transferMaxFee)) {
      throw new Error('The transfer operation exceeds the transfer max fee.')
    }

    const timestamp = Math.floor(Date.now() / 1_000)

    const Permit712MessageDomain = {
      name: 'GasFreeController',
      version: 'V1.0.0',
      chainId: `${this._config.chainId}`,
      verifyingContract: this._config.verifyingContract
    }

    const message = {
      token,
      serviceProvider: this._config.serviceProvider,
      user: address,
      receiver: recipient,
      value: amount.toString(),
      maxFee: feeEstimate.toString(),
      deadline: timestamp + TOKEN_TRANSFER_DEADLINE,
      version: TOKEN_TRANSFER_SIGNATURE_VERSION,
      nonce: gasFreeAccount.nonce
    }

    const signature = this._signTypedData(Permit712MessageDomain, message)

    const response = await this._sendRequestToGasfreeProvider('POST', '/api/v1/gasfree/submit', {
      ...message,
      sig: signature.slice(2)
    })

    const resp = await response.json()

    if (resp.code !== 200) {
      throw new Error(resp.reason)
    }

    const activationFee = BigInt(resp.data.estimatedActivateFee || 0)
    const fee = BigInt(resp.data.estimatedTransferFee) + activationFee

    return { hash: resp.data.id, fee, activationFee }
  }

  /**
   * Returns a read-only copy of the account.
   *
   * @returns {Promise<WalletAccountReadOnlyTronGasfree>} The read-only account.
   */
  async toReadOnlyAccount () {
    if (!this._tronGasfreeReadOnlyAccount) {
      const address = await this._getOwnerAddress()
      this._tronGasfreeReadOnlyAccount = new WalletAccountReadOnlyTronGasfree(address, this._config)
    }

    return this._tronGasfreeReadOnlyAccount
  }

  /**
   * Disposes the wallet account. The signer's private key is erased only if the account owns the signer (created from a
   * seed or private key, or with `shouldWipeSignerOnDisposal`); otherwise a signer you supplied is left untouched.
   * Calling it again has no effect.
   */
  dispose () {
    if (this._disposed) {
      return
    }

    if (this._shouldWipeSignerOnDisposal) {
      this._signer.dispose()
    }

    this._disposed = true
  }

  /**
   * Returns the address of the signer, which owns the gasfree account.
   *
   * @protected
   * @returns {Promise<string>} The owner's address.
   */
  async _getOwnerAddress () {
    return await this._signer.getAddress()
  }

  /** @private */
  _guardDisposed () {
    if (this.disposed) {
      throw new DisposalError('The wallet account has been disposed.')
    }
  }

  /** @private */
  _getTypedDataSigningKey () {
    if (this._signer.disposed) {
      throw new DisposalError('The signer has been disposed.')
    }

    const privateKey = this._signer.keyPair?.privateKey

    if (!privateKey) {
      throw new UnsupportedOperationError('transfer(options, config)')
    }

    return privateKey
  }

  /** @private */
  _signTypedData (domain, value) {
    const privateKey = this._getTypedDataSigningKey()

    const messageDigest = TronWebUtils._TypedDataEncoder
      .hash(domain, PERMIT_712_TYPES, value)
      .slice(2)

    const signature = secp256k1.sign(messageDigest, privateKey, { lowS: true })

    const r = signature.r.toString(16).padStart(64, '0')
    const s = signature.s.toString(16).padStart(64, '0')
    const v = (signature.recovery + 27).toString(16).padStart(2, '0')

    return '0x' + r + s + v
  }
}
