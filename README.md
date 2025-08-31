# @wdk/wallet-tron-gasfree

A simple and secure package to manage BIP-44 wallets for the Tron blockchain with **gas-free TRC20 token transfers**. This package provides a clean API for creating, managing, and interacting with Tron wallets using BIP-39 seed phrases and Tron-specific derivation paths, with support for gas-free operations via a service provider.

## 🔍 About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://wallet.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control.

For detailed documentation about the complete WDK ecosystem, visit [docs.wallet.tether.io](https://docs.wallet.tether.io).

## 🌟 Features

- **Gas-Free Transactions**: Support for gas-free transactions using TRC20 tokens.
- **BIP-39 Seed Phrase Support**: Generate and validate BIP-39 mnemonic seed phrases.
- **Tron Derivation Paths**: Support for BIP-44 standard derivation paths for Tron.
- **Multi-Account Management**: Create and manage multiple accounts from a single seed phrase.
- **Tron Address Support**: Generate and manage Tron addresses.
- **Message Signing**: Sign and verify messages using Tron cryptography.
- **Transaction Management**: Send transactions and get fee estimates.
- **TRC20 Support**: Query native TRX and TRC20 token balances.
- **TypeScript Support**: Full TypeScript definitions included.
- **Memory Safety**: Secure private key management with automatic memory cleanup.
- **Provider Flexibility**: Support for custom Tron RPC endpoints.

## ⬇️ Installation

To install the `wdk-wallet-tron-gasfree` package, follow these instructions:

### Public Release

Once the package is publicly available, you can install it using npm:

```bash
npm install @wdk/wallet-tron-gasfree
```

### Private Access

If you have access to the private repository, install the package from the develop branch on GitHub:

```bash
npm install git+https://github.com/tetherto/wdk-wallet-tron-gasfree.git#develop
```

After installation, ensure your package.json includes the dependency correctly:

```json
"dependencies": {
  // ... other dependencies ...
  "@wdk/wallet-tron-gasfree": "git+ssh://git@github.com:tetherto/wdk-wallet-tron-gasfree.git#develop"
  // ... other dependencies ...
}
```

## 🚀 Quick Start

### Importing from `wdk-wallet-tron-gasfree`

1. WalletManagerTronGasfree: This is the main class for managing wallets with gas-free capabilities.
2. WalletAccountTronGasfree: Use this for full access accounts with gas-free features.
3. WalletAccountReadOnlyTronGasfree: Use this for read-only accounts with gas-free features.

### Creating a New Gas-Free Wallet

```javascript
import WalletManagerTronGasfree, { 
  WalletAccountTronGasfree, 
  WalletAccountReadOnlyTronGasfree 
} from '@wdk/wallet-tron-gasfree'

// Use a BIP-39 seed phrase (replace with your own secure phrase)
const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

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
  transferMaxFee: 10000000 // Maximum fee in sun (optional)
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
const customAccount = await wallet.getAccountByPath("0'/0/5")
const customAddress = await customAccount.getAddress()
console.log('Custom account address:', customAddress)
```

### Checking Balances

#### Owned Account

For accounts where you have the seed phrase and full access:

```javascript
import WalletManagerTronGasfree from '@wdk/wallet-tron-gasfree'

// Assume wallet and account are already created
// Get native TRX balance (in sun)
const balance = await account.getBalance()
console.log('Native TRX balance:', balance, 'sun')

// Get TRC20 token balance
const trc20Address = 'T...'; // TRC20 contract address
const trc20Balance = await account.getTokenBalance(trc20Address);
console.log('TRC20 token balance:', trc20Balance);
```

#### Read-Only Account

For addresses where you don't have the seed phrase:

```javascript
import { WalletAccountReadOnlyTronGasfree } from '@wdk/wallet-tron-gasfree'

// Use the address directly
const address = 'T...'; // Replace with the actual Tron address

// Create a read-only account
const readOnlyAccount = new WalletAccountReadOnlyTronGasfree(address, {
  provider: 'https://api.trongrid.io'
})

// Check the balance
const balance = await readOnlyAccount.getBalance()
console.log('Read-only account balance:', balance)
```

### Sending Transactions

⚠️ Direct transaction sending using `sendTransaction()` is not supported in `WalletAccountTronGasfree`. This is a gasfree implementation that handles transactions through a gasfree provider instead of direct blockchain transactions.

For sending tokens, please use the `transfer()` method instead.

### Token Transfers

Transfer TRC20 tokens and estimate fees using `WalletAccountTronGasfree`. Ensure connection to TronWeb.

```javascript
// Transfer TRC20 tokens
const transferResult = await account.transfer({
  token: 'T...',      // TRC20 contract address
  recipient: 'T...',  // Recipient's Tron address
  amount: 1000000     // Amount in TRC20's base units
}, {
  transferMaxFee: 1000 // Optional: Maximum fee allowed for the transfer
});
console.log('Transfer hash:', transferResult.hash);
console.log('Transfer fee:', transferResult.fee, 'sun');

// Quote token transfer
const transferQuote = await account.quoteTransfer({
  token: 'T...',      // TRC20 contract address
  recipient: 'T...',  // Recipient's Tron address
  amount: 1000000     // Amount in TRC20's base units 
})
console.log('Transfer fee estimate:', transferQuote.fee, 'sun') // Includes both transfer and activation fees if needed
```

Replace `'T...'` with a valid Tron address.

### Message Signing and Verification

Sign and verify messages using `WalletAccountTronGasfree`. Ensure connection to TronWeb.

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

Retrieve current fee rates using `WalletManagerTronGasfree`. Ensure connection to TronWeb.

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
| [WalletManagerTronGasfree](#walletmanagertrongasfree) | Main class for managing Tron wallets with gas-free features | [Constructor](#constructor), [Methods](#methods), [Properties](#properties) |
| [WalletAccountTronGasfree](#walletaccounttrongasfree) | Individual Tron wallet account implementation with gas-free features | [Constructor](#constructor-1), [Methods](#methods), [Properties](#properties-1) |
| [WalletAccountReadOnlyTronGasfree](#walletaccountreadonlytrongasfree) | Read-only Tron wallet account with gas-free features | [Constructor](#constructor-2), [Methods](#methods-2) |

### WalletManagerTronGasfree

The main class for managing Tron wallets with gas-free features.  
Extends `WalletManager` from `@wdk/wallet`.

#### Constructor

```javascript
new WalletManagerTronGasfree(seed, config)
```

**Parameters:**
- `seed` (string | Uint8Array): BIP-39 mnemonic seed phrase or seed bytes
- `config` (object): Configuration object
  - `chainId` (string): The blockchain's id
  - `provider` (string | TronWeb): Tron RPC endpoint URL or TronWeb instance (e.g., 'https://api.trongrid.io')
  - `gasFreeProvider` (string): The gasfree provider's url
  - `gasFreeApiKey` (string): The gasfree provider's api key
  - `gasFreeApiSecret` (string): The gasfree provider's api secret
  - `serviceProvider` (string): The address of the service provider
  - `verifyingContract` (string): The address of the verifying contract
  - `transferMaxFee` (number, optional): Maximum fee amount for transfer operations (in sun)

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
  transferMaxFee: 10000000 // Optional: Maximum fee in sun (e.g., 10 TRX)
})
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAccount(index)` | Returns a wallet account at the specified index | `Promise<WalletAccountTronGasfree>` |
| `getAccountByPath(path)` | Returns a wallet account at the specified BIP-44 derivation path | `Promise<WalletAccountTronGasfree>` |
| `getFeeRates()` | Returns current fee rates for normal and fast transactions | `Promise<{normal: number, fast: number}>` |
| `dispose()` | Disposes all wallet accounts, clearing private keys from memory | `void` |

##### `getAccount(index)`
Returns a wallet account at the specified index.

**Parameters:**
- `index` (number, optional): The index of the account to get (default: 0)

**Returns:** `Promise<WalletAccountTronGasfree>` - The wallet account

**Example:**
```javascript
const account = await wallet.getAccount(0)
```

##### `getAccountByPath(path)`
Returns a wallet account at the specified BIP-44 derivation path.

**Parameters:**
- `path` (string): The derivation path (e.g., "0'/0/1")

**Returns:** `Promise<WalletAccountTronGasfree>` - The wallet account

**Example:**
```javascript
const account = await wallet.getAccountByPath("0'/0/1")
```

##### `getFeeRates()`
Returns current fee rates for normal and fast transactions. Requires a TronWeb connection through the provider config.

**Returns:** `Promise<FeeRates>` - Object containing normal and fast fee rates
**Throws:** Error if TronWeb is not connected

**Example:**
```javascript
const feeRates = await wallet.getFeeRates()
console.log('Normal fee rate:', feeRates.normal, 'sun') // 1.1x base fee
console.log('Fast fee rate:', feeRates.fast, 'sun')     // 2.0x base fee
```

##### `dispose()`
Disposes all wallet accounts, clearing private keys from memory.

**Example:**
```javascript
wallet.dispose()
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
- `config` (object): Configuration object
  - `chainId` (string): The blockchain's id
  - `provider` (string | TronWeb): Tron RPC endpoint URL or TronWeb instance
  - `gasFreeProvider` (string): The gasfree provider's url
  - `gasFreeApiKey` (string): The gasfree provider's api key
  - `gasFreeApiSecret` (string): The gasfree provider's api secret
  - `serviceProvider` (string): The address of the service provider
  - `verifyingContract` (string): The address of the verifying contract
  - `transferMaxFee` (number, optional): Maximum fee amount for transfer operations (in sun)

**Example:**
```javascript
const account = new WalletAccountTronGasfree(seedPhrase, "0'/0/0", {
  chainId: '1',
  provider: 'https://api.trongrid.io',
  gasFreeProvider: 'https://gasfree.trongrid.io',
  gasFreeApiKey: 'your-api-key',
  gasFreeApiSecret: 'your-api-secret',
  serviceProvider: 'T...', // Service provider address
  verifyingContract: 'T...', // Verifying contract address
  transferMaxFee: 10000000 // Optional: Maximum fee in sun (e.g., 10 TRX)
})
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAddress()` | Returns the account's Tron address | `Promise<string>` |
| `sign(message)` | Signs a message using the account's private key | `Promise<string>` |
| `verify(message, signature)` | Verifies a message signature | `Promise<boolean>` |
| `transfer(options)` | Transfers TRC20 tokens to another address | `Promise<{hash: string, fee: number}>` |
| `quoteTransfer(options)` | Estimates the fee for a TRC20 transfer | `Promise<{fee: number}>` |
| `getBalance()` | Returns the native TRX balance (in sun) | `Promise<number>` |
| `getTokenBalance(tokenAddress)` | Returns the balance of a specific TRC20 token | `Promise<number>` |
| `dispose()` | Disposes the wallet account, clearing private keys from memory | `void` |

##### `getAddress()`
Returns the account's address.

**Returns:** `Promise<string>` - The account's Tron address

**Example:**
```javascript
const address = await account.getAddress()
console.log('Account address:', address)
```

##### `sign(message)`
Signs a message using the account's private key.

**Parameters:**
- `message` (string): The message to sign

**Returns:** `Promise<string>` - The message signature

**Example:**
```javascript
const signature = await account.sign('Hello, World!')
console.log('Signature:', signature)
```

##### `verify(message, signature)`
Verifies a message signature.

**Parameters:**
- `message` (string): The original message
- `signature` (string): The signature to verify

**Returns:** `Promise<boolean>` - True if the signature is valid

**Example:**
```javascript
const isValid = await account.verify('Hello, World!', signature)
console.log('Signature valid:', isValid)
```

##### `transfer(options, config?)`
Transfers TRC20 tokens to another address.

**Parameters:**
- `options` (object): Transfer options
  - `token` (string): TRC20 contract address (e.g., 'T...')
  - `recipient` (string): Recipient Tron address (e.g., 'T...')
  - `amount` (number): Amount in TRC20's base units
- `config` (object, optional): Additional configuration
  - `transferMaxFee` (number, optional): Maximum allowed fee for this transfer

**Returns:** `Promise<{hash: string, fee: number}>` - Object containing hash and fee (in sun)

**Example:**
```javascript
const result = await account.transfer({
  token: 'T...',      // TRC20 contract address
  recipient: 'T...',  // Recipient's Tron address
  amount: 1000000     // Amount in TRC20's base units
}, {
  transferMaxFee: 1000000 // Optional: Maximum allowed fee
});
console.log('Transfer hash:', result.hash);
console.log('Transfer fee:', result.fee, 'sun');
```

##### `quoteTransfer(options)`
Estimates the fee for a TRC20 token transfer.

**Parameters:**
- `options` (object): Transfer options (same as transfer)
  - `token` (string): TRC20 contract address (e.g., 'T...')
  - `recipient` (string): Recipient Tron address (e.g., 'T...')
  - `amount` (number): Amount in TRC20's base units

**Returns:** `Promise<{fee: number}>` - Object containing fee estimate (in sun)

**Example:**
```javascript
const quote = await account.quoteTransfer({
  token: 'T...',      // TRC20 contract address
  recipient: 'T...',  // Recipient's Tron address
  amount: 1000000     // Amount in TRC20's base units
});
console.log('Transfer fee estimate:', quote.fee, 'sun');
```

##### `getBalance()`
Returns the native TRX balance (in sun).

**Returns:** `Promise<number>` - Balance in sun

**Example:**
```javascript
const balance = await account.getBalance();
console.log('Balance:', balance, 'sun');
```

##### `getTokenBalance(tokenAddress)`
Returns the balance of a specific TRC20 token.

**Parameters:**
- `tokenAddress` (string): The TRC20 contract address (e.g., 'T...')

**Returns:** `Promise<number>` - Token balance in base units 

**Example:**
```javascript
const tokenBalance = await account.getTokenBalance('T...');
console.log('Token balance:', tokenBalance);
```

##### `dispose()`
Disposes the wallet account, clearing private keys from memory.

**Example:**
```javascript
account.dispose()
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `index` | `number` | The derivation path's index of this account |
| `path` | `string` | The full derivation path of this account |
| `keyPair` | `object` | The account's key pair (⚠️ Contains sensitive data) |

**Example:**
```javascript
// Access non-sensitive properties
console.log('Account index:', account.index)
console.log('Derivation path:', account.path)

// Avoid logging or exposing keyPair as it contains sensitive data
```

⚠️ **Security Note**: The `keyPair` property contains sensitive cryptographic material. Never log, display, or expose the private key.

### WalletAccountReadOnlyTronGasfree

Represents a read-only wallet account with gas-free features.

#### Constructor

```javascript
new WalletAccountReadOnlyTronGasfree(address, config)
```

**Parameters:**
- `address` (string): The account's Tron address
- `config` (object): Configuration object
  - `chainId` (string): The blockchain's id
  - `provider` (string | TronWeb): Tron RPC endpoint URL or TronWeb instance
  - `gasFreeProvider` (string): The gasfree provider's url
  - `gasFreeApiKey` (string): The gasfree provider's api key
  - `gasFreeApiSecret` (string): The gasfree provider's api secret
  - `serviceProvider` (string): The address of the service provider

**Example:**
```javascript
const readOnlyAccount = new WalletAccountReadOnlyTronGasfree('T...', {
  chainId: '1',
  provider: 'https://api.trongrid.io',
  gasFreeProvider: 'https://gasfree.trongrid.io',
  gasFreeApiKey: 'your-api-key',
  gasFreeApiSecret: 'your-api-secret',
  serviceProvider: 'T...', // Service provider address
  verifyingContract: 'T...' // Verifying contract address
})
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `getAddress()` | Returns the account's Tron address | `Promise<string>` |
| `getBalance()` | Returns the native TRX balance (in sun) | `Promise<number>` |
| `getTokenBalance(tokenAddress)` | Returns the balance of a specific TRC20 token | `Promise<number>` |
| `quoteTransfer(options)` | Estimates the fee for a TRC20 transfer | `Promise<{fee: number}>` |

##### `getAddress()`
Returns the account's address.

**Returns:** `Promise<string>` - The account's Tron address

**Example:**
```javascript
const address = await readOnlyAccount.getAddress()
console.log('Account address:', address)
```

##### `getBalance()`
Returns the native TRX balance (in sun).

**Returns:** `Promise<number>` - Balance in sun

**Example:**
```javascript
const balance = await readOnlyAccount.getBalance();
console.log('Balance:', balance, 'sun');
```

##### `getTokenBalance(tokenAddress)`
Returns the balance of a specific TRC20 token.

**Parameters:**
- `tokenAddress` (string): The TRC20 contract address (e.g., 'T...')

**Returns:** `Promise<number>` - Token balance in base units 

**Example:**
```javascript
const tokenBalance = await readOnlyAccount.getTokenBalance('T...');
console.log('Token balance:', tokenBalance);
```

##### `quoteTransfer(options)`
Estimates the fee for a TRC20 token transfer.

**Parameters:**
- `options` (object): Transfer options
  - `token` (string): TRC20 contract address (e.g., 'T...')
  - `recipient` (string): Recipient Tron address (e.g., 'T...')
  - `amount` (number): Amount in TRC20's base units

**Returns:** `Promise<{fee: number}>` - Object containing fee estimate (in sun)

**Example:**
```javascript
const quote = await readOnlyAccount.quoteTransfer({
  token: 'T...',      // TRC20 contract address
  recipient: 'T...',  // Recipient's Tron address
  amount: 1000000     // Amount in TRC20's base units
});
console.log('Transfer fee estimate:', quote.fee, 'sun');
```

## 🌐 Supported Networks

This package works with the Tron blockchain, including:

- **Tron Mainnet**
- **Tron Shasta Testnet**

## 🔒 Security Considerations

- **Seed Phrase Security**: Always store your seed phrase securely and never share it
- **Private Key Management**: The package handles private keys internally with memory safety features
- **Provider Security**: Use trusted RPC endpoints and consider using your own node for production applications
- **Transaction Validation**: Always validate transaction details before signing
- **Memory Cleanup**: Use the `dispose()` method to clear private keys from memory when done
- **Fee Limits**: Set `transferMaxFee` in config to prevent excessive transaction fees

## 💡 Examples

### Complete Wallet Setup

```javascript
import WalletManagerTronGasfree from '@wdk/wallet-tron-gasfree'

async function setupWallet() {
  try {
    // ⚠️ WARNING: Never hardcode seed phrases in production code
    // This is just an example - use secure key management in production
    const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    
    // Create wallet manager
    const wallet = new WalletManagerTronGasfree(seedPhrase, {
      chainId: '728126428', // Tron chain ID
      provider: 'https://api.trongrid.io', // or any other Tron RPC provider
      gasFreeProvider: 'https://gasfree.provider.url', // Gasfree provider's URL
      gasFreeApiKey: 'your-gasfree-api-key', // Gasfree provider's API key
      gasFreeApiSecret: 'your-gasfree-api-secret', // Gasfree provider's API secret
      serviceProvider: 'T...', // Service provider's address
      verifyingContract: 'T...', // Verifying contract's address
      transferMaxFee: 10000000 // Optional: Maximum fee in sun
    })
    
    // Get first account
    const account = await wallet.getAccount(0)
    const address = await account.getAddress()
    console.log('Wallet address:', address)
    
    // Check balance
    const balance = await account.getBalance()
    console.log('Balance:', balance, 'sun')
    
    return { wallet, account, address, balance }
  } catch (error) {
    console.error('Failed to setup wallet:', error)
    throw error
  }
}
```

### Multi-Account Management

```javascript
async function manageMultipleAccounts(wallet) {
  try {
    const accounts = []
    
    // Create 5 accounts
    for (let i = 0; i < 5; i++) {
      const account = await wallet.getAccount(i)
      const address = await account.getAddress()
      const balance = await account.getBalance()
      
      accounts.push({
        index: i,
        address,
        balance
      })
    }
    
    return accounts
  } catch (error) {
    console.error('Failed to manage accounts:', error)
    throw error
  } finally {
    // Clean up when done to remove sensitive data from memory
    wallet.dispose()
  }
}
```

⚠️ **Security Notes:**
- Never hardcode seed phrases in production code
- Always use proper key management and secure storage
- Call `dispose()` when done to clear sensitive data from memory
- Handle errors appropriately in production code

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

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.