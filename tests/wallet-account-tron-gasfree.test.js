import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import * as bip39 from 'bip39'
import { HDKey } from '@scure/bip32'
import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { utils } from 'tronweb'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'

const ACCOUNT = {
  index: 0,
  path: "m/44'/195'/0'/0/0",
  address: 'TXngH8bVadn9ZWtKBgjKQcqN1GsZ7A1jcb',
  keyPair: {
    privateKey: '5d5645db7db2a3b86435e3ec9b3b2cc670fccef5b6d5705e310b8ac2d8d37633',
    publicKey: '03ebdf0c06e1523a5931e7593e3ac231f5a123b898eb6c02af61aa83b32f8603b0'
  }
}

const GASFREE_ADDRESS = 'TGasFreeTestAddress123456789ab'

const CONFIG = {
  chainId: 728126428,
  provider: 'https://tron.web.provider/',
  gasFreeProvider: 'https://gasfree.provider',
  gasFreeApiKey: 'test-api-key',
  gasFreeApiSecret: 'test-api-secret',
  serviceProvider: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
  verifyingContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
}

const GASFREE_ACCOUNT_RESPONSE = {
  code: 200,
  data: {
    gasFreeAddress: GASFREE_ADDRESS,
    active: true,
    nonce: 1
  }
}

jest.unstable_mockModule('@tetherto/wdk-wallet-tron', () => {
  class MockWalletAccountTron {
    constructor (seedOrPhrase, path, config) {
      let seed = seedOrPhrase
      if (typeof seed === 'string') {
        if (!bip39.validateMnemonic(seed)) {
          throw new Error('The seed phrase is invalid.')
        }
        seed = bip39.mnemonicToSeedSync(seed)
      }

      const fullPath = `m/44'/195'/${path}`
      let hdKey
      try {
        hdKey = HDKey.fromMasterSeed(seed).derive(fullPath)
      } catch (e) {
        throw new Error(e.message.toLowerCase())
      }

      this._path = fullPath
      this._index = parseInt(path.split('/').pop()) || 0
      this._keyPair = {
        privateKey: hdKey.privateKey,
        publicKey: hdKey.publicKey
      }

      this._address = ACCOUNT.address
    }

    get index () { return this._index }
    get path () { return this._path }
    get keyPair () { return this._keyPair }

    async getAddress () { return this._address }

    async sign (message) {
      const messageBytes = Buffer.from(message, 'utf8')
      const prefix = Buffer.from(`\x19TRON Signed Message:\n${messageBytes.length}`, 'utf8')
      const messageWithPrefixBytes = Buffer.concat([prefix, messageBytes])
      const hash = keccak_256(messageWithPrefixBytes)
      const signature = secp256k1.sign(hash, this._keyPair.privateKey)
      const signatureWithRecovery = new Uint8Array([...signature.toCompactRawBytes(), 27 + signature.recovery])
      const hex = Buffer.from(signatureWithRecovery).toString('hex')
      return '0x' + hex
    }

    dispose () {
      this._keyPair = { privateKey: new Uint8Array(32), publicKey: new Uint8Array(33) }
    }
  }

  class MockWalletAccountReadOnlyTron {
    constructor (address, config) {
      this._address = address
      this._config = config
    }

    async getBalance () { return 0n }
    async getTokenBalance () { return 0n }
    async verify () { return true }
    async getTransactionReceipt () { return null }
  }

  return {
    WalletAccountTron: MockWalletAccountTron,
    WalletAccountReadOnlyTron: MockWalletAccountReadOnlyTron,
    default: class {
      static _FEE_RATE_NORMAL_MULTIPLIER = 110n
      static _FEE_RATE_FAST_MULTIPLIER = 200n
    }
  }
})

jest.unstable_mockModule('tronweb', () => ({
  TronWeb: class {},
  utils,
  default: class {}
}))

const { WalletAccountTronGasfree, WalletAccountReadOnlyTronGasfree } = await import('../index.js')

function mockFetchResponse (data) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data)
  })
}

describe('WalletAccountTronGasfree', () => {
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

    account = new WalletAccountTronGasfree(SEED_PHRASE, "0'/0/0", CONFIG)
  })

  afterEach(() => {
    account.dispose()
  })

  describe('constructor', () => {
    test('should successfully initialize an account for the given seed phrase and path', () => {
      expect(account.index).toBe(ACCOUNT.index)
      expect(account.path).toBe(ACCOUNT.path)
      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.publicKey, 'hex'))
      })
    })

    test('should throw if the seed phrase is invalid', () => {
      expect(() => { new WalletAccountTronGasfree('invalid seed phrase', "0'/0/0", CONFIG) })
        .toThrow('The seed phrase is invalid.')
    })

    test('should throw if the path is invalid', () => {
      expect(() => { new WalletAccountTronGasfree(SEED_PHRASE, "a'/b/c", CONFIG) })
        .toThrow('invalid child index')
    })
  })

  describe('getAddress', () => {
    test('should return the gasfree address from the provider', async () => {
      const address = await account.getAddress()

      expect(address).toBe(GASFREE_ADDRESS)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/v1/address/${ACCOUNT.address}`),
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

    test('should cache the gasfree account after the first fetch', async () => {
      await account.getAddress()
      await account.getAddress()

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('sign', () => {
    const MESSAGE = 'Dummy message to sign.'
    const EXPECTED_SIGNATURE = '0x67b1e4bb9a9b070cd60776ceab1ff4d7c4d4997bb5b4a71757da646f75d847e6600c22d8d83caa13d42c33099f75ba5ec30390467392aa78a3e5319da6c30e291b'

    test('should return the correct signature', async () => {
      const signature = await account.sign(MESSAGE)
      expect(signature).toBe(EXPECTED_SIGNATURE)
    })
  })

  describe('sendTransaction', () => {
    test('should throw as not supported on tron gasfree', async () => {
      await expect(account.sendTransaction({ to: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD', value: 1000 }))
        .rejects.toThrow("Method 'sendTransaction(tx)' not supported on tron gasfree.")
    })
  })

  describe('transfer', () => {
    const TRANSFER = {
      token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      recipient: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD',
      amount: 100_000_000
    }

    const TOKEN_CONFIG_RESPONSE = {
      code: 200,
      data: {
        tokens: [{
          tokenAddress: TRANSFER.token,
          transferFee: 50000,
          activateFee: 100000
        }]
      }
    }

    const DUMMY_SUBMIT_RESPONSE = {
      code: 200,
      data: {
        id: 'gasfree-tx-id-abc123',
        estimatedTransferFee: 50000,
        estimatedActivateFee: 0
      }
    }

    function mockTransferFetch (overrides = {}) {
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/v1/address/')) {
          return mockFetchResponse(GASFREE_ACCOUNT_RESPONSE)
        }

        if (url.includes('/api/v1/config/token/all')) {
          return mockFetchResponse(overrides.tokenConfig || TOKEN_CONFIG_RESPONSE)
        }

        if (url.includes('/api/v1/gasfree/submit')) {
          return mockFetchResponse(overrides.submit || DUMMY_SUBMIT_RESPONSE)
        }

        return Promise.reject(new Error(`Unexpected fetch URL: ${url}`))
      })
    }

    test('should successfully transfer tokens via gasfree', async () => {
      mockTransferFetch()

      const { hash, fee } = await account.transfer(TRANSFER)

      expect(hash).toBe('gasfree-tx-id-abc123')
      expect(fee).toBe(50_000n)

      const submitCall = fetchMock.mock.calls.find(([url]) => url.includes('/api/v1/gasfree/submit'))
      const submitBody = JSON.parse(submitCall[1].body)

      expect(submitCall[1].method).toBe('POST')
      expect(submitBody).toEqual(expect.objectContaining({
        token: TRANSFER.token,
        serviceProvider: CONFIG.serviceProvider,
        user: ACCOUNT.address,
        receiver: TRANSFER.recipient,
        value: TRANSFER.amount.toString(),
        nonce: GASFREE_ACCOUNT_RESPONSE.data.nonce
      }))
    })

    test('should throw if the transfer fee exceeds the transfer max fee configuration', async () => {
      mockTransferFetch()

      await expect(account.transfer(TRANSFER, { transferMaxFee: 0 }))
        .rejects.toThrow('The transfer operation exceeds the transfer max fee.')
    })

    test('should throw if the gasfree provider rejects the submission', async () => {
      mockTransferFetch({
        submit: { code: 400, reason: 'Insufficient balance' }
      })

      await expect(account.transfer(TRANSFER))
        .rejects.toThrow('Insufficient balance')
    })
  })

  describe('toReadOnlyAccount', () => {
    test('should return a read-only copy of the account', async () => {
      const readOnlyAccount = await account.toReadOnlyAccount()

      expect(readOnlyAccount).toBeInstanceOf(WalletAccountReadOnlyTronGasfree)
    })
  })

  describe('dispose', () => {
    test('should dispose the account without errors', () => {
      expect(() => account.dispose()).not.toThrow()
    })
  })
})
