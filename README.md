AFi Testcases execution on mainnet fork:

# to run the mainnet fork with new infura link (Same can be modified for solidity )

npx hardhat node --fork "https://arbitrum.meowrpc.com"

# run test
npx hardhat test ./test/AFiBase.test.js

# solidity- coverage
npx truffle run coverage

# soldiity coverage command
$ npx hardhat coverage --solcoverjs ./.solcover.js 
keep the node running on other terminal


**Missing or unexpected coverage?** Make sure you're using the latest plugin version and run:
```sh
$ npx hardhat clean
$ npx hardhat compile
$ npx hardhat coverage
```

$ npx hardhat clean & npx hardhat compile & npx hardhat coverage

npx hardhat node --fork "https://arbitrum-mainnet.infura.io/v3/28bbb4cc4e7c4e7bbb4ddfcf867aa511"

npx hardhat node --fork "https://arbitrum-mainnet.infura.io/v3/0a434cfb8e5b4aa4934e185ff2581186"

https://site1.moralis-nodes.com/arbitrum/6b2108bfde3944cdbd5a45a8ae941633
