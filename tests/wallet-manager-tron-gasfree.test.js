import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import { TronWeb, utils } from 'tronweb'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

const CONFIG = {
  chainId: 728126428,
  provider: 'https://tron.web.provider/',
  gasFreeProvider: 'https://gasfree.provider',
  gasFreeApiKey: 'test-api-key',
  gasFreeApiSecret: 'test-api-secret',
  serviceProvider: 'TServiceProviderAddress',
  verifyingContract: 'TVerifyingContractAddress'
}

const getChainParametersMock = jest.fn()

jest.unstable_mockModule('tronweb', () => {
  const TronWebMock = jest.fn().mockReturnValue({
    trx: {
      getChainParameters: getChainParametersMock
    }
  })

  Object.defineProperties(TronWebMock, Object.getOwnPropertyDescriptors(TronWeb))

  return {
    default: TronWebMock,
    TronWeb: TronWebMock,
    utils
  }
})

const { default: WalletManagerTronGasfree, WalletAccountTronGasfree } = await import('../index.js')

describe('WalletManagerTronGasfree', () => {
  let wallet

  beforeEach(() => {
    jest.clearAllMocks()
    wallet = new WalletManagerTronGasfree(SEED_PHRASE, CONFIG)
  })

  afterEach(() => {
    wallet.dispose()
  })

  describe('getAccount', () => {
    test('should return the account at index 0 by default', async () => {
      const account = await wallet.getAccount()

      expect(account).toBeInstanceOf(WalletAccountTronGasfree)

      expect(account.path).toBe("m/44'/195'/0'/0/0")
    })

    test('should return the account at the given index', async () => {
      const account = await wallet.getAccount(3)

      expect(account).toBeInstanceOf(WalletAccountTronGasfree)

      expect(account.path).toBe("m/44'/195'/0'/0/3")
    })

    test('should return the same cached account for the same index', async () => {
      const account1 = await wallet.getAccount(0)
      const account2 = await wallet.getAccount(0)

      expect(account1).toBe(account2)
    })

    test('should throw if the index is a negative number', async () => {
      await expect(wallet.getAccount(-1))
        .rejects.toThrow('invalid child index')
    })
  })

  describe('getAccountByPath', () => {
    test('should return the same cached account for the same path', async () => {
      const account1 = await wallet.getAccountByPath("0'/0/0")
      const account2 = await wallet.getAccountByPath("0'/0/0")

      expect(account1).toBe(account2)
    })

    test('should return the account with the given path', async () => {
      const account = await wallet.getAccountByPath("1'/2/3")

      expect(account).toBeInstanceOf(WalletAccountTronGasfree)

      expect(account.path).toBe("m/44'/195'/1'/2/3")
    })

    test('should throw if the path is invalid', async () => {
      await expect(wallet.getAccountByPath("a'/b/c"))
        .rejects.toThrow('invalid child index')
    })
  })

  describe('getFeeRates', () => {
    test('should return the correct fee rates', async () => {
      const DUMMY_CHAIN_PARAMETERS = [
        { key: 'getTransactionFee', value: 1_000 }
      ]

      getChainParametersMock.mockResolvedValue(DUMMY_CHAIN_PARAMETERS)

      const feeRates = await wallet.getFeeRates()

      expect(getChainParametersMock).toHaveBeenCalled()
      expect(feeRates.normal).toBe(1_100n)
      expect(feeRates.fast).toBe(2_000n)
    })

    test('should accept a TronWeb instance as provider', async () => {
      const { TronWeb } = await import('tronweb')
      const tronWebInstance = new TronWeb({ fullHost: CONFIG.provider })
      const walletWithInstance = new WalletManagerTronGasfree(SEED_PHRASE, { ...CONFIG, provider: tronWebInstance })

      getChainParametersMock.mockResolvedValue([
        { key: 'getTransactionFee', value: 1_000 }
      ])

      const feeRates = await walletWithInstance.getFeeRates()

      expect(feeRates.normal).toBe(1_100n)
      expect(feeRates.fast).toBe(2_000n)

      walletWithInstance.dispose()
    })

    test('should throw if the wallet is not connected to tron web', async () => {
      const { provider, ...configWithoutProvider } = CONFIG
      const disconnectedWallet = new WalletManagerTronGasfree(SEED_PHRASE, configWithoutProvider)

      await expect(disconnectedWallet.getFeeRates())
        .rejects.toThrow('The wallet must be connected to tron web to get fee rates.')
    })
  })
})
