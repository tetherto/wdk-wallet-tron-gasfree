import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import { TronWeb, utils, Trx } from 'tronweb'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

const CONFIG = {
  chainId: 728126428,
  provider: 'https://tron.web.provider/',
  gasFreeProvider: 'https://gasfree.provider',
  gasFreeApiKey: 'test-api-key',
  gasFreeApiSecret: 'test-api-secret',
  serviceProvider: 'TKtWbdzEq5ss9vTS9kwRhBp5mXmBfBns3E',
  verifyingContract: 'THQGuFzL87ZqhxkgqYEryRAd7gqFqL5rdc'
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
    TronWeb: TronWebMock,
    utils,
    Trx
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

    test('should throw if the index is a negative number', async () => {
      await expect(wallet.getAccount(-1))
        .rejects.toThrow('invalid child index')
    })
  })

  describe('getAccountByPath', () => {
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

    test('should throw if the wallet is not connected to tron web', async () => {
      const { provider, ...configWithoutProvider } = CONFIG
      const disconnectedWallet = new WalletManagerTronGasfree(SEED_PHRASE, configWithoutProvider)

      await expect(disconnectedWallet.getFeeRates())
        .rejects.toThrow('The wallet must be connected to tron web to get fee rates.')
    })
  })
})
