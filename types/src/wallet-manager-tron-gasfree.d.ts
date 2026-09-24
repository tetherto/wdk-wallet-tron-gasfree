export default class WalletManagerTronGasfree extends WalletManager {
    /**
     * Creates a new wallet manager for the tron blockchain that implements gasfree features.
     *
     * @param {string | Uint8Array} seed - A [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
     * @param {TronGasfreeWalletConfig} config - The configuration object.
     */
    constructor(seed: string | Uint8Array, config: TronGasfreeWalletConfig);
    /**
     * The tron gasfree wallet configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    protected _config: TronGasfreeWalletConfig;
    /**
     * The tron web client.
     *
     * @protected
     * @type {TronWeb | undefined}
     */
    protected _tronWeb: TronWeb | undefined;
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
    /**
     * Builds the account config, injecting the manager's shared tron web client so accounts
     * reuse it instead of opening their own.
     *
     * @private
     * @returns {TronGasfreeWalletConfig} The account configuration.
     */
    private _accountConfig;
    /**
     * Returns the current fee rates.
     *
     * @returns {Promise<FeeRates>} The fee rates.
     */
    getFeeRates(): Promise<FeeRates>;
}
export type FeeRates = import("@tetherto/wdk-wallet-tron").FeeRates;
export type TronGasfreeWalletConfig = import("./wallet-account-tron-gasfree.js").TronGasfreeWalletConfig;
import WalletManager from '@tetherto/wdk-wallet';
import { TronWeb } from 'tronweb';
import WalletAccountTronGasfree from './wallet-account-tron-gasfree.js';
