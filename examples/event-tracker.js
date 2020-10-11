/**
 * Tracker for CDP contract.
 * Knows when margin call happens (or about to happen).
 * Optional TODO: implement tracking logic.
 */

'use strict';

const REST_URL = process.env.REST_URL || 'https://rest.testnet.dfinance.co/';
const CHAIN_ID = process.env.CHAIN_ID || 'dn-testnet';

const DFI = require('../lib');
const dfi = new DFI(REST_URL, CHAIN_ID);

const TRACKED_CONTRACT = process.env.TRACKED_CONTRACT || '0x1::Account';
const TRACKED_EVENT    = process.env.TRACKED_EVENT    || '0x1::Account::ReceivedPaymentEvent';
const BLOCK_FROM       = process.env.BLOCK_FROM       || '0';
const BLOCK_TO         = process.env.BLOCK_TO         || '199263'; // some random value

(async () => {

    return dfi.tracker.track({

        action: 'execute_script',
        module: 'vm',
        block: [BLOCK_FROM, BLOCK_TO],

        vm: {
            module: TRACKED_CONTRACT,
            event:  TRACKED_EVENT
        }

    });

})().then((res) => console.log(JSON.stringify(res, null, 4)));
