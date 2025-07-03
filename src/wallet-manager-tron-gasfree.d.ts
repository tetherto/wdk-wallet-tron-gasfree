/** @typedef {import('./wallet-account-tron-gasfree.js').TronGasfreeWalletConfig} TronGasfreeWalletConfig */
export default class WalletManagerTronGasfree {
    /**
     * Creates a new wallet manager for the tron blockchain that implements gasless features.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {TronGasfreeWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, config?: TronGasfreeWalletConfig);
    /**
     * The tron gasless wallet configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    protected _config: TronGasfreeWalletConfig;
    /**
     * Returns the wallet account at a specific index (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @example
     * // Returns the account with derivation path m/44'/195'/0'/0/1
     * const account = await wallet.getAccount(1);
     * @param {number} [index] - The index of the account to get (default: 0).
     * @returns {Promise<WalletAccountTronGasfree>} The account.
     */
    getAccount(index?: number): Promise<WalletAccountTronGasfree>;
    /**
     * Returns the wallet account at a specific BIP-44 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/195'/0'/0/1
     * const account = await wallet.getAccountByPath("0'/0/1");
     * @param {string} path - The derivation path (e.g. "0'/0/0").
     * @returns {Promise<WalletAccountTronGasfree>} The account.
     */
    getAccountByPath(path: string): Promise<WalletAccountTronGasfree>;
}
export type TronGasfreeWalletConfig = import("./wallet-account-tron-gasfree.js").TronGasfreeWalletConfig;
import WalletAccountTronGasfree from './wallet-account-tron-gasfree.js';
