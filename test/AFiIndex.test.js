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
//                 "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
//                 "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
//                 "0x514910771AF9Ca656af840dff83E8264EcF986CA",  // LINK
//                 "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",  //MATIC
//                 "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",  //MKR
//                 "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",   //AAVE
//                 "0xD533a949740bb3306d119CC777fa900bA034cd52",    //CRV
//                 "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
//                 "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
//                 "0x4a220E6096B25EADb88358cb44068A3248254675"
//             ],
//             [
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of DAI
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDC
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDT
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//             ]
//         ]

//         const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

//         const payloadnew = [
//             ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], //USDT, USDC - payment tokens
//             ["0x3E7d1eAB13ad0104d2750B8863b489D65364e32D", "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9"], // USDT, USDC - chainlink oracles
//             uDataPayload,
//             [
//                 "0x5Ee5bf7ae06D1Be5997A1A72006FE6C607eC6DE8",
//                 "0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8",
//                 "0xF6D2224916DDFbbab6e6bd0D1B7034f4Ae0CaB18",
//                 "0x5E8C8A7243651DB1384C0dDfDbE39761E8e7E51a",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x8A458A9dc9048e005d22849F470891b840296619",
//                 "0xA700b4eB416Be35b2911fd5Dee80678ff64fF6C9",
//                 "0x7B95Ec873268a6BFC6427e7a28e396Db9D0ebc65",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x9A44fd41566876A39655f74971a3A6eA0a17a454",
//                 "0x0000000000000000000000000000000000000000"
//             ],
//             [
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000"
//             ],
//             [
//                 "0xf4030086522a5beea4988f8ca5b36dbc97bee88c", //WBTC
//                 "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419", //WETH
//                 "0x553303d460ee0afb37edff9be42922d8ff63220e", //UNI
//                 "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c", //LINK
//                 "0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676", //MATIC
//                 "0xec1d1b3b0443256cc3860e24a46f108e699484aa", //MKR
//                 "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9",  //AAVE
//                 "0xCd627aA160A6fA45Eb793D19Ef54f5062F20f33f",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000"
//             ],
//             ["1000000", "1000000", "1000000", "1000000", "1000000", "1000000", "1000000", "1000000", "500000", "500000", "1000000"
//                 //  "500000", "500000", "1000000"
//             ],
//             [
//                 "0x0000000000000000000000000000000000000000",
//                 "0xA17581A9E3356d9A858b789D68B4d866e593aE94",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000",
//                 "0x0000000000000000000000000000000000000000"
//             ],
//             1
//         ]

//         const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);

//         result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, true, aFiStorageInstance.address,
//             aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"]);

//         aTokenConInstance = await aFiFactoryInstance.aFiProducts(0);

//         //let txObject = await result.wait()

//         //console.log("result++++++++++++++++++++++++", txObject.events[11].args[0]);

//         aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance);
//         //console.log("result++++++++++++++++++++++++", await aTokenConInstance.getPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"));

//         await aFiAFiOracleInstance.intializeStalePriceDelay(aTokenConInstance.address, [
//             "0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F",
//             "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
//             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
//             "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
//             "0x514910771AF9Ca656af840dff83E8264EcF986CA",  // LINK
//             "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",  //MATIC
//             "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",  //MKR
//             "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",   //AAVE
//             "0xD533a949740bb3306d119CC777fa900bA034cd52",    //CRV
//             "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
//             "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
//             "0x4a220E6096B25EADb88358cb44068A3248254675"

//         ], [
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500,
//             86500
//         ]);

//         await aTokenConInstance.updateTVLUpdatePeriod(3000);
//         await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);

//         // // Transfer all AFinance Tokens to PLATFORM_WALLET
//         // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

//         // MAINNET CONTRACT INSTANCES
//         daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS);
//         usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
//         usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);


//         const accountToInpersonate = "0x9E4E147d103deF9e98462884E7Ce06385f8aC540"
//         const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

//         await hre.network.provider.request({
//             method: "hardhat_impersonateAccount",
//             params: [accountToInpersonate],
//         });
//         const signer = await ethers.getSigner(accountToInpersonate);

//         const ether = (amount) => {
//             const weiString = ethers.utils.parseEther(amount.toString());
//             return BigNumber.from(weiString);
//         };

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

//         await daiConInstance.connect(investor1).approve(
//             aTokenConInstance.address,
//             ethers.constants.MaxUint256
//         );

//         await daiConInstance.connect(investor2).approve(
//             aTokenConInstance.address,
//             ethers.constants.MaxUint256
//         );

//         const daiBalance = await daiConInstance.balanceOf(accountToInpersonate)
//         console.log("whale dai balance", daiBalance / 1e18)
//         console.log("transfering to", accountToFund)


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
//                 "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
//                 "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
//                 "0x514910771AF9Ca656af840dff83E8264EcF986CA",  // LINK
//                 "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",  //MATIC
//                 "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",  //MKR
//                 "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",   //AAVE
//                 "0xD533a949740bb3306d119CC777fa900bA034cd52",    //CRV
//                 "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
//                 "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
//                 "0x4a220E6096B25EADb88358cb44068A3248254675"
//             ],
//             [
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of DAI
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDC
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDT
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//             ],
//         );

//         await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
//           await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
//         const poolPayload = [
//             [
//                 "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
//                 "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
//                 "0x514910771AF9Ca656af840dff83E8264EcF986CA",  // LINK
//                 "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",  //MATIC
//                 "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",  //MKR
//                 "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",   //AAVE
//                 "0xD533a949740bb3306d119CC777fa900bA034cd52",    //CRV
//                 "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
//                 "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
//                 "0x4a220E6096B25EADb88358cb44068A3248254675"
//             ],
//             [
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of DAI
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDC
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDT
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
//             ],
//             [
//                 "0xCBCdF9626bC03E24f779434178A73a0B4bad62eD",  // pool WBTC - WETH
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // pool WETH - WETH
//                 "0x1d42064Fc4Beb5F8aAF85F4617AE8b3b5B8Bd801",   // pool UNI - WETH
//                 "0xa6Cc3C2531FdaA6Ae1A3CA84c2855806728693e8",
//                 "0x290a6a7460b308ee3f19023d2d00de604bcf5b42",
//                 "0xe8c6c9227491c0a8156a0106a0204d881bb7e531",
//                 "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB",
//                 "0x919Fa96e88d67499339577Fa202345436bcDaf79",
//                 "0x2f62f2b4c5fcd7570a709dec05d68ea19c82a9ec",
//                 "0xa3f558aebaecaf0e11ca4b2199cc5ed341edfd74",
//                 "0x24EE2c6B9597F035088CDa8575E9D5e15a84B9DF"

//             ],
//             [
//                 "0xCBCdF9626bC03E24f779434178A73a0B4bad62eD",  // pool WBTC - WETH
//                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // pool WETH - WETH
//                 "0x1d42064Fc4Beb5F8aAF85F4617AE8b3b5B8Bd801",   // pool UNI - WETH
//                 "0xa6Cc3C2531FdaA6Ae1A3CA84c2855806728693e8",
//                 "0x290a6a7460b308ee3f19023d2d00de604bcf5b42",
//                 "0xe8c6c9227491c0a8156a0106a0204d881bb7e531",
//                 "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB",
//                 "0x919Fa96e88d67499339577Fa202345436bcDaf79",
//                 "0x2f62f2b4c5fcd7570a709dec05d68ea19c82a9ec",
//                 "0xa3f558aebaecaf0e11ca4b2199cc5ed341edfd74",
//                 "0x24EE2c6B9597F035088CDa8575E9D5e15a84B9DF"
//             ],
//             [
//                 [[
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36", // Pool USDT-WETH (Stables- I/O tokens)
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36", // Pool USDT-WETH (Stables- I/O tokens)
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",  // Pool USDT-WETH (Stables- I/O tokens)
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",  // Pool USDT-WETH (Stables- I/O tokens)
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
//                     "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
//                 ]], [[
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", // pool USDC-WETH (Stables- I/O tokens)
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8", // pool USDC-WETH (Stables- I/O tokens)
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",  // pool USDC-WETH (Stables- I/O tokens)
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",  // pool USDC-WETH (Stables- I/O tokens)
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
//                     "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
//                 ]],
//                 [[
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
//                     "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
//                 ]]
//             ],
//             [
//                 "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
//                 "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
//                 "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
//             ]
//         ]

//         const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
//         await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], unipooldata);

//         const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
//         await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

//         console.log("transfer complete")
//         console.log("funded account balance usdttttttttt", investorusdtBalance)
//     });

//     context('Basic checks for deposit and withdraw', () => {

//         it("withdraw check if tvl is not updated", async () => {
//             var nav1 = await aTokenConInstance.depositUserNav(investor1.address);
//             console.log("user nav1 before deposit", `${nav1}`);

//             const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
//             console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

//             const isOTokenWhitelisted = await aTokenConInstance.isOTokenWhitelisted(usdtConInstance.address);
//             expect(isOTokenWhitelisted).to.equal(true);

//             await aFiAFiOracleInstance.increaseObservation("0x2f62f2b4c5fcd7570a709dec05d68ea19c82a9ec", 26);

//             var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
//             await aTokenConInstance.connect(investor1).updatePool(poolValue);

//             await aTokenConInstance.connect(investor1).deposit(
//                 10000000000, usdtConInstance.address, false
//             );

//             let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address);
//             console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`);

//             nav1 = await aTokenConInstance.depositUserNav(investor1.address);
//             console.log("user nav1 after deposit", `${nav1}`);

//             const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
//             console.log("Nav from storage", `${NavfromStorage}`);

//             await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

//             const swapParams = {
//                 afiContract: aTokenConInstance.address,
//                 oToken: usdtConInstance.address,
//                 cSwapFee: 1000000,
//                 depositTokens: ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"],
//                 minimumReturnAmount: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
//                 iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
//                 underlyingTokens: ["0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
//                     "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
//                     "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", // UNI
//                     "0x514910771AF9Ca656af840dff83E8264EcF986CA",  // LINK
//                     "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",  //MATIC
//                     "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",  //MKR
//                     "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",   //AAVE
//                     "0xD533a949740bb3306d119CC777fa900bA034cd52",    //CRV
//                     "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
//                     "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
//                     "0x4a220E6096B25EADb88358cb44068A3248254675"
//                 ],// Fill this array if your function expects specific tokens
//                 newProviders: [2, 3, 2, 2, 0, 2, 2, 2, 0, 2, 0], // Fill this with the new providers' information
//                 _deadline: deadline,
//                 cometToClaim: [],
//                 cometRewardTokens: [],
//                 rewardTokenMinReturnAmounts: []
//             };

//             await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams,0);

//             poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
//             await aTokenConInstance.connect(investor1).updatePool(poolValue);

//             await aTokenConInstance.connect(investor2).deposit(
//                 10000000000, usdtConInstance.address, false
//             );

//             const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
//             console.log("Nav from storage after cswap", `${NavfromStorageAfter}`);

//             const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
//             console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
//             const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
//             console.log("After deposit user usdc balance", `${AfterusdcBalance}`)


//             const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
//             console.log("aficontract usdt balance", `${afibalance}`)

//             const Afterbal = await aTokenConInstance.balanceOf(
//                 investor1.address
//             );
//             console.log("Afterbal", `${Afterbal}`)


//             const minimumReturnAmount = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

//             const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
//             const returnString = Amount.map(bn => bn.toString());

//             poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
//             await aTokenConInstance.connect(investor1).updatePool(poolValue);

//             await aTokenConInstance.connect(investor1).withdraw(
//                 197801111576383300n, usdtConInstance.address, deadline, returnString, false, 1
//             )

//             const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
//             console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
//             const AfterwithusdcBalance = await usdcConInstance.balanceOf(investor1.address)
//             console.log("After withdraw user usdc balance", `${AfterwithusdcBalance}`)
//         });

//     })
// })