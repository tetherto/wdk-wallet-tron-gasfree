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

import { WalletAccountTron } from '@wdk/wallet-tron'

import { secp256k1 } from '@noble/curves/secp256k1'

import TronWeb from 'tronweb'

import WalletAccountReadOnlyTronGasfree from './wallet-account-read-only-tron-gasfree.js'

/** @typedef {import('@wdk/wallet').IWalletAccount} IWalletAccount */

/** @typedef {import('@wdk/wallet-tron').KeyPair} KeyPair */

/** @typedef {import('@wdk/wallet-tron').TronTransaction} TronTransaction */
/** @typedef {import('@wdk/wallet-tron').TransactionResult} TransactionResult */
/** @typedef {import('@wdk/wallet-tron').TransferOptions} TransferOptions */
/** @typedef {import('@wdk/wallet-tron').TransferResult} TransferResult */

/** @typedef {import('@wdk/wallet-tron').TronTransactionReceipt } TronTransactionReceipt */

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

/** @implements {IWalletAccount} */
export default class WalletAccountTronGasfree extends WalletAccountReadOnlyTronGasfree {
  /**
   * Creates a new tron gasfree wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
   * @param {TronGasfreeWalletConfig} config - The configuration object.
   */
  constructor (seed, path, config) {
    const ownerAccount = new WalletAccountTron(seed, path, config)

    super(ownerAccount._address, config)

    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    this._config = config

    /** @private */
    this._ownerAccount = ownerAccount
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return this._ownerAccount.index
  }

  /**
   * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
   *
   * @type {string}
   */
  get path () {
    return this._ownerAccount.path
  }

  /**
   * The account's key pair.
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return this._ownerAccount.keyPair
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  async sign (message) {
    return await this._ownerAccount.sign(message)
  }

  /**
   * Verifies a message's signature.
   *
   * @param {string} message - The original message.
   * @param {string} signature - The signature to verify.
   * @returns {Promise<boolean>} True if the signature is valid.
   */
  async verify (message, signature) {
    return await this._ownerAccount.verify(message, signature)
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
   * @param {number} [config.transferMaxFee] - The maximum fee amount for the transfer operation.
   * @returns {Promise<TransferResult>} The transfer's result.
   */
  async transfer ({ token, recipient, amount }, config = {}) {
    const address = await super.getAddress()

    const gasFreeAccount = await this._getGasfreeAccount()

    const { fee: feeEstimate } = await this.quoteTransfer({ token, recipient, amount })

    // eslint-disable-next-line eqeqeq
    if (config.transferMaxFee !== undefined && feeEstimate >= config.transferMaxFee) {
      throw new Error('The transfer operation exceeds the transfer max fee.')
    }

    const timestamp = Math.floor(Date.now() / 1_000)

    const Permit712MessageDomain = {
      name: 'GasFreeController',
      version: 'V1.0.0',
      chainId: this._config.chainId,
      verifyingContract: this._config.verifyingContract
    }

    const message = {
      token,
      serviceProvider: this._config.serviceProvider,
      user: address,
      receiver: recipient,
      value: amount,
      maxFee: feeEstimate,
      deadline: timestamp + TOKEN_TRANSFER_DEADLINE,
      version: TOKEN_TRANSFER_SIGNATURE_VERSION,
      nonce: gasFreeAccount.nonce
    }

    const signature = this._signTypedData(Permit712MessageDomain, message)

    const response = await this._sendRequestToGasfreeProvider('POST', '/api/v1/gasfree/submit', {
      ...message,
      sig: signature.slice(2)
    })

    const { data } = await response.json()

    const fee = data.estimatedTransferFee + data.estimatedActivateFee

    return { hash: data.id, fee }
  }

  /**
   * Returns a read-only copy of the account.
   * 
   * @returns {Promise<WalletAccountReadOnlyTronGasfree>} The read-only account.
   */
  async toReadOnlyAccount () {
    const address = await this._ownerAccount.getAddress()

    const readOnlyAccount = new WalletAccountReadOnlyTronGasfree(address, this._config)

    return readOnlyAccount
  }  

  /**
   * Disposes the wallet account, erasing the private key from the memory.
   */
  dispose () {
    this._ownerAccount.dispose()
  }

  /** @private */
  _signTypedData (domain, value) {
    const messageDigest = TronWeb.utils._TypedDataEncoder
      .hash(domain, PERMIT_712_TYPES, value)
      .slice(2)

    const signature = secp256k1.sign(messageDigest, this.keyPair.privateKey, { lowS: true })

    const r = signature.r.toString(16).padStart(64, '0')
    const s = signature.s.toString(16).padStart(64, '0')
    const v = (signature.recovery + 27).toString(16).padStart(2, '0')

    return '0x' + r + s + v
  }
}
