import { beforeEach, describe, expect, jest, test } from '@jest/globals'
import { TronWeb, utils } from 'tronweb'

const OWNER_ADDRESS = 'TXngH8bVadn9ZWtKBgjKQcqN1GsZ7A1jcb'
const GASFREE_ADDRESS = 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD'

const CONFIG = {
  chainId: 728126428,
  provider: 'https://tron.web.provider/',
  gasFreeProvider: 'https://gasfree.provider',
  gasFreeApiKey: 'test-api-key',
  gasFreeApiSecret: 'test-api-secret',
  serviceProvider: 'TKtWbdzEq5ss9vTS9kwRhBp5mXmBfBns3E',
  verifyingContract: 'THQGuFzL87ZqhxkgqYEryRAd7gqFqL5rdc'
}

const GASFREE_ACCOUNT_RESPONSE = {
  code: 200,
  data: {
    gasFreeAddress: GASFREE_ADDRESS,
    active: true,
    nonce: 1
  }
}

const getBalanceMock = jest.fn()
const getTokenBalanceMock = jest.fn()
const verifyMock = jest.fn()
const getTransactionReceiptMock = jest.fn()

jest.unstable_mockModule('tronweb', () => {
  const TronWebMock = jest.fn().mockReturnValue({})

  Object.defineProperties(TronWebMock, Object.getOwnPropertyDescriptors(TronWeb))

  return {
    TronWeb: TronWebMock,
    utils,
    default: TronWebMock
  }
})

jest.unstable_mockModule('@tetherto/wdk-wallet-tron', () => {
  class WalletAccountReadOnlyTron {
    constructor (address) {
      this._address = address
    }

    async getAddress () { return this._address }
    async getBalance () { return getBalanceMock(this._address) }
    async getTokenBalance (tokenAddress) { return getTokenBalanceMock(tokenAddress) }
    async verify (message, signature) { return verifyMock(message, signature) }
    async getTransactionReceipt (hash) { return getTransactionReceiptMock(hash) }
  }

  class WalletAccountTron {}
  class WalletManagerTron {}

  return { default: WalletManagerTron, WalletAccountReadOnlyTron, WalletAccountTron }
})

const { WalletAccountReadOnlyTronGasfree } = await import('../index.js')

function mockFetchResponse (data) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data)
  })
}

describe('WalletAccountReadOnlyTronGasfree', () => {
  let account
  let fetchMock

  beforeEach(() => {
    jest.clearAllMocks()

    fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url.includes('/api/v1/address/')) {
        return mockFetchResponse(GASFREE_ACCOUNT_RESPONSE)
      }

      return Promise.reject(new Error(`Unexpected fetch URL: ${url}`))
    })

    account = new WalletAccountReadOnlyTronGasfree(OWNER_ADDRESS, CONFIG)
  })

  describe('getAddress', () => {
    test('should return the gasfree address from the provider', async () => {
      const address = await account.getAddress()

      expect(address).toBe(GASFREE_ADDRESS)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/address/${OWNER_ADDRESS}`),
        {
          method: 'GET',
          headers: {
            Timestamp: expect.any(String),
            Authorization: expect.stringContaining(`ApiKey ${CONFIG.gasFreeApiKey}:`),
            'Content-Type': 'application/json'
          },
          body: null
        }
      )
    })

    test('should send requests without auth headers when no credentials are provided', async () => {
      const { gasFreeApiKey, gasFreeApiSecret, ...proxyConfig } = CONFIG
      const proxyAccount = new WalletAccountReadOnlyTronGasfree(OWNER_ADDRESS, proxyConfig)

      const address = await proxyAccount.getAddress()

      expect(address).toBe(GASFREE_ADDRESS)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/address/${OWNER_ADDRESS}`),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          body: null
        }
      )
    })

    test('should throw if only gasFreeApiKey is provided without gasFreeApiSecret', () => {
      const { gasFreeApiSecret, ...partialConfig } = CONFIG

      expect(() => new WalletAccountReadOnlyTronGasfree(OWNER_ADDRESS, partialConfig))
        .toThrow("The 'gasFreeApiKey' and the 'gasFreeApiSecret' options must be provided together.")
    })

    test('should throw if only gasFreeApiSecret is provided without gasFreeApiKey', () => {
      const { gasFreeApiKey, ...partialConfig } = CONFIG

      expect(() => new WalletAccountReadOnlyTronGasfree(OWNER_ADDRESS, partialConfig))
        .toThrow("The 'gasFreeApiKey' and the 'gasFreeApiSecret' options must be provided together.")
    })
  })

  describe('verify', () => {
    const MESSAGE = 'Dummy message to sign.'
    const SIGNATURE = '0x67b1e4bb9a9b070cd60776ceab1ff4d7c4d4997bb5b4a71757da646f75d847e6600c22d8d83caa13d42c33099f75ba5ec30390467392aa78a3e5319da6c30e291b'

    test('should return true for a valid signature', async () => {
      verifyMock.mockResolvedValue(true)

      const result = await account.verify(MESSAGE, SIGNATURE)

      expect(verifyMock).toHaveBeenCalledWith(MESSAGE, SIGNATURE)
      expect(result).toBe(true)
    })

    test('should return false for an invalid signature', async () => {
      verifyMock.mockResolvedValue(false)

      const result = await account.verify('Another message.', SIGNATURE)

      expect(verifyMock).toHaveBeenCalledWith('Another message.', SIGNATURE)
      expect(result).toBe(false)
    })
  })

  describe('getBalance', () => {
    test('should return the correct balance of the gasfree account', async () => {
      getBalanceMock.mockResolvedValue(1_000_000_000n)

      const balance = await account.getBalance()

      expect(getBalanceMock).toHaveBeenCalledWith(GASFREE_ADDRESS)
      expect(balance).toBe(1_000_000_000n)
    })
  })

  describe('getTokenBalance', () => {
    const TOKEN_ADDRESS = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

    test('should return the correct token balance of the gasfree account', async () => {
      getTokenBalanceMock.mockResolvedValue(1_000_000n)

      const balance = await account.getTokenBalance(TOKEN_ADDRESS)

      expect(getTokenBalanceMock).toHaveBeenCalledWith(TOKEN_ADDRESS)
      expect(balance).toBe(1_000_000n)
    })
  })

  describe('quoteSendTransaction', () => {
    test('should throw as not supported on tron gasfree', async () => {
      await expect(account.quoteSendTransaction({ to: OWNER_ADDRESS, value: 1000 }))
        .rejects.toThrow("Method 'quoteSendTransaction(tx)' not supported on tron gasfree.")
    })
  })

  describe('quoteTransfer', () => {
    const TRANSFER = {
      token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      recipient: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
      amount: 100_000_000
    }

    test('should return the correct fee estimate when account is active', async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/v1/address/')) {
          return mockFetchResponse({
            code: 200,
            data: { gasFreeAddress: GASFREE_ADDRESS, active: true, nonce: 1 }
          })
        }

        if (url.includes('/api/v1/config/token/all')) {
          return mockFetchResponse({
            code: 200,
            data: {
              tokens: [{
                tokenAddress: TRANSFER.token,
                transferFee: 50000,
                activateFee: 100000
              }]
            }
          })
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`))
      })

      const { fee } = await account.quoteTransfer(TRANSFER)

      expect(fee).toBe(50_000n)
    })

    test('should include activate fee when account needs activation', async () => {
      const freshAccount = new WalletAccountReadOnlyTronGasfree(OWNER_ADDRESS, CONFIG)

      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/v1/address/')) {
          return mockFetchResponse({
            code: 200,
            data: { gasFreeAddress: GASFREE_ADDRESS, active: false, nonce: 0 }
          })
        }

        if (url.includes('/api/v1/config/token/all')) {
          return mockFetchResponse({
            code: 200,
            data: {
              tokens: [{
                tokenAddress: TRANSFER.token,
                transferFee: 50000,
                activateFee: 100000
              }]
            }
          })
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`))
      })

      const { fee } = await freshAccount.quoteTransfer(TRANSFER)

      expect(fee).toBe(150_000n)
    })

    test('should throw when the token config API returns a non-200 code', async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/v1/address/')) {
          return mockFetchResponse(GASFREE_ACCOUNT_RESPONSE)
        }

        if (url.includes('/api/v1/config/token/all')) {
          return mockFetchResponse({
            code: 500,
            reason: 'Internal server error'
          })
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`))
      })

      await expect(account.quoteTransfer(TRANSFER))
        .rejects.toThrow('Internal server error')
    })
  })

  describe('getTransactionReceipt', () => {
    const GASFREE_TX_ID = 'gasfree-tx-id-123'
    const ONCHAIN_TX_HASH = 'onchain-tx-hash-456'

    test('should return the correct transaction receipt', async () => {
      const DUMMY_RECEIPT = {
        id: ONCHAIN_TX_HASH,
        blockNumber: 12345,
        fee: 1000,
        result: 'SUCCESS'
      }

      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/v1/address/')) {
          return mockFetchResponse(GASFREE_ACCOUNT_RESPONSE)
        }

        if (url.includes(`/api/v1/gasfree/${GASFREE_TX_ID}`)) {
          return mockFetchResponse({
            code: 200,
            data: { txnHash: ONCHAIN_TX_HASH }
          })
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`))
      })

      getTransactionReceiptMock.mockResolvedValue(DUMMY_RECEIPT)

      const receipt = await account.getTransactionReceipt(GASFREE_TX_ID)

      expect(getTransactionReceiptMock).toHaveBeenCalledWith(ONCHAIN_TX_HASH)
      expect(receipt).toEqual(DUMMY_RECEIPT)
    })

    test('should return null if the gasfree transaction has no onchain hash yet', async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/v1/address/')) {
          return mockFetchResponse(GASFREE_ACCOUNT_RESPONSE)
        }

        if (url.includes(`/api/v1/gasfree/${GASFREE_TX_ID}`)) {
          return mockFetchResponse({
            code: 200,
            data: { txnHash: null }
          })
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`))
      })

      const receipt = await account.getTransactionReceipt(GASFREE_TX_ID)

      expect(receipt).toBe(null)
    })

    test('should throw when the gasfree transaction API returns a non-200 code', async () => {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/v1/address/')) {
          return mockFetchResponse(GASFREE_ACCOUNT_RESPONSE)
        }

        if (url.includes('/api/v1/gasfree/')) {
          return mockFetchResponse({
            code: 404,
            reason: 'Transaction not found'
          })
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`))
      })

      await expect(account.getTransactionReceipt('invalid-tx-id'))
        .rejects.toThrow('Transaction not found')
    })
  })
})
