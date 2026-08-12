# @tetherto/wdk-wallet-tron-gasfree

[![npm version](https://img.shields.io/npm/v/%40tetherto%2Fwdk-wallet-tron-gasfree?style=flat-square)](https://www.npmjs.com/package/@tetherto/wdk-wallet-tron-gasfree)
[![npm downloads](https://img.shields.io/npm/dw/%40tetherto%2Fwdk-wallet-tron-gasfree?style=flat-square)](https://www.npmjs.com/package/@tetherto/wdk-wallet-tron-gasfree)
[![license](https://img.shields.io/npm/l/%40tetherto%2Fwdk-wallet-tron-gasfree?style=flat-square)](https://github.com/tetherto/wdk-wallet-tron-gasfree/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-docs.wdk.tether.io-0A66C2?style=flat-square)](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-tron-gasfree)

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.

A TRON wallet module for TRC20 transfers through a GasFree service provider. It derives TRON accounts from BIP-39 seed phrases, resolves their GasFree addresses, quotes provider fees, and submits signed transfer authorizations without requiring users to hold TRX for network resources.

## About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://docs.wdk.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control.

For detailed documentation about the complete WDK ecosystem, visit [docs.wdk.tether.io](https://docs.wdk.tether.io).

## Installation

```bash
npm install @tetherto/wdk-wallet-tron-gasfree
```

## Quick Start

Before running this example, set `WDK_SEED_PHRASE` and obtain the current `GASFREE_SERVICE_PROVIDER` address from your provider's `/api/v1/config/provider/all` endpoint.

```javascript
import WalletManagerTronGasfree from '@tetherto/wdk-wallet-tron-gasfree'

const seedPhrase = process.env.WDK_SEED_PHRASE
const serviceProvider = process.env.GASFREE_SERVICE_PROVIDER

if (!seedPhrase || !serviceProvider) {
  throw new Error('Set WDK_SEED_PHRASE and GASFREE_SERVICE_PROVIDER')
}

const wallet = new WalletManagerTronGasfree(seedPhrase, {
  chainId: 728126428,
  provider: 'https://api.trongrid.io',
  gasFreeProvider: 'https://open.gasfree.io/tron',
  serviceProvider,
  verifyingContract: 'TFFAMQLZybALaLb4uxHA9RBE7pxhUAjF3U'
})

try {
  const account = await wallet.getAccount(0)
  const address = await account.getAddress()
  console.log('GasFree address:', address)
} finally {
  wallet.dispose()
}
```

## Key Capabilities

- **GasFree TRC20 Transfers**: Quote fees and submit provider-backed token transfers without requiring TRX for network resources
- **BIP-44 Account Derivation**: Derive multiple TRON accounts from one BIP-39 seed phrase
- **GasFree Address Resolution**: Resolve the provider-managed GasFree address associated with an owner account
- **TRX and TRC20 Balances**: Query native and token balances for owned or read-only accounts
- **Per-Transfer Fee Caps**: Reject a transfer when its quoted provider fee exceeds `transferMaxFee`
- **Message Signing**: Sign messages and verify signatures with TRON accounts
- **Receipt Lookup**: Resolve a GasFree trace identifier to its on-chain transaction receipt
- **Memory Disposal**: Clear owned account key material with `dispose()`

## Compatibility

- **TRON Mainnet** (`chainId: 728126428`)
- **TRON Nile Testnet** (`chainId: 3448148188`)
- **TRON RPC Providers** supplied as an endpoint URL or `TronWeb` instance
- **GasFree Providers** implementing the GasFree account, configuration, submission, and status endpoints
- **Node.js and Bare** runtime entry points

## Operational Notes

- This module supports GasFree TRC20 transfers. Native `quoteSendTransaction()`, `signTransaction()`, and `sendTransaction()` calls are unsupported; use [`@tetherto/wdk-wallet-tron`](https://github.com/tetherto/wdk-wallet-tron) when you need native TRX transactions.
- Retrieve `serviceProvider` from the selected provider and use the verifying-contract address for the target network. Do not substitute one address for the other.
- Pass `transferMaxFee` in the second argument to `account.transfer()` when a transfer needs a fee cap. The current runtime does not use the constructor-level field as a default.
- Supply `gasFreeApiKey` and `gasFreeApiSecret` together when authenticated requests are required. Never embed the API secret in browser, mobile, or distributed desktop code.
- Verify token addresses, recipients, amounts, provider fees, and any first-transfer activation fee before submitting an authorization.

## Documentation

| Topic | Description | Link |
|-------|-------------|------|
| Overview | Module overview and supported flows | [TRON GasFree Overview](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-tron-gasfree) |
| Usage | Task-oriented integration guides | [TRON GasFree Usage](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-tron-gasfree/usage) |
| Configuration | Networks, providers, credentials, contracts, and fee caps | [TRON GasFree Configuration](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-tron-gasfree/configuration) |
| API Reference | Complete class and type reference | [TRON GasFree API Reference](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-tron-gasfree/api-reference) |

## Community

Join the [WDK Discord](https://discord.gg/arYXDhHB2w) to connect with other developers.

## Support

For support, please [open an issue](https://github.com/tetherto/wdk-wallet-tron-gasfree/issues) on GitHub or reach out via [email](mailto:wallet-info@tether.io).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
