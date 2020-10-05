/**
 * Dfinance library for contract support
 *
 * @module dfinance
 */

'use strict';

const API     = require('./api');
const Wallet  = require('./wallet');
const Tracker = require('./tracker');
const TX      = require('./txs');

/**
 * @constructor
 */
module.exports = exports = Dfinance;

function Dfinance(baseUrl, chainId = 'dn-testnet') {

    if (!new.target) {
        return new Dfinance(baseUrl, chainId);
    }

    const api     = new API(baseUrl);
    const tracker = new Tracker(api);

    Object.defineProperties(this, {
        api:     {value: api},
        Wallet:  {value: Wallet},
        tracker: {value: tracker},
        tx:      {value: TX}
    });
}

// Few offline static properties Dfinance
Object.defineProperties(Dfinance, {
    Wallet:  {value: Wallet},
    tx:      {value: TX}
});

/**
 * Shorthand for module compilation
 */
Object.defineProperty(Dfinance.prototype, 'compile', {
    value: function compile(addr, code) {
        return this.api.compile(addr, code);
    }
});
