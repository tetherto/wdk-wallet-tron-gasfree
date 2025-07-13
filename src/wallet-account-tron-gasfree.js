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

/** @typedef {import('@wdk/wallet').TransferOptions} TransferOptions */
/** @typedef {import('@wdk/wallet').TransferResult} TransferResult */

/**
 * @typedef {object} TronGasfreeTransactionReceiptReceiptDetails
 * @property {number} energy_usage - The amount of energy used by the transaction.
 * @property {number} energy_fee - The fee paid for the energy used.
 * @property {number} energy_usage_total - The total energy usage.
 * @property {number} net_fee - The fee paid for network usage.
 * @property {string} result - The result of the transaction (e.g., "SUCCESS").
 */

/**
 * @typedef {object} TronGasfreeTransactionReceiptLog
 * @property {string} address - The address of the contract that emitted the log.
 * @property {string[]} topics - An array of topics for the log.
 * @property {string} data - The data payload of the log.
 */

/**
 * @typedef {object} TronGasfreeTransactionReceiptInternalTransaction
 * @property {string} hash - The hash of the internal transaction.
 * @property {string} caller_address - The address of the caller.
 * @property {string} transferTo_address - The address of the recipient.
 * @property {object[]} callValueInfo - Information about the value transferred.
 * @property {string} note - A note associated with the internal transaction.
 */

/**
 * @typedef {object} TronGasfreeTransactionReceipt
 * @property {string} id - The unique identifier for the transaction.
 * @property {number} fee - The total fee for the transaction.
 * @property {number} blockNumber - The block number in which the transaction was included.
 * @property {number} blockTimeStamp - The timestamp of the block.
 * @property {string[]} contractResult - The result of the contract execution.
 * @property {string} contract_address - The address of the contract.
 * @property {TronGasfreeTransactionReceiptReceiptDetails} receipt - The receipt details of the transaction.
 * @property {TronGasfreeTransactionReceiptLog[]} log - An array of logs emitted by the transaction.
 * @property {TronGasfreeTransactionReceiptInternalTransaction[]} internal_transactions - An array of internal transactions.
 */

/**
 * @typedef {Object} TronGasfreeWalletConfig
 * @property {Object} paymasterToken - The paymaster token configuration.
 * @property {string} paymasterToken.address - The address of the paymaster token.
 * @property {string} provider - The provider URL.
 * @property {string} gasFreeProvider - The gasfree provider URL.
 * @property {string} apiKey - The gasfree provider API key.
 * @property {string} apiSecret - The gasfree provider API secret.
 * @property {string} serviceProvider - The service provider address.
 * @property {string} verifyingContract - The verifying contract address.
 * @property {string} transferMaxFee - The max fee for the transfer.
 * @property {string} chainId - The chain id.
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

    /**
     * The tron gasfree free account.
     *
     * @protected
     * @type {string}
     */
    this._gasFreeAccount = null
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
   * Returns the account's address.
   * @returns {Promise<string>} The account's abstracted address.
   */
  async getAddress() {
    const address = await super.getAddress()
    const gasfreeAccount = await this._getGasfreeAccount(address)
    return gasfreeAccount.gasFreeAddress
  }

  /**
   * Transfers a token to another address.
   *
   * @param {TransferOptions} options - The transfer’s options.
   * @returns {Promise<TransferResult>} The transfer's result.
   */

  async transfer({ token, recipient, amount }) {
    const originalAddress = await super.getAddress()
    const timestamp = Math.floor(Date.now() / 1_000)

    const gasfreeAccount = await this._getGasfreeAccount(originalAddress)

    const tokenInfo = gasfreeAccount.assets.find(
      (a) => a.tokenAddress === token
    )

    if (!tokenInfo) {
      throw new Error('Token not supported for this account')
    }

    // Calculate total fee, including activation fee if the account isn't active
    const totalFee =
      tokenInfo.transferFee +
      (gasfreeAccount.active ? 0 : tokenInfo.activateFee)

    const effectiveMaxFee = Math.max(this._config.transferMaxFee, totalFee)

    const messageForSigning = {
      token,
      serviceProvider: this._config.serviceProvider,
      user: originalAddress,
      receiver: recipient,
      value: String(amount),
      maxFee: String(effectiveMaxFee),
      deadline: String(timestamp + 300),
      version: '1',
      nonce: String(gasfreeAccount.nonce)
    }

    const Permit712MessageDomain = {
      name: 'GasFreeController',
      version: 'V1.0.0',
      chainId: this._config.chainId,
      verifyingContract: this._config.verifyingContract
    }

    const signature = this._signTypedData(
      Permit712MessageDomain,
      messageForSigning
    )

    messageForSigning.sig = signature.slice(2)

    const response = await this._makeRequestToGasfreeProvider(
      'POST',
      '/api/v1/gasfree/submit',
      messageForSigning
    )

    const returnedData = await response.json()

    if (returnedData.code !== 200) {
      throw new Error(returnedData.message)
    }

    const gasCost =
      (returnedData.data.estimatedActivateFee || 0) +
      (returnedData.data.estimatedTransferFee || 0)

    return {
      hash: returnedData.data.id,
      fee: gasCost
    }
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @param {TransferOptions} options - The transfer’s options.
   * @returns {Promise<Omit<TransferResult,'hash'>>} The transfer’s quotes.
   */
  async quoteTransfer({ token }) {
    const originalAddress = await super.getAddress()

    const tokenConfigResponse = await this._makeRequestToGasfreeProvider(
      'GET',
      '/api/v1/config/token/all'
    )
    const tokenConfigData = await tokenConfigResponse.json()

    if (tokenConfigData.code !== 200) {
      throw new Error('Failed to fetch token configuration')
    }

    const tokenInfo = tokenConfigData.data.tokens.find(
      (t) => t.tokenAddress === token
    )

    if (!tokenInfo) {
      throw new Error('Token not supported')
    }

    const gasfreeAccount = await this._getGasfreeAccount(originalAddress)

    // Calculate the total fee, including an activation fee if the account is not yet active
    let totalFee = tokenInfo.transferFee
    if (!gasfreeAccount.active) {
      totalFee += tokenInfo.activateFee
    }

    return {
      fee: totalFee
    }
  }

  /**
   * Returns a transaction's receipt.
   *
   * @param {string} hash - The transaction's hash.
   * @returns {Promise<TronGasfreeTransactionReceipt | null>} The receipt, or null if the transaction has not been included in a block yet.
   */
  async getTransactionReceipt(hash) {
    try {
      const txHash = await this._getTransferHash(hash)

      return await super.getTransactionReceipt(txHash)
    } catch (error) {
      if (error.message.includes('Transaction hash not available yet')) {
        return null
      }
      throw error
    }
  }

  /** @private */
  _signTypedData(domain, value) {
    const messageDigest = this._tronWeb.utils._TypedDataEncoder.hash(domain, PERMIT_712_TYPES, value).slice(2);
    const signature = secp256k1.sign(messageDigest, this.keyPair.privateKey)
    const r = signature.r.toString(16).padStart(64, '0')
    const s = signature.s.toString(16).padStart(64, '0')
    const v = (signature.recovery + 27).toString(16).padStart(2, '0')
    return `0x${r}${s}${v}`
  }

  /** @private */
  async _getTransferHash(transferId) {
    const response = await this._makeRequestToGasfreeProvider(
      'GET',
      `/api/v1/gasfree/${transferId}`
    )

    const returnedData = await response.json()

    if (returnedData.code === 400 || returnedData.code === 500) {
      throw new Error(returnedData.message || 'Failed to get transfer hash')
    }

    if (!returnedData.data || !returnedData.data.txnHash) {
      throw new Error(
        'Transaction hash not available yet. The transaction might still be in WAITING state.'
      )
    }

    return returnedData.data.txnHash
  }

  /** @private */
  async _getGasfreeAccount(address) {
    if (this._gasFreeAccount) return this._gasFreeAccount

    const response = await this._makeRequestToGasfreeProvider(
      'GET',
      `/api/v1/address/${address}`
    )

    const { data, code } = await response.json()

    if (code === 200) { 
      this._gasFreeAccount = data
      return this._gasFreeAccount
    }

    throw new Error(data.message || 'Failed to get gasfree account')
  }

  /** @private */
  async _makeRequestToGasfreeProvider(method, path, body = null) {
    const timestamp = Math.floor(Date.now() / 1000)
    const message = method + path + timestamp

    const hmac = createHmac('sha256', this._config.apiSecret)
    hmac.update(message)
    const signature = hmac.digest('base64')

    const url = this._config.gasFreeProvider + path

    const headers = {
      Timestamp: `${timestamp}`,
      Authorization: `ApiKey ${this._config.apiKey}:${signature}`,
      'Content-Type': 'application/json'
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    })

    return response
  }
}
