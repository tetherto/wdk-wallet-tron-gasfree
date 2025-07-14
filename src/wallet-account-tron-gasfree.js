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

import { createHmac } from 'crypto'

import { WalletAccountTron } from '@wdk/wallet-tron'

import { secp256k1 } from '@noble/curves/secp256k1'

/** @typedef {import('tronweb').default } TronWeb */

/** @typedef {import('@wdk/wallet-tron').TronTransactionReceipt } TronTransactionReceipt  */

/** @typedef {import('@wdk/wallet-tron').TransferOptions} TransferOptions */

/** @typedef {import('@wdk/wallet-tron').TransferResult} TransferResult */

/**
 * @typedef {Object} TronGasfreeWalletConfig
 * @property {string} chainId - The blockchain's id.
 * @property {string | TronWeb} provider - The url of the tron web provider, or an instance of the {@link TronWeb} class.
 * @property {string} gasFreeProvider - The gasfree provider's url.
 * @property {string} gasFreeApiKey - The gasfree provider's api key.
 * @property {string} gasFreeApiSecret - The gasfree provider's api secret.
 * @property {string} serviceProvider - The address of the service provider.
 * @property {string} verifyingContract - The address of the verifying contract.
 * @property {Object} paymasterToken - The paymaster token configuration.
 * @property {string} paymasterToken.address - The address of the paymaster token.
 * @property {number} [transferMaxFee] - The maximum fee amount for transfer operations.
 */

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

export default class WalletAccountTronGasfree extends WalletAccountTron {
  /**
   * Creates a new tron gasfree wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
   * @param {TronGasfreeWalletConfig} [config] - The configuration object.
   */
  constructor(seed, path, config) {
    super(seed, path, config)

    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    this._config = config

    /** @private */
    this._gasFreeAccount = undefined
  }

  /**
   * Returns the account's gasfree address.
   * 
   * @returns {Promise<string>} The account's gasfree address.
   */
  async getAddress() {
    const { gasFreeAddress } = await this._getGasfreeAccount()

    return gasFreeAddress
  }

  /**
   * Returns the account's balance for the paymaster token defined in the wallet account configuration.
   *
   * @returns {Promise<number>} The paymaster token balance (in base unit).
   */
  async getPaymasterTokenBalance() {
    const { paymasterToken } = this._config

    return await this.getTokenBalance(paymasterToken.address)
  }

  async sendTransaction(tx) {
    throw new Error("Method 'sendTransaction(tx)' not supported on tron gasfree.")
  }

  async quoteSendTransaction(tx) {
    throw new Error("Method 'quoteSendTransaction(tx)' not supported on tron gasfree.")
  }

  /**
   * Transfers a token to another address.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<TransferResult>} The transfer's result.
   */
  async transfer({ token, recipient, amount }) {
    const address = await super.getAddress()

    const gasFreeAccount = await this._getGasfreeAccount()

    const timestamp = Math.floor(Date.now() / 1_000)

    const { fee: feeEstimate } = await this.quoteTransfer({ token, recipient, amount })

    // eslint-disable-next-line eqeqeq
    if (this._config.transferMaxFee != undefined && feeEstimate >= this._config.transferMaxFee) {
      throw new Error('Exceeded maximum fee cost for transfer operations.')
    }

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
      maxFee: maxFee,
      deadline: timestamp + 300,
      version: 1,
      nonce: gasFreeAccount.nonce
    }

    const signature = this._signTypedData(Permit712MessageDomain, message)

    const response = await this._sendRequestToGasFreeProvider(
      'POST',
      '/api/v1/gasfree/submit',
      {
        ...message,
        sig: signature.slice(2)
      }
    )

    const { data } = await response.json()

    const fee = (data.estimatedTransferFee || 0) + (data.estimatedActivateFee || 0) 

    return { hash: data.id, fee }
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @see {@link transfer}
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
   */
  async quoteTransfer({ token }) {
    const gasFreeAccount = await this._getGasfreeAccount()
    
    const { transferFee, activateFee } = gasFreeAccount.assets.find(({ tokenAddress }) => tokenAddress === token)

    const maxFee = transferFee + (gasFreeAccount.active ? 0 : activateFee)

    return { fee: maxFee }
  }

  /**
   * Returns a transaction's receipt.
   *
   * @param {string} hash - The transaction's hash.
   * @returns {Promise<TronTransactionReceipt | null>} The receipt, or null if the transaction has not been included in a block yet.
   */
  async getTransactionReceipt(hash) {
    const txHash = await this._getTokenTransferHash(hash)

    return txHash 
      ? await super.getTransactionReceipt(txHash) 
      : null
  }

  /** @private */
  _signTypedData(domain, value) {
    const messageDigest = this._tronWeb.utils._TypedDataEncoder
      .hash(domain, PERMIT_712_TYPES, value)
      .slice(2)

    const signature = secp256k1.sign(messageDigest, this.keyPair.privateKey, { lowS: true })

    const r = signature.r.toString(16).padStart(64, '0')
    const s = signature.s.toString(16).padStart(64, '0')
    const v = (signature.recovery + 27).toString(16).padStart(2, '0')

    return `0x${r}${s}${v}`
  }

  /** @private */
  async _getGasfreeAccount() {
    if (!this._gasFreeAccount) {
      const address = await super.getAddress()

      const response = await this._sendRequestToGasFreeProvider('GET', `/api/v1/address/${address}`)

      const { data } = await response.json()

      this._gasFreeAccount = data
    }

    return this._gasFreeAccount
  }

  /** @private */
  async _getTokenTransferHash(id) {
    const transfer = await this._sendRequestToGasFreeProvider('GET', `/api/v1/gasfree/${id}`)

    const { data } = await response.json()

    return data?.txnHash
  }

  /** @private */
  async _sendRequestToGasFreeProvider(method, path, body = null) {
    const timestamp = Math.floor(Date.now() / 1_000)

    const message = method + path + timestamp

    const signature = createHmac('sha256', this._config.gasFreeApiSecret)
      .update(message)
      .digest('base64')

    const url = this._config.gasFreeProvider + path

    const headers = {
      'Timestamp': `${timestamp}`,
      'Authorization': `ApiKey ${this._config.gasFreeApiKey}:${signature}`,
      'Content-Type': 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    })

    if (!response.ok) {
      const { reason, message } = await response.json()

      throw new Error(`Gasfree provider error (${reason}): ${message}.`)
    }

    return response
  }
}
