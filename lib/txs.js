/**
 * Transaction builder
 * @example
 * ```
 * const TX = require('lib/txs');
 *
 * const pubModTx = TX({account, wallet, gas}).publishModule(moduleCode);
 * const result   = await api.broadcastTx(pubModTx, 'block');
 * ```
 *
 * @module dfinance/txs
 */

'use strict';

/**
 * @interface Message       Base message interface for Cosmos-SDK
 * @property {String} type  Message action (or type)
 * @property {Object} value Message specific value
 */

/**
 * @interface TxParams        Common TX parameters, valid for every transaction
 * @property {Object} account Account instance for sequence and public key
 * @property {Wallet} wallet  Wallet instance to sign tx
 * @property {String} gas     Amount of gas for tx
 * @property {String} chainId Dnode chainId (dn-testnet is default)
 */

/**
 * @interface MsgBuilder
 * Generic function which takes {@link TxParams} as first argument
 * and returns {@link Message} type. Other arguments may vary
 */


/**
 * @type {Map<String, MsgBuilder>}
 *
 * TODO:
 * - Optionally allow developers to implement custom builders
 * by adding new handles to this Map.
 */
const msgBuilders = new Map([
    ['executeScript', executeScriptMsg],
    ['publishModule', publishModuleMsg]
])

/**
 * @example
 * ```
 * // we have wallet, account and gas (and chainId)
 * const TX = require('lib/tx');
 *
 * let execScriptTx = TX({wallet, account, gas}).executeScript(script, args);
 * let pubModTx = TX({wallet, account, gas, chainId}).publishModule(code);
 *
 * // or multiple messsages at once!
 * let multiTx = TX({wallet, account, gas})
 *     .multi()
 *     .executeScript(script1, args)
 *     .executeScript(script2)
 *     .publishModule(modCode)
 *     .combine();
 * ```
 *
 * @param   {TxParams} txParams Predefined parameters for this tx
 * @return  {Object<Function>}  Object with message builders
 */
module.exports = exports = function prepareTx(txParams) {

    const ret = {};

    for (let [key, builder] of msgBuilders) {
        ret[key] = function msgBuilder(...args) {
            return wrapStdTx(txParams, [
                builder(txParams, ...args)
            ]);
        };
    }

    ret.multi = multi.bind(null, txParams);

    return ret;
};

Object.defineProperties(exports, {
    wrapStdTx: {value: wrapStdTx},
    msgBuilders: {get: () => msgBuilders},
    executeScriptMsg: {value: executeScriptMsg},
    publishModuleMsg: {value: publishModuleMsg},
});

function multi(txParams) {

    let ret = {
        msgs: [],
        combine() {
            return wrapStdTx(txParams, this.msgs);
        }
    };

    for (let [key, builder] of msgBuilders) {
        ret[key] = function msgBuilder(...args) {
            const msg = builder(txParams, ...args);
            ret.msgs.push(msg);
            return ret;
        }
    }

    return ret;
};

/**
 * @type {MsgBuilder}
 *
 * @param  {Wallet}  wallet Wallet instance to get address
 * @param  {String}  script Hex-encoded script (result of compilation)
 * @param  {?Array}  args   Arguments (currently unsupported)
 *
 * @return {Message}
 */
function executeScriptMsg({wallet}, script, args = null) {
    return {
        type: 'vm/MsgExecuteScript',
        value: {
            args,
            script: Buffer.from(script, 'hex').toString('base64'),
            signer: wallet.address,
        }
    };
}

/**
 * @type {MsgBuilde}
 *
 * @param  {Wallet} wallet Wallet instance to get address
 * @param  {String} code   Hex-encoded module code (result of compilation)
 *
 * @return {Message}
 */
function publishModuleMsg({wallet}, code) {
    return {
        type: 'vm/MsgDeployModule',
        value: {
            module: Buffer.from(code, 'hex').toString('base64'),
            signer: wallet.address,
        },
    }
}

/**
 * Wrap {@link Message} into standard Cosmos SDK transaction object
 *
 * @param {TxParams} txParams Transaction params
 * @param {Message}  msg      Message
 *
 * @return {Object} Correct transaction message - signed and verified
 */
function wrapStdTx({account, wallet, gas, chainId}, msgs) {

    const objectToSign = {
        account_number: account.account_number.toString(),
        chain_id: chainId || 'dn-testnet',
        fee: { amount: [ { amount: '1', denom : 'xfi' } ], gas },
        memo: '',
        msgs,
        sequence: account.sequence.toString()
    };

    const signature = wallet.sign(objectToSign);

    return {
        type: 'cosmos-sdk/StdTx',
        msg: msgs,
        fee: objectToSign.fee,
        memo: objectToSign.memo,
        signatures: [
            {
                account_number: account.account_number,
                pub_key: {
                    type: 'tendermint/PubKeySecp256k1',
                    value: wallet.publicKey.toString('base64')
                },
                sequence:  account.sequence,
                signature: signature.toString('base64')
            }
        ]
    };
}
