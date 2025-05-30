/* eslint-disable no-underscore-dangle */
const { assert, expect } = require('chai');
const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { time, constants } = require("@openzeppelin/test-helpers");
const { provider } = waffle;

const swapTokens2 = require('./getOneInchData2.js');

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
    let oneInchParam;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let wbtcConInstance;
    let uniConInstance;
    let linkToken;
    let signer2;
    let signer3;


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
        aFiBaseInstace = await AFiBase.deploy("AFi802", "AFi");
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
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
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
                "0x191c10Aa4AF7C30e871E70C95dB0E4eb77237530",
            ],
            [
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            [
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000" 
            ],
            ["0", "0"],
            ["5000000", "5000000"],
            [
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            3
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
            "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            "0x912ce59144191c1204e64559fe8253a0e49e6548"
        ], [
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
        wbtcConInstance = await ethers.getContractAt(DAI_ABI, "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f");
        uniConInstance = await ethers.getContractAt(DAI_ABI, "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0");

        linkToken = await ethers.getContractAt(DAI_ABI, "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4");

        const accountToInpersonate = "0x1AB4973a48dc892Cd9971ECE8e01DcC7688f8F23"
        const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate],
        });
        const signer = await ethers.getSigner(accountToInpersonate)


        const accountToInpersonate2 = "0xB6860393Ade5CD3766E47e0B031A0F4C33FD48a4"
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate2],
        });
        signer2 = await ethers.getSigner(accountToInpersonate2)

        const accountToInpersonate3 = "0x00002B503a75998C97508916A74Fdb41934Fa030"
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate3],
        });
        signer3 = await ethers.getSigner(accountToInpersonate3)


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
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            ]
        );
        const poolPayload = [
            [
                "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            ],
            [
                "0x2f5e87C9312fa29aed5c179E456625D79015299c",  // pool WBTC - WETH
                "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",

            ],
            [
                "0x2f5e87C9312fa29aed5c179E456625D79015299c",  // pool WBTC - WETH
                "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d", // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // Pool USDT-WETH (Stables- I/O tokens)
                ]],
                [[
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0", // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool USDC-WETH (Stables- I/O tokens)
                ]],
                [[
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
        await aTokenConInstance.setplatformWallet(investor1.address);
        await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);

        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);

        console.log("funded account balance usdt", investorusdtBalance)
    });

    describe('Basic checks for deposit and withdraw', () => {

        it("algo rebalance and reinitialize on the vault", async () => {
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

            const morphoRewardData = {
                rewardTokens: [],
                proofs: [],
                rewardTokenAmount:[],
                minReturnAmounts: [],
                swapData: []
            };

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
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);


            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, morphoRewardData, ["0x"],  0);

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

            console.log("111");
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


            console.log("1123456781");

            const bytesPayload = [
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
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
            console.log("11345678909876567891");

            var res = await aTokenConInstance.getProportions();

            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            console.log("AFiController set");

            res = await aTokenConInstance.getProportions();
            console.log("after rebal uTokProp", res);

            var navfromStorag = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("After emeregency rebalance nav from storage value", `${navfromStorag}`);


            var utokensafter = await aTokenConInstance.getUTokens();
            console.log(utokensafter);

            const linkTokenInstance = await ethers.getContractAt(DAI_ABI, "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0");

            var staleBal = await linkTokenInstance.balanceOf(aTokenConInstance.address);
            console.log("removed token bal = ", `${staleBal}`);

            var staleBal = await usdtConInstance.balanceOf(aTokenConInstance.address);
            console.log("stable token bal = ", `${staleBal}`);

            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdtConInstance.address
            );

            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdtConInstance.address
            );

            var swapParams2 = {
                afiContract: aTokenConInstance.address,
                oToken: usdtConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 1,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp", res);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams2, 0, oneInchParam, morphoRewardData, ["0x"],  0);

            var navfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage after cswap", `${navfromStorageAfter}`);

            usdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address);
            console.log("usdcBal before bal injection", `${usdcBalance}`);

            await usdcConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);

            usdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address);
            console.log("usdcBal after bal injection", `${usdcBalance}`);

            await aTokenConInstance.handleOrphanTokens(
                usdcConInstance.address,  
                usdcConInstance.address, 
                usdcConInstance.address, 
                1234567890, 
                0,
                "0x"
            );

            let preDep = await aFiStorageInstance.getPreSwapDepositsTokens(aTokenConInstance.address, 2, usdcConInstance.address);
            console.log("preDep", `${preDep}`);

            usdcBalance = await wbtcConInstance.balanceOf(aTokenConInstance.address);
            console.log("wbtc before bal injection", `${usdcBalance}`);

            await wbtcConInstance.connect(signer2).transfer(aTokenConInstance.address, 1000000000);

            usdcBalance = await wbtcConInstance.balanceOf(aTokenConInstance.address);
            console.log("ubtc after bal injection", `${usdcBalance}`);

            await aTokenConInstance.handleOrphanTokens(
                wbtcConInstance.address,  
                usdcConInstance.address, 
                usdcConInstance.address, 
                1234567890, 
                0,
                "0x"
            );

            preDep = await aFiStorageInstance.getPreSwapDepositsTokens(aTokenConInstance.address, 2, usdcConInstance.address);
            console.log("preDep", `${preDep}`);

            usdcBalance = await uniConInstance.balanceOf(aTokenConInstance.address);
            console.log("uni before bal injection", `${usdcBalance}`);

            await uniConInstance.connect(signer3).transfer(aTokenConInstance.address, 10000000000000000000n);

            usdcBalance = await uniConInstance.balanceOf(aTokenConInstance.address);
            console.log("uni after bal injection", `${usdcBalance}`);

            usdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address);
            console.log("usdcBal after bal injection", `${usdcBalance}`);

            preDep = await aFiStorageInstance.getPreSwapDepositsTokens(aTokenConInstance.address, 2, usdcConInstance.address);
            console.log("preDep", `${preDep}`);

            await aFiPassiveRebalanceInstance.updateMidToken(
                [
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                ]
            );

            const poolPayload = [
                [
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
                ],
                [
                    "0xff96D42dc8E2700ABAb1f1F82Ecf699caA1a2056",   // pool UNI - WETH    
                ],
                [
                    "0xff96D42dc8E2700ABAb1f1F82Ecf699caA1a2056",   // pool UNI - WETH
                ],
                [
                    [[
                        "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // Pool USDT-WETH (Stables- I/O tokens)
                    ]],
                    [[
                        "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool USDC-WETH (Stables- I/O tokens)
                    ]],
                    [[
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
    

            await aTokenConInstance.handleOrphanTokens(
                uniConInstance.address,  
                usdcConInstance.address, 
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 
                deadline, 
                0,
                "0x"
            );

            usdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address);
            console.log("usdcBal after bal injection", `${usdcBalance}`);

            preDep = await aFiStorageInstance.getPreSwapDepositsTokens(aTokenConInstance.address, 2, usdcConInstance.address);
            console.log("preDep", `${preDep}`);

            await expect(aTokenConInstance.handleOrphanTokens(
                uniConInstance.address,  
                uniConInstance.address, 
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", 
                deadline, 
                0,
                "0x"
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

    });
});