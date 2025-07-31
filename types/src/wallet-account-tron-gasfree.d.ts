/** @implements {IWalletAccount} */
export default class WalletAccountTronGasfree extends WalletAccountReadOnlyTronGasfree implements IWalletAccount {
    /**
     * Creates a new tron gasfree wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The BIP-44 derivation path (e.g. "0'/0/0").
     * @param {TronGasfreeWalletConfig} config - The configuration object.
     */
    constructor(seed: string | Uint8Array, path: string, config: TronGasfreeWalletConfig);
    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    protected _config: TronGasfreeWalletConfig;
    /** @private */
    private _ownerAccount;
    /**
     * The derivation path's index of this account.
     *
     * @type {number}
     */
    get index(): number;
    /**
     * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)).
     *
     * @type {string}
     */
    get path(): string;
    /**
     * The account's key pair.
     *
     * @type {KeyPair}
     */
    get keyPair(): KeyPair;
    /**
     * Signs a message.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<string>} The message's signature.
     */
    sign(message: string): Promise<string>;
    /**
     * Verifies a message's signature.
     *
     * @param {string} message - The original message.
     * @param {string} signature - The signature to verify.
     * @returns {Promise<boolean>} True if the signature is valid.
     */
    verify(message: string, signature: string): Promise<boolean>;
    /**
     * Sends a transaction.
     *
     * @param {TronTransaction} tx - The transaction.
     * @returns {Promise<TransactionResult>} The transaction's result.
     */
    sendTransaction(tx: TronTransaction): Promise<TransactionResult>;
    /**
     * Transfers a token to another address, paying gas fees with the transferred token.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @param {Object} [config] - A configuration object containing additional options.
     * @param {number} [config.transferMaxFee] - The maximum fee amount for the transfer operation.
     * @returns {Promise<TransferResult>} The transfer's result.
     */
    transfer({ token, recipient, amount }: TransferOptions, config?: { transferMaxFee?: number }): Promise<TransferResult>;
/**
     * Returns a read-only copy of the account.
     * 
     * @returns {Promise<WalletAccountReadOnlyTronGasfree>} The read-only account.
     */
    toReadOnlyAccount(): Promise<WalletAccountReadOnlyTronGasfree>
    /**
     * Disposes the wallet account, erasing the private key from the memory.
     */
    dispose(): void;
    /** @private */
    private _signTypedData;
}
export type IWalletAccount = import("@wdk/wallet").IWalletAccount;
export type KeyPair = import("@wdk/wallet-tron").KeyPair;
export type TronTransaction = import("@wdk/wallet-tron").TronTransaction;
export type TransactionResult = import("@wdk/wallet-tron").TransactionResult;
export type TransferOptions = import("@wdk/wallet-tron").TransferOptions;
export type TransferResult = import("@wdk/wallet-tron").TransferResult;
export type TronTransactionReceipt = import("@wdk/wallet-tron").TronTransactionReceipt;
export type TronGasfreeWalletConfig = import("./wallet-account-read-only-tron-gasfree.js").TronGasfreeWalletConfig;
import WalletAccountReadOnlyTronGasfree from './wallet-account-read-only-tron-gasfree.js';
