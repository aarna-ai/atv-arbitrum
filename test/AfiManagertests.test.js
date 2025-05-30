/* eslint-disable no-underscore-dangle */
const { assert, expect } = require('chai');
const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { time, constants } = require("@openzeppelin/test-helpers");
const { provider } = waffle;


const { abi: AFIBASE_ABI } = require('../artifacts/contracts/AtvBase.sol/AtvBase.json');

const {
    // eslint-disable-next-line max-len
    ONEINCHEXCHANGE_ABI, ONEINCHEXCHANGE_ADDRESS, DAI_ABI, DAI_ADDRESS, SAI_ABI, SAI_ADDRESS, USDT_ABI, USDT_ADDRESS, USDC_ABI, USDC_ADDRESS,
} = require('../utils/constants');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');

const getBigNumber = (number) => ethers.BigNumber.from(number);

describe('AFi Product 101', function (accounts) {
    this.timeout(0);

    let platformWallet; let recipient; let investor1; let investor2; let other;
    let investor3;
    let deadline;
    let deployedAFiBase;
    let aTokenConInstance;
    let datasequencer;


    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let linkToken;
    let oneInchParam;
    before(async () => {

        oneInchParam = {
            firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
        }


        const userAccounts = await ethers.getSigners();
        [platformWallet, recipient, investor1, investor2, investor3, other] = userAccounts;

        const currentTime = await time.latest();
        deadline = currentTime + (60 * 60);

        const AFiBase = await ethers.getContractFactory('AtvBase');
        const AFiManager = await ethers.getContractFactory('AtvManager');
        const PassiveRebalanceStrategies = await ethers.getContractFactory('AtvPassiveRebalanceStrategies');

        const AFiStorage = await ethers.getContractFactory('AtvStorage');
        const AFiFacotry = await ethers.getContractFactory('AtvFactory');
        const AFiOracle = await ethers.getContractFactory('AtvOracle');
        const DataConsumerWithSequencerCheck = await ethers.getContractFactory('DataConsumerWithSequencerCheck');
        const AFiTimeDelayContract = await ethers.getContractFactory('TimeDelayModule');

        const feeData = await hre.ethers.provider.getFeeData();

        // LOCAL CONTRACTS
        aFiBaseInstace = await AFiBase.deploy("AFiBase", "AFB", {
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });
        aFiManagerInstance = await AFiManager.deploy({
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });
        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy({
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });
        datasequencer = await DataConsumerWithSequencerCheck.deploy({
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });
        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address, {
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address, {
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });
        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address, aFiFactoryInstance.address, {
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });
        aFiTimeLockInstance = await AFiTimeDelayContract.deploy(investor1.address, 100, 172800, {
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });
        console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);
        const payload = [
            [
                "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                // "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                // "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            ]
        ]

        const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload);
        await aFiAFiOracleInstance.setOracleSequencer(datasequencer.address);


        const payloadnew = [
            ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
            uDataPayload,
            [
                "0x078f358208685046a11C85e8ad32895DED33A249",
                // "0x912ce59144191c1204e64559fe8253a0e49e6548",
                "0x0000000000000000000000000000000000000000",
                "0x191c10Aa4AF7C30e871E70C95dB0E4eb77237530",
            ],
            [
                "0x0000000000000000000000000000000000000000",
                // "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            ["0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000"
             ],
            ["0", "0", "0"],
            ["3000000", "3000000",
                "4000000"],
            [
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            2
        ]

        const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);
        console.log("Payload encoded");

        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"]);

        deployedAFiBase = await aFiFactoryInstance.aFiProducts(0);

        console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);


        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, deployedAFiBase);

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
                "0x912CE59144191C1204E64559FE8253a0e49E6548"
            ],
            [
                "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
                "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
                "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB"
            ], // USDT, USDC - chainlink oracles
            [
                "0xd0C7101eACbB49F3deCcCc166d238410D6D46d57",
                "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
                "0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720",
                "0x0000000000000000000000000000000000000000",
                "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6"
            ],
        )

        await expect(aFiPassiveRebalanceInstance.connect(investor1).intializeStalePriceDelay([
            "0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F",
            "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
            "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
            "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL

        ], [
            86500,
            86500,
            86500,
            86500,
            86500,
            86500,
            86500,
            86500
        ])).to.be.reverted;


        await aFiPassiveRebalanceInstance.intializeStalePriceDelay([
            "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
            "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
            "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
            "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
            "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            "0x912ce59144191c1204e64559fe8253a0e49e6548"
        ], [
            86500,
            86500,
            86500,
            86500,
            86500,
            86500,
            86500,
            86500
        ]);

        await expect(aFiAFiOracleInstance.connect(investor1).setAFiStorage(aFiStorageInstance.address)).to.be.reverted;

        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
        await aTokenConInstance.setplatformWallet(platformWallet.address);

        // await aFiAFiOracleInstance.updateRebalContract(aFiPassiveRebalanceInstance.address);

        // // Transfer all AFinance Tokens to PLATFORM_WALLET
        // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

        // MAINNET CONTRACT INSTANCES
        daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS);
        usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
        usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);
        linkToken = await ethers.getContractAt(DAI_ABI, "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4");

        const accountToInpersonate = "0x1AB4973a48dc892Cd9971ECE8e01DcC7688f8F23"
        const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate],
        });
        const signer = await ethers.getSigner(accountToInpersonate)

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
        let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate);

        await usdcConInstance.connect(signer).transfer(investor1.address, usdcBalance);
        console.log("usdcBalance", usdcBalance);

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 3;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "10000000000");
        await usdtConInstance.connect(signer).transfer(investor2.address, "10000000000");

        const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

        await aFiPassiveRebalanceInstance.updateMidToken(
            [
                "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            ]
        );
        const poolPayload = [
            [
                "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            ],
            [
                "0x2f5e87C9312fa29aed5c179E456625D79015299c",  // pool WBTC - WETH
                "0xff96D42dc8E2700ABAb1f1F82Ecf699caA1a2056",   // pool UNI - WETH
                "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",

            ],
            [
                "0x2f5e87C9312fa29aed5c179E456625D79015299c",  // pool WBTC - WETH
                "0xff96D42dc8E2700ABAb1f1F82Ecf699caA1a2056",   // pool UNI - WETH
                "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d", // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // Pool USDT-WETH (Stables- I/O tokens)
                ]],
                [[
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0", // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool USDC-WETH (Stables- I/O tokens)
                ]],
                [[
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001",
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001",
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001",
                ]]
            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                "0xC6962004f452bE9203591991D15f6b388e09E8D0",
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
            ]
        ]
        const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
        await aFiPassiveRebalanceInstance.initUniStructure(
            ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
            unipooldata)
        await aFiManagerInstance.setRebalanceController(investor1.address);
        await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);

        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        // await aFiManagerInstance.setRebalanceController(platformWallet.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);

        console.log("funded account balance usdt", investorusdtBalance)
    });

    describe('Basic checks for deposit and withdraw', () => {

        it("active rebalance scenario 1 check with DAI", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
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
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

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

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            const uniPayload = [[
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            ],
            [
                "0x2e85e2c100ddfd1b1680187ee7bCbb60a0608414"
            ],
            [
                "0x2e85e2c100ddfd1b1680187ee7bCbb60a0608414"
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d"
                ]], [[
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F"
                ]], [[
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
                ]]
            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], encodedUniPayload);

            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            );

            await aFiPassiveRebalanceInstance.intializeStalePriceDelay([
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ], [
                86500
            ]);

            const newUToken = "0x912ce59144191c1204e64559fe8253a0e49e6548";
            const payload = [
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);

            var res = await aTokenConInstance.getProportions();

            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            console.log("AFiController set");

            var mid = await aFiAFiOracleInstance.getMidToken("0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0");
            console.log("mid", mid);

            await aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    daiConInstance.address,
                    newUToken,
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    1,
                    [],
                    res[0],
                    res[1],
                    1,
                    2
                ],
                deadline,
                [0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                ],
                { gasLimit: 20000000 }
            );

            res = await aTokenConInstance.getProportions();
            console.log("after rebal uTokProp", res);

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("active rebalance scenario 2 check with DAI", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            await aTokenConInstance.connect(investor1).deposit(
                4000000000, usdtConInstance.address
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
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam,  "0x", 0);

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

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            const uniPayload = [[
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            ],
            [
                "0x2e85e2c100ddfd1b1680187ee7bCbb60a0608414"
            ],
            [
                "0x2e85e2c100ddfd1b1680187ee7bCbb60a0608414"
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d"
                ]], [[
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F"
                ]], [[
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
                ]]
            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], encodedUniPayload);

            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            );

            await aFiPassiveRebalanceInstance.intializeStalePriceDelay([
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ], [
                86500
            ]);

            const newUToken = "0x912ce59144191c1204e64559fe8253a0e49e6548";
            const payload = [
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);

            var res = await aTokenConInstance.getProportions();

            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            console.log("AFiController set");
            // await aFiAFiOracleInstance.increaseObservation("0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff", 2);

            await aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    daiConInstance.address,
                    newUToken,
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    2,
                    [
                    ],
                    res[0],
                    res[1],
                    1,
                    2
                ],
                deadline,
                [0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ],
                { gasLimit: 20000000 }
            );

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('reverts when invoked by non owner wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const newTeamWallet = investor2.address;

            await expect(aFiManagerInstance.connect(newTeamWallet).addTeamWalletInAFi(
                aFiStorageInstance.address,
                aTokenConInstance.address,
                newTeamWallet
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('unpause the contract', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            // when manager contract is not already paused
            await expect(aFiManagerInstance.unPause()).to.be.reverted;

            await aFiManagerInstance.pause();
            await aFiManagerInstance.connect(platformWallet).unPause();
            expect((await aFiManagerInstance.getPauseStatus())).to.equal(false);
            await aFiManagerInstance.pause();
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('pause the contract from a non owner wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            // when manager contract is not already paused
            await expect(aFiManagerInstance.connect(investor1).pause()).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('pause and unpause the contract from a non owner wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiManagerInstance.pause();
            await expect(aFiManagerInstance.connect(investor1).unPause()).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('pause the contract when it is already paused', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiManagerInstance.pause();
            // when manager contract is already paused
            await expect(aFiManagerInstance.connect(investor1).pause()).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('withdraw from pools', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            var two_Week = 2 * 60 * 60;
            await time.increase(two_Week);

            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            //await aTokenConInstance.connect(investor1).updatePool(poolValue);
            console.log("1");
            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
            );
            console.log("2");

            await time.increase(two_Week);

            await aFiManagerInstance.withdrawFromPool(aFiStorageInstance.address, aTokenConInstance.address, "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599");
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('withdraw from pools revert when called from non owner', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await expect(aFiManagerInstance.connect(investor1).withdrawFromPool(aFiStorageInstance.address, aTokenConInstance.address, "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599")).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('withdraw from pools revert when vault is paused', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiManagerInstance.pause();
            await expect(aFiManagerInstance.withdrawFromPool(aFiStorageInstance.address, aTokenConInstance.address, "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599")).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('reverts when newTeamWallet address is zero address', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(
                aFiManagerInstance.addTeamWalletInAFi(
                    aFiStorageInstance.address,
                    aTokenConInstance.address,
                    constants.ZERO_ADDRESS
                )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('reverts when trying to add a wallet in paused vault', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiManagerInstance.pause();
            await expect(
                aFiManagerInstance.addTeamWalletInAFi(
                    aFiStorageInstance.address,
                    aTokenConInstance.address,
                    constants.ZERO_ADDRESS
                )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('reverts when trying to add a wallet from a non owner wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await expect(
                aFiManagerInstance.connect(investor1).addTeamWalletInAFi(
                    aFiStorageInstance.address,
                    aTokenConInstance.address,
                    constants.ZERO_ADDRESS
                )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('reverts when trying to add an existing team wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const firstTeamWallet = investor2.address;
            await expect(
                aFiManagerInstance.addTeamWalletInAFi(
                    aFiStorageInstance.address,
                    aTokenConInstance.address,
                    firstTeamWallet
                )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('adds newTeamWallet successfully', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const newTeamWallet = investor3.address;
            const teamWalletBefore = await aFiStorageInstance.getTeamWalletsOfAFi(aTokenConInstance.address);
            await aFiManagerInstance.addTeamWalletInAFi(
                aFiStorageInstance.address,
                aTokenConInstance.address,
                newTeamWallet
            );

            const teamWalletAfter = await aFiStorageInstance.getTeamWalletsOfAFi(aTokenConInstance.address);
            console.log(`${teamWalletBefore}`);
            console.log(`${teamWalletAfter}`);
            expect(teamWalletAfter.length).to.greaterThan(teamWalletBefore.length);
            expect(teamWalletAfter[teamWalletAfter.length - 1]).to.equal(newTeamWallet);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('after adding a new team wallet teamWallets length is 2', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            expect(
                (await aFiStorageInstance.getTeamWalletsOfAFi(aTokenConInstance.address)).length,
                2,
                'Team wallets length do not match',
            );
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('check the active status of team wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiStorageInstance.deactivateTeamWallet(
                aTokenConInstance.address, investor1.address
            );

            const deactivated = false;
            const { isPresent, isActive } = await aFiStorageInstance.getTeamWalletDetails(
                aTokenConInstance.address, investor1.address);
            console.log(" isPresent isActive ", `${isPresent}`, `${isActive}`);
            expect(isActive).to.equal(deactivated);
            await ethers.provider.send('evm_revert', [snapshotId]);

        })

        it('check the active status of team wallet after reactivate', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiStorageInstance.deactivateTeamWallet(
                aTokenConInstance.address, investor1.address
            );
            await aFiStorageInstance.reActivateTeamWallet(
                aTokenConInstance.address, investor1.address
            );

            const reactivated = true;
            const { isPresent, isActive } = await aFiStorageInstance.getTeamWalletDetails(
                aTokenConInstance.address, investor1.address);
            console.log(" isPresent isActive ", `${isPresent}`, `${isActive}`);
            expect(isActive).to.equal(reactivated);
            await ethers.provider.send('evm_revert', [snapshotId]);

        })

        it('reverts when previous and new active status are the same ', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(
                aFiStorageInstance.reActivateTeamWallet(
                    aTokenConInstance.address, investor2.address
                )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('afi active status are the same', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiManagerInstance.setActiveRebalStatus(
                aFiStorageInstance.address, aTokenConInstance.address, false
            )
            const status = await aFiStorageInstance.isAFiActiveRebalanced(aTokenConInstance.address);
            expect(status).to.equal(false);
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('afi active status when contract is paused', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiManagerInstance.pause();
            await expect(aFiManagerInstance.setActiveRebalStatus(
                aFiStorageInstance.address, aTokenConInstance.address, false
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('afi active status from a non owner wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(aFiManagerInstance.connect(investor1).setActiveRebalStatus(
                aFiStorageInstance.address, aTokenConInstance.address, false
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('reverts when scenario is greater than 3', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const uniPayload = [[
                "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
                "0xc00e94Cb662C3520282E6f5717214004A7f26888"   // COMP
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB",
                "0xea4Ba4CE14fdd287f380b55419B1C5b6c3f22ab6"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB",
                "0xea4Ba4CE14fdd287f380b55419B1C5b6c3f22ab6"
            ],
            [
                [[
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
                ]], [[
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]], [[
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
                ]]

            ],
            [
                "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

            const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
            const payload = [
                [
                    "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);
            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);


            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
            await expect(aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    newUToken,
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                    4,
                    [
                    ],
                    res[0],
                    res[1],
                    2,
                    2
                ],
                deadline,
                [0, 0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);

        })

        it('reverts when calling rebalance from a non owner wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const uniPayload = [[
                "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                [[
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
                ]], [[
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]], [[
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
                ]]

            ],
            [
                "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

            const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
            const payload = [
                [
                    "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);
            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            //await aTokenConInstance.connect(investor1).updatePool(poolValue);

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);
            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);


            await expect(aFiManagerInstance.connect(investor2).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    newUToken,
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                    1,
                    [

                    ],
                    res[0],
                    res[1],
                    2,
                    2
                ],
                deadline,
                [0, 0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('reverts when calling rebalance on paused vault', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const uniPayload = [[
                "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                [[
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
                ]], [[
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]], [[
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
                ]]

            ],
            [
                "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

            const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
            const payload = [
                [
                    "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);
            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            //await aTokenConInstance.connect(investor1).updatePool(poolValue);

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);
            await aFiManagerInstance.pause();
            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await expect(aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    newUToken,
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                    1,
                    [

                    ],
                    res[0],
                    res[1],
                    2,
                    2
                ],
                deadline,
                [0, 0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('reverts when calling rebalance when vault is not to active rebalance', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiManagerInstance.setActiveRebalStatus(
                aFiStorageInstance.address, aTokenConInstance.address, false
            )

            const uniPayload = [[
                "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                [[
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
                ]], [[
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]], [[
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
                ]]

            ],
            [
                "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

            const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
            const payload = [
                [
                    "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            var res = await aTokenConInstance.getProportions();


            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);
            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            //await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await expect(aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    newUToken,
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                    1,
                    [],
                    res[0],
                    res[1],
                    2,
                    2
                ],
                deadline,
                [0, 0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('reverts when array length mismatched', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const uniPayload = [[
                "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                [[
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
                ]], [[
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]], [[
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
                ]]

            ],
            [
                "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

            const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
            const payload = [
                [
                    "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);
            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            //await aTokenConInstance.connect(investor1).updatePool(poolValue);

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await expect(aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    newUToken,
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                    3,
                    [

                    ],
                    res[0],
                    res[1],
                    2,
                    2
                ],
                deadline,
                [0, 0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            )).to.be.reverted;

            await ethers.provider.send('evm_revert', [snapshotId]);

        })

        it('reverts when proportion is not equal to zero', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const uniPayload = [[
                "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                [[
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
                ]], [[
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]], [[
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
                ]]

            ],
            [
                "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

            const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
            const payload = [
                [
                    "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,

                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["100"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);
            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            //await aTokenConInstance.connect(investor1).updatePool(poolValue);

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await expect(aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    newUToken,
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
                    4,
                    [
                    ],
                    res[0],
                    res[1],
                    2,
                    2
                ],
                deadline,
                [0, 0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);

        })

        it('scenario 1 testing inmanager', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const accountBalance = await daiConInstance.balanceOf(investor1.address)
            console.log("transfer complete")
            console.log("funded account balance", accountBalance / 1e18)

            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
            );

            console.log("deposit done -1")

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            console.log("deposit done -2")

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [1, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam,  "0x", 0);

            const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)
            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            const minimumReturnAmount =
                [
                    0,
                    0,
                    0
                ]

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            console.log("check", Amount);

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before withdraw usdtBalance", usdtBalance);

            const uniPayload = [[
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            ],
            [
                "0x2e85e2c100ddfd1b1680187ee7bCbb60a0608414"
            ],
            [
                "0x2e85e2c100ddfd1b1680187ee7bCbb60a0608414"
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d"
                ]], [[
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F"
                ]], [[
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
                ]]

            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], encodedUniPayload);

            const newUToken = "0x912ce59144191c1204e64559fe8253a0e49e6548";
            const payload = [
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);

            var res = await aTokenConInstance.getProportions();

            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            console.log("AFiController set");

            await aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    usdtConInstance.address,
                    newUToken,
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    1,
                    [
                    ],
                    res[0],
                    res[1],
                    1,
                    0
                ],
                deadline,
                [0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ],
                { gasLimit: 2000000 }
            );

            res = await aTokenConInstance.getUTokens();
            console.log("uTokProp", res);
            res = await aTokenConInstance.getProportions();
            console.log("after rebalance theproprtion", res);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('scenario 2 testing inmanager with stable USDT', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            );

            await aFiPassiveRebalanceInstance.intializeStalePriceDelay([
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ], [
                86500
            ]);


            const accountBalance = await daiConInstance.balanceOf(investor1.address)
            console.log("transfer complete")
            console.log("funded account balance", accountBalance / 1e18)

            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdcConInstance.address
            );
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
            const numbers = [
                "0",
                "0",
                "0"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    // "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam,  "0x", 0);

            const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            const minimumReturnAmount =
                [
                    0,
                    0,
                    0
                ]

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));

            console.log("check", Amount);

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before withdraw usdtBalance", usdtBalance);

            const uniPayload = [[
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            ],
            [
                "0x92fd143A8FA0C84e016C2765648B9733b0aa519e"
            ],
            [
                "0x92fd143A8FA0C84e016C2765648B9733b0aa519e"
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d"
                ]], [[
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F"
                ]], [[
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
                ]]

            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], encodedUniPayload);

            const newUToken = "0x912ce59144191c1204e64559fe8253a0e49e6548";
            const payload = [
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);
            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    usdtConInstance.address,
                    newUToken,
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    2,
                    [],
                    res[0],
                    res[1],
                    1,
                    0
                ],
                deadline,
                [0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ],
            );

            res = await aTokenConInstance.getUTokens();
            console.log("uTokens", res);
            res = await aTokenConInstance.getProportions();
            console.log("after rebalance the proportion", res);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('scenario 1 testing inmanager with USDC stable', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            );

            await aFiPassiveRebalanceInstance.intializeStalePriceDelay([
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ], [
                86500
            ]);


            const accountBalance = await daiConInstance.balanceOf(investor1.address)
            console.log("transfer complete")
            console.log("funded account balance", accountBalance / 1e18)

            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdcConInstance.address
            );
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
            const numbers = [
                "0",
                "0",
                "0"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    // "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam,  "0x", 0);

            const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            const minimumReturnAmount =
                [
                    0,
                    0,
                    0
                ]

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));

            console.log("check", Amount);

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before withdraw usdtBalance", usdtBalance);

            const uniPayload = [[
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            ],
            [
                "0x92fd143A8FA0C84e016C2765648B9733b0aa519e"
            ],
            [
                "0x92fd143A8FA0C84e016C2765648B9733b0aa519e"
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d"
                ]], [[
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F"
                ]], [[
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
                ]]

            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], encodedUniPayload);

            const newUToken = "0x912ce59144191c1204e64559fe8253a0e49e6548";
            const payload = [
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);
            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    usdcConInstance.address,
                    newUToken,
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    1,
                    [
                    ],
                    res[0],
                    res[1],
                    1,
                    1
                ],
                deadline,
                [0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            );

            res = await aTokenConInstance.getUTokens();
            console.log("uTokens", res);
            res = await aTokenConInstance.getProportions();
            console.log("after rebalance the proportion", res);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('scenario 2 testing inmanager with USDC stable', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            );

            await aFiPassiveRebalanceInstance.intializeStalePriceDelay([
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ], [
                86500
            ]);


            const accountBalance = await daiConInstance.balanceOf(investor1.address)
            console.log("transfer complete")
            console.log("funded account balance", accountBalance / 1e18)

            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdcConInstance.address
            );
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
            const numbers = [
                "0",
                "0",
                "0"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    // "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam,  "0x", 0);

            const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            const minimumReturnAmount =
                [
                    0,
                    0,
                    0
                ]

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));

            console.log("check", Amount);

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before withdraw usdtBalance", usdtBalance);

            const uniPayload = [[
                "0x912ce59144191c1204e64559fe8253a0e49e6548"
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            ],
            [
                "0x92fd143A8FA0C84e016C2765648B9733b0aa519e"
            ],
            [
                "0x92fd143A8FA0C84e016C2765648B9733b0aa519e"
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d"
                ]], [[
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F"
                ]], [[
                    "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
                ]]

            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], encodedUniPayload);

            const newUToken = "0x912ce59144191c1204e64559fe8253a0e49e6548";
            const payload = [
                [
                    "0x912ce59144191c1204e64559fe8253a0e49e6548"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);
            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    usdcConInstance.address,
                    newUToken,
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    2,
                    [
                    ],
                    res[0],
                    res[1],
                    1,
                    1
                ],
                deadline,
                [0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            );

            res = await aTokenConInstance.getUTokens();
            console.log("uTokens", res);
            res = await aTokenConInstance.getProportions();
            console.log("after rebalance the proportion", res);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('emergency rebalance revert when called from non owner wallet', async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(aFiManagerInstance.connect(investor1).emergencyRebalance(
                aTokenConInstance.address,
                aFiStorageInstance.address,
                "0x514910771AF9Ca656af840dff83E8264EcF986CA",
                [
                    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
                    "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
                ]
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('emergency rebalance revert when contract is paused', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiManagerInstance.pause();
            await expect(aFiManagerInstance.emergencyRebalance(
                aTokenConInstance.address,
                aFiStorageInstance.address,
                "0x514910771AF9Ca656af840dff83E8264EcF986CA",
                [
                    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
                    "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
                ]
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('emergency rebalance revert when length of uTokens and proportion mismatches', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(aFiManagerInstance.emergencyRebalance(
                aTokenConInstance.address,
                aFiStorageInstance.address,
                "0x514910771AF9Ca656af840dff83E8264EcF986CA",
                [
                    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
                    "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
                ]
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('passiveRebal application', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1);

            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
            );

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            //await aTokenConInstance.connect(investor1).updatePool(poolValue);
            let swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // SOL], // Fill this array if your function expects specific tokens
                newProviders: [0, 0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam,  "0x", 0);

            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        //  // errored
        // it('deposit and withdraw after rebalance scenarios', async () => {
        //     snapshotId = await ethers.provider.send('evm_snapshot');


        //     await aFiAFiOracleInstance.updateMidToken(
        //         [
        //             "0x912ce59144191c1204e64559fe8253a0e49e6548"
        //         ],
        //         [
        //             "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
        //         ]
        //     );


        //     await aFiAFiOracleInstance.intializeStalePriceDelay(aTokenConInstance.address, [
        //         "0x912ce59144191c1204e64559fe8253a0e49e6548"
        //     ], [
        //         86500
        //     ]);


        //     const accountBalance = await daiConInstance.balanceOf(investor1.address)
        //     console.log("transfer complete")
        //     console.log("funded account balance", accountBalance / 1e18)

        //     const ether = (amount) => {
        //         const weiString = ethers.utils.parseEther(amount.toString());
        //         return BigNumber.from(weiString);
        //     };

        //     await aTokenConInstance.connect(investor1).deposit(
        //         3000000000, usdtConInstance.address
        //     );

        //     await aTokenConInstance.connect(investor1).deposit(
        //         1000000000, usdcConInstance.address
        //     );

        //     checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
        //     console.log("check nav ", `${checkNav}`);

        //     let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
        //     console.log("User NAVVVVV", `${nav2}`)
        //     let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
        //     console.log("after deposit usdtBalance", usdtBalance)
        //     await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

        //     const numbers = [
        //         "1250230",
        //         "211379301119179471",
        //         "80080613841879501949",
        //         "34816381824594232923",
        //         "5355788253"
        //     ];

        //     const bigNumbers = numbers.map(num => BigNumber.from(num));

        //     const stringRepresentations = bigNumbers.map(bn => bn.toString());

        //     let swapParams = {
        //         afiContract: aTokenConInstance.address,
        //         oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        //         cSwapFee: 1000000,
        //         cSwapCounter: 0,
        //         depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
        //         minimumReturnAmount: [0, 0, 0, 0],
        //         iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
        //         underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
        //         "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        //         "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
        //         "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
        //         ],  // SOL], // Fill this array if your function expects specific tokens
        //         newProviders: [1,1,0,0], // Fill this with the new providers' information
        //         _deadline: deadline,
        //         cometToClaim: [],
        //         cometRewardTokens: [],
        //         rewardTokenMinReturnAmounts: []
        //     };

        //     await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams,0);

        //     const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
        //     console.log("Afterbal++++++3", `${Afterbal1}`)

        //     checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
        //     console.log("check nav ", `${checkNav}`);

        //     const minimumReturnAmount = 
        //     [   
        //         0,
        //         0,
        //         0,
        //         0,
        //         0
        //     ]

        //     const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
        //     const returnString = Amount.map(bn => bn.toString());

        //     console.log("check", Amount);

        //     usdtBalance = await usdtConInstance.balanceOf(investor1.address)
        //     console.log("before withdraw usdtBalance", usdtBalance);

        //     const uniPayload = [[
        //         "0x912ce59144191c1204e64559fe8253a0e49e6548"
        //     ],
        //     [
        //         "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
        //     ],
        //     [
        //         "0x92fd143A8FA0C84e016C2765648B9733b0aa519e"
        //     ],
        //     [
        //         "0x92fd143A8FA0C84e016C2765648B9733b0aa519e"
        //     ],
        //     [
        //         [[
        //             "0x53C6ca2597711Ca7a73b6921fAf4031EeDf71339"
        //         ]], [[
        //             "0x6f38e884725a116C9C7fBF208e79FE8828a2595F"
        //         ]], [[
        //             "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
        //         ]]

        //     ],
        //     [
        //         "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",
        //         "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
        //         "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001"
        //     ]
        //     ]
        //     const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
        //     await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], encodedUniPayload);

        //     const newUToken = "0x912ce59144191c1204e64559fe8253a0e49e6548";
        //     const payload = [
        //         [
        //             "0x912ce59144191c1204e64559fe8253a0e49e6548"
        //         ],
        //         [
        //             "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
        //         ]
        //     ]
        //     const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

        //     const bytesPayload = [
        //         ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
        //         ["0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7", "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3", "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB"], // USDT, USDC - chainlink oracles
        //         uDataPayload,
        //         [
        //             "0x0000000000000000000000000000000000000000"
        //         ],
        //         [
        //             "0x0000000000000000000000000000000000000000"
        //         ],
        //         [
        //             "0x0000000000000000000000000000000000000000"
        //         ],
        //         ["0"],
        //         [
        //             "0x0000000000000000000000000000000000000000"
        //         ],
        //         2,
        //     ]

        //     const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);

        //     var res = await aTokenConInstance.getProportions();
        //     console.log("uTokProp", res);

        //     await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

        //     await aFiManagerInstance.rebalance(
        //         bytesData,
        //         [ 
        //             aTokenConInstance.address,
        //             aFiStorageInstance.address,
        //             "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        //             newUToken,
        //             "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
        //             3,
        //             [
        //                 "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
        //                 "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        //                 "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
        //                 "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
        //             ],
        //             res[0],
        //             res[1],
        //             2
        //         ],
        //         deadline,
        //         [0, 0, 0, 0, 0],
        //         0
        //     );

        //     res = await aTokenConInstance.getUTokens();
        //     console.log("uTokProp", res);
        //     res = await aTokenConInstance.getProportions();
        //     console.log("after rebalance theproprtion", res);


        //     await aTokenConInstance.connect(investor1).deposit(
        //         3000000000, usdtConInstance.address
        //     );

        //     let underlyingTok = await aTokenConInstance.getUTokens();
        //     console.log("uTokProp", underlyingTok);
        //     res = await aTokenConInstance.getProportions();
        //     console.log("after rebalance theproprtion", res);

        //     await aTokenConInstance.connect(investor1).deposit(
        //         3000000000, usdtConInstance.address
        //     );

        //     console.log("+++++++++++++++++++++++++++++++++++");

        //     swapParams = {
        //         afiContract: aTokenConInstance.address,
        //         oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        //         cSwapFee: 1000000,
        //         cSwapCounter: 1,
        //         depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
        //         minimumReturnAmount: [0, 0, 0, 0],
        //         iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
        //         underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
        //         "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        //         "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
        //         "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
        //         ],  // SOL], // Fill this array if your function expects specific tokens
        //         newProviders: [1,1,0,0], // Fill this with the new providers' information
        //         _deadline: deadline,
        //         cometToClaim: [],
        //         cometRewardTokens: [],
        //         rewardTokenMinReturnAmounts: []
        //     };
        //     await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams,0);

        //     console.log("cumulative swap done");

        //     await aTokenConInstance.connect(investor1).deposit(
        //         3000000000, usdtConInstance.address
        //     );

        //     await aTokenConInstance.connect(investor1).withdraw(
        //         ether(2), usdtConInstance.address, deadline, returnString, 1
        //     );

        //     await ethers.provider.send('evm_revert', [snapshotId]);

        // });

        // // errored
        // it('rebalance revert when there is zero token balance that needs to be removed', async () => {
        //     snapshotId = await ethers.provider.send('evm_snapshot');


        //     const minimumReturnAmount =
        //         [
        //             0,
        //             0,
        //             0,
        //             0,
        //             0
        //         ]

        //     const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
        //     const returnString = Amount.map(bn => bn.toString());

        //     console.log("check", Amount);

        //     usdtBalance = await usdtConInstance.balanceOf(investor1.address)
        //     console.log("before withdraw usdtBalance", usdtBalance);

        //     const uniPayload = [[
        //         "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
        //     ],
        //     [
        //         "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        //     ],
        //     [
        //         "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
        //     ],
        //     [
        //         "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
        //     ],
        //     [
        //         [[
        //             "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
        //         ]], [[
        //             "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
        //         ]], [[
        //             "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
        //         ]]

        //     ],
        //     [
        //         "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
        //         "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
        //         "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
        //     ]
        //     ]
        //     const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
        //     await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

        //     const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
        //     const payload = [
        //         [
        //             "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
        //         ],
        //         [
        //             "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        //         ]
        //     ]
        //     const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

        //     const bytesPayload = [
        //         ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
        //         ["0x3E7d1eAB13ad0104d2750B8863b489D65364e32D", "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6"], // USDT, USDC - chainlink oracles
        //         uDataPayload,

        //         [
        //             "0x0000000000000000000000000000000000000000"
        //         ],
        //         [
        //             "0x0000000000000000000000000000000000000000"
        //         ],
        //         [
        //             "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9"
        //         ],
        //         ["0"],
        //         [
        //             "0x0000000000000000000000000000000000000000"
        //         ],
        //         2,
        //     ]

        //     const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);

        //     var res = await aTokenConInstance.getProportions();
        //     console.log("uTokProp", res);
        //     await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);


        //     await expect(aFiManagerInstance.connect(investor1).rebalance(
        //         bytesData,
        //         [
        //             aTokenConInstance.address,
        //             aFiStorageInstance.address,
        //             "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        //             newUToken,
        //             "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
        //             3,
        //             [
        //                 "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
        //                 "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
        //                 "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
        //                 "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
        //                 "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
        //             ],
        //             res[0],
        //             res[1],
        //             2
        //         ],
        //         deadline,
        //         [0, 0, 0, 0, 0, 0],
        //         0
        //     )).to.be.revertedWith('AM06');
        //     await ethers.provider.send('evm_revert', [snapshotId]);
        // });

        it('rebalance validations revert when length mismatch', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
                    "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
                    "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of DAI
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDC
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDT
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            );

            const minimumReturnAmount =
                [
                    0,
                    0,
                    0,
                    0,
                    0
                ]

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            console.log("check", Amount);

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before withdraw usdtBalance", usdtBalance);

            const uniPayload = [[
                "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB"
            ],
            [
                [[
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
                ]], [[
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]], [[
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
                ]]

            ],
            [
                "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

            const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
            const payload = [
                [
                    "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,

                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0", "0"],
                ["0", "0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);
            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);


            await expect(aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    newUToken,
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    2,
                    [],
                    res[0],
                    res[1],
                    1,
                    1
                ],
                deadline,
                [0, 0, 0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            )).to.be.revertedWith('AFM05');
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('rebalance validations revert when new underlying proportion is not zero', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
                    "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
                    "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of DAI
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDC
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDT
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            );

            const minimumReturnAmount =
                [
                    0,
                    0,
                    0,
                    0,
                    0
                ]

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            console.log("check", Amount);

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before withdraw usdtBalance", usdtBalance);

            const uniPayload = [[
                "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
                "0xc00e94Cb662C3520282E6f5717214004A7f26888"   // COMP
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB",
                "0xea4Ba4CE14fdd287f380b55419B1C5b6c3f22ab6"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB",
                "0xea4Ba4CE14fdd287f380b55419B1C5b6c3f22ab6"
            ],
            [
                [[
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
                ]], [[
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]], [[
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
                ]]

            ],
            [
                "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

            const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
            const payload = [
                [
                    "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,

                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["10"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);
            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await expect(aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    newUToken,
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    2,
                    [

                    ],
                    res[0],
                    res[1],
                    1,
                    1
                ],
                deadline,
                [0, 0, 0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            )).to.be.revertedWith('AM11');
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('rebalance validations revert newUtoken is not same as encoded 0 index underlying token', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // underlying - WBTC
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",  // UNI
                    "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
                    "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of DAI
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDC
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  // Middle Token of USDT
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            );

            const minimumReturnAmount =
                [
                    0,
                    0,
                    0,
                    0,
                    0
                ]

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            console.log("check", Amount);

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before withdraw usdtBalance", usdtBalance);

            const uniPayload = [[
                "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
                "0xc00e94Cb662C3520282E6f5717214004A7f26888"   // COMP
            ],
            [
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB",
                "0xea4Ba4CE14fdd287f380b55419B1C5b6c3f22ab6"
            ],
            [
                "0x5aB53EE1d50eeF2C1DD3d5402789cd27bB52c1bB",
                "0xea4Ba4CE14fdd287f380b55419B1C5b6c3f22ab6"
            ],
            [
                [[
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36"
                ]], [[
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]], [[
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8",
                    "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
                ]]

            ],
            [
                "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                "0xC2e9F25Be6257c210d7Adf0D4Cd6E3E881ba25f8"
            ]
            ]
            const encodedUniPayload = await aFiPassiveRebalanceInstance.encodePoolData(uniPayload);
            await aFiPassiveRebalanceInstance.initUniStructure(["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"], encodedUniPayload)

            const newUToken = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";
            const payload = [
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ],
                [
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,

                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["0"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]

            const bytesData = await aFiFactoryInstance.encodePoolData(bytesPayload);

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);


            await expect(aFiManagerInstance.connect(investor1).rebalance(
                bytesData,
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    newUToken,
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                    2,
                    [],
                    res[0],
                    res[1],
                    1,
                    1
                ],
                deadline,
                [0, 0, 0, 0, 0, 0],
                0,
                0,
                "0x",
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ]
            )).to.be.revertedWith('AM002');
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('emergency withdraw when product type is 2', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            var staleBal = await usdtConInstance.balanceOf(investor1.address);
            console.log("usdt balance of user before deposit ", `${staleBal}`);

            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdtConInstance.address
            );

            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdtConInstance.address
            );

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdtConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [3, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam,  "0x", 0);

            var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("After 2nd deposit nav from storage value", `${NavfromStorage}`);

            var uTokenProp1 = await aTokenConInstance.getProportions();
            console.log("uTokenProp before emergency rebalance", `${uTokenProp1[0]}`);
            console.log("default proportion before emergency rebalance", `${uTokenProp1[1]}`);

            var utokensafter = await aTokenConInstance.getUTokens();
            console.log("before emergency rebalance uTokens", utokensafter);

            await aFiManagerInstance.emergencyRebalance(
                aTokenConInstance.address,
                aFiStorageInstance.address,
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
                [5000000, 5000000]
            );

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("After emergency rebalance nav from storage value", `${NavfromStorage}`);

            var uTokenProp2 = await aTokenConInstance.getProportions();
            console.log("uTokenProp", `${uTokenProp2[0]}`);
            console.log("default proportion after emergency rebalance", `${uTokenProp2[1]}`);

            var utokensafter = await aTokenConInstance.getUTokens();
            console.log("after emergency rebalance uTokens", utokensafter);

            const linkTokenInstance = await ethers.getContractAt(DAI_ABI, "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4");

            var staleBal = await linkTokenInstance.balanceOf(aTokenConInstance.address);
            console.log("staleBal = ", `${staleBal}`);

            await aTokenConInstance.emergencyWithdraw("0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", platformWallet.address);

            staleBal = await daiConInstance.balanceOf(platformWallet.address);
            console.log("staleBal after emergency withdraw = ", `${staleBal}`);

            await aFiManagerInstance.emergencyRebalance(
                aTokenConInstance.address,
                aFiStorageInstance.address,
                "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                [10000000]
            );

            await aTokenConInstance.emergencyWithdraw("0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0", platformWallet.address);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        // // errored
        // it('emergency withdraw', async () => {

        //     var staleBal = await usdtConInstance.balanceOf(investor1.address);
        //     console.log("usdt balance of user before deposit ", `${staleBal}`);

        //     var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
        //     //await aTokenConInstance.connect(investor1).updatePool(poolValue);

        //     await aTokenConInstance.connect(investor2).deposit(
        //         1000000000, usdtConInstance.address
        //     );

        //     poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
        //     //await aTokenConInstance.connect(investor1).updatePool(poolValue);

        //     await aTokenConInstance.connect(investor2).deposit(
        //         1000000000, usdtConInstance.address
        //     );

        //     await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

        //     let swapParams = {
        //         afiContract: aTokenConInstance.address,
        //         oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
        //         cSwapFee: 1000000,
        //         cSwapCounter: 0,
        //         depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
        //         minimumReturnAmount: [0, 0, 0, 0],
        //         iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
        //         underlyingTokens:  ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
        //         "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        //         "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
        //         "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
        //         ],  // SOL], // Fill this array if your function expects specific tokens
        //         newProviders: [0,0,0,0], // Fill this with the new providers' information
        //         _deadline: deadline,
        //         cometToClaim: [],
        //         cometRewardTokens: [],
        //         rewardTokenMinReturnAmounts: []
        //     };


        //     await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams,0);

        //     var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
        //     console.log("After 2nd deposit nav from storage value", `${NavfromStorage}`);

        //     await aFiManagerInstance.emergencyRebalance(
        //         aTokenConInstance.address,
        //         aFiStorageInstance.address,
        //         "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
        //         [
        //             "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
        //             "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        //             "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI

        //         ]
        //     );

        //     NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
        //     console.log("After 2nd deposit nav from storage value", `${NavfromStorage}`);

        //     var uTokenProp2 = await aTokenConInstance.getProportions();
        //     console.log("uTokenProp", `${uTokenProp2[0]}`);

        //     var utokensafter = await aTokenConInstance.getUTokens();
        //     console.log(utokensafter);

        //     var staleBal = await linkToken.balanceOf(aTokenConInstance.address);
        //     console.log("staleBal = ", `${staleBal}`);

        //     await aTokenConInstance.emergencyWithdraw(linkToken.address, platformWallet.address);

        //     staleBal = await daiConInstance.balanceOf(platformWallet.address);
        //     console.log("staleBal after emergency withdraw = ", `${staleBal}`);
        //     await ethers.provider.send('evm_revert', [snapshotId]);

        // });

        it('set algo fees and upper and lower limits', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiManagerInstance.setRebalFee(200);
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

    });
});
