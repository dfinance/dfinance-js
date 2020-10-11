/**
 * Easily search transactions via REST endpoint
 *
 * @module dfi-tracker
 */

'use strict';

const {URLSearchParams} = require('url');

/**
 * Mapping from human-readable keys to Cosmos-SDK
 *
 * @type {Map<String, String>}
 */
const keyMap = new Map([

    ['limit', 'limit'],

    ['action', 'message.action'],
    ['sender', 'message.sender'],
    ['module', 'message.module'],

    ['vm.module', 'vm.contract_events.source'],
    ['vm.event',  'vm.contract_events.type'],
    ['vm.sender', 'vm.contract_events.sender_address'],
    ['vm.status', 'vm.contract_status.status'],

    ['transfer.recipient', 'transfer.recipient'],
    ['transfer.sender',    'transfer.sender'],
    ['transfer.amount',    'transfer.amount'],
]);

/**
 * @constructor
 * @param   {API} api API instance for querying
 */
module.exports = exports = function Tracker(api) {

    if (!new.target) {
        return new Tracker(api);
    }

    /**
     * @property {Function} track
     */
    Object.defineProperties(this, {
        buildFilter: {value: buildFilter},
        track: {value: function searchTxs(query) {
            const search = new URLSearchParams(buildFilter(query)).toString();

            return api
                .rawRequest('/txs?' + search)
                .then((res) => res.txs.map(formatTx));
        }}
    });
};

/**
 * Basic formatter, removes rawLog property
 *
 * @param  {Object} tx Cosmos-SDK TX
 * @return {Object}    Prettified version of TX with parsed logs
 */
function formatTx(tx) {
    return {
        height: tx.height,
        txhash: tx.txhash,
        timestamp: tx.timestamp,
        gas: {
            wanted: tx.gas_wanted,
            used: tx.gas_used
        },
        logs: parseTxLogs(tx.logs),
        rawTx: tx.tx,
    };
}

/**
 * Build filter query based on user input
 * {@see keyMap} for details of these transformations
 *
 * @param   {Object} query Query with grouping (vm, transfers)
 * @return  {Object}       Resulting set of keys
 */
function buildFilter(query = {}) {
    let res = {};

    Object.keys(query).forEach((key) => {

        // allow filtering by block either by using [:2] array
        // or by passing the block height directly
        if (key === 'block' && query[key]) {

            let arr = (query[key].constructor !== Array)
                ? [query[key]]
                : query[key];

            if (arr[0] === null || arr[0] === undefined) {
                throw new Error('Block Filter requires parameter to be Number/String or Array of two Numbers/Strings');
            }

            res['tx.minheight'] = arr[0];
            res['tx.maxheight'] = arr[1] || arr[0];

            console.log(res);

            return;
        }

        // for objects do unwrapping, if vm is an object, then
        // we walk through inner keys, join them with . (dot) sign
        // and search for that path in our mapping. Easy-peasy!
        if (query[key].constructor === Object) {
            Object.keys(query[key]).forEach((subKey) => {
                let prop = [key, subKey].join('.');

                if (keyMap.has(prop)) {
                    res[keyMap.get(prop)] = query[key][subKey];
                }
            });
        }

        // this one is for main keys
        if (keyMap.has(key)) {
            res[keyMap.get(key)] = query[key];
        }
    });

    return res;
}

/**
 * Parses Transaction logs, that simple and yet not so.
 *
 * @param  {Object[]} logs Raw TX Logs
 * @return {Object}        Parsed and grouped logs for tx
 */
function parseTxLogs(logs) {
    return logs.map((log) => {

        const res = {
            messages:  [],
            transfers: [],
            vm_events: [],
            vm_status: []
        };

        for (let evt of log.events) {
            switch (evt.type) {
                case 'message':
                    for (let chunk of intoPieces(evt.attributes, 3)) {
                        res.messages.push(kvArrToObj(chunk));
                    }

                    break;

                case 'transfer':

                    for (let chunk of intoPieces(evt.attributes, 3)) {
                        res.transfers.push(kvArrToObj(chunk));
                    }

                    break;

                case 'vm.contract_events':
                    for (let chunk of intoPieces(evt.attributes, 4)) {
                        res.vm_events.push(kvArrToObj(chunk));
                    }

                    break;

                case 'vm.contract_status':
                    res.vm_status.push(kvArrToObj(evt.attributes));
                    break;

                default:
                    console.log('UNKNOWN LOG!!!!', evt);
            }
        }

        return res;
    });
}

/**
 * Cuts KV array into chunks of N elements
 * @generator
 */
function* intoPieces(arr, numEl = 1, cb) {

    if ((arr.length % numEl) !== 0) {
        return null;
    }

    while (arr.length) {
        yield arr.slice(0, numEl);
        arr = arr.slice(numEl);
    }
}

/**
 * Turns [{key: <key>, value: <value>}, ...] into {key1: value, key2: value}
 *
 * @param   {Object[]} arr Array of KV records (Objects)
 * @return  {Object}       Object with KV taken from input
 */
function kvArrToObj(arr = []) {
    return arr.reduce((a, b) => Object.assign(a, {[b.key]: b.value}), {});
}
