export default class WalletAccountReadOnlyTronGasfree extends WalletAccountReadOnly {
    /**
     * Creates a new read-only tron gasfree wallet account.
     *
     * @param {string} address - The tron account's address.
     * @param {Omit<TronGasfreeWalletConfig, 'transferMaxFee'>} config - The configuration object.
     */
    constructor(address: string, config: Omit<TronGasfreeWalletConfig, "transferMaxFee">);
    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {Omit<TronGasfreeWalletConfig, 'transferMaxFee'>}
     */
    protected _config: Omit<TronGasfreeWalletConfig, "transferMaxFee">;
    /** @private */
    private _ownerAccountAddress;
    /** @private */
    private _gasFreeAccount;
    /**
     * Returns the account's tronix balance.
     *
     * @returns {Promise<bigint>} The tronix balance (in suns).
     */
    getBalance(): Promise<bigint>;
    /**
     * Returns the account balance for a specific token.
     *
     * @param {string} tokenAddress - The smart contract address of the token.
     * @returns {Promise<bigint>} The token balance (in base unit).
     */
    getTokenBalance(tokenAddress: string): Promise<bigint>;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @param {TronTransaction} tx - The transaction.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     */
    quoteSendTransaction(tx: TronTransaction): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Quotes the costs of a transfer operation.
     *
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
    /**
     * Returns the gasfree provider's account.
     *
     * @protected
     * @returns {Promise<any>} The gasfree provider's account.
     */
    protected _getGasfreeAccount(): Promise<any>;
    /**
     * Sends a http request to the gasfree provider.
     *
     * @protected
     * @param {string} method - The http request's method; available values: 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'.
     * @param {string} path - The http request's url's path.
     * @param {any} [body] - The http request's body.
     * @returns {Promise<Response>} The http response.
     */
    protected _sendRequestToGasfreeProvider(method: string, path: string, body?: any): Promise<Response>;
    /** @private */
    private _getTronReadOnlyAccount;
    /** @private */
    private _getTokenTransferHash;
}
export type TronWeb = import("tronweb").default;
export type TronTransaction = import("@wdk/wallet-tron").TronTransaction;
export type TransactionResult = import("@wdk/wallet-tron").TransactionResult;
export type TransferOptions = import("@wdk/wallet-tron").TransferOptions;
export type TransferResult = import("@wdk/wallet-tron").TransferResult;
export type TronTransactionReceipt = import("@wdk/wallet-tron").TronTransactionReceipt;
export type TronGasfreeWalletConfig = {
    /**
     * - The blockchain's id.
     */
    chainId: number;
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
    /**
     * - The maximum fee amount for transfer operations.
     */
    transferMaxFee?: number | bigint;
};
import { WalletAccountReadOnly } from '@wdk/wallet';
