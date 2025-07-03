import { keccak_256 as keccak256 } from '@noble/hashes/sha3'
import { secp256k1 } from '@noble/curves/secp256k1'
import { AbiCoder } from 'ethers'

export class SecureTronSigner {
  constructor (privateKeyBuffer, tronWeb) {
    this.privateKey = privateKeyBuffer
    this.tronWeb = tronWeb
  }

  /**
   * Encodes the struct type definition into its canonical string representation.
   * @param types The full type map.
   * @param primaryType The name of the primary struct type.
   * @returns The canonical type string.
   */
  _encodeType (types, primaryType) {
    let deps = []
    const findDependencies = (type) => {
      if (!types[type] || deps.includes(type)) {
        return
      }
      deps.push(type)
      for (const field of types[type]) {
        findDependencies(field.type.replace(/\[\]$/, ''))
      }
    }

    findDependencies(primaryType)
    deps = deps.filter(d => d !== primaryType)
    deps.sort()

    const allTypes = [primaryType, ...deps]
    let result = ''
    for (const type of allTypes) {
      result += `${type}(${types[type].map(field => `${field.type} ${field.name}`).join(',')})`
    }
    return result
  }

  /**
   * Hashes a struct type definition.
   * @param types The full type map.
   * @param primaryType The name of the primary struct type.
   * @returns A Buffer containing the 32-byte typeHash.
   */
  _hashType (types, primaryType) {
    const encodedType = this._encodeType(types, primaryType)
    return keccak256(encodedType)
  }

  /**
   * Encodes the data of a struct instance according to TIP-712 rules.
   * @param types The full type map.
   * @param primaryType The name of the primary struct type.
   * @param data The data object for the struct instance.
   * @returns A Buffer containing the encoded data.
   */
  _encodeData (types, primaryType, data) {
    const abiCoder = new AbiCoder()
    const typeFields = types[primaryType]

    const encodedTypes = []
    const encodedValues = []

    for (const field of typeFields) {
      const value = data[field.name]
      if (value === undefined || value === null) {
        throw new Error(`Missing value for field ${field.name}`)
      }

      if (types[field.type]) {
        encodedTypes.push('bytes32')
        encodedValues.push(this._hashStruct(types, field.type, value))
      } else if (field.type.endsWith('[]')) {
        encodedTypes.push('bytes32')
        const hashedArray = keccak256(Buffer.concat(
          value.map((item) => this._encodeData(types, field.type.slice(0, -2), item))
        ))
        encodedValues.push(hashedArray)
      } else if (field.type === 'string' || field.type === 'bytes') {
        encodedTypes.push('bytes32')
        encodedValues.push(keccak256(Buffer.from(value, field.type === 'bytes' ? 'hex' : 'utf8')))
      } else if (field.type === 'address') {
        const hexAddress = this.tronWeb.address.toHex(value)
        if (!hexAddress.startsWith('41')) {
          throw new Error(`Invalid TRON address format for ${value}`)
        }
        encodedTypes.push('address')
        encodedValues.push('0x' + hexAddress.substring(2))
      } else if (field.type === 'trcToken') {
        encodedTypes.push('uint256')
        encodedValues.push(value)
      } else {
        encodedTypes.push(field.type)
        encodedValues.push(value)
      }
    }

    return Buffer.from(abiCoder.encode(encodedTypes, encodedValues).slice(2), 'hex')
  }

  /**
   * Hashes a struct instance.
   * @param types The full type map.
   * @param primaryType The name of the primary struct type.
   * @param data The data object for the struct instance.
   * @returns A Buffer containing the 32-byte struct hash.
   */
  _hashStruct (types, primaryType, data) {
    const typeHash = this._hashType(types, primaryType)
    const encodedData = this._encodeData(types, primaryType, data)
    return keccak256(Buffer.concat([typeHash, encodedData]))
  }

  /**
   * Signs a TIP-712 typed data message.
   * @param domain The domain separator data.
   * @param types The type definitions.
   * @param value The message data object.
   * @returns The 65-byte signature as a hex string (r, s, v).
   */
  async signTypedData (domain, types, primaryType, value) {
    const allTypes = { ...types }
    if (!allTypes.EIP712Domain) {
      allTypes.EIP712Domain = [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' }
      ].filter(field => domain[field.name] !== undefined)
    }

    const domainSeparator = this._hashStruct(allTypes, 'EIP712Domain', domain)
    const structHash = this._hashStruct(allTypes, primaryType, value)
    const digest = keccak256(Buffer.concat([
      Buffer.from('\x19\x01'),
      domainSeparator,
      structHash
    ]))

    const signature = await secp256k1.sign(digest, this.privateKey)
    const r = signature.r.toString(16).padStart(64, '0')
    const s = signature.s.toString(16).padStart(64, '0')

    // 3. The recovery bit is in `signature.recovery`. Add 27 to get the 'v' value.
    const v = (signature.recovery + 27).toString(16).padStart(2, '0')

    return `0x${r}${s}${v}`
  }
}
