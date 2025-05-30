// const BN = require("bn.js");
// var web3 = require('web3');

// const { USDT, USDT_WHALE, DAI, WETH, USDC } = require("./config");

// const IERC20 = artifacts.require("IERC20");

// contract("IERC20", (accounts) => {

   
//     // const TOKEN = UNI;
//     // const WHALE = "0xBfEd5dB4A855C66452aFe5ec2d27949F185A22bf";
//     // const WHALE = USDT_WHALE;
//     const TOKEN = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
//     const WHALE ="0x2d070ed1321871841245D8EE5B84bD2712644322";

//     let token;
//     beforeEach(async () => {
//         token = await IERC20.at(TOKEN);
//         //daiInstance = await IERC20.at(DAI);
//     });

//     it("should pass", async () => {
//         const bal = await token.balanceOf(WHALE);
//         // let one_eth = web3.toWei(1, "ether");
//         // await web3.eth.sendTransaction({from: accounts[0], to: "0x89071Af5E9Fe930c88935963aa4aB81fB9a17cB0", value: 1000000});
//         console.log(`bal: ${bal}`);
//     });

//     it("should transfer", async () => {
//         const bal = await token.balanceOf(WHALE);
//         console.log(`balance of whealthy address: ${bal}`);

//         await token.transfer(accounts[0], bal, { from: WHALE });
//         //await daiInstance.transfer(accounts[0], bal, { from: WHALE });
//         // // // const balLater= await token.balanceOf(DAI_WHALE);
//         // const balAfter = await token.balanceOf(accounts[0]);

//         const balzero = await token.balanceOf(accounts[0]);
//         //const balzero1 = await daiInstance.balanceOf(accounts[0]);
//         console.log(accounts[0].privateKey)



//         //const balLater = await token.balanceOf("0x6B175474E89094C44Da98b954EedeAC495271d0F");
//         console.log(`bal: ${balzero}`);
//         //console.log(`bal: ${balzero1}`);
//         //console.log(`balAfter: ${balAfter}`);

//         // console.log(`bal: ${balLater}`);

//         // // console.log(`balance Later: ${balLater}`);
//         // const name = await token.name();
//         // console.log(`name: ${name}`);


//         // const tSypply = await token.totalSupply(WHALE);
//         // console.log(tSupply);
//     });

//     // it("should approve", async () => {
//     //   const bal = await token.balanceOf(accounts[0]);
//     //   await token.approve("0x398eC7346DcD622eDc5ae82352F02bE94C62d119", bal, { from: accounts[0] });
//     // });
// });