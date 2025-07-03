// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict'

/** @typedef {import('@wdk/wallet-tron').FeeRates} FeeRates */
/** @typedef {import('@wdk/wallet-tron').KeyPair} KeyPair */
/** @typedef {import('@wdk/wallet-tron').TronTransaction} TronTransaction */
/** @typedef {import('@wdk/wallet-tron').TransactionResult} TransactionResult */
/** @typedef {import('@wdk/wallet-tron').TransferOptions} TransferOptions */
/** @typedef {import('@wdk/wallet-tron').TransferResult} TransferResult */

/** @typedef {import('./src/wallet-account-tron-gasfree.js').TronGasfreeTransactionReceipt} TronGasfreeTransactionReceipt */
/** @typedef {import('./src/wallet-account-tron-gasfree.js').TronGasfreeWalletConfig} TronGasfreeWalletConfig */

export { default } from './src/wallet-manager-tron-gasfree.js'

export { default as WalletAccountTronGasfree } from './src/wallet-account-tron-gasfree.js'
