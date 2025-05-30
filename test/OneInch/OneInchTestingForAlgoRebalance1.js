/* eslint-disable no-underscore-dangle */
const { assert, expect } = require('chai');
const { ethers, waffle } = require('hardhat');
const { BigNumber } = require('ethers');
const { time, constants } = require("@openzeppelin/test-helpers");
const { provider } = waffle;
const { abi: AFIBASE_ABI } = require('../../artifacts/contracts/AtvBase.sol/AtvBase.json');
const {
    // eslint-disable-next-line max-len
    ONEINCHEXCHANGE_ABI, ONEINCHEXCHANGE_ADDRESS, DAI_ABI, DAI_ADDRESS, SAI_ABI, SAI_ADDRESS, USDT_ABI, USDT_ADDRESS, USDC_ABI, USDC_ADDRESS,
} = require('../../utils/constants');
const { ZERO_ADDRESS } = require('@openzeppelin/test-helpers/src/constants');
const getBigNumber = (number) => ethers.BigNumber.from(number);

const swapTokens = require('./getOneInchData.js');
const swapTokens2 = require('./getOneInchData2.js');
const swapTokens3 = require('./getOneInchData3.js');


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


        // LOCAL CONTRACTS
        aFiBaseInstace = await AFiBase.deploy("AFiBase", "AFB");
        aFiManagerInstance = await AFiManager.deploy();
        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();
        datasequencer = await DataConsumerWithSequencerCheck.deploy();
        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address);

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);
        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address, aFiFactoryInstance.address);
        await aFiAFiOracleInstance.setOracleSequencer(datasequencer.address);

        console.log("Payload encoded");
        console.log("aFiBaseInstace", aFiBaseInstace.address);
        console.log("aFiAFiOracleInstance", aFiAFiOracleInstance.address);
        console.log("aFiPassiveRebalanceInstance", aFiPassiveRebalanceInstance.address);
        console.log("AFiFacotry", aFiFactoryInstance.address);
        console.log("aFiStorageInstance", aFiStorageInstance.address);
        console.log("aFiManagerInstance", aFiManagerInstance.address);


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
        // await aFiAFiOracleInstance.updateRebalContract(aFiPassiveRebalanceInstance.address);

        // // Transfer all AFinance Tokens to PLATFORM_WALLET
        // await aFinanceConInstance.transfer(platformWallet.address, AFINANCE_SUPPLY);

        // MAINNET CONTRACT INSTANCES
        daiConInstance = await ethers.getContractAt(DAI_ABI, DAI_ADDRESS);
        usdcConInstance = await ethers.getContractAt(USDC_ABI, USDC_ADDRESS);
        usdtConInstance = await ethers.getContractAt(USDT_ABI, USDT_ADDRESS);
        linkToken = await ethers.getContractAt(DAI_ABI, "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4");

    });

    describe('ALGO', async function () {

        this.timeout(0);
        let snapshotId;
        let aTokenConInstance;

        before(async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
            const payload = [
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
            ]

            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const payloadnew = [
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000",
                    "0x0000000000000000000000000000000000000000",
                    "0x0000000000000000000000000000000000000000",
                ],
                [
                    "0x0000000000000000000000000000000000000000",
                    "0x0000000000000000000000000000000000000000",
                    "0x0000000000000000000000000000000000000000",
                ],
                ["0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
               ],
                ["0", "0", "0"],
                ["3000000", "3000000", "4000000"],
                [
                    "0x0000000000000000000000000000000000000000",
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

            await expect(aFiAFiOracleInstance.connect(investor1).setAFiStorage(aFiStorageInstance.address)).to.be.reverted;

            await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);
            await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
            await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
            await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
            // await aFiAFiOracleInstance.updateRebalContract(aFiPassiveRebalanceInstance.address);

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
            await usdtConInstance.connect(signer).transfer(investor1.address, "3148301051869");
            await usdtConInstance.connect(signer).transfer(investor2.address, "3148301051869");

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
                    "0x99dFc0126ED31E0169fc32dB6B89adF9FeE9a77e",  // pool WBTC - WETH
                    "0xC24f7d8E51A64dc1238880BD00bb961D54cbeb29",   // pool UNI - WETH
                    "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",

                ],
                [
                    "0x99dFc0126ED31E0169fc32dB6B89adF9FeE9a77e",  // pool WBTC - WETH
                    "0xC24f7d8E51A64dc1238880BD00bb961D54cbeb29",   // pool UNI - WETH
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

            // await aFiAFiOracleInstance.increaseObservation("0x99dFc0126ED31E0169fc32dB6B89adF9FeE9a77e", 2);
            // await aFiAFiOracleInstance.increaseObservation("0xC24f7d8E51A64dc1238880BD00bb961D54cbeb29", 2);
            // await aFiAFiOracleInstance.increaseObservation("0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff", 2);
            // await aFiAFiOracleInstance.increaseObservation("0x929fcf81102c5577243Ee614c2c455ACd6681F1A", 2);
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

        it('Algo product testing', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiManagerInstance.setRebalanceController(investor1.address);
            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            console.log("checkkkkkkkk");

            const accountBalance = await daiConInstance.balanceOf(investor1.address)
            console.log("transfer complete")
            console.log("funded account balance", accountBalance / 1e18)

            console.log("Heyy checkout ")

            await aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)

            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
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

            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",  0);

            const oraclePayload = [
                "0x9C917083fDb403ab5ADbEC26Ee294f6EcAda2720",
                "0x86E53CF1B870786351Da77A57575e79CB55812CB",
            ];

            let managerF = await usdtConInstance.balanceOf(investor1.address);
            console.log("before first rebal", `${managerF}`);

            let pool = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address
            );
            console.log("Nav before rebal", `${pool}`);

            var res = await aTokenConInstance.getProportions();
            console.log("uTokProp before rebal", res);

            await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
            await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
            const poolPayload = [
                [
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                ],
                [
                    "0x929fcf81102c5577243Ee614c2c455ACd6681F1A",   // pool UNI - WETH
                    "0x22127577D772c4098c160B49a8e5caE3012C5824",
                ],
                [
                    "0x929fcf81102c5577243Ee614c2c455ACd6681F1A",   // pool UNI - WETH
                    "0x22127577D772c4098c160B49a8e5caE3012C5824"
                ],
                [
                    [[
                        "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // Pool USDT-WETH (Stables- I/O tokens)
                        "0x641C00A822e8b671738d32a431a4Fb6074E5c79d"
                    ]], [[
                        "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool USDC-WETH (Stables- I/O tokens)
                        "0xC6962004f452bE9203591991D15f6b388e09E8D0"
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

            const unipooldata1 = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
            await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], unipooldata1);

            var swapParamsInRebalance = {
                afiContract: aTokenConInstance.address,
                oToken: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
                ],
                newProviders: [0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            const getStables = await aFiManagerInstance.inputTokenUSD(aTokenConInstance.address, 1, aFiStorageInstance.address);
            await aFiManagerInstance.connect(investor1).updateStableUnitsInUSD(getStables);

            console.log("checkkkkkkkkkkkkkk");

            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

            var siloData = {
                silo: 0, // Replace with actual address
                assets: []
            };

            let swap, swap1, swap2, swap3, swap4;
            try {
                const tokenIn = '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f';  // Provide your tokenIn address
                const tokenOut = '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9'; // Provide your tokenOut address
                const amountIn = '1206434';  // Amount to swap
                const from = aTokenConInstance.address;     // Provide the from address
                const origin = aTokenConInstance.address;

                console.log("from", from);

                swap = await swapTokens3(
                    tokenIn,
                    tokenOut,
                    amountIn,
                    from,
                    origin
                );

                swap1 = await swapTokens3(
                    "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
                    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
                    "129205044917720354264",
                    aTokenConInstance.address,
                    aTokenConInstance.address
                );

                swap2 = await swapTokens3(
                    "0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
                    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
                    "84054997662321880306",
                    aTokenConInstance.address,
                    aTokenConInstance.address
                );

                swap3 = await swapTokens3(
                    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
                    "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0",
                    "195692789",
                    aTokenConInstance.address,
                    aTokenConInstance.address
                );

                swap4 = await swapTokens3(
                    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
                    "0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
                    "1956927899",
                    aTokenConInstance.address,
                    aTokenConInstance.address
                );

            } catch (error) {
                console.error("Error during swaps:", error);
            }

            oneInchParam = {
                firstIterationUnderlyingSwap: [swap, swap1, swap2],
                secondIterationUnderlyingSwap: [swap3, swap4],
                firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
                secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
            }

            await aFiPassiveRebalanceInstance.connect(investor1).setDexForTokenPair("0xf97f4df75117a78c1a5a0dbb814af92458539fb4", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", 1);
            await aFiPassiveRebalanceInstance.connect(investor1).setDexForTokenPair("0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", 1);
            await aFiPassiveRebalanceInstance.connect(investor1).setDexForTokenPair("0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", 1);
            await aFiPassiveRebalanceInstance.connect(investor1).setDexForTokenPair("0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", "0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0", 1);
            await aFiPassiveRebalanceInstance.connect(investor1).setDexForTokenPair("0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", "0xf97f4df75117a78c1a5a0dbb814af92458539fb4", 1);

            console.log("----");
           
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiPassiveRebalanceInstance.updatePreSwapDepositLimit(1000000000000000000n);

            await aFiManagerInstance.connect(investor1).rebalanceUnderlyingTokens(
                [
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                        unipooldata1,
                        oraclePayload,
                    [],
                    usdtConInstance.address,
                        0,
                        1,
                        deadline,
                    [0, 0, 0],
                    [0, 0, 0]
                ],
                swapParamsInRebalance,
                oneInchParam,
                0, 
                0
            );

            console.log("2222222222222222222222222222222222222222222");

            res = await aTokenConInstance.getProportions();
            console.log("uTokProp after rebal", res);

            pool = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav after rebal", `${pool}`);

            const check = await aTokenConInstance.getProportions();
            console.log("check", check[0]);

            let check1 = await aTokenConInstance.getUTokens();
            console.log("check", check1);

            // await ethers.provider.send('evm_revert', [snapshotId]);
        });
    });
});