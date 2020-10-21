# dfinance js

The most effective way to work with dfinance smart contracts on NodeJS.

## Examples

```
npm install dfinance
```

### Search contract events

```JavaScript

const DFI = require('dfinance');
const dfi = new DFI('https://rest.testnet.dfinance.co/');

(async () => {

    const txSearch = await dfi.tracker.track({

        // main search params
        sender: 'wallet12tg20s9g4les55vfvnumlkg0a5zk825py9j0ha',
        action: 'execute_script',
        module: 'vm',
        // Search fromBlock, toBlock
        // Also you can use: {block: value}
        // to search in specific block
        block: [0, 200000],

        // vm specific params
        vm: {
            module: '0x1::Account',
            event: '0x1::Account::ReceivedPaymentEvent'
        },

    });

    console.log(JSON.stringify(txSearch, null, 4));
})();
```

### Compile scripts/modules and execute them!

```JavaScript
const mnemonic = '...'; // PASTE HERE!
const DFI = require('dfinance');
const dfi = new DFI('https://rest.testnet.dfinance.co/');

(async () => {

    const wallet = new dfi.Wallet(mnemonic);
    const addr   = wallet.address;
    const script = await dfi.compile(addr, `
        script {
            use 0x1::Account;
            use 0x1::Coins::ETH;

            fun main(acc: &signer) {
                Account::pay_from_sender<ETH>(
                    acc,
                    0x1,
                    100000
                )
            }
        }
    `);

    const gas = '500000'; // 200k-300k is enough
    const account = await dfi.api.getAccount(addr);

    // also you can .publishModule
    const execScriptTx = dfi
        .tx({account, wallet, gas})
        .executeScript(script.code);

    const res = await dfi.api.broadcastTx(execScriptTx, 'block');

    console.log(res);

})();
```

### Multi script publish + arguments

```JavaScript
const mnemonic = '...'; // PASTE HERE!
const DFI = require('dfinance');
const dfi = new DFI('https://rest.testnet.dfinance.co/');

(async () => {

    const wallet = new dfi.Wallet(mnemonic);
    const addr   = wallet.address;
    const script = await dfi.compile(addr, `
        script {
            use 0x1::Account;
            use 0x1::XFI::T as XFI;

            fun main(
                account: &signer,
                payee: address,
                amount: u128
            ) {
                Account::pay_from_sender<XFI>(
                    account,
                    payee,
                    amount
                );
            }
        }
    `);

    const gas = '500000'; // 200k-300k is enough
    const account = await dfi.api.getAccount(addr);
    const tx = dfi
        .tx({account, wallet, gas})
        .multi()
        .executeScript(script.code, DFI.scriptArg([
            // &signer should never be passed!
            ['address', 'wallet12tg20s9g4les55vfvnumlkg0a5zk825py9j0ha'],
            ['u128', '100000000']
        ]))
        .executeScript(script.code, DFI.scriptArg([
            ['address', '0x1'],
            ['u128', '1000']
        ]))
        // .publishModule or .executeScript is also available here!
        .combine();

    const res = await dfi.api.broadcastTx(execScriptTx, 'block');

    console.log(res);

})();
```
