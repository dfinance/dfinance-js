/**
 * This module wraps script arguments format
 * from dvm-proto {@link https://github.com/dfinance/dvm-proto}.
 *
 * @module dfinance/script-args
 */

const cosmos = require('cosmos-lib');
const BN     = require('bignumber.js');

/**
 * Map for transforming string type values into
 * protobuf type IDs. Freezed, can't be changed.
 *
 * @type {Enum}
 */
const VMTypeMap = new Map([
    ['bool', 0],
    ['u64',  1],
    ['vector', 2],
    ['address', 3],
    ['u8', 4],
    ['u128', 5],
]);

Object.freeze(VMTypeMap);

exports.arg   = arg;
exports.types = VMTypeMap;

/**
 * Convert wallet1... address to bytes[].
 *
 * @param   {String} addr wallet1-prefixed dfinance address
 * @return  {String}      HEX address representation
 */
function addressToBytes(addr) {
    return cosmos.address.getBytes(addr).toString('base64');
}

/**
 * Convert true/false boolean value to bytes
 *
 * @param   {String|Boolean} bool Boolean value as bool or string type
 * @return  {Buffer}              HEX-encoded boolean value
 */
function boolToBytes(bool) {

    if (bool.constructor === String) {
        bool = (bool === 'false') ? false : true;
    }

    let ret = uintToBytes(+bool, 1);

    return ret;
}

function isHex(h) {
    return (parseInt(h, 16).toString(16) === h.toLowerCase());
}

/**
 * [vectorToBuffer description]
 *
 * @param   {String|Array|Number}  vec
 * @return  {Buffer}
 */
function vectorToBytes(vec) {

    switch (vec.constructor) {
        case String:
            return (isHex(vec))
                ? Buffer.from(vec, 'hex')
                : Buffer.from(vec, 'ascii');

        case Number:
            vec = vec.toString(16);

            if (vec.length % 2 !== 0) {
                vec = '0' + vec;
            }

            return Buffer.from(vec, 'hex');

        case Array:
            return Buffer.from(vec);
    }

    throw new Error('Unsupported type in vector conversion');
}

function u8ToBytes(u8) {
    return uintToBytes(u8, 1);
}

function u64ToBytes(u64) {
    return uintToBytes(u64, 8);
}

function u128ToBytes(u128) {
    return uintToBytes(u128, 16);
}

/**
 * Build a script argument object for given type and value.
 *
 * @param   {String}        type  Argument type
 * @param   {String|Number} value Argument value
 * @return  {ScriptArg}
 */
function arg(type, value) {
    if (!VMTypeMap.has(type)) {
        throw new Error('Unknown type passed as script argument: ' + type);
    }

    switch (type) {
        case 'u8':      value = u8ToBytes(value); break;
        case 'u64':     value = u64ToBytes(value); break;
        case 'u128':    value = u128ToBytes(value); break;
        case 'bool':    value = boolToBytes(value); break;
        case 'vector':  value = vectorToBytes(value); break;
        case 'address': value = addressToBytes(value); break;
    }

    return {
        type: VMTypeMap.get(type),
        value: value.toString('base64')
    };
}

/**
 * Turn Number (as String) to base64 LE
 *
 * @param   {String}  num   Number to transform
 * @param   {Number}  size  Size of uint in bytes (8 for u64, 16 for u128)
 * @return  {Buffer}        Buffer with result
 */
function uintToBytes(num, size) {

    let uint_bn  = new BN(num);
    let uint_hex = uint_bn.toString(16);

    if (uint_hex.length % 2 !== 0) {
        uint_hex = '0' + uint_hex;
    }

    let uint_buf = Buffer.from(uint_hex, 'hex');
    let len = uint_buf.length;

    if (len > size) {
        throw new Error('Too many bytes for ' + size + ' byte uint');
    }

    let uint_res = Buffer.alloc(size);

    for (let j = 0, i = len - 1; i >= 0; i--, j++) {
        uint_res[j] = uint_buf[i];
    }

    return uint_res;
}
