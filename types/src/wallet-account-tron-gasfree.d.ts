/** @implements {IWalletAccount} */
export default class WalletAccountTronGasfree extends WalletAccountReadOnlyTronGasfree implements IWalletAccount {
    /**
     * Creates a new tron gasfree wallet account from a signer.
     *
     * The signer is wiped on {@link dispose} only if `shouldWipeSignerOnDisposal` is set.
     *
     * @overload
     * @param {ISignerTron} signer - A signer implementing the tron signer interface.
     * @param {TronGasfreeWalletConfig & SignerOptions} config - The configuration object.
     * @throws {ValueError} If only one of the 'gasFreeApiKey' and 'gasFreeApiSecret' options is set.
     */
    constructor(signer: ISignerTron, config: TronGasfreeWalletConfig & SignerOptions);
    /**
     * Creates a new tron gasfree wallet account from a seed.
     *
     * @overload
     * @param {string | Uint8Array} seed - A [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
     * @param {string} path - The BIP-44 derivation path, relative to "m/44'/195'" (e.g. "0'/0/0").
     * @param {TronGasfreeWalletConfig} config - The configuration object.
     * @throws {ValueError} If the seed or the path is not valid.
     * @throws {ValueError} If only one of the 'gasFreeApiKey' and 'gasFreeApiSecret' options is set.
     */
    constructor(seed: string | Uint8Array, path: string, config: TronGasfreeWalletConfig);
    /**
     * Creates the first tron gasfree wallet account (m/44'/195'/0'/0/0) from a seed.
     *
     * @overload
     * @param {string | Uint8Array} seed - A [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
     * @param {TronGasfreeWalletConfig} config - The configuration object.
     * @throws {ValueError} If the seed is not a valid seed or BIP-39 seed phrase.
     * @throws {ValueError} If only one of the 'gasFreeApiKey' and 'gasFreeApiSecret' options is set.
     */
    constructor(seed: string | Uint8Array, config: TronGasfreeWalletConfig);
    /**
     * Creates a new tron gasfree wallet account from a raw private key. The account owns the signer it creates
     * and wipes it on {@link dispose}.
     *
     * @param {string | Uint8Array} privateKey - The raw private key (hex string with or without 0x, or 32 bytes).
     * @param {TronGasfreeWalletConfig} config - The configuration object.
     * @returns {WalletAccountTronGasfree} The wallet account.
     * @throws {ValueError} If the private key is not valid.
     * @throws {ValueError} If only one of the 'gasFreeApiKey' and 'gasFreeApiSecret' options is set.
     */
    static fromPrivateKey(privateKey: string | Uint8Array, config: TronGasfreeWalletConfig): WalletAccountTronGasfree;
    /**
     * The tron gasfree wallet account configuration.
     *
     * @protected
     * @type {TronGasfreeWalletConfig}
     */
    protected _config: TronGasfreeWalletConfig;
    /** @private */
    private _signer;
    /**
     * If true, disposes the signer on calls to the 'dispose' method.
     *
     * @protected
     * @type {boolean}
     */
    protected _shouldWipeSignerOnDisposal: boolean;
    /** @private */
    private _disposed;
    /**
     * True if the wallet account has been disposed.
     *
     * @type {boolean}
     */
    get disposed(): boolean;
    /**
     * The derivation path of this account (see [BIP-44](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)),
     * or null for an account backed by a non-HD signer.
     *
     * @type {string | null}
     */
    get path(): string | null;
    /**
     * The account's key pair.
     *
     * The uint8 arrays are the signer's own, so any external change will reflect to the signer's internal representation. For this reason,
     * it's strongly recommended to treat the key pair as a read-only view of the keys. While it's still technically possible to alter their
     * content, client code should never do so.
     *
     * Null if the account's signer does not expose key material.
     *
     * @type {KeyPair | null}
     */
    get keyPair(): KeyPair | null;
    /**
     * Signs a message.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<string>} The message's signature.
     * @throws {DisposalError} If the wallet account or its signer has been disposed.
     */
    sign(message: string): Promise<string>;
    /**
     * Signs a transaction.
     *
     * @param {TronTransaction} tx - The transaction.
     * @returns {Promise<never>} Never resolves; always throws.
     * @throws {UnsupportedOperationError} Always; tron gasfree accounts only support token transfers.
     */
    signTransaction(tx: TronTransaction): Promise<never>;
    /**
     * Sends a transaction.
     *
     * @param {TronTransaction} tx - The transaction.
     * @returns {Promise<never>} Never resolves; always throws.
     * @throws {UnsupportedOperationError} Always; tron gasfree accounts only support token transfers.
     */
    sendTransaction(tx: TronTransaction): Promise<never>;
    /**
     * Transfers a token to another address, paying gas fees with the transferred token.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @param {Object} [config] - A configuration object containing additional options.
     * @param {number | bigint} [config.transferMaxFee] - The maximum fee amount for the transfer operation (default: the `transferMaxFee` the wallet was configured with).
     * @returns {Promise<TransferResult & TronActivationFee>} The transfer's result.
     * @throws {MaximumFeeExceededError} If the transfer's cost exceeds the maximum transfer fee option.
     * @throws {DisposalError} If the wallet account or its signer has been disposed.
     * @throws {UnsupportedOperationError} If the account's signer does not expose its private key.
     */
    transfer({ token, recipient, amount }: TransferOptions, config?: {
        transferMaxFee?: number | bigint;
    }): Promise<TransferResult & TronActivationFee>;
    /**
     * Returns a read-only copy of the account.
     *
     * @returns {Promise<WalletAccountReadOnlyTronGasfree>} The read-only account.
     */
    toReadOnlyAccount(): Promise<WalletAccountReadOnlyTronGasfree>;
    /**
     * Disposes the wallet account. The signer's private key is erased only if the account owns the signer (created from a
     * seed or private key, or with `shouldWipeSignerOnDisposal`); otherwise a signer you supplied is left untouched.
     * Calling it again has no effect.
     */
    dispose(): void;
    /**
     * Returns the address of the tron account that owns the gasfree account, as given by the signer.
     *
     * @protected
     * @returns {Promise<string>} The owner's address.
     */
    protected _getOwnerAddress(): Promise<string>;
    /** @private */
    private _guardDisposed;
    /** @private */
    private _getTypedDataSigningKey;
    /** @private */
    private _signTypedData;
}
export type IWalletAccount = import("@tetherto/wdk-wallet").IWalletAccount;
export type ValueError = import("@tetherto/wdk-wallet").ValueError;
export type KeyPair = import("@tetherto/wdk-wallet-tron").KeyPair;
export type SignerOptions = import("@tetherto/wdk-wallet-tron").SignerOptions;
export type TronTransaction = import("@tetherto/wdk-wallet-tron").TronTransaction;
export type TransferOptions = import("@tetherto/wdk-wallet-tron").TransferOptions;
export type TransferResult = import("@tetherto/wdk-wallet-tron").TransferResult;
export type TronActivationFee = import("@tetherto/wdk-wallet-tron").TronActivationFee;
export type TronTransactionReceipt = import("@tetherto/wdk-wallet-tron").TronTransactionReceipt;
export type ISignerTron = import("@tetherto/wdk-wallet-tron/signers").ISignerTron;
export type TronGasfreeWalletConfig = import("./wallet-account-read-only-tron-gasfree.js").TronGasfreeWalletConfig;
import WalletAccountReadOnlyTronGasfree from './wallet-account-read-only-tron-gasfree.js';
