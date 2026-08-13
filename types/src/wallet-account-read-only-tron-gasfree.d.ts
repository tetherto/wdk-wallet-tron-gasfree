export default class WalletAccountReadOnlyTronGasfree extends WalletAccountReadOnly {
    /**
     * Creates a new read-only tron gasfree wallet account.
     *
     * @param {string} address - The tron account's address.
     * @param {Omit<TronGasfreeWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>} config - The configuration object.
     */
    constructor(address: string, config: Omit<TronGasfreeWalletConfig, "transferMaxFee" | "transactionMaxFee">);
    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {Omit<TronGasfreeWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>}
     */
    protected _config: Omit<TronGasfreeWalletConfig, "transferMaxFee" | "transactionMaxFee">;
    /** @private */
    private _ownerAccountAddress;
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
     * @returns {Promise<Omit<TransferResult, 'hash'> & TronActivationFee>} The transfer's quotes.
     */
    quoteTransfer({ token }: TransferOptions): Promise<Omit<TransferResult, "hash"> & TronActivationFee>;
    /**
     * Quotes the costs of a transfer operation using a pre-fetched gasfree account.
     *
     * @protected
     * @param {TronGasfreeAccountInfo} gasFreeAccount - The pre-fetched gasfree account.
     * @param {TransferOptions} options - The transfer's options.
     * @returns {Promise<Omit<TransferResult, 'hash'> & TronActivationFee>} The transfer's quotes.
     * @throws {Error} If the provider doesn't support the given TRC-20 token.
     */
    protected _quoteTransferWithAccount(gasFreeAccount: TronGasfreeAccountInfo, options: TransferOptions): Promise<Omit<TransferResult, "hash"> & TronActivationFee>;
    /**
     * Verifies a message's signature.
     *
     * @param {string} message - The original message.
     * @param {string} signature - The signature to verify.
     * @returns {Promise<boolean>} True if the signature is valid.
     */
    verify(message: string, signature: string): Promise<boolean>;
    /**
     * Returns a transaction's receipt.
     *
     * @deprecated Use {@link getTransaction} instead, which returns a normalized, finality-based receipt. The raw tron receipt remains available on its `receipt` property.
     * @param {string} hash - The transaction's hash.
     * @returns {Promise<TronTransactionReceipt | null>} The receipt, or null if the transaction has not been included in a block yet.
     */
    getTransactionReceipt(hash: string): Promise<TronTransactionReceipt | null>;
    /**
     * Returns a normalized, finality-based receipt for a gasfree transfer.
     *
     * @param {string} hash - The gasfree transfer's id.
     * @returns {Promise<TransactionReceipt & TronGasfreeTransactionDetails>} The normalized receipt.
     * @throws {NoSuchElementError} If no transfer has been found for the given hash.
     */
    getTransaction(hash: string): Promise<TransactionReceipt & TronGasfreeTransactionDetails>;
    /**
     * Blocks until a transaction reaches a terminal state (the requested finality target or `dropped`), or times out.
     *
     * @param {string} hash - The gasfree transfer's id.
     * @param {WaitForTransactionOptions} [options] - The wait options.
     * @returns {Promise<TransactionReceipt & TronGasfreeTransactionDetails>} The terminal receipt: the finality target reached (inspect `success` to tell success from revert), or `dropped`.
     * @throws {TimeoutError} If the target is not reached before the timeout.
     */
    waitForTransaction(hash: string, options?: WaitForTransactionOptions): Promise<TransactionReceipt & TronGasfreeTransactionDetails>;
    /**
     * Overrides the base default to allow for the gasfree provider's relay and tron confirmation latency.
     *
     * @type {number}
     */
    get defaultWaitTimeout(): number;
    /**
     * Returns the gasfree provider's account.
     *
     * @protected
     * @returns {Promise<TronGasfreeAccountInfo>} The gasfree provider's account.
     */
    protected _getGasfreeAccount(): Promise<TronGasfreeAccountInfo>;
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
export type TronWeb = import("tronweb").TronWeb;
export type TronTransaction = import("@tetherto/wdk-wallet-tron").TronTransaction;
export type TransactionResult = import("@tetherto/wdk-wallet-tron").TransactionResult;
export type TransferOptions = import("@tetherto/wdk-wallet-tron").TransferOptions;
export type TransferResult = import("@tetherto/wdk-wallet-tron").TransferResult;
export type TronTransactionReceipt = import("@tetherto/wdk-wallet-tron").TronTransactionReceipt;
export type TronActivationFee = import("@tetherto/wdk-wallet-tron").TronActivationFee;
export type TransactionReceipt = import("@tetherto/wdk-wallet").TransactionReceipt;
export type WaitForTransactionOptions = import("@tetherto/wdk-wallet").WaitForTransactionOptions;
/**
 * The tron-specific fields added to a normalized transaction receipt.
 */
export type TronGasfreeTransactionDetails = {
    /**
     * - The confirmation depth, or null while it can't be resolved.
     */
    confirmations: number | null;
    /**
     * - The native tron receipt, or null while the transaction is pending or dropped.
     */
    receipt: TronTransactionReceipt | null;
};
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
    gasFreeApiKey?: string;
    /**
     * - The gasfree provider's api secret.
     */
    gasFreeApiSecret?: string;
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
    /**
     * - The maximum fee amount for sendTransaction and signTransaction operations.
     */
    transactionMaxFee?: number | bigint;
};
export type TronGasfreeAssetInfo = {
    /**
     * - The token's smart contract address.
     */
    tokenAddress: string;
    /**
     * - The token's symbol.
     */
    tokenSymbol: string;
    /**
     * - The fee to activate the account for this token.
     */
    activateFee: number;
    /**
     * - The fee for transferring this token.
     */
    transferFee: number;
    /**
     * - The token's decimals.
     */
    decimal: number;
    /**
     * - Whether the token is frozen.
     */
    frozen: number;
};
export type TronGasfreeAccountInfo = {
    /**
     * - The owner's account address.
     */
    accountAddress: string;
    /**
     * - The gasfree contract address for the account.
     */
    gasFreeAddress: string;
    /**
     * - Whether the gasfree account is active.
     */
    active: boolean;
    /**
     * - The account's nonce.
     */
    nonce: number;
    /**
     * - Whether the account is allowed to submit transactions.
     */
    allowSubmit: boolean;
    /**
     * - The list of supported assets and their info.
     */
    assets: TronGasfreeAssetInfo[];
};
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
