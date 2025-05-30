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
const exp = require('constants');
const { zeroAddress } = require('ethereumjs-util');

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
    let aFiMorphoInstance;
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
        //const AFiMorphoVaultInteraction = await ethers.getContractFactory('AtvMorphoVaultInteraction');

        aFiBaseInstace = await AFiBase.deploy("AFi802", "AFi");
        aFiManagerInstance = await AFiManager.deploy();
        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();
        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address);
        // aFiDelayModule = await delayModule.deploy(86400, 172800);

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);
        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address, aFiFactoryInstance.address);
        
        //aFiMorphoInstance = await AFiMorphoVaultInteraction.deploy(aFiAFiOracleInstance.address);

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
                "0x078f358208685046a11C85e8ad32895DED33A249",
                "0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8",
                "0x0000000000000000000000000000000000000000",
                "0x191c10Aa4AF7C30e871E70C95dB0E4eb77237530",
            ],
            [
                "0xD3204E4189BEcD9cD957046A8e4A643437eE0aCC",
                "0x0000000000000000000000000000000000000000",
                "0x46Eca1482fffb61934C4abCA62AbEB0b12FEb17A",
                "0x013ee4934ecbFA5723933c4B08EA5E47449802C8",
            ],
            [   "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000"
            ]
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
        await aTokenConInstance.setMinDepLimit(100);
        //await aFiStorageInstance.setMorphoVaultInteraction(aFiMorphoInstance.address);

        console.log("transfer complete")
        console.log("funded account balance usdttttttttt", investorusdtBalance)
    });

});

    
describe('Stable product', (accounts) => {
    let platformWallet; let recipient; let investor1; let investor2;
    let deadline;
    let deployedAFiBase;
    let aTokenConInstance;
    let datasequencer;
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
        [platformWallet, recipient, investor1, investor2] = userAccounts;

        const currentTime = await time.latest();
        deadline = currentTime + (60 * 60);

        const AFiBase = await ethers.getContractFactory('AtvBase');
        const AFiManager = await ethers.getContractFactory('AtvManager');
        const PassiveRebalanceStrategies = await ethers.getContractFactory('AtvPassiveRebalanceStrategies');
        const DataConsumerWithSequencerCheck = await ethers.getContractFactory('DataConsumerWithSequencerCheck');
        const AFiStorage = await ethers.getContractFactory('AtvStorage');
        const AFiFacotry = await ethers.getContractFactory('AtvFactory');
        const AFiOracle = await ethers.getContractFactory('AtvOracle');
        //const AFiMorphoVaultInteraction = await ethers.getContractFactory('AtvMorphoVaultInteraction');
        // LOCAL CONTRACTS
        aFiBaseInstace = await AFiBase.deploy("AFi802", "AFi");
        aFiManagerInstance = await AFiManager.deploy();
        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();
        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address);

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);
        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address, aFiFactoryInstance.address);
        datasequencer = await DataConsumerWithSequencerCheck.deploy();
        //aFiMorphoInstance = await AFiMorphoVaultInteraction.deploy(aFiAFiOracleInstance.address);
        console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);

        await aFiAFiOracleInstance.setOracleSequencer(datasequencer.address);

        console.log("____________________________________________");


        const payload = [
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // underlying - USDT
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC
                "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",  // DAI
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
            ]
        ]



        const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

        console.log("________________________1____________________");


        const payloadnew = [
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", 
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", 
                "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
            ], //USDT, USDC - payment tokens
            uDataPayload,
            [
                "0x6ab707Aca953eDAeFBc4fD23bA73294241490620",
                "0x724dc807b04555b71ed48a6896b6F41593b8C637",
                "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
            ],
            [
                "0xf52f079Af080C9FB5AFCA57DDE0f8B83d49692a9",
                "0x8dc3312c68125a94916d62B97bb5D925f84d4aE0",
                "0xf6995955e4B0E5b287693c221f456951D612b628",
            ],
            ["0x0000000000000000000000000000000000000000",
             "0x563B46Cddd026Ee909C75eF5D125A94136799Ac1",
             "0x0000000000000000000000000000000000000000" ],
            ["0", "0", "0"],
            ["2500000", "2500000", "5000000"],
            [
                "0x0000000000000000000000000000000000000000",
                "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf",
                "0x0000000000000000000000000000000000000000",
            ],
            2
        ]
        

        const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);
        console.log("Payload encoded");

        console.log("________________________3____________________");


        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, []);

        deployedAFiBase = await aFiFactoryInstance.aFiProducts(0);

        console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);

        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, deployedAFiBase);

        console.log("000000000000000000000000000000000000000000000000000000000");

        await aFiPassiveRebalanceInstance.setPriceOracle(
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
            ],
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
            ],
            [
                "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
                "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
                "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB"
            ], // USDT, USDC - chainlink oracles
            [
                "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
                "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
                "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB"
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

        await expect(aFiPassiveRebalanceInstance.intializeStalePriceDelay([
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
            86500
        ])).to.be.reverted;



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
        await expect(aFiAFiOracleInstance.connect(investor1).setAFiStorage(aFiStorageInstance.address)).to.be.reverted;

        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);

        await aFiAFiOracleInstance.updateRebalContract(aFiPassiveRebalanceInstance.address);

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

        await usdcConInstance.connect(signer2).transfer(investor1.address, usdcBalance);
        console.log("usdcBalance", usdcBalance);

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 3;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "10000000000");
        //await usdtConInstance.connect(signer).transfer(investor2.address, "8000000000");

        const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

        await aFiPassiveRebalanceInstance.updateMidToken(
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // underlying - WBTC
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // WETH
                "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",  // UNI
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
            ]
        );

        const poolPayload = [
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // underlying - WBTC
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // WETH
                "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",  // UNI
                "0x354A6dA3fcde098F8389cad84b0182725c6C91dE"
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of DAI
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDC
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // Middle Token of USDT
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // pool WBTC - WETH
                "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool WETH - WETH
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001",   // pool UNI - WETH
                "0xDfA19e743421C394d904f5a113121c2227d2364b"
            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // pool WBTC - WETH
                "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool WETH - WETH
                "0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001",
                "0xDfA19e743421C394d904f5a113121c2227d2364b"
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d", // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d", // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",  // Pool USDT-WETH (Stables- I/O tokens)
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d"
                ]],
                [[
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0", // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0", // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0",  // pool USDC-WETH (Stables- I/O tokens)
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0"
                ]],
                [[
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

        await aFiPassiveRebalanceInstance.initUniStructure(
            ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
            unipooldata)

        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aFiManagerInstance.setRebalanceController(platformWallet.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
       

        // async function fetchMorphoRewards(userAddress) {
        //     try {
        //       // Validate the address format (basic check)
        //       if (!userAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        //         throw new Error('Invalid Ethereum address format');
        //       }
              
        //       console.log("Fetching data for address:", userAddress);
              
        //       // Construct the API URL with the user's address
        //       const apiUrl = `https://rewards.morpho.org/v1/users/${userAddress}/distributions`;
              
        //       console.log("API URL:", apiUrl);
              
        //       // Make the API request with axios
        //       const response = await axios.get(apiUrl);
              
        //       console.log("Response status:", response.status);
              
        //       // The data is already parsed with axios
        //       const data = response.data;
              
        //       console.log("Received data:", JSON.stringify(data, null, 2));
              
        //       // Process and display the important information
        //       console.log('Morpho Rewards Information:');
        //       console.log('--------------------------');
              
        //       if (data.data && data.data.length > 0) {
        //         // Loop through all available distributions
        //         data.data.forEach((distribution, index) => {
        //           console.log(`Distribution #${index + 1}:`);
        //           console.log(`User: ${distribution.user}`);
        //           console.log(`Asset Address: ${distribution.asset.address}`);
        //           console.log(`Chain ID: ${distribution.asset.chain_id}`);
        //           console.log(`Distributor Address: ${distribution.distributor.address}`);
        //           console.log(`Claimable Amount: ${distribution.claimable}`);
                  
        //           // Display transaction data if available
        //           if (distribution.tx_data) {
        //             console.log(`Transaction Data Available: Yes`);
        //           } else {
        //             console.log(`Transaction Data Available: No`);
        //           }
                  
        //           // Display proof information
        //           if (distribution.proof && distribution.proof.length > 0) {
        //             console.log(`Merkle Proof: Available (${distribution.proof.length} elements)`);
        //           } else {
        //             console.log(`Merkle Proof: Not available`);
        //           }
                  
        //           console.log('--------------------------');
        //         });
        //       } else {
        //         console.log('No reward distributions found for this address');
        //       }
              
        //       // Return the full data for further processing if needed
        //       return data;
        //     } catch (error) {
        //       console.error('Error fetching Morpho rewards:', error.message);
        //       // Log more detailed error information
        //       if (error.response) {
        //         // The request was made and the server responded with a status code
        //         // that falls out of the range of 2xx
        //         console.error('Error details:', {
        //           status: error.response.status,
        //           data: error.response.data
        //         });
        //       } else if (error.request) {
        //         // The request was made but no response was received
        //         console.error('No response received:', error.request);
        //       }
        //       throw error;
        //     }
        //   }

        // // Call the function
        // const data =  await fetchMorphoRewards(userAddress)
                
        // console.log("data", data);

        // console.log("funded account balance usdt", investorusdtBalance)


    });

    context('Basic checks for deposit and withdraw', () => {

        it('Stable product', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            // await aTokenConInstance.connect(investor1).deposit(
            //     3000000000, usdtConInstance.address
            // );

            await aTokenConInstance.connect(investor1).deposit(
                100000000, usdcConInstance.address
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
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
                ],
                newProviders: [0, 5, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: ["0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf"],
                cometRewardTokens: ["0x354A6dA3fcde098F8389cad84b0182725c6C91dE"],
                rewardTokenMinReturnAmounts: [0]
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            let navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav before cswap", `${navfromStorage}`);


           // await expect(aFiAFiOracleInstance.connect(investor2).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)).to.be.reverted;
            
            //await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);

          

            const morphoRewardData = {
                rewardTokens: [],
                proofs: [],
                rewardTokenAmount:[],
                minReturnAmounts: [],
                swapData: []
              };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, morphoRewardData, ["0x"], 0);

            navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav after cswap", `${navfromStorage}`);
                     
            const morphoBalanceBeforeWithdraw = await aFiStorageInstance.balanceMorpho(
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC address
                aTokenConInstance.address
            );
            console.log("AtvBase Morpho Balance in USDC before withdrawal:", morphoBalanceBeforeWithdraw);

            // // Advance time by 2 weeks (14 days)
            // await network.provider.send("evm_increaseTime", [14 * 24 * 60 * 60]); // 14 days in seconds
            // await network.provider.send("evm_mine"); // Mine a new block with the new timestamp


            // Verify that the balance is greater than 0 after deposit via cumulativeSwap
            expect(morphoBalanceBeforeWithdraw).to.be.gt(0, "No assets were deposited to Morpho");
            
            const Afterbal1 = await aTokenConInstance.balanceOf(
                investor1.address
            );
            
            const minimumReturnAmount = [0, 0, 0, 0];
            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            // await aTokenConInstance.connect(investor1).withdraw(
            //     Afterbal1, usdtConInstance.address, deadline, returnString, 3, 0
            // );

            // Check the balance after withdrawal
            const morphoBalanceAfterWithdraw = await aFiStorageInstance.balanceMorpho(
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC address
                aTokenConInstance.address
            );
            console.log("AtvBase Morpho Balance in USDC after withdrawal:", ethers.utils.formatUnits(morphoBalanceAfterWithdraw,0));

            // // Verify that assets were withdrawn from Morpho
            // expect(morphoBalanceAfterWithdraw).to.be.lt(
            //     morphoBalanceBeforeWithdraw, 
            //     "Assets were not withdrawn from Morpho"
            // );

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)

            await ethers.provider.send('evm_revert', [snapshotId]);
        });
    });
});

