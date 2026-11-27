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

import { WalletAccountReadOnly, NoSuchElementError, UnsupportedOperationError, ValueError } from '@tetherto/wdk-wallet'

import { WalletAccountReadOnlyTron } from '@tetherto/wdk-wallet-tron'

import { TronWeb, utils } from 'tronweb'

import { GASFREE_CONTRACTS, NILE_CHAIN_ID, TRON_CHAIN_ID } from './gasfree-contracts.js'

/** @typedef {import('tronweb').TronWeb } TronWeb */

/** @typedef {import('@tetherto/wdk-wallet-tron').TronTransaction} TronTransaction */
/** @typedef {import('@tetherto/wdk-wallet-tron').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-tron').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-tron').TransferResult} TransferResult */

/** @typedef {import('@tetherto/wdk-wallet-tron').TronTransactionReceipt } TronTransactionReceipt */
/** @typedef {import('@tetherto/wdk-wallet-tron').TronActivationFee } TronActivationFee */

/** @typedef {import('@tetherto/wdk-wallet').TransactionReceipt} TransactionReceipt */
/** @typedef {import('@tetherto/wdk-wallet').WaitForTransactionOptions} WaitForTransactionOptions */

/**
 * The tron-specific fields added to a normalized transaction receipt.
 *
 * @typedef {Object} TronGasfreeTransactionDetails
 * @property {number | null} confirmations - The confirmation depth, or null while it can't be resolved.
 * @property {TronTransactionReceipt | null} receipt - The native tron receipt, or null while the transaction is pending or dropped.
 */

/**
 * @typedef {Object} TronGasfreeWalletConfig
 * @property {number} chainId - The blockchain's id.
 * @property {string | TronWeb | Array<string | TronWeb>} provider - The url of the tron web provider, or an instance of the {@link TronWeb} class.
 * @property {number} [retries] - The number of retries in the failover mechanism.
 * @property {string} gasFreeProvider - The gasfree provider's url.
 * @property {string} [gasFreeApiKey] - The gasfree provider's api key.
 * @property {string} [gasFreeApiSecret] - The gasfree provider's api secret.
 * @property {string} serviceProvider - The address of the service provider.
 * @property {string} verifyingContract - The address of the verifying contract.
 * @property {number | bigint} [transferMaxFee] - The maximum fee amount for transfer operations.
 * @property {number | bigint} [transactionMaxFee] - The maximum fee amount for sendTransaction and signTransaction operations.
 */

/**
 * @typedef {Object} TronGasfreeAssetInfo
 * @property {string} tokenAddress - The token's smart contract address.
 * @property {string} tokenSymbol - The token's symbol.
 * @property {number} activateFee - The fee to activate the account for this token.
 * @property {number} transferFee - The fee for transferring this token.
 * @property {number} decimal - The token's decimals.
 * @property {number} frozen - Whether the token is frozen.
 */

/**
 * @typedef {Object} TronGasfreeAccountInfo
 * @property {string} accountAddress - The owner's account address.
 * @property {string} gasFreeAddress - The gasfree contract address for the account.
 * @property {boolean} active - Whether the gasfree account is active.
 * @property {number} nonce - The account's nonce.
 * @property {boolean} allowSubmit - Whether the account is allowed to submit transactions.
 * @property {TronGasfreeAssetInfo[]} assets - The list of supported assets and their info.
 */

/**
 * The byte TRON puts in front of a CREATE2 preimage, where ethereum puts 0xff.
 */
const TRON_CREATE2_PREFIX = '0x41'

/**
 * The byte TRON puts in front of a 20-byte address.
 */
const TRON_ADDRESS_PREFIX = '41'

export default class WalletAccountReadOnlyTronGasfree extends WalletAccountReadOnly {
  /**
   * Creates a new read-only tron gasfree wallet account.
   *
   * @param {string} address - The tron account's address.
   * @param {Omit<TronGasfreeWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>} config - The configuration object.
   * @throws {ValueError} If only one of the 'gasFreeApiKey' and 'gasFreeApiSecret' options is set.
   */
  constructor (address, config) {
    super(undefined)

    const { gasFreeApiKey, gasFreeApiSecret } = config

    if ((gasFreeApiKey && !gasFreeApiSecret) || (!gasFreeApiKey && gasFreeApiSecret)) {
      throw new ValueError("The 'gasFreeApiKey' and the 'gasFreeApiSecret' options must be provided together.")
    }

    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {Omit<TronGasfreeWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>}
     */
    this._config = config

    /** @private */
    this._ownerAccountAddress = address
  }

  /**
   * Returns the account's address: the GasFree account of its owner. With an official GasFree controller as the
   * `verifyingContract`, it is derived locally from the owner's address; with any other, it is read from the GasFree provider.
   *
   * @returns {Promise<string>} The GasFree account's address.
   */
  async getAddress () {
    const contracts = GASFREE_CONTRACTS[Number(this._config.chainId)]

    if (contracts && TronWeb.address.toHex(contracts.controller) === TronWeb.address.toHex(this._config.verifyingContract).toLowerCase()) {
      const ownerAddress = await this._getOwnerAddress()

      return this._deriveGasFreeAddress(ownerAddress, contracts)
    }

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
   * @throws {UnsupportedOperationError} Always; tron gasfree accounts only support token transfers.
   */
  async quoteSendTransaction (tx) {
    throw new UnsupportedOperationError('quoteSendTransaction(tx)')
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<Omit<TransferResult, 'hash'> & TronActivationFee>} The transfer's quotes.
   */
  async quoteTransfer ({ token }) {
    const gasFreeAccount = await this._getGasfreeAccount()

    return this._quoteTransferWithAccount(gasFreeAccount, { token })
  }

  /**
   * Quotes the costs of a transfer operation using a pre-fetched gasfree account.
   *
   * @protected
   * @param {TronGasfreeAccountInfo} gasFreeAccount - The pre-fetched gasfree account.
   * @param {TransferOptions} options - The transfer's options.
   * @returns {Promise<Omit<TransferResult, 'hash'> & TronActivationFee>} The transfer's quotes.
   * @throws {Error} If the provider doesn't support the given TRC-20 token.
   */
  async _quoteTransferWithAccount (gasFreeAccount, { token }) {
    const response = await this._sendRequestToGasfreeProvider('GET', '/api/v1/config/token/all')

    const resp = await response.json()

    if (resp.code !== 200) {
      throw new Error(resp.reason)
    }

    const paymasterToken = resp.data.tokens.find(({ tokenAddress }) => tokenAddress === token)

    if (!paymasterToken) {
      throw new Error(`Token ${token} is not supported by the gasfree provider.`)
    }

    const activationFee = !gasFreeAccount.active ? paymasterToken.activateFee : 0
    const fee = BigInt(paymasterToken.transferFee) + BigInt(activationFee)

    return { fee: BigInt(fee), activationFee: BigInt(activationFee) }
  }

  /**
   * Verifies a message's signature.
   *
   * @param {string} message - The original message.
   * @param {string} signature - The signature to verify.
   * @returns {Promise<boolean>} True if the signature is valid.
   */
  async verify (message, signature) {
    const ownerAddress = await this._getOwnerAddress()

    const tronReadOnlyAccount = new WalletAccountReadOnlyTron(ownerAddress, this._config)

    return await tronReadOnlyAccount.verify(message, signature)
  }

  /**
   * Returns a transaction's receipt.
   *
   * @deprecated Use {@link getTransaction} instead, which returns a normalized, finality-based receipt. The raw tron receipt remains available on its `receipt` property.
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
   * Returns a normalized, finality-based receipt for a gasfree transfer.
   *
   * @param {string} hash - The gasfree transfer's id.
   * @returns {Promise<TransactionReceipt & TronGasfreeTransactionDetails>} The normalized receipt.
   * @throws {NoSuchElementError} If no transfer has been found for the given hash.
   */
  async getTransaction (hash) {
    const tronReadOnlyAccount = await this._getTronReadOnlyAccount()

    const txHash = await this._getTokenTransferHash(hash)

    if (!txHash) {
      throw new NoSuchElementError(`No transfer found for '${hash}'.`)
    }

    const info = await tronReadOnlyAccount.getTransaction(txHash)

    return { ...info, hash }
  }

  /**
   * Blocks until a transaction reaches a terminal state (the requested finality target or `dropped`), or times out.
   *
   * @param {string} hash - The gasfree transfer's id.
   * @param {WaitForTransactionOptions} [options] - The wait options.
   * @returns {Promise<TransactionReceipt & TronGasfreeTransactionDetails>} The terminal receipt: the finality target reached (inspect `success` to tell success from revert), or `dropped`.
   * @throws {TimeoutError} If the target is not reached before the timeout.
   */
  async waitForTransaction (hash, options = {}) {
    return await super.waitForTransaction(hash, options)
  }

  /**
   * Overrides the base default to allow for the gasfree provider's relay and tron confirmation latency.
   *
   * @type {number}
   */
  get defaultWaitTimeout () {
    return 120000
  }

  /**
   * Returns the gasfree provider's account.
   *
   * @protected
   * @returns {Promise<TronGasfreeAccountInfo>} The gasfree provider's account.
   */
  async _getGasfreeAccount () {
    const ownerAddress = await this._getOwnerAddress()

    const response = await this._sendRequestToGasfreeProvider('GET', `/api/v1/address/${ownerAddress}`)

    const resp = await response.json()

    if (resp.code !== 200) {
      throw new Error(resp.reason)
    }

    return resp.data
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
    const chainId = Number(this._config.chainId)

    if (![NILE_CHAIN_ID, TRON_CHAIN_ID].includes(chainId)) {
      throw new Error(`Gas free provider does not support this chain with id ${chainId}`)
    }

    const url = this._config.gasFreeProvider + path

    const headers = {
      'Content-Type': 'application/json'
    }

    const { gasFreeApiKey, gasFreeApiSecret } = this._config

    if (gasFreeApiKey && gasFreeApiSecret) {
      const timestamp = Math.floor(Date.now() / 1_000)

      const prefix = chainId === NILE_CHAIN_ID ? '/nile' : '/tron'

      const message = method + prefix + path + timestamp

      const signature = createHmac('sha256', gasFreeApiSecret)
        .update(message)
        .digest('base64')

      headers.Timestamp = `${timestamp}`
      headers.Authorization = `ApiKey ${gasFreeApiKey}:${signature}`
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

  /**
   * Returns the address of the tron account that owns the gasfree account.
   *
   * @protected
   * @returns {Promise<string>} The owner's address.
   */
  async _getOwnerAddress () {
    return this._ownerAccountAddress
  }

  /** @private */
  _deriveGasFreeAddress (ownerAddress, { controller, beacon, creationCode }) {
    const { keccak256, AbiCoder, concat, id } = utils.ethersUtils
    const toEvmAddress = (tronAddress) => '0x' + TronWeb.address.toHex(tronAddress).slice(TRON_ADDRESS_PREFIX.length)

    const salt = '0x' + toEvmAddress(ownerAddress).slice(2).padStart(64, '0')
    const initializer = id('initialize(address)').slice(0, 10) + salt.slice(2)
    const bytecode = concat([creationCode, AbiCoder.defaultAbiCoder().encode(['address', 'bytes'], [toEvmAddress(beacon), initializer])])
    const hash = keccak256(concat([TRON_CREATE2_PREFIX, toEvmAddress(controller), salt, keccak256(bytecode)]))

    return TronWeb.address.fromHex(TRON_ADDRESS_PREFIX + hash.slice(-40))
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

    const resp = await response.json()

    if (resp.code !== 200) {
      throw new Error(resp.reason)
    }

    return resp.data?.txnHash
  }
}
