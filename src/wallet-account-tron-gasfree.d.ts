/** @typedef {import('@wdk/wallet').TransferOptions} TransferOptions */
/** @typedef {import('@wdk/wallet').TransferResult} TransferResult */
/**
 * @typedef {object} TronGasfreeTransactionReceiptReceiptDetails
 * @property {number} energy_usage - The amount of energy used by the transaction.
 * @property {number} energy_fee - The fee paid for the energy used.
 * @property {number} energy_usage_total - The total energy usage.
 * @property {number} net_fee - The fee paid for network usage.
 * @property {string} result - The result of the transaction (e.g., "SUCCESS").
 */
/**
 * @typedef {object} TronGasfreeTransactionReceiptLog
 * @property {string} address - The address of the contract that emitted the log.
 * @property {string[]} topics - An array of topics for the log.
 * @property {string} data - The data payload of the log.
 */
/**
 * @typedef {object} TronGasfreeTransactionReceiptInternalTransaction
 * @property {string} hash - The hash of the internal transaction.
 * @property {string} caller_address - The address of the caller.
 * @property {string} transferTo_address - The address of the recipient.
 * @property {object[]} callValueInfo - Information about the value transferred.
 * @property {string} note - A note associated with the internal transaction.
 */
/**
 * @typedef {object} TronGasfreeTransactionReceipt
 * @property {string} id - The unique identifier for the transaction.
 * @property {number} fee - The total fee for the transaction.
 * @property {number} blockNumber - The block number in which the transaction was included.
 * @property {number} blockTimeStamp - The timestamp of the block.
 * @property {string[]} contractResult - The result of the contract execution.
 * @property {string} contract_address - The address of the contract.
 * @property {TronGasfreeTransactionReceiptReceiptDetails} receipt - The receipt details of the transaction.
 * @property {TronGasfreeTransactionReceiptLog[]} log - An array of logs emitted by the transaction.
 * @property {TronGasfreeTransactionReceiptInternalTransaction[]} internal_transactions - An array of internal transactions.
 */
/**
 * @typedef {Object} TronGasfreeWalletConfig
 * @property {Object} paymasterToken - The paymaster token configuration.
 * @property {string} paymasterToken.address - The address of the paymaster token.
 * @property {string} provider - The provider URL.
 * @property {string} gasFreeProvider - The gasfree provider URL.
 * @property {string} apiKey - The gasfree provider API key.
 * @property {string} apiSecret - The gasfree provider API secret.
 * @property {string} serviceProvider - The service provider address.
 * @property {string} verifyingContract - The verifying contract address.
 * @property {string} transferMaxFee - The max fee for the transfer.
 * @property {string} chainId - The chain id.
 */
export default class WalletAccountTronGasfree {
    /**
     * Creates a new tron gasfree wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
     * @param {TronGasfreeWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, path: string, config?: TronGasfreeWalletConfig);
    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    protected _config: TronGasfreeWalletConfig;
    /**
     * The tron gasfree free account.
     *
     * @protected
     * @type {string}
     */
    protected _gasFreeAccount: string;
    /** @private */
    private _secureTronSigner;
    /**
     * Returns the account's balance for the paymaster token defined in the wallet account configuration.
     *
     * @returns {Promise<number>} The paymaster token balance (in base unit).
     */
    getPaymasterTokenBalance(): Promise<number>;
    sendTransaction(tx: any): Promise<void>;
    quoteSendTransaction(tx: any): Promise<void>;
    /**
     * Returns the account's address.
     * @returns {Promise<string>} The account's abstracted address.
     */
    getAddress(): Promise<string>;
    /**
     * Transfers a token to another address.
     *
     * @param {TransferOptions} options - The transfer’s options.
     * @returns {Promise<TransferResult>} The transfer's result.
     */
    transfer({ token, recipient, amount }: TransferOptions): Promise<TransferResult>;
    /**
     * Quotes the costs of a transfer operation.
     *
     * @param {TransferOptions} options - The transfer’s options.
     * @returns {Promise<Omit<TransferResult,'hash'>>} The transfer’s quotes.
     */
    quoteTransfer({ token }: TransferOptions): Promise<Omit<TransferResult, "hash">>;
    /**
     * Returns a transaction's receipt.
     *
     * @param {string} hash - The transaction's hash.
     * @returns {Promise<TronGasfreeTransactionReceipt | null>} The receipt, or null if the transaction has not been included in a block yet.
     */
    getTransactionReceipt(hash: string): Promise<TronGasfreeTransactionReceipt | null>;
    /** @private */
    private _getTransferHash;
    /** @private */
    private _getGasfreeAccount;
    /** @private */
    private _makeRequestToGasfreeProvider;
}
export type TransferOptions = any;
export type TransferResult = any;
export type TronGasfreeTransactionReceiptReceiptDetails = {
    /**
     * - The amount of energy used by the transaction.
     */
    energy_usage: number;
    /**
     * - The fee paid for the energy used.
     */
    energy_fee: number;
    /**
     * - The total energy usage.
     */
    energy_usage_total: number;
    /**
     * - The fee paid for network usage.
     */
    net_fee: number;
    /**
     * - The result of the transaction (e.g., "SUCCESS").
     */
    result: string;
};
export type TronGasfreeTransactionReceiptLog = {
    /**
     * - The address of the contract that emitted the log.
     */
    address: string;
    /**
     * - An array of topics for the log.
     */
    topics: string[];
    /**
     * - The data payload of the log.
     */
    data: string;
};
export type TronGasfreeTransactionReceiptInternalTransaction = {
    /**
     * - The hash of the internal transaction.
     */
    hash: string;
    /**
     * - The address of the caller.
     */
    caller_address: string;
    /**
     * - The address of the recipient.
     */
    transferTo_address: string;
    /**
     * - Information about the value transferred.
     */
    callValueInfo: object[];
    /**
     * - A note associated with the internal transaction.
     */
    note: string;
};
export type TronGasfreeTransactionReceipt = {
    /**
     * - The unique identifier for the transaction.
     */
    id: string;
    /**
     * - The total fee for the transaction.
     */
    fee: number;
    /**
     * - The block number in which the transaction was included.
     */
    blockNumber: number;
    /**
     * - The timestamp of the block.
     */
    blockTimeStamp: number;
    /**
     * - The result of the contract execution.
     */
    contractResult: string[];
    /**
     * - The address of the contract.
     */
    contract_address: string;
    /**
     * - The receipt details of the transaction.
     */
    receipt: TronGasfreeTransactionReceiptReceiptDetails;
    /**
     * - An array of logs emitted by the transaction.
     */
    log: TronGasfreeTransactionReceiptLog[];
    /**
     * - An array of internal transactions.
     */
    internal_transactions: TronGasfreeTransactionReceiptInternalTransaction[];
};
export type TronGasfreeWalletConfig = {
    /**
     * - The paymaster token configuration.
     */
    paymasterToken: {
        address: string;
    };
    /**
     * - The provider URL.
     */
    provider: string;
    /**
     * - The gasfree provider URL.
     */
    gasFreeProvider: string;
    /**
     * - The gasfree provider API key.
     */
    apiKey: string;
    /**
     * - The gasfree provider API secret.
     */
    apiSecret: string;
    /**
     * - The service provider address.
     */
    serviceProvider: string;
    /**
     * - The verifying contract address.
     */
    verifyingContract: string;
    /**
     * - The max fee for the transfer.
     */
    transferMaxFee: string;
    /**
     * - The chain id.
     */
    chainId: string;
};
