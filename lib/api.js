
/**
 * DFI API module.
 * Implements class to work with DFI REST API.
 *
 * @module dfinance/api
 */

'use strict';

const {URL}   = require('url');
const request = require('request-promise-native');
const rp  = (uri) => (typeof uri === 'string')
    ? request({uri, json: true})
    : request(uri);

/**
 * DFI REST API.
 */
module.exports = class API {

    /**
     * @constructor
     * @param {String} restAPI URL of rest api base path.
     */
    constructor(restAPI) {
        this.restAPI = restAPI;
    }

    rawRequest(uri) {
        return rp(this.path(uri));
    }

    /**
     * Get list of validators from DFI
     *
     * @return {Promise}
     */
    getValidators() {
        return rp(this.path('/poa/validators'))
            .then(({result}) => result.validators);
    }

    /**
     * Compile
     */
    compile(address, code) {
        return rp({
            uri: this.path('/vm/compile'),
            json: true,
            method: 'POST',
            body: {
                address,
                code
            }
        }).then((rs) => rs.result);
    }

    /**
     * Get index of validator.
     *
     * 1. We assume that list of validators is immutable and order is permanent
     * 2. All new validators are added into the end of the list, so previous positions are saved
     *
     * Caveats: when validator loses his position, other validators are moved as well, so
     * currently we don't have solution for covering this case.
     *
     * @param  {String}           address Address to check in list of validators
     * @return {Promise<Array>}           Order number of Validator in list / null when not present and total number of validators
     */
    async getValidatorIndex(address) {
        const validators = await this.getValidators();
        const index      = validators.map((acc) => acc.address).indexOf(address);

        return [
            (index === -1) ? null : (index + 1),    // index
            validators.length,                      // total
            validators                              // all of 'em
        ];
    }

    /**
     * Get account from rest api.
     *
     * @param {String}  address Address of account.
     * @param {Promise}
     */
    getAccount(address) {
        return rp(this.path(`/auth/accounts/${address}`))
            .then(resp => resp && resp.result.value || null);
    }

    /**
     * Get destroys per page.
     *
     * @param  {Number} page  Page number.
     * @param  {Number} limit Limit of destoys per page.
     *
     * @return {Promise}
     */
    getDestroys(page, limit) {
        return rp(this.path(`/currencies/withdraws?page=${page}&limit=${limit}`)).then(resp => (resp.result || []));
    }

    /**
     * Get transaction by hash.
     *
     * @param  {String}  hash Transaction hash.
     * @return {Promise}
     */
    getTransactionByHash(hash) {
        return rp(this.path(`/txs/${hash}`)).then(resp => resp.result);
    }

    /**
     * Get human-readable response for issue status
     *
     * @param  {String} uniqueID Unique ID to query issue
     * @return {Object}          Issue status in readable format
     */
    async getIssueStatus(uniqueID) {
        const status = await this.getCallByUniqueId(uniqueID).catch((err) => err);

        if (!status) {
            return {
                exists: false,
                msgId: null,
                approved: false,
                votes: [],
                data: [],
                creator: null,
                raw: null
            };
        }

        return {
            exists:    true,
            msgId:     status.call.id,
            msgData:   status.call.msg_data,
            approved:  status.call.approved,
            votes:     status.votes,
            creator:   status.call.creator,
            raw:       status
        };
    }

    /**
     * Get list of supported tickers
     */
    getOracleAssets() {
        return rp(this.path('/oracle/assets'));
    }

    /**
     * Get price for specific ticker, e.g. ETH_BTC
     */
    getPrice(ticker) {
        return rp(this.path(`/oracle/currentprice/${ticker.toLowerCase()}`));
    }

    /**
     * Get multisig call by unique ID.
     * Unique id is usually sha256(chainID + symbol + txHash) serialized to hex.
     *
     * @param  {String}  uniqueID Multisig call unique ID.
     * @return {Promise}
     */
    getCallByUniqueId(uniqueID) {
        return rp(this.path(`/multisig/unique/${uniqueID}`))
            .then(resp => resp.result)
            .catch((e) => {
                const error = parseError(e);
                if (error.code == 403) { // not found error, return null
                    return null;
                }
            });
    }

    /**
     * Broadcast signed tx to dfi.
     *
     * @param  {Object}  tx   Signed transaction object.
     * @param  {String}  mode Mode of broadcasting, 'async', 'sync', or 'block'.
     * @return {Promise}
     */
    broadcastTx(tx, mode = 'async') {
        return rp({
            json: true,
            method: 'POST',
            uri: this.path('/txs'),
            body: {
                tx,
                mode
            }
        }).catch((err) => Promise.reject(parseError(err)));
    }

    path(urlPath = '') {
        return new URL(urlPath, this.restAPI).toString();
    }
};

/**
 * Parse error from rest api.
 *
 * @param  {Object} e Error object.
 * @return {Object}   Parsed rest api error object.
 */
function parseError(rpErr) {
    try {
        return JSON.parse(rpErr.error.error);
    } catch (err) {
        return rpErr.error;
    }
}
