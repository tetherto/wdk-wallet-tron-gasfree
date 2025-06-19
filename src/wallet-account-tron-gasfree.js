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

/**
 * @typedef {import("@wdk/wallet").IWalletAccount} IWalletAccount
 */

/** @typedef {import('@wdk/wallet').KeyPair} KeyPair */

/** @typedef {import('@wdk/wallet').TransferOptions} TransferOptions */

/** @typedef {import('@wdk/wallet').TransferResult} TransferResult */

export default class WalletAccountTronGasfree extends WalletAccountTron {
  _gasFreeAccount

  /**
   * Gets the original address from the private key.
   * @returns {Promise<string>} The original address.
   * @private
   */
  async _getOriginalAddress () {
    return this._tronWeb.address.fromPrivateKey(
      Buffer.from(this.keyPair.privateKey).toString('hex')
    )
  }

  /**
   * Returns the account's address.
   * @returns {Promise<string>} The account's abstracted address.
   */
  async getAddress () {
    const address = await this._getOriginalAddress()

    const gasfreeAccount = await this._getGasfreeAccount(address)
    return gasfreeAccount.gasFreeAddress
  }

  async getBalance () {
    throw new Error('getBalance is not implemented')
  }

  /**
   * Quotes a transfer operation.
   * @param {TransferOptions} params - The transaction parameters.
   * @returns {Promise<Omit<TransactionResult,'hash'>>} The transaction's quotes.
   */
  async quoteTransfer (options) {
    return await this.transfer({ ...options, simulate: true })
  }

  /**
   * Sends a token transaction.
   *
   * @param {TransferOptions} params - The transaction parameters.
   * @returns {Promise<TransactionResult>} The transaction's hash.
   */
  async transfer (options) {
    const { token, recipient, amount, simulate } = options
    const originalAddress = await this._getOriginalAddress()

    if (simulate) {
      const tokenConfigResponse = await this.makeRequestToGasfreeProvider(
        'GET',
        '/api/v1/config/token/all'
      )
      const tokenConfigData = await tokenConfigResponse.json()

      if (tokenConfigData.code !== 200) {
        throw new Error('Failed to fetch token configuration')
      }

      // Find the token info
      const tokenInfo = tokenConfigData.data.tokens.find(
        (t) => t.tokenAddress === token
      )
      if (!tokenInfo) {
        throw new Error('Token not supported')
      }

      // Check if user account is activated
      const accountResponse = await this.makeRequestToGasfreeProvider(
        'GET',
        `/api/v1/address/${originalAddress}`
      )
      const accountData = await accountResponse.json()

      if (accountData.code !== 200) {
        throw new Error('Failed to fetch account status')
      }

      // Calculate total fee
      let totalFee = tokenInfo.transferFee
      if (!accountData.data.active) {
        totalFee += tokenInfo.activateFee
      }

      return {
        hash: null,
        fee: totalFee
      }
    }

    const timestamp = Math.floor(Date.now() / 1_000)

    // Get account info to get recommended nonce and check if we can submit
    const accountResponse = await this.makeRequestToGasfreeProvider(
      'GET',
      `/api/v1/address/${originalAddress}`
    )
    const accountData = await accountResponse.json()

    if (accountData.code !== 200) {
      throw new Error('Failed to fetch account status')
    }

    // Get token info to calculate fees
    const tokenInfo = accountData.data.assets.find(
      (a) => a.tokenAddress === token
    )

    if (!tokenInfo) {
      throw new Error('Token not supported')
    }

    // Calculate total fee (transfer fee + activation fee if account is not active)
    const totalFee =
      tokenInfo.transferFee +
      (!accountData.data.active ? tokenInfo.activateFee : 0)

    // Use the calculated total fee if maxFee is not provided or is too low
    const effectiveMaxFee = Math.max(this._config.transferMaxFee, totalFee)

    const messageForSigning = {
      token,
      serviceProvider: this._config.serviceProvider,
      user: originalAddress,
      receiver: recipient,
      value: amount,
      maxFee: effectiveMaxFee,
      deadline: timestamp + 300, // 5 minutes
      version: 1,
      nonce: accountData.data.nonce
    }

    const Permit712MessageDomain = {
      name: 'GasFreeController',
      version: 'V1.0.0',
      chainId: this._config.chainId,
      verifyingContract: this._config.verifyingContract
    }

    const Permit712MessageTypes = {
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

    try {
      const signature = await this.signTypedData(
        Permit712MessageDomain,
        Permit712MessageTypes,
        messageForSigning
      )

      messageForSigning.sig = signature.slice(2)

      const response = await this.makeRequestToGasfreeProvider(
        'POST',
        '/api/v1/gasfree/submit',
        messageForSigning
      )

      const returnedData = await response.json()

      if (returnedData.code === 400) {
        throw new Error(returnedData.message)
      }

      // Calculate gas cost from the response data
      const gasCost =
        (returnedData.data.estimatedActivateFee || 0) +
        (returnedData.data.estimatedTransferFee || 0)

      return {
        id: returnedData.data.id,
        fee: gasCost
      }
    } catch (error) {
      console.error('Transfer error:', error)
      throw error
    }
  }

  /**
   * Gets the transfer hash for a given transfer ID.
   * @param {string} transferId - The transfer ID.
   * @returns {Promise<string>} The transfer hash.
   */
  async getTransferHash (transferId) {
    const response = await this.makeRequestToGasfreeProvider(
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


  /**
   * @private
   */
  async _getGasfreeAccount (address) {
    if (this._gasFreeAccount) return this._gasFreeAccount

    const response = await this.makeRequestToGasfreeProvider(
      'GET',
      `/api/v1/address/${address}`
    )

    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch (error) {
      throw new Error('Invalid response format')
    }

    if (response.ok) {
      if (!data || !data.data) {
        throw new Error('Invalid response format: missing data field')
      }
      this._gasFreeAccount = data.data
      return this._gasFreeAccount
    }

    if (response.status === 401) {
      throw new Error('unauthorized')
    } else if (response.status === 404) {
      throw new Error('address not found')
    } else {
      throw new Error(`unknown error: ${data.message || response.status}`)
    }
  }

  async makeRequestToGasfreeProvider (method, path, body = null) {
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
