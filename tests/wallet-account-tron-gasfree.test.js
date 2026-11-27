import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'
import * as bip39 from 'bip39'
import { TronWeb, utils, Trx } from 'tronweb'

const SEED_PHRASE = 'cook voyage document eight skate token alien guide drink uncle term abuse'
const SEED = bip39.mnemonicToSeedSync(SEED_PHRASE)

const ACCOUNT = {
  path: "m/44'/195'/0'/0/0",
  address: 'TXngH8bVadn9ZWtKBgjKQcqN1GsZ7A1jcb',
  keyPair: {
    privateKey: '5d5645db7db2a3b86435e3ec9b3b2cc670fccef5b6d5705e310b8ac2d8d37633',
    publicKey: '03ebdf0c06e1523a5931e7593e3ac231f5a123b898eb6c02af61aa83b32f8603b0'
  }
}

const GASFREE_ADDRESS = 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD'

const MESSAGE = 'Dummy message to sign.'

const EXPECTED_SIGNATURE = '0x67b1e4bb9a9b070cd60776ceab1ff4d7c4d4997bb5b4a71757da646f75d847e6600c22d8d83caa13d42c33099f75ba5ec30390467392aa78a3e5319da6c30e291b'

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

jest.unstable_mockModule('tronweb', () => {
  const TronWebMock = jest.fn().mockImplementation((options) => {
    const provider = new TronWeb(options)

    provider.trx = {}
    provider.transactionBuilder = {}

    return provider
  })

  Object.defineProperties(TronWebMock, Object.getOwnPropertyDescriptors(TronWeb))

  return {
    TronWeb: TronWebMock,
    utils,
    Trx
  }
})

const { WalletAccountTronGasfree, DisposalError, MaximumFeeExceededError, UnsupportedOperationError, ValueError } = await import('../index.js')
const { SeedSignerTron, PrivateKeySignerTron } = await import('../src/signers/index.js')

const EXPECTED_TRANSFER_SIGNATURE = '1b232c9d7f980fd556727b86901741eea50b33a58f97146f46e3eacafb944531087063e112913d867e04323e6add398b00675c972b80aa54d55a1a9694e6d8931b'

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

function mockFetchResponse (data) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data)
  })
}

const FIXED_TIMESTAMP = 1_700_000_000

const AUTHORIZATIONS = {
  [`GET /api/v1/address/${ACCOUNT.address}`]: 'ApiKey test-api-key:5wlZcP3xHCPi1r2MhHXESwSxNrihRLfs6/NXL2ocfs4=',
  'GET /api/v1/config/token/all': 'ApiKey test-api-key:aS0hiU1rixzHoRrBt1NaZGMTu3bAh5NgMMVD+fFS02I=',
  'POST /api/v1/gasfree/submit': 'ApiKey test-api-key:Jm9DxkuG/t3mo3cp10aAfblRN0qYalCdN+O+6jfqP2I='
}

function request (method, path, body) {
  return [CONFIG.gasFreeProvider + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Timestamp: `${FIXED_TIMESTAMP}`,
      Authorization: AUTHORIZATIONS[`${method} ${path}`]
    },
    body: body ? JSON.stringify(body) : null
  }]
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

    jest.spyOn(Date, 'now').mockReturnValue(FIXED_TIMESTAMP * 1_000)

    account = new WalletAccountTronGasfree(SEED_PHRASE, "0'/0/0", CONFIG)
  })

  afterEach(() => {
    account.dispose()

    jest.restoreAllMocks()
  })

  function expectRequests (...requests) {
    expect(fetchMock).toHaveBeenCalledTimes(requests.length)

    requests.forEach((args, index) => {
      expect(fetchMock).toHaveBeenNthCalledWith(index + 1, ...args)
    })
  }

  describe('constructor', () => {
    test('should successfully initialize an account for the given seed phrase and path', () => {
      expect(account.path).toBe(ACCOUNT.path)
      expect(account.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.publicKey, 'hex'))
      })
    })

    test('should successfully initialize an account for the given seed and path', () => {
      const accountFromSeed = new WalletAccountTronGasfree(SEED, "0'/0/0", CONFIG)

      expect(accountFromSeed.path).toBe(ACCOUNT.path)
      expect(accountFromSeed.keyPair).toEqual({
        privateKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.privateKey, 'hex')),
        publicKey: new Uint8Array(Buffer.from(ACCOUNT.keyPair.publicKey, 'hex'))
      })

      accountFromSeed.dispose()
    })

    test('should default to the first account if only a seed and a config are given', () => {
      const firstAccount = new WalletAccountTronGasfree(SEED_PHRASE, CONFIG)

      expect(firstAccount.path).toBe(ACCOUNT.path)

      firstAccount.dispose()
    })

    test('should successfully initialize an account for the given signer', async () => {
      const signer = new SeedSignerTron(SEED_PHRASE, ACCOUNT.path)
      const signerAccount = new WalletAccountTronGasfree(signer, CONFIG)

      expect(signerAccount.path).toBe(ACCOUNT.path)
      expect(await signerAccount.sign(MESSAGE)).toBe(EXPECTED_SIGNATURE)

      signer.dispose()
    })

    test('should throw if the seed phrase is invalid', () => {
      expect(() => { new WalletAccountTronGasfree('invalid seed phrase', "0'/0/0", CONFIG) })
        .toThrow(expect.objectContaining({ constructor: ValueError, message: 'The seed phrase is invalid.' }))
    })

    test('should throw if the path is invalid', () => {
      expect(() => { new WalletAccountTronGasfree(SEED_PHRASE, "a'/b/c", CONFIG) })
        .toThrow(expect.objectContaining({ constructor: ValueError, message: 'The derivation path is not a valid BIP-32 path.' }))
    })

    test('should dispose the seed signer it built if the configuration is rejected', () => {
      const disposeSpy = jest.spyOn(SeedSignerTron.prototype, 'dispose')

      expect(() => { new WalletAccountTronGasfree(SEED_PHRASE, "0'/0/0", { ...CONFIG, gasFreeApiSecret: undefined }) })
        .toThrow(expect.objectContaining({ constructor: ValueError, message: "The 'gasFreeApiKey' and the 'gasFreeApiSecret' options must be provided together." }))
      expect(disposeSpy).toHaveBeenCalledTimes(1)

      disposeSpy.mockRestore()
    })
  })

  describe('fromPrivateKey', () => {
    test('should throw if the private key is invalid', () => {
      expect(() => WalletAccountTronGasfree.fromPrivateKey('zz', CONFIG))
        .toThrow(expect.objectContaining({ constructor: ValueError, message: 'The private key must be a valid 32-byte secp256k1 key (hex or bytes).' }))
    })

    test('should create an account backed by the given private key', async () => {
      const keyAccount = WalletAccountTronGasfree.fromPrivateKey(ACCOUNT.keyPair.privateKey, CONFIG)

      expect(keyAccount.path).toBeNull()
      expect(await keyAccount.sign(MESSAGE)).toBe(EXPECTED_SIGNATURE)

      keyAccount.dispose()
    })

    test('should wipe the signer it created on dispose', () => {
      const keyAccount = WalletAccountTronGasfree.fromPrivateKey(ACCOUNT.keyPair.privateKey, CONFIG)

      keyAccount.dispose()

      expect(keyAccount.keyPair.privateKey).toBeNull()
    })

    test('should dispose the signer it created if the configuration is rejected', () => {
      const disposeSpy = jest.spyOn(PrivateKeySignerTron.prototype, 'dispose')

      expect(() => WalletAccountTronGasfree.fromPrivateKey(ACCOUNT.keyPair.privateKey, { ...CONFIG, gasFreeApiSecret: undefined }))
        .toThrow(expect.objectContaining({ constructor: ValueError, message: "The 'gasFreeApiKey' and the 'gasFreeApiSecret' options must be provided together." }))
      expect(disposeSpy).toHaveBeenCalledTimes(1)

      disposeSpy.mockRestore()
    })
  })

  describe('dispose', () => {
    test('should mark the account as disposed', () => {
      account.dispose()

      expect(account.disposed).toBe(true)
    })

    test('should wipe the signer it built from a seed', () => {
      account.dispose()

      expect(account.keyPair.privateKey).toBeNull()
    })

    test('should not wipe a signer supplied by the caller', () => {
      const signer = new SeedSignerTron(SEED_PHRASE, ACCOUNT.path)
      const signerAccount = new WalletAccountTronGasfree(signer, CONFIG)

      signerAccount.dispose()

      expect(signer.disposed).toBe(false)

      signer.dispose()
    })

    test('should wipe a supplied signer if the account is told to own it', () => {
      const signer = new SeedSignerTron(SEED_PHRASE, ACCOUNT.path)
      const signerAccount = new WalletAccountTronGasfree(signer, { ...CONFIG, shouldWipeSignerOnDisposal: true })

      signerAccount.dispose()

      expect(signer.disposed).toBe(true)
    })

    test('should dispose an owned signer only once when disposed twice', () => {
      const signer = new SeedSignerTron(SEED_PHRASE, ACCOUNT.path)
      const signerAccount = new WalletAccountTronGasfree(signer, { ...CONFIG, shouldWipeSignerOnDisposal: true })
      const disposeSpy = jest.spyOn(signer, 'dispose')
      signerAccount.dispose()

      signerAccount.dispose()

      expect(disposeSpy).toHaveBeenCalledTimes(1)
    })

    test('should throw on sign after dispose', async () => {
      account.dispose()

      await expect(account.sign(MESSAGE))
        .rejects.toStrictEqual(new DisposalError('The wallet account has been disposed.'))
    })
  })

  describe('sign', () => {
    test('should return the correct signature', async () => {
      const signature = await account.sign(MESSAGE)
      expect(signature).toBe(EXPECTED_SIGNATURE)
    })

    test('should throw if a signer supplied by the caller has been disposed', async () => {
      const signer = new PrivateKeySignerTron(ACCOUNT.keyPair.privateKey)
      const signerAccount = new WalletAccountTronGasfree(signer, CONFIG)
      signer.dispose()

      await expect(signerAccount.sign(MESSAGE))
        .rejects.toStrictEqual(new DisposalError('The signer has been disposed.'))
    })
  })

  describe('signTransaction', () => {
    test('should throw as not supported on tron gasfree', async () => {
      await expect(account.signTransaction({ to: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD', value: 1000 }))
        .rejects.toStrictEqual(new UnsupportedOperationError('signTransaction(tx)'))
    })
  })

  describe('sendTransaction', () => {
    test('should throw as not supported on tron gasfree', async () => {
      await expect(account.sendTransaction({ to: 'TAibbFBAkcNioexXTFWKbp65mgLp7JiqHD', value: 1000 }))
        .rejects.toStrictEqual(new UnsupportedOperationError('sendTransaction(tx)'))
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

    const EXPECTED_SUBMIT_BODY = {
      token: TRANSFER.token,
      serviceProvider: CONFIG.serviceProvider,
      user: ACCOUNT.address,
      receiver: TRANSFER.recipient,
      value: '100000000',
      maxFee: '50000',
      deadline: FIXED_TIMESTAMP + 300,
      version: 1,
      nonce: 1,
      sig: EXPECTED_TRANSFER_SIGNATURE
    }

    test('should successfully transfer tokens via gasfree', async () => {
      mockTransferFetch()

      const { hash, fee, activationFee } = await account.transfer(TRANSFER)

      expect(hash).toBe('gasfree-tx-id-abc123')
      expect(fee).toBe(50_000n)
      expect(activationFee).toBe(0n)
      expectRequests(request('GET', `/api/v1/address/${ACCOUNT.address}`), request('GET', '/api/v1/config/token/all'), request('POST', '/api/v1/gasfree/submit', EXPECTED_SUBMIT_BODY))
    })

    test('should sign the transfer with a signer supplied by the caller', async () => {
      const signer = new PrivateKeySignerTron(ACCOUNT.keyPair.privateKey)
      const signerAccount = new WalletAccountTronGasfree(signer, CONFIG)
      mockTransferFetch()

      await signerAccount.transfer(TRANSFER)

      expectRequests(request('GET', `/api/v1/address/${ACCOUNT.address}`), request('GET', '/api/v1/config/token/all'), request('POST', '/api/v1/gasfree/submit', EXPECTED_SUBMIT_BODY))

      signer.dispose()
    })

    test('should throw if the account has been disposed', async () => {
      account.dispose()

      await expect(account.transfer(TRANSFER))
        .rejects.toStrictEqual(new DisposalError('The wallet account has been disposed.'))
    })

    test('should throw if a signer supplied by the caller has been disposed', async () => {
      const signer = new PrivateKeySignerTron(ACCOUNT.keyPair.privateKey)
      const signerAccount = new WalletAccountTronGasfree(signer, CONFIG)
      signer.dispose()
      mockTransferFetch()

      await expect(signerAccount.transfer(TRANSFER))
        .rejects.toStrictEqual(new DisposalError('The signer has been disposed.'))
      expect(fetchMock).not.toHaveBeenCalled()
    })

    test('should throw if the signer is wiped while the transfer awaits the gasfree provider', async () => {
      mockTransferFetch()
      const respond = fetchMock.getMockImplementation()
      fetchMock.mockImplementation((url) => {
        if (url.includes('/api/v1/config/token/all')) {
          account.dispose()
        }

        return respond(url)
      })

      await expect(account.transfer(TRANSFER))
        .rejects.toStrictEqual(new DisposalError('The signer has been disposed.'))
      expectRequests(request('GET', `/api/v1/address/${ACCOUNT.address}`), request('GET', '/api/v1/config/token/all'))
    })

    test('should throw if the signer does not expose its private key', async () => {
      const signer = new PrivateKeySignerTron(ACCOUNT.keyPair.privateKey)
      const keylessAccount = new WalletAccountTronGasfree(new KeylessSignerTron(signer), CONFIG)
      mockTransferFetch()

      await expect(keylessAccount.transfer(TRANSFER))
        .rejects.toStrictEqual(new UnsupportedOperationError('transfer(options, config)'))
      expect(fetchMock).not.toHaveBeenCalled()

      signer.dispose()
    })

    test('should throw if the transfer fee exceeds the transfer max fee configuration', async () => {
      mockTransferFetch()

      await expect(account.transfer(TRANSFER, { transferMaxFee: 0 }))
        .rejects.toStrictEqual(new MaximumFeeExceededError('The transfer operation exceeds the transfer max fee.'))
      expectRequests(request('GET', `/api/v1/address/${ACCOUNT.address}`), request('GET', '/api/v1/config/token/all'))
    })

    test('should throw if the transfer fee exceeds the transfer max fee of the wallet configuration', async () => {
      const cappedAccount = new WalletAccountTronGasfree(SEED_PHRASE, "0'/0/0", { ...CONFIG, transferMaxFee: 49_999 })

      mockTransferFetch()

      await expect(cappedAccount.transfer(TRANSFER))
        .rejects.toStrictEqual(new MaximumFeeExceededError('The transfer operation exceeds the transfer max fee.'))
      expectRequests(request('GET', `/api/v1/address/${ACCOUNT.address}`), request('GET', '/api/v1/config/token/all'))

      cappedAccount.dispose()
    })

    test('should let the transfer max fee of a call override the wallet configuration', async () => {
      const cappedAccount = new WalletAccountTronGasfree(SEED_PHRASE, "0'/0/0", { ...CONFIG, transferMaxFee: 49_999 })

      mockTransferFetch()

      const { hash, fee } = await cappedAccount.transfer(TRANSFER, { transferMaxFee: 50_000 })

      expect(hash).toBe('gasfree-tx-id-abc123')
      expect(fee).toBe(50_000n)
      expectRequests(request('GET', `/api/v1/address/${ACCOUNT.address}`), request('GET', '/api/v1/config/token/all'), request('POST', '/api/v1/gasfree/submit', EXPECTED_SUBMIT_BODY))

      cappedAccount.dispose()
    })

    test('should keep the transfer max fee of the wallet configuration when a call leaves it undefined', async () => {
      const cappedAccount = new WalletAccountTronGasfree(SEED_PHRASE, "0'/0/0", { ...CONFIG, transferMaxFee: 49_999 })

      mockTransferFetch()

      await expect(cappedAccount.transfer(TRANSFER, { transferMaxFee: undefined }))
        .rejects.toStrictEqual(new MaximumFeeExceededError('The transfer operation exceeds the transfer max fee.'))
      expectRequests(request('GET', `/api/v1/address/${ACCOUNT.address}`), request('GET', '/api/v1/config/token/all'))

      cappedAccount.dispose()
    })

    test('should throw if the gasfree provider rejects the submission', async () => {
      mockTransferFetch({
        submit: { code: 400, reason: 'Insufficient balance' }
      })

      await expect(account.transfer(TRANSFER))
        .rejects.toThrow('Insufficient balance')
      expectRequests(request('GET', `/api/v1/address/${ACCOUNT.address}`), request('GET', '/api/v1/config/token/all'), request('POST', '/api/v1/gasfree/submit', EXPECTED_SUBMIT_BODY))
    })
  })

  describe('toReadOnlyAccount', () => {
    test('should return a read-only copy of the account', async () => {
      const readOnlyAccount = await account.toReadOnlyAccount()

      expect(await readOnlyAccount.getAddress()).toBe(GASFREE_ADDRESS)
      expectRequests(request('GET', `/api/v1/address/${ACCOUNT.address}`))
    })
  })
})
