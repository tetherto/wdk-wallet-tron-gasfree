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

import { WalletAccountReadOnly } from '@tetherto/wdk-wallet'

import { WalletAccountReadOnlyTron } from '@tetherto/wdk-wallet-tron'

/** @typedef {import('tronweb').default } TronWeb */

/** @typedef {import('@tetherto/wdk-wallet-tron').TronTransaction} TronTransaction */
/** @typedef {import('@tetherto/wdk-wallet-tron').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-tron').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-tron').TransferResult} TransferResult */

/** @typedef {import('@tetherto/wdk-wallet-tron').TronTransactionReceipt } TronTransactionReceipt */

/**
 * @typedef {Object} TronGasfreeWalletConfig
 * @property {number} chainId - The blockchain's id.
 * @property {string | TronWeb} provider - The url of the tron web provider, or an instance of the {@link TronWeb} class.
 * @property {string} gasFreeProvider - The gasfree provider's url.
 * @property {string} gasFreeApiKey - The gasfree provider's api key.
 * @property {string} gasFreeApiSecret - The gasfree provider's api secret.
 * @property {string} serviceProvider - The address of the service provider.
 * @property {string} verifyingContract - The address of the verifying contract.
 * @property {number | bigint} [transferMaxFee] - The maximum fee amount for transfer operations.
 */

export default class WalletAccountReadOnlyTronGasfree extends WalletAccountReadOnly {
  /**
   * Creates a new read-only tron gasfree wallet account.
   *
   * @param {string} address - The tron account's address.
   * @param {Omit<TronGasfreeWalletConfig, 'transferMaxFee'>} config - The configuration object.
   */
  constructor (address, config) {
    super(undefined)

    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {Omit<TronGasfreeWalletConfig, 'transferMaxFee'>}
     */
    this._config = config

    /** @private */
    this._ownerAccountAddress = address

    /** @private */
    this._gasFreeAccount = undefined
  }

  async getAddress () {
    const { gasFreeAddress } = await this._getGasfreeAccount()

    return gasFreeAddress
  }

  /**
   * Returns the account's tronix balance.
   *
   * @returns {Promise<bigint>} The tronix balance (in suns).
   */
  async getBalance () {
    const tronReadOnlyAccount = await this._getTronReadOnlyAccount()

    return await tronReadOnlyAccount.getBalance()
  }

  /**
   * Returns the account balance for a specific token.
   *
   * @param {string} tokenAddress - The smart contract address of the token.
   * @returns {Promise<bigint>} The token balance (in base unit).
   */
  async getTokenBalance (tokenAddress) {
    const tronReadOnlyAccount = await this._getTronReadOnlyAccount()

    return await tronReadOnlyAccount.getTokenBalance(tokenAddress)
  }

  /**
   * Quotes the costs of a send transaction operation.
   *
   * @param {TronTransaction} tx - The transaction.
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
   */
  async quoteSendTransaction (tx) {
    throw new Error("Method 'quoteSendTransaction(tx)' not supported on tron gasfree.")
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
   */
  async quoteTransfer ({ token, recipient, amount }) {
    const gasFreeAccount = await this._getGasfreeAccount()

    const response = await this._sendRequestToGasfreeProvider('GET', '/api/v1/config/token/all')

    const { data } = await response.json()
    const paymasterToken = data.tokens.find(({ tokenAddress }) => tokenAddress === token)
    const fee = paymasterToken.transferFee + (+gasFreeAccount.active * paymasterToken.activateFee)

    return { fee: BigInt(fee) }
  }

  /**
   * Returns a transaction's receipt.
   *
   * @param {string} hash - The transaction's hash.
   * @returns {Promise<TronTransactionReceipt | null>} The receipt, or null if the transaction has not been included in a block yet.
   */
  async getTransactionReceipt (hash) {
    const tronReadOnlyAccount = await this._getTronReadOnlyAccount()

    const txHash = await this._getTokenTransferHash(hash)

    return txHash
      ? await tronReadOnlyAccount.getTransactionReceipt(txHash)
      : null
  }

  /**
   * Returns the gasfree provider's account.
   *
   * @protected
   * @returns {Promise<any>} The gasfree provider's account.
   */
  async _getGasfreeAccount () {
    if (!this._gasFreeAccount) {
      const response = await this._sendRequestToGasfreeProvider('GET', `/api/v1/address/${this._ownerAccountAddress}`)

      const { data } = await response.json()

      this._gasFreeAccount = data
    }

    return this._gasFreeAccount
  }

  /**
   * Sends a http request to the gasfree provider.
   *
   * @protected
   * @param {string} method - The http request's method; available values: 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'.
   * @param {string} path - The http request's url's path.
   * @param {any} [body] - The http request's body.
   * @returns {Promise<Response>} The http response.
   */
  async _sendRequestToGasfreeProvider (method, path, body) {
    const timestamp = Math.floor(Date.now() / 1_000)

    const message = method + path + timestamp

    const signature = createHmac('sha256', this._config.gasFreeApiSecret)
      .update(message)
      .digest('base64')

    const url = this._config.gasFreeProvider + path

    const headers = {
      Timestamp: `${timestamp}`,
      Authorization: `ApiKey ${this._config.gasFreeApiKey}:${signature}`,
      'Content-Type': 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    })

    if (!response.ok) {
      const { reason, message } = await response.json()

      throw new Error(`Gas free provider error (${reason}): ${message}.`)
    }

    return response
  }

  /** @private */
  async _getTronReadOnlyAccount () {
    const address = await this.getAddress()

    const tronReadOnlyAccount = new WalletAccountReadOnlyTron(address, this._config)

    return tronReadOnlyAccount
  }

  /** @private */
  async _getTokenTransferHash (id) {
    const response = await this._sendRequestToGasfreeProvider('GET', `/api/v1/gasfree/${id}`)

    const { data } = await response.json()

    return data?.txnHash
  }
}
