export default class WalletAccountTronGasfree extends WalletAccountTron {
    /**
     * Creates a new tron gasfree wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
     * @param {TronGasFreeWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, path: string, config?: TronGasFreeWalletConfig);
    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {TronGasFreeWalletConfig}
     */
    protected _config: TronGasFreeWalletConfig;
    /** @private */
    private _gasFreeAccount;
    /**
     * Returns the account's balance for the paymaster token defined in the wallet account configuration.
     *
     * @returns {Promise<number>} The paymaster token balance (in base unit).
     */
    getPaymasterTokenBalance(): Promise<number>;
    /**
     * Transfers a token to another address, paying gas fees with the transferred token.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @param {Object} [config] - A configuration object containing additional options.
     * @param {number} [config.transferMaxFee] - The maximum fee amount for the transfer operation.
     * @returns {Promise<TransferResult>} The transfer's result.
     */
    transfer({ token, recipient, amount }: TransferOptions, config?: { transferMaxFee?: string }): Promise<TransferResult>;
    /**
     * Quotes the costs of a transfer operation.
     *
     * @see {@link transfer}
     * @param {TransferOptions} options - The transfer's options.
     * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
     */
    quoteTransfer({ token, recipient, amount }: TransferOptions): Promise<Omit<TransferResult, "hash">>;
    /**
     * Returns a transaction's receipt.
     *
     * @param {string} hash - The transaction's hash.
     * @returns {Promise<TronTransactionReceipt | null>} The receipt, or null if the transaction has not been included in a block yet.
     */
    getTransactionReceipt(hash: string): Promise<TronTransactionReceipt | null>;
    /** @private */
    private _signTypedData;
    /** @private */
    private _getGasfreeAccount;
    /** @private */
    private _getTokenTransferHash;
    /** @private */
    private _sendRequestToGasFreeProvider;
}
export type TronWeb = import("@wdk/wallet-tron").default;
export type TransferOptions = import("@wdk/wallet-tron").TransferOptions;
export type TransferResult = import("@wdk/wallet-tron").TransferResult;
export type TronTransactionReceipt = import("@wdk/wallet-tron").TronTransactionReceipt;
export type TronGasFreeWalletConfig = {
    /**
     * - The blockchain's id.
     */
    chainId: string;
    /**
     * - The url of the tron web provider, or an instance of the {@link TronWeb} class.
     */
    provider: string | TronWeb;
    /**
     * - The gasfree provider's url.
     */
    gasFreeProvider: string;
    /**
     * - The gasfree provider's api key.
     */
    gasFreeApiKey: string;
    /**
     * - The gasfree provider's api secret.
     */
    gasFreeApiSecret: string;
    /**
     * - The address of the service provider.
     */
    serviceProvider: string;
    /**
     * - The address of the verifying contract.
     */
    verifyingContract: string;
};
import { WalletAccountTron } from '@wdk/wallet-tron';
