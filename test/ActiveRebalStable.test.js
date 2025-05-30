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

describe('A', (accounts) => {
    let platformWallet; let recipient; let investor1; let investor2; let investor3;
    let rebalanceController;
    let deadline;
    let deployedAFiBase;
    let aTokenConInstance;
    let datasequencer;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let snapshotId;
    let oneInchParam;

    before(async () => {

        oneInchParam = {
            firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
        }
        // Take EVM snapshot
        // snapshotId = await ethers.provider.send('evm_snapshot');

        const userAccounts = await ethers.getSigners();
        [platformWallet, recipient, investor1, investor2, investor3, rebalanceController] = userAccounts;

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
        aFiBaseInstace = await AFiBase.deploy("AFiBase", "AFi");
        aFiManagerInstance = await AFiManager.deploy();
        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();
        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address);

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);
        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address, aFiFactoryInstance.address);

        datasequencer = await DataConsumerWithSequencerCheck.deploy();

        await aFiAFiOracleInstance.setOracleSequencer(datasequencer.address);
        console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);

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
            "0x0000000000000000000000000000000000000000" ],
            ["0","0","0"],
            ["2500000", "2500000", "5000000"],
            [
                "0x0000000000000000000000000000000000000000",
                "0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf",
                "0x0000000000000000000000000000000000000000",
            ],
            2
        ]

        const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);

        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, []);

        aTokenConInstance1 = await aFiFactoryInstance.aFiProducts(0);

        //let txObject = await result.wait()

        //console.log("result++++++++++++++++++++++++", txObject.events[11].args[0]);

        aTokenConInstance1 = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance1);
        //console.log("result++++++++++++++++++++++++", await aTokenConInstance.getPriceOracle("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"));

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


        await aTokenConInstance1.setplatformWallet(platformWallet.address);
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

        // const ether = (amount) => {
        //     const weiString = ethers.utils.parseEther(amount.toString());
        //     return BigNumber.from(weiString);
        // };

        /**
        * GIVE APPROVAL TO AFi of DEPOSIT TOKEN
        * THIS IS REQUIRED WHEN 1% fee IS TRANSFEREED FROM INVESTOR TO PLATFORM WALLET
        */

        console.log("print the productttttttttttt", usdtConInstance.address);

        console.log("print the productttttttttttt", aTokenConInstance1.address);

        await usdtConInstance.connect(investor1).approve(
            aTokenConInstance1.address,
            ethers.constants.MaxUint256
        );

        await usdtConInstance.connect(investor2).approve(
            aTokenConInstance1.address,
            ethers.constants.MaxUint256
        );

        await usdcConInstance.connect(investor1).approve(
            aTokenConInstance1.address,
            ethers.constants.MaxUint256
        );

        await usdcConInstance.connect(investor2).approve(
            aTokenConInstance1.address,
            ethers.constants.MaxUint256
        );

        await daiConInstance.connect(investor1).approve(
            aTokenConInstance1.address,
            ethers.constants.MaxUint256
        );

        await daiConInstance.connect(investor2).approve(
            aTokenConInstance1.address,
            ethers.constants.MaxUint256
        );

        const daiBalance = await daiConInstance.balanceOf(accountToInpersonate)
        console.log("whale dai balance", daiBalance / 1e18)
        console.log("transfering to", accountToFund)


        // await daiConInstance.connect(signer).transfer(investor1.address, daiBalance);

        // const accountBalance = await daiConInstance.balanceOf(investor1.address)
        console.log("transfer complete")
        // console.log("funded account balance", accountBalance / 1e18)

        var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
        let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate);
        usdcBalance = usdcBalance / 100;

        // console.log("usdcBalance",usdcBalance);
        // await usdcConInstance.connect(signer).transfer(investor1.address, "10654653354");
        // await usdcConInstance.connect(signer).transfer(investor2.address, "10654653354");

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 100;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "15571047024");
        await usdtConInstance.connect(signer).transfer(investor2.address, "15571047024");

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

        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
        await aFiPassiveRebalanceInstance.setPriceOracle(
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
            ],
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
                "0x912CE59144191C1204E64559FE8253a0e49E6548"
            ],
            [
                "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
                "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
                "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB"
            ], // USDT, USDC - chainlink oracles
            [
                "0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7",
                "0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3",
                "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB",
                "0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6"
            ],
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
            unipooldata);

        const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance1.address, investor1.address, investor1.address);
        await aFiManagerInstance.setRebalanceController(rebalanceController.address);

        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance1.address, investor1.address, investor1.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance1.address, investor1.address);
        // await aFiManagerInstance.setRebalanceController(platformWallet.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
        
        console.log("transfer completey")
        console.log("funded account balance usdttttttttt", investorusdtBalance);
    });
    describe('Basic checks for deposit and withdraw', () => {

        it('scenario 1 testing inmanager when stable token is usdt', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            console.log("Checkkkkkkkkk");

            const accountBalance = await daiConInstance.balanceOf(investor1.address)
            console.log("transfer complete")
            console.log("funded account balance", accountBalance / 1e18)

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };

            await aTokenConInstance1.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            await aTokenConInstance1.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance1.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance1.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance1.address, investor1.address, investor1.address);

            let checkprop = await aTokenConInstance1.getProportions();
            console.log("after rebalance theproprtion==========>", checkprop);

            const numbers = [
                "1250230",
                "211379301119179471",
                "80080613841879501949",
                "34816381824594232923",
                "5355788253"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));

            const stringRepresentations = bigNumbers.map(bn => bn.toString());

            const swapParams = {
                afiContract: aTokenConInstance1.address,
                oToken: usdcConInstance.address,
                cSwapFee: 0,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
                ],
                newProviders: [0, 2, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: ["0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf"],
                cometRewardTokens: ["0x354A6dA3fcde098F8389cad84b0182725c6C91dE"],
                rewardTokenMinReturnAmounts: [0]
            };

            await aTokenConInstance1.connect(investor1).pauseUnpauseDeposit(true);

            var siloSwapData = {
                siloRewardTokens:[],
                minReturnSilo:[],
                siloOtoken:[]
            };

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0,  oneInchParam, "0x",  0);

            const Afterbal1 = await aTokenConInstance1.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance1.address, aFiStorageInstance.address);
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


            var res = await aTokenConInstance1.getProportions();
            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiManagerInstance.connect(rebalanceController).rebalance(
                bytesData,
                [
                    aTokenConInstance1.address,
                    aFiStorageInstance.address,
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    newUToken,
                    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                    1,
                    [],
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
                ],
            );

            res = await aTokenConInstance1.getUTokens();
            console.log("uTokProp", res);
            res = await aTokenConInstance1.getProportions();
            console.log("after rebalance theproprtion", res);
            res = await aTokenConInstance1.getInputToken();
            console.log("after getInputToken theproprtion", res);
            // await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('scenario 1 testing inmanager when stable token is usdt when adding a stable token again in the list and removing from the non overlapping', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            console.log("Checkkkkkkkkk");

            const accountBalance = await daiConInstance.balanceOf(investor1.address);

            console.log("transfer complete")
            console.log("funded account balance", accountBalance / 1e18)

            await aTokenConInstance1.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            await aTokenConInstance1.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance1.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance1.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance1.address, investor1.address, investor1.address);

            let checkprop = await aTokenConInstance1.getProportions();
            console.log("after rebalance theproprtion==========>", checkprop);

            const numbers = [
                "1250230",
                "211379301119179471",
                "80080613841879501949",
                "34816381824594232923",
                "5355788253"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));

            const stringRepresentations = bigNumbers.map(bn => bn.toString());

            const swapParams = {
                afiContract: aTokenConInstance1.address,
                oToken: usdcConInstance.address,
                cSwapFee: 0,
                cSwapCounter: 1,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
                ],
                newProviders: [0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: ["0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf"],
                cometRewardTokens: ["0x354A6dA3fcde098F8389cad84b0182725c6C91dE"],
                rewardTokenMinReturnAmounts: [0]
            };

            await aTokenConInstance1.connect(investor1).pauseUnpauseDeposit(true);

            var siloSwapData = {
                siloRewardTokens:[],
                minReturnSilo:[],
                siloOtoken:[]
            };

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0,  oneInchParam, "0x",  0);

            const Afterbal1 = await aTokenConInstance1.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance1.address, aFiStorageInstance.address);
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


            const newUToken = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
            const payload = [
                [
                    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const bytesPayload = [
                [
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
                ],
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

            console.log("updatePool");

            var res = await aTokenConInstance1.getUTokens();
            console.log("uTokens -------------------------", res);

            res = await aTokenConInstance1.getProportions();
            console.log("uTokProp", res);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            // await aFiManagerInstance.connect(rebalanceController).rebalance(
            //     bytesData,
            //     [
            //         aTokenConInstance1.address,
            //         aFiStorageInstance.address,
            //         "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
            //         newUToken,
            //         "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
            //         1,
            //         [],
            //         res[0],
            //         res[1],
            //         0
            //     ],
            //     deadline,
            //     [0, 0],
            //     0,
            //     0
            // );

            await aFiManagerInstance.connect(rebalanceController).rebalance(
                bytesData,
                [
                    aTokenConInstance1.address,
                    aFiStorageInstance.address,
                    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
                    newUToken,
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    2,
                    [],
                    res[0],
                    res[1],
                    0,
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
            );

            res = await aTokenConInstance1.getUTokens();
            console.log("uTokProp", res);
            res = await aTokenConInstance1.getProportions();
            console.log("after rebalance theproprtion", res);
            res = await aTokenConInstance1.getInputToken();
            console.log("after getInputToken theproprtion", res);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('scenario 2 testing inmanager when stable token is usdt', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            console.log("Checkkkkkkkkk");

            const accountBalance = await daiConInstance.balanceOf(investor1.address)
            console.log("transfer complete")
            console.log("funded account balance", accountBalance / 1e18)

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };
            await aTokenConInstance1.connect(investor1).deposit(
                3000000000, usdtConInstance.address
            );

            await aTokenConInstance1.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance1.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance1.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance1.address, investor1.address, investor1.address);

            const numbers = [
                "1250230",
                "211379301119179471",
                "80080613841879501949",
                "34816381824594232923",
                "5355788253"
            ];

            const bigNumbers = numbers.map(num => BigNumber.from(num));

            const stringRepresentations = bigNumbers.map(bn => bn.toString());

            const swapParams = {
                afiContract: aTokenConInstance1.address,
                oToken: usdcConInstance.address,
                cSwapFee: 0,
                cSwapCounter: 2,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
                ],
                newProviders: [0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: ["0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf"],
                cometRewardTokens: ["0x354A6dA3fcde098F8389cad84b0182725c6C91dE"],
                rewardTokenMinReturnAmounts: [0]
            };

            await aTokenConInstance1.connect(investor1).pauseUnpauseDeposit(true);

            var siloSwapData = {
                siloRewardTokens:[],
                minReturnSilo:[],
                siloOtoken:[]
            };

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",  0);

            const Afterbal1 = await aTokenConInstance1.balanceOf(investor1.address);
            console.log("Afterbal++++++3", `${Afterbal1}`)

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance1.address, aFiStorageInstance.address);
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

            res = await aTokenConInstance1.getUTokens();
            console.log("uTokProp", res);

            var res = await aTokenConInstance1.getProportions();
            console.log("uTokProp", res);

            await aFiPassiveRebalanceInstance.intializeStalePriceDelay([
                "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"
            ], [
                86500
            ]);

            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);

            await aFiManagerInstance.connect(rebalanceController).rebalance(
                bytesData,
                [
                    aTokenConInstance1.address,
                    aFiStorageInstance.address,
                    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
                    newUToken,
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    2,
                    [],
                    res[0],
                    res[1],
                    0,
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
                ],
            );

            res = await aTokenConInstance1.getUTokens();
            console.log("uTokProp", res);
            res = await aTokenConInstance1.getProportions();
            console.log("after rebalance theproprtion", res);
            res = await aTokenConInstance1.getInputToken();
            console.log("after getInputToken theproprtion", res);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });
    })
})

