/**
 * Simple wallet lib to wrap crypto logic and don't bother
 * everyone with details.
 *
 * @module dfinance/wallet
 */

'use strict';

const cosmos = require('cosmos-lib');

module.exports = exports = Wallet;

/**
 * DFI wallet which covers crypto-related operations
 *
 * @param       {String} mnemonic BIP39 mnemonic to do crypto stuff
 * @param       {String} path     Path through mnemonic
 * @constructor
 */
function Wallet(mnemonic, path = "m/44'/118'/0'/0/0") {

    if (!new.target) {
        return new Wallet(mnemonic, path);
    }

    const keys    = cosmos.crypto.getKeysFromMnemonic(mnemonic, path);
    const address = cosmos.address.getAddress(keys.publicKey, 'wallet');

    Object.defineProperties(this, {
        address:    {value: address},
        publicKey:  {value: keys.publicKey},
        privateKey: {value: keys.privateKey}
    });
}

/**
 * Sign an object. Required for transactions
 *
 * @param  {Object} obj Object to sign
 * @return {Buffer}     Signed object as Buffer
 */
Wallet.prototype.sign = function sign(obj) {
    return cosmos.crypto.signJson(obj, this.privateKey);
};
