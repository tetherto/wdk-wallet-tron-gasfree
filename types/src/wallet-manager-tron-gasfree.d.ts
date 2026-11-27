/** @extends {WalletManager<ISignerTron>} */
export default class WalletManagerTronGasfree extends WalletManager<ISignerTron> {
    /**
     * Creates a new wallet manager for the tron blockchain that implements gasfree features, from a default signer.
     *
     * The default signer must be derivable (it must be able to derive child accounts);
     * non-derivable signers (e.g. private-key signers) are not allowed as the default but
     * may be registered by name via {@link addSigner}.
     * **Warning:** the signer is kept exactly as given, not cloned. Disposing it directly breaks
     * further account derivation, and the manager never disposes a signer you supplied.
     *
     * @overload
     * @param {ISignerTron} signer - The default root signer.
     * @param {TronGasfreeWalletConfig} config - The configuration object.
     * @throws {InvalidSignerError} If the default signer does not support account derivation.
     */
    constructor(signer: ISignerTron, config: TronGasfreeWalletConfig);
    /**
     * Creates a new wallet manager for the tron blockchain that implements gasfree features, from a seed.
     *
     * The manager wraps the seed in a {@link SeedSignerTron} at "m/44'/195'", owns it, and wipes it on
     * {@link dispose}. The seed itself is not kept.
     *
     * @overload
     * @param {string | Uint8Array} seed - A [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
     * @param {TronGasfreeWalletConfig} config - The configuration object.
     * @throws {ValueError} If the seed is not a valid seed or BIP-39 seed phrase.
     */
    constructor(seed: string | Uint8Array, config: TronGasfreeWalletConfig);
    /**
     * If true, disposes the default signer on calls to the 'dispose' method.
     *
     * @protected
     * @type {boolean}
     */
    protected _shouldWipeDefaultSignerOnDisposal: boolean;
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
     * @overload
     * @param {number} [index] - The index of the account to get (default: 0).
     * @param {Object} [options] - Account options.
     * @param {string} [options.signerName] - The name of a signer registered via `addSigner`. Omit to use the default signer.
     * @returns {Promise<WalletAccountTronGasfree>} The account.
     * @throws {ValueError} If the index is not an integer between 0 and 2^31 - 1.
     * @throws {NoSuchElementError} If a signer name is given but no signer is registered with that name.
     * @throws {InvalidSignerError} If the signer doesn't support account derivation.
     * @throws {DisposalError} If the wallet manager or the signer has been disposed.
     */
    getAccount(index?: number, options?: {
        signerName?: string;
    }): Promise<WalletAccountTronGasfree>;
    /**
     * Returns the wallet account backed by a registered signer, without further derivation.
     * Use it for non-derivable signers, such as {@link PrivateKeySignerTron}.
     *
     * @example
     * wallet.addSigner('treasury', new PrivateKeySignerTron(privateKey))
     * const account = await wallet.getAccount('treasury');
     * @overload
     * @param {string} signerName - The signer name registered via {@link addSigner}.
     * @returns {Promise<WalletAccountTronGasfree>} The account.
     * @throws {NoSuchElementError} If no signer is registered with the given name.
     * @throws {DisposalError} If the wallet manager or the given signer has been disposed.
     */
    getAccount(signerName: string): Promise<WalletAccountTronGasfree>;
    /**
     * Returns the wallet account at a specific BIP-44 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/195'/0'/0/1
     * const account = await wallet.getAccountByPath("0'/0/1");
     * @param {string} path - The derivation path (e.g. "0'/0/0").
     * @param {Object} [options] - Account options.
     * @param {string} [options.signerName] - The name of a signer registered via `addSigner`. Omit to use the default signer.
     * @returns {Promise<WalletAccountTronGasfree>} The account.
     * @throws {ValueError} If the path is not valid.
     * @throws {NoSuchElementError} If a signer name is given but no signer is registered with that name.
     * @throws {InvalidSignerError} If the signer doesn't support account derivation.
     * @throws {DisposalError} If the wallet manager or the signer has been disposed.
     */
    getAccountByPath(path: string, options?: {
        signerName?: string;
    }): Promise<WalletAccountTronGasfree>;
    /**
     * Disposes all wallet accounts, clearing secret material from memory, including accounts whose signer does not expose
     * its keys. The default signer is disposed too if the manager created it from a seed; signers you supplied, as the
     * default or via {@link addSigner}, are never disposed. Calling it again has no effect.
     */
    dispose(): void;
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
     * @returns {Promise<FeeRates>} The fee rates (in suns).
     */
    getFeeRates(): Promise<FeeRates>;
}
export type NoSuchElementError = import("@tetherto/wdk-wallet").NoSuchElementError;
export type FeeRates = import("@tetherto/wdk-wallet-tron").FeeRates;
export type ISignerTron = import("@tetherto/wdk-wallet-tron/signers").ISignerTron;
export type PrivateKeySignerTron = import("@tetherto/wdk-wallet-tron/signers").PrivateKeySignerTron;
export type TronGasfreeWalletConfig = import("./wallet-account-tron-gasfree.js").TronGasfreeWalletConfig;
import WalletManager from '@tetherto/wdk-wallet';
import { TronWeb } from 'tronweb';
import WalletAccountTronGasfree from './wallet-account-tron-gasfree.js';
