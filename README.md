# @wdk/wallet-tron-gasfree

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.

A simple and secure package to manage BIP-44 wallets for the Tron blockchain with **gas-free TRC20 token transfers**. This package provides a clean API for creating, managing, and interacting with Tron wallets using BIP-39 seed phrases and Tron-specific derivation paths, with support for gas-free operations via a service provider.

## 🔍 About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://wallet.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control.

For detailed documentation about the complete WDK ecosystem, visit [docs.wallet.tether.io](https://docs.wallet.tether.io).

## 🌟 Features

- **Gas-Free Transactions**: Support for gas-free transactions using TRC20 tokens
- **Tron Derivation Paths**: Support for BIP-44 standard derivation paths for Tron
- **Multi-Account Management**: Create and manage multiple accounts from a single seed phrase
- **TRC20 Support**: Query native TRX and TRC20 token balances using smart contract interactions
- **Message Signing**: Sign and verify messages using Tron cryptography

## ⬇️ Installation

To install the `@wdk/wallet-tron-gasfree` package, follow these instructions:

You can install it using npm:

```bash
npm install @wdk/wallet-tron-gasfree
```

## 🚀 Quick Start

### Importing from `@wdk/wallet-tron-gasfree`

### Creating a New Gas-Free Wallet

```javascript
import WalletManagerTronGasfree, { 
  WalletAccountTronGasfree, 
  WalletAccountReadOnlyTronGasfree 
} from '@wdk/wallet-tron-gasfree'

// Use a BIP-39 seed phrase (replace with your own secure phrase)
const seedPhrase = 'test only example nut use this real life secret phrase must random'

// Create wallet manager with required configuration
const wallet = new WalletManagerTronGasfree(seedPhrase, {
  // Tron network configuration
  chainId: '728126428', // Tron chain ID
  provider: 'https://api.trongrid.io', // or any other Tron RPC provider
  // Gas-free service configuration
  gasFreeProvider: 'https://gasfree.provider.url', // Gas-free provider's URL
  gasFreeApiKey: 'your-gasfree-api-key', // Gas-free provider's API key
  gasFreeApiSecret: 'your-gasfree-api-secret', // Gas-free provider's API secret
  serviceProvider: 'T...', // Service provider's address
  verifyingContract: 'T...', // Verifying contract's address
  
  // Optional configuration
  transferMaxFee: 10000000n // Maximum fee in sun (optional)
})

// Get a full access account
const account = await wallet.getAccount(0)

// Convert to a read-only account
const readOnlyAccount = await account.toReadOnlyAccount()
```

### Managing Multiple Accounts

```javascript
import WalletManagerTronGasfree from '@wdk/wallet-tron-gasfree'

// Assume wallet is already created
// Get the first account (index 0)
const account = await wallet.getAccount(0)
const address = await account.getAddress()
console.log('Account 0 address:', address)

// Get the second account (index 1)
const account1 = await wallet.getAccount(1)
const address1 = await account1.getAddress()
console.log('Account 1 address:', address1)

// Get account by custom derivation path
// Full path will be m/44'/195'/0'/0/5
const customAccount = await wallet.getAccountByPath("0'/0/5")
const customAddress = await customAccount.getAddress()
console.log('Custom account address:', customAddress)

// Note: All addresses are Tron addresses (T...)
// All accounts inherit the provider configuration from the wallet manager
```

### Checking Balances

#### Owned Account

For accounts where you have the seed phrase and full access:

```javascript
import WalletManagerTronGasfree from '@wdk/wallet-tron-gasfree'

// Assume wallet and account are already created
// Get native TRX balance (in sun)
const balance = await account.getBalance()
console.log('Native TRX balance:', balance, 'sun') // 1 TRX = 1000000 sun

// Get TRC20 token balance
const tokenContract = 'T...'; // TRC20 contract address
const tokenBalance = await account.getTokenBalance(tokenContract);
console.log('TRC20 token balance:', tokenBalance);

// Note: Provider is required for balance checks
// Make sure wallet was created with a provider configuration
```

#### Read-Only Account

For addresses where you don't have the seed phrase:

```javascript
import { WalletAccountReadOnlyTronGasfree } from '@wdk/wallet-tron-gasfree'

// Create a read-only account
const readOnlyAccount = new WalletAccountReadOnlyTronGasfree('T...', { // Tron address
  chainId: '728126428',
  provider: 'https://api.trongrid.io', // Required for balance checks
  gasFreeProvider: 'https://gasfree.provider.url',
  gasFreeApiKey: 'your-gasfree-api-key',
  gasFreeApiSecret: 'your-gasfree-api-secret',
  serviceProvider: 'T...'
})

// Check native TRX balance
const balance = await readOnlyAccount.getBalance()
console.log('Native TRX balance:', balance, 'sun')

// Check TRC20 token balance using contract
const tokenBalance = await readOnlyAccount.getTokenBalance('T...') // TRC20 contract address
console.log('TRC20 token balance:', tokenBalance)

// Note: TRC20 balance checks use the standard balanceOf(address) function
// Make sure the contract address is correct and implements the TRC20 standard
```

### Sending Transactions

⚠️ **Important Note**: Direct transaction sending using `sendTransaction()` is not supported in `WalletAccountTronGasfree`. This is a gas-free implementation that handles transactions through a gas-free provider instead of direct blockchain transactions.

For sending tokens, please use the `transfer()` method instead.

### Token Transfers (Gas-Free)

Transfer TRC20 tokens and estimate fees using `WalletAccountTronGasfree`. Uses gas-free operations via service provider.

```javascript
// Transfer TRC20 tokens using gas-free transactions
const transferResult = await account.transfer({
  token: 'T...',      // TRC20 contract address
  recipient: 'T...',  // Recipient's Tron address
  amount: 1000000n     // Amount in TRC20's base units (use BigInt for large numbers)
}, {
  transferMaxFee: 1000000n // Optional: Maximum fee allowed for the transfer
});
console.log('Transfer hash:', transferResult.hash);
console.log('Transfer fee:', transferResult.fee, 'sun');

// Quote token transfer fee
const transferQuote = await account.quoteTransfer({
  token: 'T...',      // TRC20 contract address
  recipient: 'T...',  // Recipient's Tron address
  amount: 1000000n     // Amount in TRC20's base units
})
console.log('Transfer fee estimate:', transferQuote.fee, 'sun') // Includes both transfer and activation fees if needed

// Note: Gas fees are handled by the gas-free service provider
// Ensure proper gas-free service configuration before transfers
```

### Message Signing and Verification

Sign and verify messages using `WalletAccountTronGasfree`.

```javascript
// Sign a message
const message = 'Hello, Tron!'
const signature = await account.sign(message)
console.log('Signature:', signature)

// Verify a signature
const isValid = await account.verify(message, signature)
console.log('Signature valid:', isValid)
```

### Fee Management

Retrieve current fee rates using `WalletManagerTronGasfree`.

```javascript
// Get current fee rates
const feeRates = await wallet.getFeeRates();
console.log('Normal fee rate:', feeRates.normal, 'sun');
console.log('Fast fee rate:', feeRates.fast, 'sun');
```

### Memory Management

Clear sensitive data from memory using `dispose` methods in `WalletAccountTronGasfree` and `WalletManagerTronGasfree`.

```javascript
// Dispose wallet accounts to clear private keys from memory
account.dispose()

// Dispose entire wallet manager
wallet.dispose()
```

## 📚 API Reference

### Table of Contents

| Class | Description | Methods |
|-------|-------------|---------|
| [WalletManagerTronGasfree](#walletmanagertrongasfree) | Main class for managing Tron wallets with gas-free features. Extends `WalletManager` from `@wdk/wallet`. | [Constructor](#constructor), [Methods](#methods) |
| [WalletAccountTronGasfree](#walletaccounttrongasfree) | Individual Tron wallet account implementation with gas-free features. Extends `WalletAccountReadOnlyTronGasfree` and implements `IWalletAccount` from `@wdk/wallet`. | [Constructor](#constructor-1), [Methods](#methods-1), [Properties](#properties) |
| [WalletAccountReadOnlyTronGasfree](#walletaccountreadonlytrongasfree) | Read-only Tron wallet account with gas-free features. Extends `WalletAccountReadOnly` from `@wdk/wallet`. | [Constructor](#constructor-2), [Methods](#methods-2) |

### WalletManagerTronGasfree

The main class for managing Tron wallets with gas-free features.  
Extends `WalletManager` from `@wdk/wallet`.

#### Constructor

```javascript
new WalletManagerTronGasfree(seed, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `config` (object, optional): Configuration object
  - `chainId` (string): The blockchain's id
  - `provider` (string | TronWeb): Tron RPC endpoint URL or TronWeb instance (e.g., 'https://api.trongrid.io')
  - `gasFreeProvider` (string): The gasfree provider's url
  - `gasFreeApiKey` (string): The gasfree provider's api key
  - `gasFreeApiSecret` (string): The gasfree provider's api secret
  - `serviceProvider` (string): The address of the service provider
  - `verifyingContract` (string): The address of the verifying contract
  - `transferMaxFee` (number | bigint, optional): Maximum fee amount for transfer operations (in sun)

**Example:**
```javascript
const wallet = new WalletManagerTronGasfree(seedPhrase, {
  chainId: '728126428',
  provider: 'https://api.trongrid.io',
  gasFreeProvider: 'https://gasfree.trongrid.io',
  gasFreeApiKey: 'your-api-key',
  gasFreeApiSecret: 'your-api-secret',
  serviceProvider: 'T...', // Service provider address
  verifyingContract: 'T...', // Verifying contract address
  transferMaxFee: '10000000' // Maximum fee in sun
})
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAccount(index)` | Returns a wallet account at the specified index | `Promise<WalletAccountTronGasfree>` |
| `getAccountByPath(path)` | Returns a wallet account at the specified BIP-44 derivation path | `Promise<WalletAccountTronGasfree>` |
| `getFeeRates()` | Returns current fee rates for transactions | `Promise<{normal: bigint, fast: bigint}>` |
| `dispose()` | Disposes all wallet accounts, clearing private keys from memory | `void` |

##### `getAccount(index)`
Returns a gas-free Tron wallet account at the specified index using BIP-44 derivation path m/44'/195'.

**Parameters:**
- `index` (number, optional): The index of the account to get (default: 0)

**Returns:** `Promise<WalletAccountTronGasfree>` - The gas-free Tron wallet account

**Example:**
```javascript
const account = await wallet.getAccount(0)
const address = await account.getAddress()
console.log('Gas-free Tron account address:', address)
```

##### `getAccountByPath(path)`
Returns a gas-free Tron wallet account at the specified BIP-44 derivation path.

**Parameters:**
- `path` (string): The derivation path (e.g., "0'/0/0", "1'/0/5")

**Returns:** `Promise<WalletAccountTronGasfree>` - The gas-free Tron wallet account

**Example:**
```javascript
const account = await wallet.getAccountByPath("0'/0/1")
const address = await account.getAddress()
console.log('Custom path gas-free address:', address)
```

##### `getFeeRates()`
Returns current fee rates for Tron transactions (used by service provider for gas-free operations).

**Returns:** `Promise<{normal: bigint, fast: bigint}>` - Object containing fee rates in sun
- `normal`: Standard fee rate for normal confirmation speed
- `fast`: Higher fee rate for faster confirmation

**Example:**
```javascript
const feeRates = await wallet.getFeeRates()
console.log('Normal fee rate:', feeRates.normal, 'sun')
console.log('Fast fee rate:', feeRates.fast, 'sun')

// Note: These fees are typically covered by the service provider in gas-free transactions
```

##### `dispose()`
Disposes all gas-free Tron wallet accounts and clears sensitive data from memory.

**Returns:** `void`

**Example:**
```javascript
wallet.dispose()
// All gas-free accounts and private keys are now securely wiped from memory
```

### WalletAccountTronGasfree

Represents an individual wallet account with gas-free features. Implements `IWalletAccount` from `@wdk/wallet`.

#### Constructor

```javascript
new WalletAccountTronGasfree(seed, path, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `path` (string): BIP-44 derivation path (e.g., "0'/0/0")
- `config` (object, optional): Configuration object
  - `chainId` (string): The blockchain's id
  - `provider` (string | TronWeb): Tron RPC endpoint URL or TronWeb instance
  - `gasFreeProvider` (string): The gasfree provider's url
  - `gasFreeApiKey` (string): The gasfree provider's api key
  - `gasFreeApiSecret` (string): The gasfree provider's api secret
  - `serviceProvider` (string): The address of the service provider
  - `verifyingContract` (string): The address of the verifying contract
  - `transferMaxFee` (number | bigint, optional): Maximum fee amount for transfer operations (in sun)

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAddress()` | Returns the account's address | `Promise<string>` |
| `sign(message)` | Signs a message using the account's private key | `Promise<string>` |
| `verify(message, signature)` | Verifies a message signature | `Promise<boolean>` |
| `transfer(options, config?)` | Transfers TRC20 tokens to another address | `Promise<{hash: string, fee: bigint}>` |
| `quoteTransfer(options)` | Estimates the fee for a TRC20 transfer | `Promise<{fee: bigint}>` |
| `getBalance()` | Returns the native TRX balance (in sun) | `Promise<bigint>` |
| `getTokenBalance(tokenAddress)` | Returns the balance of a specific TRC20 token | `Promise<bigint>` |
| `dispose()` | Disposes the wallet account, clearing private keys from memory | `void` |

##### `getAddress()`
Returns the account's Tron address.

**Returns:** `Promise<string>` - The Tron address

**Example:**
```javascript
const address = await account.getAddress()
console.log('Gas-free Tron address:', address) // TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH
```

##### `sign(message)`
Signs a message using the account's private key.

**Parameters:**
- `message` (string): Message to sign

**Returns:** `Promise<string>` - Signature as hex string

**Example:**
```javascript
const signature = await account.sign('Hello Tron Gas-Free!')
console.log('Signature:', signature)
```

##### `verify(message, signature)`
Verifies a message signature using the account's public key.

**Parameters:**
- `message` (string): Original message
- `signature` (string): Signature as hex string

**Returns:** `Promise<boolean>` - True if signature is valid

**Example:**
```javascript
const isValid = await account.verify('Hello Tron Gas-Free!', signature)
console.log('Signature valid:', isValid)
```

##### `transfer(options, config?)`
Transfers TRC20 tokens to another address using gas-free operations where the service provider covers transaction fees.

**Parameters:**
- `options` (object): Transfer options
  - `token` (string): TRC20 contract address (e.g., 'T...')
  - `recipient` (string): Recipient Tron address (e.g., 'T...')
  - `amount` (number | bigint): Amount in TRC20's base units
- `config` (object, optional): Additional configuration
  - `transferMaxFee` (number | bigint, optional): Maximum allowed fee for this transfer

**Returns:** `Promise<{hash: string, fee: bigint}>` - Object containing hash and fee (typically 0 or covered by service provider)

**Example:**
```javascript
const result = await account.transfer({
  token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT TRC20
  recipient: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
  amount: 1000000n // 1 USDT (6 decimals)
})
console.log('Gas-free transfer hash:', result.hash)
console.log('Fee (covered by service provider):', result.fee, 'sun')
```

##### `quoteTransfer(options)`
Estimates the fee for a TRC20 token transfer (typically covered by service provider in gas-free operations).

**Parameters:**
- `options` (object): Transfer options
  - `token` (string): TRC20 contract address
  - `recipient` (string): Recipient Tron address
  - `amount` (number | bigint): Amount in TRC20's base units

**Returns:** `Promise<{fee: bigint}>` - Object containing estimated fee (typically 0 or covered by service provider)

**Example:**
```javascript
const quote = await account.quoteTransfer({
  token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT TRC20
  recipient: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
  amount: 1000000n // 1 USDT (6 decimals)
})
console.log('Estimated fee (service provider will cover):', quote.fee, 'sun')
```

##### `getBalance()`
Returns the account's native TRX balance in sun.

**Returns:** `Promise<bigint>` - Balance in sun

**Example:**
```javascript
const balance = await account.getBalance()
console.log('TRX balance:', balance, 'sun')
console.log('Balance in TRX:', Number(balance) / 1e6)
```

##### `getTokenBalance(tokenAddress)`
Returns the balance of a specific TRC20 token.

**Parameters:**
- `tokenAddress` (string): The TRC20 token contract address

**Returns:** `Promise<bigint>` - Token balance in token's smallest unit

**Example:**
```javascript
// Get USDT TRC20 balance (6 decimals)
const usdtBalance = await account.getTokenBalance('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
console.log('USDT balance:', Number(usdtBalance) / 1e6)
```

##### `dispose()`
Disposes the wallet account, securely erasing the private key from memory.

**Returns:** `void`

**Example:**
```javascript
account.dispose()
// Private key is now securely wiped from memory
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | The derivation path's index of this account |
| `path` | `string` | The full derivation path of this account |
| `keyPair` | `object` | The account's key pair (⚠️ Contains sensitive data) |

⚠️ **Security Note**: The `keyPair` property contains sensitive cryptographic material. Never log, display, or expose the private key.

### WalletAccountReadOnlyTronGasfree

Represents a read-only wallet account with gas-free features.

#### Constructor

```javascript
new WalletAccountReadOnlyTronGasfree(address, config)
```

**Parameters:**
- `address` (string): The account's Tron address
- `config` (object, optional): Configuration object
  - `chainId` (string): The blockchain's id
  - `provider` (string | TronWeb): Tron RPC endpoint URL or TronWeb instance
  - `gasFreeProvider` (string): The gasfree provider's url
  - `gasFreeApiKey` (string): The gasfree provider's api key
  - `gasFreeApiSecret` (string): The gasfree provider's api secret
  - `serviceProvider` (string): The address of the service provider

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getBalance()` | Returns the native TRX balance (in sun) | `Promise<bigint>` |
| `getTokenBalance(tokenAddress)` | Returns the balance of a specific TRC20 token | `Promise<bigint>` |
| `quoteTransfer(options)` | Estimates the fee for a TRC20 transfer | `Promise<{fee: bigint}>` |

##### `getBalance()`
Returns the account's native TRX balance in sun.

**Returns:** `Promise<bigint>` - Balance in sun

**Example:**
```javascript
const balance = await readOnlyAccount.getBalance()
console.log('TRX balance:', balance, 'sun')
console.log('Balance in TRX:', Number(balance) / 1e6)
```

##### `getTokenBalance(tokenAddress)`
Returns the balance of a specific TRC20 token.

**Parameters:**
- `tokenAddress` (string): The TRC20 token contract address

**Returns:** `Promise<bigint>` - Token balance in token's smallest unit

**Example:**
```javascript
// Get USDT TRC20 balance (6 decimals)
const usdtBalance = await readOnlyAccount.getTokenBalance('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
console.log('USDT balance:', Number(usdtBalance) / 1e6)
```

##### `quoteTransfer(options)`
Estimates the fee for a TRC20 token transfer (typically covered by service provider in gas-free operations).

**Parameters:**
- `options` (object): Transfer options
  - `token` (string): TRC20 contract address
  - `recipient` (string): Recipient Tron address
  - `amount` (number | bigint): Amount in TRC20's base units

**Returns:** `Promise<{fee: bigint}>` - Object containing estimated fee (typically 0 or covered by service provider)

**Example:**
```javascript
const quote = await readOnlyAccount.quoteTransfer({
  token: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // USDT TRC20
  recipient: 'TLyqzVGLV1srkB7dToTAEqgDSfPtXRJZYH',
  amount: 1000000n // 1 USDT (6 decimals)
})
console.log('Estimated fee (service provider will cover):', quote.fee, 'sun')
console.log('Estimated fee in TRX:', Number(quote.fee) / 1e6)
```

## 🌐 Supported Networks

This package works with the Tron blockchain, including:

- **Tron Mainnet**
- **Tron Shasta Testnet**

## 🔒 Security Considerations

- **Seed Phrase Security**: Always store your seed phrase securely and never share it
- **Private Key Management**: The package handles private keys internally with memory safety features
- **Provider Security**: Use trusted RPC endpoints and consider running your own node for production
- **Transaction Validation**: Always validate transaction details before signing
- **Memory Cleanup**: Use the `dispose()` method to clear private keys from memory when done
- **Fee Limits**: Set `transferMaxFee` in config to prevent excessive transaction fees
- **Gas-Free Provider**: Validate gas-free provider configuration and API credentials
- **Service Provider**: Ensure service provider address is correct and trusted
- **Contract Interactions**: Verify contract addresses and token decimals before transfers

## 🛠️ Development

### Building

```bash
# Install dependencies
npm install

# Build TypeScript definitions
npm run build:types

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📜 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🆘 Support

For support, please open an issue on the GitHub repository.

---