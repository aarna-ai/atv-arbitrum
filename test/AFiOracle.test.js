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

describe('AFi Oracle testcases', (accounts) => {
    let platformWallet; let recipient; let investor1; let investor2; let other;
    let deadline;
    let deployedAFiBase;
    let aTokenConInstance;
    let datasequencer;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let oneInchParam;

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
        const AFiTimeDelayContract = await ethers.getContractFactory('TimeDelayModule');


        aFiBaseInstace = await AFiBase.deploy("AFi802", "AFi");
        aFiManagerInstance = await AFiManager.deploy();
        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();
        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address);
        // aFiDelayModule = await delayModule.deploy(86400, 172800);

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);
        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address, aFiFactoryInstance.address);

        aFiTimeLockInstance = await AFiTimeDelayContract.deploy(investor1.address, 100, 172800, {
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });

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
                "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            ]
        ]

        const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

        const payloadnew = [
            ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
            uDataPayload,
            [
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            [
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            ["0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",],
            ["0", "0", "0", "0"],
            ["2500000", "2500000",
                "2500000",
                "2500000"
            ],
            [
                "0x0000000000000000000000000000000000000000",
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
                "0x0000000000000000000000000000000000000000",
            ],
        );

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

        console.log("usdcBalance", usdcBalance);
        await usdcConInstance.connect(signer2).transfer(investor1.address, usdcBalance);
        // await usdcConInstance.connect(signer2).transfer(investor2.address, "10288395691");

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

        await aFiAFiOracleInstance.updateRebalContract(aFiPassiveRebalanceInstance.address);

        const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aFiManagerInstance.setRebalanceController(platformWallet.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
        await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);

        await aFiManagerInstance.setRebalanceController(investor1.address);
        await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);

        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);


        console.log("transfer complete")
        console.log("funded account balance usdttttttttt", investorusdtBalance)
    });

    context('Basic checks for deposit and withdraw', () => {

        it('basic oracle checks', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiPassiveRebalanceInstance.updateSecAgo(300);

            await expect(aFiPassiveRebalanceInstance.connect(investor1).updateSecAgo(300)).to.be.reverted;

            const totalProfit = await aFiAFiOracleInstance.getTotalProfit();
            const daoProfit = await aFiAFiOracleInstance.getDaoProfit();
            expect(`${totalProfit}`).to.equal('10');
            expect(`${daoProfit}`).to.equal('6');

            await aFiPassiveRebalanceInstance.setstalepriceWindowLimit(5000);
            const stalepriceWindowLimit = await aFiPassiveRebalanceInstance.getstalepriceWindowLimit();
            console.log("Stale Price Window Limit => ", stalepriceWindowLimit);

            await aFiPassiveRebalanceInstance.updateSecAgo(300);
            const secAgo = await aFiPassiveRebalanceInstance.getSecAgo();
            expect(`${secAgo}`).to.equal('300');

            //await aFiAFiOracleInstance.intializeStalePriceDelay(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"],[86500]);

            //await expect(aFiAFiOracleInstance.connect(investor1).setstalepriceWindowLimit(5000)).to.be.reverted;

            const stalePriceDelay = await aFiPassiveRebalanceInstance.getStalePriceDelay("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9");
            expect(`${stalePriceDelay}`).to.equal('86500');

            console.log("check--0")

            // //TODO: need to recheck
            // var amountOut = await aFiAFiOracleInstance.estimateAmountOut("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 1000000, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1");
            // var amountOut = await aFiAFiOracleInstance.estimateAmountOutMin("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 1000000, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "0x641C00A822e8b671738d32a431a4Fb6074E5c79d");

            // console.log("check--1")

            await expect(aFiPassiveRebalanceInstance.estimateAmountOut("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 1000000, "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9")).to.be.revertedWith("AF03");
            await expect(aFiPassiveRebalanceInstance.estimateAmountOutMin("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 1000000, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", constants.ZERO_ADDRESS)).to.be.revertedWith("AF03");

            const lastSwapped = await aFiAFiOracleInstance.getLastSwapTime(aTokenConInstance.address);
            expect(Number(lastSwapped)).to.equal(0);

            await aFiAFiOracleInstance.updateSwapPeriod(aTokenConInstance.address, 10000);
            console.log("check--1")
            await expect(aFiAFiOracleInstance.connect(investor1).updateSwapPeriod(aTokenConInstance.address, 10000)).to.be.reverted;

            const csPeriod = await aFiAFiOracleInstance.getSwapPeriod(aTokenConInstance.address);
            expect(`${csPeriod}`).to.equal('10000');

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };

            await aFiAFiOracleInstance.settxFee(10000);
            const csFee = await aFiAFiOracleInstance.getFeeDetails();
            expect(`${csFee[1]}`).to.equal('10000');

            await expect(aFiAFiOracleInstance.connect(investor1).settxFee(1000)).to.be.reverted;

            await expect(aFiAFiOracleInstance.connect(investor1).updateProfitShare(10, 3)).to.be.reverted;
            await expect(aFiAFiOracleInstance.updateProfitShare(11, 3)).to.be.revertedWith('AO24');

            await aFiAFiOracleInstance.updateProfitShare(10, 3);

            const midTok = await aFiAFiOracleInstance.getMidToken("0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f");
            await aFiPassiveRebalanceInstance.setstalepriceWindowLimit(100);

            var val = await aFiAFiOracleInstance.getPriceInUSD("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1");
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
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('unpause the contract', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            // when manager contract is not already paused
            await expect(aFiAFiOracleInstance.unPause()).to.be.reverted;

            await aFiAFiOracleInstance.pause();

            await expect(aFiAFiOracleInstance.updateProfitShare(10, 3)).to.be.reverted;

            await aFiAFiOracleInstance.connect(platformWallet).unPause();
            expect((await aFiAFiOracleInstance.paused())).to.equal(false);
            await aFiAFiOracleInstance.pause();
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('pause the contract from a non owner wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(aFiAFiOracleInstance.connect(investor2).updateAFiManager(aFiAFiOracleInstance.address)).to.be.reverted;

            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('update afimanager from a non owner wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            // when manager contract is not already paused
            await expect(aFiAFiOracleInstance.connect(investor1).pause()).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('pause and unpause the contract from a non owner wallet', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiAFiOracleInstance.pause();
            await expect(aFiAFiOracleInstance.connect(investor1).unPause()).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('pause the contract when it is already paused', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiAFiOracleInstance.pause();
            // when manager contract is already paused
            await expect(aFiAFiOracleInstance.connect(investor1).pause()).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

        it('queue flow check', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };

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

            await expect(aFiAFiOracleInstance.connect(investor1).updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)).to.be.reverted;

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);


            res = await aTokenConInstance.getProportions();
            console.log("before cumulaticeswap theproprtion", res[0]);

            var val = await aFiAFiOracleInstance.getPriceInUSD("0xf97f4df75117a78c1A5a0DBb814Af92458539FB4");

            var swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 0,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
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
            await expect(aFiAFiOracleInstance.connect(investor2).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0)).to.be.reverted;

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0);
            const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)


            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            const minimumReturnAmount =
                [
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

            res = await aTokenConInstance.getUTokens();
            console.log("uTokProp", res);
            res = await aTokenConInstance.getProportions();
            console.log("after rebalance theproprtion", res);

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            //To check the profit distribution
            await aTokenConInstance.connect(investor1).withdraw(
                ether(2), usdtConInstance.address, deadline, returnString, 3, 0
            );

            console.log("checkkkkkk");

            // Trigger the toggleTheOtoken to change the status of oToken 

            await aFiAFiOracleInstance.connect(platformWallet).toggleTheOtoken(usdtConInstance.address, true);

            await expect(aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdtConInstance.address
            )).to.be.reverted;

            await aFiAFiOracleInstance.connect(platformWallet).toggleTheOtoken(usdtConInstance.address, false);

            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdtConInstance.address
            );

            var userQueuedShare = await aFiAFiOracleInstance.getUserQueuedShares(investor1.address, aTokenConInstance.address, usdtConInstance.address, await aFiAFiOracleInstance.batchWithdrawCounter(aTokenConInstance.address));
            console.log("user's shares in queue", userQueuedShare);
            expect(Number(userQueuedShare)).to.greaterThan(0);

            await aFiAFiOracleInstance.connect(investor1).unqueueWithdraw(
                aTokenConInstance.address, usdtConInstance.address
            );

            userQueuedShare = await aFiAFiOracleInstance.getUserQueuedShares(investor1.address, aTokenConInstance.address, usdtConInstance.address, await aFiAFiOracleInstance.batchWithdrawCounter(aTokenConInstance.address));
            console.log("user's shares to unqueue", userQueuedShare);
            expect(Number(userQueuedShare)).to.equal(0);

            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdtConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav - after queue", `${checkNav}`);

            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdtConInstance.address
            );

            _unstakeData = {
                iTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                oToken: usdtConInstance.address,
                deadline: deadline,
                minimumReturnAmount: [0, 0, 0, 0, 0],
                minOutForiToken: [0, 0, 0],
                unstakingFees: 0
            }

            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, true);

            await aFiAFiOracleInstance.connect(investor1).unstakeForQueuedWithdrawals(aTokenConInstance.address, _unstakeData,
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ],
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ], 0
            );

            //await aFiAFiOracleInstance.connect(investor1).unstakeForQueuedWithdrawals(aTokenConInstance.address, usdtConInstance.address, deadline, [0, 0, 0, 0, 0], [0, 0, 0], 0, ["0x", "0x", "0x", "0x", "0x"]);

            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, false);

            var beforeinvestorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before redeem funded account investor1 balance usdt", beforeinvestorusdtBalance)

            await expect(aFiAFiOracleInstance.connect(investor1).redeem(aTokenConInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"], 1)).to.be.revertedWith('AO26');

            await aFiAFiOracleInstance.connect(investor1).redeem(aTokenConInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"], 0);

            userQueuedShare = await aFiAFiOracleInstance.getUserQueuedShares(investor1.address, aTokenConInstance.address, usdtConInstance.address, await aFiAFiOracleInstance.batchWithdrawCounter(aTokenConInstance.address));
            console.log("user's shares to unqueue", userQueuedShare);
            expect(Number(userQueuedShare)).to.equal(0);

            await aFiAFiOracleInstance.unstakingProfitDistribution(aTokenConInstance.address, aFiStorageInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"]);

            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('unstakingProfitDistribution from a non owner', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await expect(aFiAFiOracleInstance.connect(investor2).unstakingProfitDistribution(aTokenConInstance.address, aFiStorageInstance.address, ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"])).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('unstakeForQueuedWithdrawals call from a random address', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, true);
            await expect(aFiAFiOracleInstance.connect(investor2).unstakeForQueuedWithdrawals(aTokenConInstance.address, "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", deadline, [0, 0, 0, 0, 0], [0, 0, 0], 0)).to.be.reverted;
            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, false);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('transafer profit share to the team after redeem', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };

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

            await expect(aFiAFiOracleInstance.connect(investor1).updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)).to.be.reverted;
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const numbers = [
                "1250230",
                "211379301119179471",
                "80080613841879501949",
                "34816381824594232923",
                "5355788253"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));
            const stringRepresentations = bigNumbers.map(bn => bn.toString());

            var swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 1,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
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

            
            await expect(aFiAFiOracleInstance.connect(investor2).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0)).to.be.reverted;


            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0);
            const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

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

            res = await aTokenConInstance.getUTokens();
            console.log("uTokProp", res);
            res = await aTokenConInstance.getProportions();
            console.log("after rebalance theproprtion", res);

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            var swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 1,
                cSwapCounter: 1,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
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

            console.log("balance", await usdcConInstance.balanceOf(investor1.address));

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0);

            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 900000000);
            await usdtConInstance.connect(investor2).transfer(aTokenConInstance.address, 900000000);

            // await aTokenConInstance.connect(investor2).deposit(
            //     1000000000, usdcConInstance.address
            // );

            //To check the profit distribution
            await aTokenConInstance.connect(investor1).withdraw(
                ether(2), usdtConInstance.address, deadline, returnString, 3, 0
            );
            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, false);
            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdtConInstance.address
            );

            var userQueuedShare = await aFiAFiOracleInstance.getUserQueuedShares(investor1.address, aTokenConInstance.address, usdtConInstance.address, await aFiAFiOracleInstance.batchWithdrawCounter(aTokenConInstance.address));
            console.log("user's shares in queue", userQueuedShare);
            expect(Number(userQueuedShare)).to.greaterThan(0);

            await aFiAFiOracleInstance.connect(investor1).unqueueWithdraw(
                aTokenConInstance.address, usdtConInstance.address
            );

            userQueuedShare = await aFiAFiOracleInstance.getUserQueuedShares(investor1.address, aTokenConInstance.address, usdtConInstance.address, await aFiAFiOracleInstance.batchWithdrawCounter(aTokenConInstance.address));
            console.log("user's shares to unqueue", userQueuedShare);
            expect(Number(userQueuedShare)).to.equal(0);

            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdtConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav - after queue", `${checkNav}`);

            await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
                aTokenConInstance.address, ether(2), usdtConInstance.address
            );

            // await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
            //     aTokenConInstance.address, ether(2), usdcConInstance.address
            // );

            // await aFiAFiOracleInstance.connect(investor1).queueWithdraw(
            //     aTokenConInstance.address, ether(2), daiConInstance.address
            // );

            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 10000000000);

            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 900000000);

            await usdtConInstance.connect(investor2).transfer(aTokenConInstance.address, 900000000);

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav - before unstake", `${checkNav}`);

            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, true);
            //await expect(aFiAFiOracleInstance.connect(investor1).unstakeForQueuedWithdrawals(aTokenConInstance.address, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", deadline, [0, 0, 0, 0, 0], [0, 0, 0], 0, ["0x", "0x", "0x", "0x", "0x"])).to.be.revertedWith('AO08');

            _unstakeData = {
                iTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                oToken: usdtConInstance.address,
                deadline: deadline,
                minimumReturnAmount: [0, 0, 0, 0, 0],
                minOutForiToken: [0, 0, 0],
                unstakingFees: 0
            }

            await aFiAFiOracleInstance.connect(investor1).unstakeForQueuedWithdrawals(aTokenConInstance.address, _unstakeData,
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ],
                [
                    "0x",
                    "0x",
                    "0x",
                    "0x",
                    "0x"
                ], 0
            );

            await aFiAFiOracleInstance.connect(investor1).pauseUnpauseQueue(aTokenConInstance.address, false);
            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav - after unstake", `${checkNav}`);

            var beforeinvestorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before redeem funded account investor1 balance usdt", beforeinvestorusdtBalance)

            await expect(aFiAFiOracleInstance.connect(investor1).redeem(aTokenConInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"], 1)).to.be.revertedWith('AO26');

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before redeem usdtBalance", usdtBalance);

            await aFiAFiOracleInstance.connect(investor1).redeem(aTokenConInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"], 0);
            userQueuedShare = await aFiAFiOracleInstance.getUserQueuedShares(investor1.address, aTokenConInstance.address, usdtConInstance.address, await aFiAFiOracleInstance.batchWithdrawCounter(aTokenConInstance.address));
            console.log("user's shares to unqueue", userQueuedShare);
            expect(Number(userQueuedShare)).to.equal(0);

            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after redeem usdtBalance", usdtBalance);

            await aFiAFiOracleInstance.unstakingProfitDistribution(aTokenConInstance.address, aFiStorageInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"]);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('cumulativeswap when cswap fees is > zero', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

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

            await expect(aFiAFiOracleInstance.connect(investor1).updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)).to.be.reverted;

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const numbers = [
                "1250230",
                "211379301119179471",
                "80080613841879501949",
                "34816381824594232923",
                "5355788253"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));
            const stringRepresentations = bigNumbers.map(bn => bn.toString());

            var swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 1,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
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
            
            await expect(aFiAFiOracleInstance.connect(investor2).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0)).to.be.reverted;

            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('cumulativeswap when cswap fees is > zero and passed fees is zero', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

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

            await expect(aFiAFiOracleInstance.connect(investor1).updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)).to.be.reverted;

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);


            const numbers = [
                "1250230",
                "211379301119179471",
                "80080613841879501949",
                "34816381824594232923",
                "5355788253"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));
            const stringRepresentations = bigNumbers.map(bn => bn.toString());

            var swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 1,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
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
            

            await expect(aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams)).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('cumulativeswap when cswap fees is zero', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

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

            await expect(aFiAFiOracleInstance.connect(investor1).updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)).to.be.reverted;

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const numbers = [
                "1250230",
                "211379301119179471",
                "80080613841879501949",
                "34816381824594232923",
                "5355788253"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));
            const stringRepresentations = bigNumbers.map(bn => bn.toString());

            var swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 0,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
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

            
            await expect(aFiAFiOracleInstance.connect(investor2).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0)).to.be.reverted;

            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('profit share', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const accountBalance = await daiConInstance.balanceOf(investor1.address)
            console.log("transfer complete")
            console.log("funded account balance", accountBalance / 1e18)

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };

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

            await expect(aFiAFiOracleInstance.connect(investor1).updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address)).to.be.reverted;

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);


            var swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 0,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
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
            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            
            await expect(aFiAFiOracleInstance.connect(investor2).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0)).to.be.reverted;


            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",0);
            const Afterbal1 = await aTokenConInstance.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)



            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

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

            console.log("check amount", Amount);
            usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("before withdraw usdtBalance", usdtBalance);
            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);


            res = await aTokenConInstance.getUTokens();
            console.log("uTokProp", res);
            res = await aTokenConInstance.getProportions();
            console.log("after rebalance theproprtion", res);

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            //To check the profit distribution
            await aTokenConInstance.connect(investor1).withdraw(
                ether(2), usdtConInstance.address, deadline, returnString, 3, 0
            );

            const getController = await aFiAFiOracleInstance.getControllers(aTokenConInstance.address);
            console.log("getController", getController)
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('should revert if setstalepriceWindowLimit is called by non-owner, but succeed when called by owner', async () => {
            const newStalePWindow = 300; // Test value for stale price window limit

            // Try calling the function as a non-owner and expect a revert
            await expect(
                aFiPassiveRebalanceInstance.connect(investor2).setstalepriceWindowLimit(newStalePWindow)
            ).to.be.revertedWith('Ownable: caller is not the owner'); // Assuming 'Ownable' is used for ownership control

        });

    });
});