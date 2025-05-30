/* eslint-disable no-underscore-dangle */
const { assert, expect } = require('chai');
const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { time, constants } = require("@openzeppelin/test-helpers");
const { provider } = waffle;
const axios = require("axios");
const { abi: AFIBASE_ABI } = require('../artifacts/contracts/AtvBase.sol/AtvBase.json');

const {
    // eslint-disable-next-line max-len
    ONEINCHEXCHANGE_ABI, ONEINCHEXCHANGE_ADDRESS, DAI_ABI, DAI_ADDRESS, SAI_ABI, SAI_ADDRESS, USDT_ABI, USDT_ADDRESS, USDC_ABI, USDC_ADDRESS,
} = require('../utils/constants');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const exp = require('constants');
const { zeroAddress } = require('ethereumjs-util');

const swapTokens = require('./getOneInchData.js');
const swapTokens2 = require('./getOneInchData2.js');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getBigNumber = (number) => ethers.BigNumber.from(number);

describe('AFiBase', () => {
    let platformWallet; let recipient; let investor1; let investor2;
    let deadline;
    let aTokenConInstance;
    let aTokenConInstance1;
    let oneInchParam;
    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;

    before(async () => {

        oneInchParam = {
            firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
        }

        const userAccounts = await ethers.getSigners();
        [platformWallet, recipient, investor1, investor2, other] = userAccounts;

        const feeData = await hre.ethers.provider.getFeeData();

        const currentTime = await time.latest();
        deadline = currentTime + (60 * 60);

        const AFiBase = await ethers.getContractFactory('AtvBase');
        const AFiManager = await ethers.getContractFactory('AtvManager');
        const PassiveRebalanceStrategies = await ethers.getContractFactory('AtvPassiveRebalanceStrategies');
        const DataConsumerWithSequencerCheck = await ethers.getContractFactory('DataConsumerWithSequencerCheck');
        const AFiStorage = await ethers.getContractFactory('AtvStorage');
        const AFiFacotry = await ethers.getContractFactory('AtvFactory');
        const AFiOracle = await ethers.getContractFactory('AtvOracle');

        aFiBaseInstace = await AFiBase.deploy("AFi802", "AFi");
        aFiManagerInstance = await AFiManager.deploy();
        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();
        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address);
        // aFiDelayModule = await delayModule.deploy(86400, 172800);

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);
        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address, aFiFactoryInstance.address);

        dataConsumerWithSequencerCheckInstance = await DataConsumerWithSequencerCheck.deploy({
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });

        console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);

        await aFiAFiOracleInstance.setOracleSequencer(dataConsumerWithSequencerCheckInstance.address);

        const payload = [
            [
                "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI

            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
            ]
        ]

        const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

        const payloadnew = [
            ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
            uDataPayload,
            [
                "0x078f358208685046a11C85e8ad32895DED33A249",
                "0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8",
                "0x0000000000000000000000000000000000000000",
            ],
            [
                "0xD3204E4189BEcD9cD957046A8e4A643437eE0aCC",
                "0x0000000000000000000000000000000000000000",
                "0x46Eca1482fffb61934C4abCA62AbEB0b12FEb17A",

            ],
            ["0x0000000000000000000000000000000000000000",
            "0x563B46Cddd026Ee909C75eF5D125A94136799Ac1",
            "0x0000000000000000000000000000000000000000" ],
            ["0", "0", "0"],
            ["5000000", "2500000", "2500000"],
            [
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",

            ],
            2
        ]

        const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);
        console.log("checkkkkkk");
        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"]);

        aTokenConInstance = await aFiFactoryInstance.aFiProducts(0);

        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance);

        await aFiPassiveRebalanceInstance.setPriceOracle(
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
            ],
            [
                "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            ],
            ["0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
                "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
                "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB"], // USDT, USDC - chainlink oracles
            [
                "0xd0C7101eACbB49F3deCcCc166d238410D6D46d57",
                "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
                "0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720",
                "0x86E53CF1B870786351Da77A57575e79CB55812CB",
            ],
        );
        console.log("checkkkkkk111");


        console.log("checkkkkkk2222");
        await aFiPassiveRebalanceInstance.intializeStalePriceDelay([
            "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
            "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
            "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
            "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
            "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
        ], [
            86500,
            86500,
            86500,
            86500,
            86500,
            86500,
            86500
        ]);

        await aTokenConInstance.setplatformWallet(platformWallet.address);
        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);

        // // Transfer all AFinance Tokens to PLATFORM_WALLET
        // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

        // MAINNET CONTRACT INSTANCES
        daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS);
        usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
        usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);


        const accountToInpersonate = "0x1AB4973a48dc892Cd9971ECE8e01DcC7688f8F23"
        const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate],
        });
        const signer = await ethers.getSigner(accountToInpersonate);

        const accountToInpersonate2 = "0x1F7bc4dA1a0c2e49d7eF542F74CD46a3FE592cb1"

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate2],
        });
        const signer2 = await ethers.getSigner(accountToInpersonate2);

        const ether = (amount) => {
            const weiString = ethers.utils.parseEther(amount.toString());
            return BigNumber.from(weiString);
        };

        /**
        * GIVE APPROVAL TO AFi of DEPOSIT TOKEN
        * THIS IS REQUIRED WHEN 1% fee IS TRANSFEREED FROM INVESTOR TO PLATFORM WALLET
        */

        console.log("print the productttttttttttt", usdtConInstance.address);

        console.log("print the productttttttttttt", aTokenConInstance.address);

        await usdtConInstance.connect(investor1).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        await usdtConInstance.connect(investor2).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        await usdcConInstance.connect(investor1).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        await usdcConInstance.connect(investor2).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
        let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate2);
        usdcBalance = usdcBalance / 100;

        console.log("usdcBalance", usdcBalance);
        await usdcConInstance.connect(signer2).transfer(investor1.address, "10288395691");
        await usdcConInstance.connect(signer2).transfer(investor2.address, "10288395691");

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 100;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "208790359575");
        await usdtConInstance.connect(signer).transfer(investor2.address, "208790359575");

        await aFiPassiveRebalanceInstance.updateMidToken(
            [
                "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            ]
        );

        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
        console.log("checkkkkk4");
        const poolPayload = [
            [
                "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                "0x354A6dA3fcde098F8389cad84b0182725c6C91dE"   // COMP
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            ],
            [
                "0x2f5e87C9312fa29aed5c179E456625D79015299c",  // pool WBTC - WETH
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // pool WETH - WETH
                "0xff96D42dc8E2700ABAb1f1F82Ecf699caA1a2056",   // pool UNI - WETH
                "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",
                "0xDfA19e743421C394d904f5a113121c2227d2364b"

            ],
            [
                "0x2f5e87C9312fa29aed5c179E456625D79015299c",  // pool WBTC - WETH
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // pool WETH - WETH
                "0xff96D42dc8E2700ABAb1f1F82Ecf699caA1a2056",   // pool UNI - WETH
                "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",
                "0xDfA19e743421C394d904f5a113121c2227d2364b"

            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d", // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d"
                ]], [[
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0", // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0"
                ]],
                [[
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001",
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001",
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001",
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001",
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
                ]]
            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                "0xC6962004f452bE9203591991D15f6b388e09E8D0",
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
            ]
        ]
        const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
        await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], unipooldata);
        console.log("checkkkkkk555");
        const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aFiManagerInstance.setRebalanceController(platformWallet.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
        await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);

        console.log("transfer complete")
        console.log("funded account balance usdttttttttt", investorusdtBalance)
    });

    context('Basic checks for deposit and withdraw', () => {
        it("withdraw check", async () => {
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`);

            await aTokenConInstance.connect(investor1).deposit(
                200000000, usdtConInstance.address
            );

            let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address);
            console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`);

            const nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1", `${nav1}`);

            const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdtConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                ],  // Fill this array if your function expects specific tokens expects specific tokens
                newProviders: [1, 1, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };


            let swap, swap1, swap2;
            try {

                const tokenIn = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';  // Provide your tokenIn address
                const tokenOut = '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'; // Provide your tokenOut address
                const amountIn = '88500000';  // Amount to swap
                const from = aTokenConInstance.address;     // Provide the from address
                const origin = aTokenConInstance.address;

                swap = await swapTokens2(
                    tokenIn,
                    tokenOut,
                    amountIn,
                    from,
                    origin
                );

                const tokenIn1 = '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';  // Provide your tokenIn address
                const tokenOut1 = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'; // Provide your tokenOut address
                const amountIn1 = '24500000';  // Amount to swap
                const from1 = aTokenConInstance.address;     // Provide the from address
                const origin1 = aTokenConInstance.address;

                await sleep(1000);

                swap1 = await swapTokens2(
                    tokenIn1,
                    tokenOut1,
                    amountIn1,
                    from1,
                    origin1
                );

                await sleep(1000);

                swap2 = await swapTokens2(
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    "24500000",
                    aTokenConInstance.address,
                    aTokenConInstance.address
                );


            } catch (error) {
                console.error("Error during swaps:", error);
            }

            const oneInchParam = {
                firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
                secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
                firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
                secondIterationCumulativeSwap: [
                    swap,
                    swap1,
                    swap2
                ]
            }

            // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            // console.log("(((((((((((((((((((((())))))))))))))))))))))");

            // await aTokenConInstance.connect(investor1).approveForOneInch(["0xdAC17F958D2ee523a2206206994597C13D831ec7"],["73000000"]);
            await aFiPassiveRebalanceInstance.connect(platformWallet).setDexForTokenPair("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", 1);
            await aFiPassiveRebalanceInstance.connect(platformWallet).setDexForTokenPair("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 1);

            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            console.log("cs calllllllllllllllllllllllllllllllll");
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",  0);

            const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage after cswap", `${NavfromStorageAfter}`);

            const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
            const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
            console.log("After deposit user usdc balance", `${AfterusdcBalance}`)


            const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
            console.log("aficontract usdt balance", `${afibalance}`)

            const Afterbal = await aTokenConInstance.balanceOf(
                investor1.address
            );

            console.log("Afterbal", `${Afterbal}`)

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);


            const minimumReturnAmount = [0, 0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)
        });
    })
})