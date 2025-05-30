// /* eslint-disable no-underscore-dangle */
// const { assert, expect } = require('chai');
// const { ethers, waffle } = require('hardhat');
// const { BigNumber } = require('ethers');
// const { time, constants } = require("@openzeppelin/test-helpers");
// const { provider } = waffle;


// const { abi: AFIBASE_ABI } = require('../artifacts/contracts/AtvBase.sol/AtvBase.json');

// const {
//     // eslint-disable-next-line max-len
//     ONEINCHEXCHANGE_ABI, ONEINCHEXCHANGE_ADDRESS, DAI_ABI, DAI_ADDRESS, SAI_ABI, SAI_ADDRESS, USDT_ABI, USDT_ADDRESS, USDC_ABI, USDC_ADDRESS,
// } = require('../utils/constants');
// const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
// const exp = require('constants');
// const { zeroAddress } = require('ethereumjs-util');

// const getBigNumber = (number) => ethers.BigNumber.from(number);

// describe('AFiBase', () => {
//     let platformWallet; let recipient; let investor1; let investor2;
//     let deadline;
//     let aTokenConInstance;
//     let aTokenConInstance1;

//     // eslint-disable-next-line no-unused-vars
//     let daiConInstance;
//     let usdcConInstance;
//     let usdtConInstance;

//     beforeEach(async () => {
//         const userAccounts = await ethers.getSigners();
//         [platformWallet, recipient, investor1, investor2, other] = userAccounts;

//         const currentTime = await time.latest();
//         deadline = currentTime + (60 * 60);

//         const AFiBase = await ethers.getContractFactory('AtvBase');
//         const AFiManager = await ethers.getContractFactory('AtvManager');
//         const PassiveRebalanceStrategies = await ethers.getContractFactory('AtvPassiveRebalanceStrategies');

//         const AFiStorage = await ethers.getContractFactory('AtvStorage');
//         const AFiFacotry = await ethers.getContractFactory('AtvFactory');
//         const AFiOracle = await ethers.getContractFactory('AtvOracle');

//         // LOCAL CONTRACTS
//         aFiBaseInstace = await AFiBase.deploy();
//         aFiManagerInstance = await AFiManager.deploy();
//         aFiAFiOracleInstance = await AFiOracle.deploy();
//         aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();
//         aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address);
//         aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);
//         console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);

//         const payload = [
//             [
//                 "0x912CE59144191C1204E64559FE8253a0e49E6548", // arb
//                 //"0xfeA31d704DEb0975dA8e77Bf13E04239e70d7c28", // ens
//                 "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK,
//                 "0xEf171a5BA71348eff16616fd692855c2Fe606EB2", //BLUR
//                 "0x3cFD99593a7F035F717142095a3898e3Fca7783e", //IMX
//             ],
//             [
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
//                 //"0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
//             ]
//         ]

//         const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

//         const payloadnew = [
//             ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
//             ["0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7", "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3", "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB"], // USDT, USDC - chainlink oracles
//             uDataPayload,
//             [
//                 "0x0000000000000000000000000000000000000000",
//                 //"0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//             ],
//             [
//                 "0x0000000000000000000000000000000000000000",
//                 //"0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//             ],
//             [
//                 "0x0000000000000000000000000000000000000000",
//                 //"0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//             ],
//             [
//                 "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6",
//                 //"0x0000000000000000000000000000000000000000",
//                 "0x86E53CF1B870786351Da77A57575e79CB55812CB",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//             ],
//             ["3000000", "3000000","2000000","2000000"],
//             [
//                 "0x0000000000000000000000000000000000000000",
//                 //"0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//             ],
//             1
//         ]

//         const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);

//         result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, true, aFiStorageInstance.address,
//             aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"]);

//         aTokenConInstance = await aFiFactoryInstance.aFiProducts(0);

//         //let txObject = await result.wait()

//         //console.log("result++++++++++++++++++++++++", txObject.events[11].args[0]);

//         aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance);
//         //console.log("result++++++++++++++++++++++++", await aTokenConInstance.getPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"));

//         await aFiPassiveRebalanceInstance.setPriceOracle( ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
//         "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
//          "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
//          [
//             "0x912CE59144191C1204E64559FE8253a0e49E6548", // arb
//             //"0xfeA31d704DEb0975dA8e77Bf13E04239e70d7c28", // ens
//             "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
//         ],
//        ["0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
//        "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
//        "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB"], // USDT, USDC - chainlink oracles
//        [
//         "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6",
//         //"0x0000000000000000000000000000000000000000",
//         "0x86E53CF1B870786351Da77A57575e79CB55812CB",
//        ],
//          )

//         await aFiAFiOracleInstance.intializeStalePriceDelay(aTokenConInstance.address, [
//             "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
//             "0x912CE59144191C1204E64559FE8253a0e49E6548", // arb
//             "0xfeA31d704DEb0975dA8e77Bf13E04239e70d7c28", // ens
//             "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
//             "0xEf171a5BA71348eff16616fd692855c2Fe606EB2", //BLUR
//             "0x3cFD99593a7F035F717142095a3898e3Fca7783e", //IMX
//         ], [
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//         ]);

//         await aTokenConInstance.updateTVLUpdatePeriod(3000);
//         await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);

//         // // Transfer all AFinance Tokens to PLATFORM_WALLET
//         // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

//         // MAINNET CONTRACT INSTANCES
//         daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS);
//         usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
//         usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);


//         const accountToInpersonate = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
//         const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

//         await hre.network.provider.request({
//             method: "hardhat_impersonateAccount",
//             params: [accountToInpersonate],
//         });
//         const signer = await ethers.getSigner(accountToInpersonate);

//         const ether = (amount) => {
//             const weiString = ethers.utils.parseEther(amount.toString());
//             console.log("+++", BigNumber.from(weiString));
//             return BigNumber.from(weiString);
//         };

//         console.log("check__++", ether(1))
//         /**
//         * GIVE APPROVAL TO AFi of DEPOSIT TOKEN
//         * THIS IS REQUIRED WHEN 1% fee IS TRANSFEREED FROM INVESTOR TO PLATFORM WALLET
//         */

//         console.log("print the productttttttttttt", usdtConInstance.address);

//         console.log("print the productttttttttttt", aTokenConInstance.address);

//         await usdtConInstance.connect(investor1).approve(
//             aTokenConInstance.address,
//             ethers.constants.MaxUint256
//         );

//         await usdtConInstance.connect(investor2).approve(
//             aTokenConInstance.address,
//             ethers.constants.MaxUint256
//         );

//         await usdcConInstance.connect(investor1).approve(
//             aTokenConInstance.address,
//             ethers.constants.MaxUint256
//         );

//         await usdcConInstance.connect(investor2).approve(
//             aTokenConInstance.address,
//             ethers.constants.MaxUint256
//         );

//         // await daiConInstance.connect(investor1).approve(
//         //     aTokenConInstance.address,
//         //     ethers.constants.MaxUint256
//         // );

//         // await daiConInstance.connect(investor2).approve(
//         //     aTokenConInstance.address,
//         //     ethers.constants.MaxUint256
//         // );

//         // const daiBalance = await daiConInstance.balanceOf(accountToInpersonate)
//         // console.log("whale dai balance", daiBalance / 1e18)
//         // console.log("transfering to", accountToFund)


//         // await daiConInstance.connect(signer).transfer(investor1.address, daiBalance);

//         // const accountBalance = await daiConInstance.balanceOf(investor1.address)
//         // console.log("transfer complete")
//         // console.log("funded account balance", accountBalance / 1e18)

//         var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
//         let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate);
//         usdcBalance = usdcBalance / 100;

//         console.log("usdcBalance", usdcBalance);
//         await usdcConInstance.connect(signer).transfer(investor1.address, "10654653354");
//         await usdcConInstance.connect(signer).transfer(investor2.address, "10654653354");

//         console.log("usdtBalance", usdtBalance)
//         usdtBalance = usdtBalance / 100;
//         console.log("usdtBalance", usdtBalance)
//         await usdtConInstance.connect(signer).transfer(investor1.address, "208790359575");
//         await usdtConInstance.connect(signer).transfer(investor2.address, "208790359575");

//         await aFiAFiOracleInstance.updateMidToken(
//             [
//                 "0x912CE59144191C1204E64559FE8253a0e49E6548", // arb
//                 //"0xfeA31d704DEb0975dA8e77Bf13E04239e70d7c28", // ens
//                 "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK,
//                 "0xEf171a5BA71348eff16616fd692855c2Fe606EB2", //Blur
//                 "0x3cFD99593a7F035F717142095a3898e3Fca7783e" //IMX
//             ],
//             [
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
//                 //"0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
//             ]
//         );

//         await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
//         await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);

//         const poolPayload = [
//             [
//                 "0x912CE59144191C1204E64559FE8253a0e49E6548", // arb
//                 //"0xfeA31d704DEb0975dA8e77Bf13E04239e70d7c28", // ens
//                 "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
//                 "0xEf171a5BA71348eff16616fd692855c2Fe606EB2", //Blur
//                 "0x3cFD99593a7F035F717142095a3898e3Fca7783e", //IMX
//                 "0x354A6dA3fcde098F8389cad84b0182725c6C91dE"   // COMP
//             ],
//             [
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
//                 //"0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
//                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
//             ],
//             [
//                 "0x92c63d0e701CAAe670C9415d91C474F686298f00",
//                 //"0x005377Dbf6dd39f05896081f366f3A2999A1168C",
//                 "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",
//                 "0x26F13e104C2F2796AeF0f73A61121C6fc105cD66",
//                 "0xDfA19e743421C394d904f5a113121c2227d2364b",
//                 "0x37c70B381504a24d9e1BE23611C0EEda698bF53E"

//             ],
//             [
//                 "0x92c63d0e701CAAe670C9415d91C474F686298f00",
//                 //"0x005377Dbf6dd39f05896081f366f3A2999A1168C",
//                 "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",
//                 "0x26F13e104C2F2796AeF0f73A61121C6fc105cD66",
//                 "0xDfA19e743421C394d904f5a113121c2227d2364b",
//                 "0x37c70B381504a24d9e1BE23611C0EEda698bF53E"

//             ],
//             [
//                 [[
//                     "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",  // Pool USDT-WETH (Stables- I/O tokens)
//                     //"0x42161084d0672e1d3F26a9B53E653bE2084ff19C",  // Pool USDT-WETH (Stables- I/O tokens)
//                     "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",  // Pool USDT-WETH (Stables- I/O tokens)
//                     "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",
//                     "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",
//                     "0x42161084d0672e1d3F26a9B53E653bE2084ff19C"

//                 ]], [[
//                     "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",  // pool USDC-WETH (Stables- I/O tokens)
//                     //"0x6f38e884725a116C9C7fBF208e79FE8828a2595F",  // pool USDC-WETH (Stables- I/O tokens)
//                     "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",  // pool USDC-WETH (Stables- I/O tokens)
//                     "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
//                     "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",  // pool USDC-WETH (Stables- I/O tokens)
//                     "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",  // pool USDC-WETH (Stables- I/O tokens)
//                 ]],
//                 [[
//                     "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87",
//                     //"0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87",
//                     "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87",
//                     "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87",
//                     "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87",
//                     "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87"
//                 ]]
//             ],
//             [
//                 "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",
//                 "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
//                 "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87"
//             ]
//         ]
//         const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
//         await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], unipooldata);

//         const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
//         await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

//         console.log("transfer complete")
//         console.log("funded account balance usdttttttttt", investorusdtBalance)
//     });

//     context('Basic checks for deposit and withdraw', () => {
//         it("withdraw check", async () => {
//             const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
//             console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

//             var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
//             await aTokenConInstance.connect(investor1).updatePool(poolValue);

//             await aTokenConInstance.connect(investor1).deposit(
//                 1000000000, usdtConInstance.address, false
//             );

//             let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address);
//             console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`);

//             const nav1 = await aTokenConInstance.depositUserNav(investor1.address);
//             console.log("user nav1", `${nav1}`);

//             const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
//             console.log("Nav from storage", `${NavfromStorage}`);

//             await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

//             const swapParams = {
//                 afiContract: aTokenConInstance.address,
//                 oToken: usdtConInstance.address,
//                 cSwapFee: 1000000,
//                 depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
//                 minimumReturnAmount: [0, 0],
//                 iMinimumReturnAmount: [0, 0, 0, 0], // Adjust according to your contract's expectations
//                 underlyingTokens: [
//                     "0x912CE59144191C1204E64559FE8253a0e49E6548", // arb
//                     //"0xfeA31d704DEb0975dA8e77Bf13E04239e70d7c28", // ens
//                     "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK,
//                     "0xEf171a5BA71348eff16616fd692855c2Fe606EB2", //Blur,
//                     "0x3cFD99593a7F035F717142095a3898e3Fca7783e" //IMX
//                 ],
//                 newProviders: [0, 0, 0, 0], // Fill this with the new providers' information
//                 _deadline: deadline,
//                 cometToClaim: [],
//                 cometRewardTokens: [],
//                 rewardTokenMinReturnAmounts: []
//             };

//             await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams,0);

//             const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
//             console.log("Nav from storage after cswap", `${NavfromStorageAfter}`);

//             // const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
//             // console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
//             // const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
//             // console.log("After deposit user usdc balance", `${AfterusdcBalance}`)


//             // const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
//             // console.log("aficontract usdt balance", `${afibalance}`)

//             // const Afterbal = await aTokenConInstance.balanceOf(
//             //   investor1.address
//             // );
//             // console.log("Afterbal", `${Afterbal}`)

//             // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
//             // await aTokenConInstance.connect(investor1).updatePool(poolValue);

//             // const minimumReturnAmount = [0, 0, 0, 0, 0];

//             // const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
//             // const returnString = Amount.map(bn => bn.toString());

//             // const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
//             // console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

//             // await aTokenConInstance.connect(investor1).withdraw(
//             //     197801111576383300n, usdtConInstance.address, deadline, returnString, false, 3
//             // );

//             // const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
//             // console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
//         });

//     })

// })