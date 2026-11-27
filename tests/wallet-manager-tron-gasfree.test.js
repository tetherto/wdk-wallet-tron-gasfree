import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import * as bip39 from 'bip39'

import { TronWeb, utils, Trx } from 'tronweb'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

const SECOND_SEED_PHRASE = 'test walk nut penalty hip pave soap entry language right filter choice'

const PRIVATE_KEY = '5d5645db7db2a3b86435e3ec9b3b2cc670fccef5b6d5705e310b8ac2d8d37633'

const ACCOUNT_0_GASFREE_ADDRESS = 'TB5iQGWDQ7zFd7Vx8fZ1ii7gL8UWLztfw4'

const ACCOUNT_1_GASFREE_ADDRESS = 'TKe2bxbptkLYrwLknqCnze9EKZfcBjEaRu'

const COIN_NODE_GASFREE_ADDRESS = 'TATeAizMWuwgh8MJq9FsohxfMENZ3FiHbM'

const SECOND_SEED_ACCOUNT_0_GASFREE_ADDRESS = 'TSH5GahxiYrYLGQVLUxvr4AKWq3TQCsDin'

const CONFIG = {
  chainId: 728126428,
  provider: 'https://tron.web.provider/',
  gasFreeProvider: 'https://gasfree.provider',
  gasFreeApiKey: 'test-api-key',
  gasFreeApiSecret: 'test-api-secret',
  serviceProvider: 'TKtWbdzEq5ss9vTS9kwRhBp5mXmBfBns3E',
  verifyingContract: 'TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U'
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

const { default: WalletManagerTronGasfree, DisposalError, InvalidSignerError, MaximumFeeExceededError, NoSuchElementError, ProviderRequiredError, ValueError } = await import('../index.js')
const { SeedSignerTron, PrivateKeySignerTron } = await import('../src/signers/index.js')

const UNSUPPORTED_DERIVATION_ERROR = new InvalidSignerError('The signer does not support account derivation.')

class KeylessSignerTron {
  constructor (signer) {
    this._signer = signer
  }

  get isDerivable () {
    return this._signer.isDerivable
  }

  get path () {
    return this._signer.path
  }

  get keyPair () {
    return null
  }

  get disposed () {
    return this._signer.disposed
  }

  async derive (path) {
    return new KeylessSignerTron(await this._signer.derive(path))
  }

  async getAddress () {
    return await this._signer.getAddress()
  }

  async sign (message) {
    return await this._signer.sign(message)
  }

  async signTransaction (unsignedTx) {
    return await this._signer.signTransaction(unsignedTx)
  }

  dispose () {
    this._signer.dispose()
  }
}

describe('WalletManagerTronGasfree', () => {
  let wallet

  beforeEach(() => {
    jest.clearAllMocks()
    wallet = new WalletManagerTronGasfree(SEED_PHRASE, CONFIG)
  })

  afterEach(() => {
    for (const signer of Object.values(wallet.getSigners())) {
      signer.dispose()
    }

    wallet.dispose()

    jest.restoreAllMocks()
  })

  describe('constructor', () => {
    test('should wrap a seed in a seed signer at the coin-type node', () => {
      const signer = wallet.getSigner()

      expect(signer.path).toBe("m/44'/195'")
    })

    test('should not keep the seed', () => {
      expect(wallet.seed).toBeUndefined()
    })

    test('should accept a derivable signer as the default signer', async () => {
      const signer = new SeedSignerTron(SEED_PHRASE)
      const signerWallet = new WalletManagerTronGasfree(signer, CONFIG)

      const account = await signerWallet.getAccount(1)

      expect(await account.getAddress()).toBe(ACCOUNT_1_GASFREE_ADDRESS)

      signerWallet.dispose()
      signer.dispose()
    })

    test('should throw if the default signer is not derivable', () => {
      expect(() => new WalletManagerTronGasfree(new PrivateKeySignerTron(PRIVATE_KEY), CONFIG))
        .toThrow(expect.objectContaining({ constructor: InvalidSignerError, message: 'The default signer must be derivable. Non-derivable signers (e.g. private-key signers) can only be registered by name via addSigner.' }))
    })

    test('should throw if the seed phrase is invalid', () => {
      expect(() => new WalletManagerTronGasfree('invalid seed phrase', CONFIG))
        .toThrow(expect.objectContaining({ constructor: ValueError, message: 'The seed phrase is invalid.' }))
    })

    test('should dispose the seed signer it built if the provider is rejected', () => {
      const disposeSpy = jest.spyOn(SeedSignerTron.prototype, 'dispose')

      expect(() => new WalletManagerTronGasfree(SEED_PHRASE, { ...CONFIG, provider: [] }))
        .toThrow("The 'provider' option cannot be set to an empty list.")
      expect(disposeSpy).toHaveBeenCalledTimes(1)

      disposeSpy.mockRestore()
    })

    test('should not dispose a default signer supplied by the caller if the provider is rejected', () => {
      const signer = new SeedSignerTron(SEED_PHRASE)

      expect(() => new WalletManagerTronGasfree(signer, { ...CONFIG, provider: [] }))
        .toThrow("The 'provider' option cannot be set to an empty list.")
      expect(signer.disposed).toBe(false)

      signer.dispose()
    })
  })

  describe('dispose', () => {
    test('should not wipe a seed supplied by the caller', async () => {
      const seed = Uint8Array.from(bip39.mnemonicToSeedSync(SEED_PHRASE))
      const copy = Uint8Array.from(seed)
      const seedWallet = new WalletManagerTronGasfree(seed, CONFIG)
      await seedWallet.getAccount(0)

      seedWallet.dispose()

      expect(seed).toEqual(copy)
    })

    test('should wipe the keys of the accounts it derived', async () => {
      const account = await wallet.getAccount(0)

      wallet.dispose()

      expect(account.keyPair.privateKey).toBeNull()
    })

    test('should dispose the default signer built from a seed', () => {
      const signer = wallet.getSigner()

      wallet.dispose()

      expect(signer.disposed).toBe(true)
    })

    test('should dispose the default signer built from a seed only once when disposed twice', () => {
      const disposeSpy = jest.spyOn(wallet.getSigner(), 'dispose')
      wallet.dispose()

      wallet.dispose()

      expect(disposeSpy).toHaveBeenCalledTimes(1)
    })

    test('should not dispose a default signer supplied by the caller', async () => {
      const signer = new SeedSignerTron(SEED_PHRASE)
      const signerWallet = new WalletManagerTronGasfree(signer, CONFIG)
      await signerWallet.getAccount(0)

      signerWallet.dispose()

      expect(signer.disposed).toBe(false)
    })

    test('should not dispose a named signer supplied by the caller', async () => {
      const signer = new PrivateKeySignerTron(PRIVATE_KEY)
      wallet.addSigner('hot', signer)
      await wallet.getAccount('hot')

      wallet.dispose()

      expect(signer.disposed).toBe(false)
    })

    test('should dispose the accounts and derived signers of a signer that does not expose its keys', async () => {
      const rootSigner = new SeedSignerTron(SEED_PHRASE)
      const deriveSpy = jest.spyOn(rootSigner, 'derive')
      const keylessWallet = new WalletManagerTronGasfree(new KeylessSignerTron(rootSigner), CONFIG)
      const account = await keylessWallet.getAccount(0)

      keylessWallet.dispose()

      const derivedSigner = await deriveSpy.mock.results[0].value
      expect(derivedSigner.disposed).toBe(true)
      expect(account.disposed).toBe(true)
      expect(rootSigner.disposed).toBe(false)

      rootSigner.dispose()
    })

    test('should throw on getAccount by index after dispose', async () => {
      wallet.dispose()

      await expect(wallet.getAccount(0))
        .rejects.toStrictEqual(new DisposalError('The wallet manager has been disposed.'))
    })

    test('should throw on getAccount by name after dispose', async () => {
      wallet.addSigner('hot', new PrivateKeySignerTron(PRIVATE_KEY))
      wallet.dispose()

      await expect(wallet.getAccount('hot'))
        .rejects.toStrictEqual(new DisposalError('The wallet manager has been disposed.'))
    })

    test('should throw on getAccountByPath after dispose', async () => {
      wallet.dispose()

      await expect(wallet.getAccountByPath("0'/0/0"))
        .rejects.toStrictEqual(new DisposalError('The wallet manager has been disposed.'))
    })
  })

  describe('signers', () => {
    test('should use a named derivable signer as is, without derivation', async () => {
      wallet.addSigner('second', new SeedSignerTron(SEED_PHRASE))

      const account = await wallet.getAccount('second')

      expect(await account.getAddress()).toBe(COIN_NODE_GASFREE_ADDRESS)
    })

    test('should return the account of a named non-derivable signer', async () => {
      wallet.addSigner('hot', new PrivateKeySignerTron(PRIVATE_KEY))

      const account = await wallet.getAccount('hot')

      expect(await account.getAddress()).toBe(ACCOUNT_0_GASFREE_ADDRESS)
    })

    test('should return the same account on repeated calls for a named signer', async () => {
      wallet.addSigner('hot', new PrivateKeySignerTron(PRIVATE_KEY))
      const account = await wallet.getAccount('hot')

      expect(await wallet.getAccount('hot')).toBe(account)
    })

    test('should derive accounts from a named derivable signer', async () => {
      wallet.addSigner('second', new SeedSignerTron(SECOND_SEED_PHRASE))

      const account = await wallet.getAccount(0, { signerName: 'second' })

      expect(await account.getAddress()).toBe(SECOND_SEED_ACCOUNT_0_GASFREE_ADDRESS)
    })

    test('should return the same account by index and by path for a named derivable signer', async () => {
      wallet.addSigner('second', new SeedSignerTron(SECOND_SEED_PHRASE))
      const account = await wallet.getAccount(0, { signerName: 'second' })

      expect(await wallet.getAccountByPath("0'/0/0", { signerName: 'second' })).toBe(account)
    })

    test('should throw on getAccount if the named signer does not support account derivation', async () => {
      wallet.addSigner('hot', new PrivateKeySignerTron(PRIVATE_KEY))

      await expect(wallet.getAccount(0, { signerName: 'hot' }))
        .rejects.toStrictEqual(UNSUPPORTED_DERIVATION_ERROR)
    })

    test('should throw on getAccountByPath if the named signer does not support account derivation', async () => {
      wallet.addSigner('hot', new PrivateKeySignerTron(PRIVATE_KEY))

      await expect(wallet.getAccountByPath("0'/0/0", { signerName: 'hot' }))
        .rejects.toStrictEqual(UNSUPPORTED_DERIVATION_ERROR)
    })

    test('should throw if the named signer has been disposed', async () => {
      const signer = new PrivateKeySignerTron(PRIVATE_KEY)
      wallet.addSigner('hot', signer)
      signer.dispose()

      await expect(wallet.getAccount('hot'))
        .rejects.toStrictEqual(new DisposalError('The given signer has been disposed.'))
    })

    test('should throw if no signer is registered with the given name', async () => {
      await expect(wallet.getAccount('missing'))
        .rejects.toThrow('No signer found with name "missing".')
    })

    test('should throw on getAccount by index if no signer is registered with the given name', async () => {
      await expect(wallet.getAccount(0, { signerName: 'missing' }))
        .rejects.toStrictEqual(new NoSuchElementError('No signer found with name "missing".'))
    })

    test('should throw on getAccountByPath if no signer is registered with the given name', async () => {
      await expect(wallet.getAccountByPath("0'/0/0", { signerName: 'missing' }))
        .rejects.toStrictEqual(new NoSuchElementError('No signer found with name "missing".'))
    })

    test('should throw on getAccountByPath if the named signer has been disposed', async () => {
      const signer = new SeedSignerTron(SECOND_SEED_PHRASE)
      wallet.addSigner('second', signer)
      signer.dispose()

      await expect(wallet.getAccountByPath("0'/0/0", { signerName: 'second' }))
        .rejects.toStrictEqual(new DisposalError('The signer has been disposed.'))
    })
  })

  describe('getAccount', () => {
    test('should return the account at index 0 by default', async () => {
      const account = await wallet.getAccount()

      expect(account.path).toBe("m/44'/195'/0'/0/0")
    })

    test('should return the account at the given index', async () => {
      const account = await wallet.getAccount(3)

      expect(account.path).toBe("m/44'/195'/0'/0/3")
    })

    test('should return the same account on repeated calls', async () => {
      const account = await wallet.getAccount(0)

      expect(await wallet.getAccount(0)).toBe(account)
    })

    test('should return the same account on concurrent calls', async () => {
      const [first, second] = await Promise.all([wallet.getAccount(0), wallet.getAccount(0)])

      expect(first).toBe(second)
    })

    test('should derive the expected gasfree address for index 0', async () => {
      const account = await wallet.getAccount(0)

      expect(await account.getAddress()).toBe(ACCOUNT_0_GASFREE_ADDRESS)
    })

    test.each([-1, 1.5, 2 ** 31])('should throw if the index is %d', async (index) => {
      await expect(wallet.getAccount(index))
        .rejects.toStrictEqual(new ValueError('The index must be an integer between 0 and 2^31 - 1.'))
    })

    test('should apply its transfer max fee to the accounts it returns', async () => {
      const cappedWallet = new WalletManagerTronGasfree(SEED_PHRASE, { ...CONFIG, transferMaxFee: 49_999 })
      const TOKEN = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'

      const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((url) => {
        const respond = (data) => Promise.resolve({ ok: true, json: () => Promise.resolve({ code: 200, data }) })

        if (url.includes('/api/v1/address/')) {
          return respond({ gasFreeAddress: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD', active: true, nonce: 0 })
        }

        if (url.includes('/api/v1/config/token/all')) {
          return respond({ tokens: [{ tokenAddress: TOKEN, transferFee: 50_000, activateFee: 100_000 }] })
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`))
      })

      const account = await cappedWallet.getAccount()

      await expect(account.transfer({ token: TOKEN, recipient: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD', amount: 100_000_000 }))
        .rejects.toStrictEqual(new MaximumFeeExceededError('The transfer operation exceeds the transfer max fee.'))
      expect(fetchMock.mock.calls.some(([url]) => url.includes('/api/v1/gasfree/submit'))).toBe(false)

      cappedWallet.dispose()
    })
  })

  describe('getAccountByPath', () => {
    test('should return the account with the given path', async () => {
      const account = await wallet.getAccountByPath("1'/2/3")

      expect(account.path).toBe("m/44'/195'/1'/2/3")
    })

    test('should throw if the path is invalid', async () => {
      await expect(wallet.getAccountByPath("a'/b/c"))
        .rejects.toStrictEqual(new ValueError('The derivation path is not a valid BIP-32 path.'))
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
        .rejects.toStrictEqual(new ProviderRequiredError('The wallet must be connected to tron web to get fee rates.'))

      disconnectedWallet.dispose()
    })
  })
})
