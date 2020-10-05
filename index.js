// const mnemonic = 'bicycle adapt detect exclude check shift bullet fetch divorce dinner boss crouch stadium autumn long grape ready expire vivid green cloud there wash busy'; // PASTE HERE!


const DFI = require('lib');
const lcs = require('lcs-js');
const dfi = new DFI('https://rest.testnet.dfinance.co/');

// const

const events = new Map([
    ['0x1::Account::SentPaymentEvent', {
        amount: 'u128',
        denom: 'vector<u8>',
        payee: 'address',
        metadata: 'vector<u8>',
    }],
    ['0x1::Account::ReceivedPaymentEvent', {
        amount: 'u128',
        denom: 'vector<u8>',
        payer: 'address',
        metadata: 'vector<u8>',
    }],
]);

for (let [evt, description] of events) {
    lcs.registerType(evt, description);
}

(async () => {

    const txSearch = await dfi.tracker.track({

        // main search params
        sender: 'wallet12tg20s9g4les55vfvnumlkg0a5zk825py9j0ha',
        action: 'execute_script',
        module: 'vm',

        // vm specific params
        vm: {
            module: '0x1::Account',
            event: '0x1::Account::ReceivedPaymentEvent'
        },

    });

    for (let {logs} of txSearch) {
        for (let log of logs) {
            for (let evt of log.vm_events) {
                console.log(evt.source);
                console.log(evt.type);
                console.log(evt.sender_address);
                console.log(
                    lcs.deserialize(
                        Buffer.from(evt.data, 'hex'),
                        events.get(evt.type)
                    )
                );
            }
        }
    }

})();
