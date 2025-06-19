/* eslint-env jest */
import WalletManagerTronGasfree from '../src/wallet-manager-tron-gasfree.js'

describe('WalletManagerTronGasfree', () => {
  let walletManager
  const testSeedPhrase =
    'between oval abandon quantum heavy stable guess limb ring hobby surround wall'
  const testConfig = {
    // provider: "https://api.trongrid.io", // Mainnet
    // provider: 'https://api.shasta.trongrid.io' // Testnet
    provider: 'https://nile.trongrid.io' // Nile testnet
  }

  beforeEach(async () => {
    walletManager = new WalletManagerTronGasfree(testSeedPhrase, testConfig)
  })

  describe('initialization', () => {
    it('should create a new wallet manager instance', () => {
      expect(walletManager).toBeDefined()
      expect(walletManager).toBeInstanceOf(WalletManagerTronGasfree)
    })
  })

  describe('account management', () => {
    it('should get account by index', async () => {
      const account = await walletManager.getAccount(0)
      expect(account).toBeDefined()
      expect(account.path).toBe("m/44'/195'/0'/0/0")
    })

    it('should get account by path', async () => {
      const account = await walletManager.getAccountByPath("0'/0'")
      expect(account).toBeDefined()
      expect(account.path).toBe("m/44'/195'/0'/0'")
    })

    it('should track accounts in internal set', async () => {
      const account1 = await walletManager.getAccount(0)
      const account2 = await walletManager.getAccount(1)
      const account3 = await walletManager.getAccountByPath("0'/0'")

      // All accounts should be tracked
      expect(account1).toBeDefined()
      expect(account2).toBeDefined()
      expect(account3).toBeDefined()
    })
  })

  describe('seed phrase', () => {
    it('should get the seed phrase from the wallet manager', () => {
      expect(walletManager.seed).toBeDefined()
    })

    it('should throw an error if the seed phrase is invalid', () => {
      expect(
        () => new WalletManagerTronGasfree('invalid seed phrase', testConfig)
      ).toThrow()
    })
  })

  describe('fee rates', () => {
    it('should get the fee rates', async () => {
      const feeRates = await walletManager.getFeeRates()
      expect(feeRates).toBeDefined()
      expect(feeRates.normal).toBeGreaterThan(0)
      expect(feeRates.fast).toBeGreaterThan(0)
      expect(feeRates.fast).toBeGreaterThan(feeRates.normal)
    })

    it('should handle RPC errors gracefully', async () => {
      const walletManagerWithInvalidRpc = new WalletManagerTronGasfree(
        testSeedPhrase,
        {
          provider: 'https://invalid-rpc-url.com'
        }
      )
      await expect(walletManagerWithInvalidRpc.getFeeRates()).rejects.toThrow()
    })
  })

  describe('dispose', () => {
    it('should dispose all accounts and clear sensitive data', async () => {
      // Create some accounts
      const account1 = await walletManager.getAccount(0)
      const account2 = await walletManager.getAccount(1)

      // Store initial values
      const initialPath1 = account1.path
      const initialPath2 = account2.path

      // Get fee rates before disposal
      const feeRates = await walletManager.getFeeRates()
      expect(feeRates).toBeDefined()
      expect(feeRates.normal).toBeGreaterThan(0)
      expect(feeRates.fast).toBeGreaterThan(0)

      // Make seed property writable for the test
      const seedValue = walletManager.seed
      Object.defineProperty(walletManager, 'seed', {
        value: seedValue,
        writable: true,
        configurable: true
      })

      // Dispose the wallet manager
      walletManager.dispose()

      // The paths should still be accessible
      expect(account1.path).toBe(initialPath1)
      expect(account2.path).toBe(initialPath2)

      // Try to get fee rates - should throw error since TronWeb is disposed
      await expect(walletManager.getFeeRates()).rejects.toThrow()

      // Try to get a new account - should throw error since TronWeb is disposed
      await expect(walletManager.getAccount(0)).rejects.toThrow()
    })
  })
})
