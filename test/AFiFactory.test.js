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
const exp = require('constants');
const { zeroAddress } = require('ethereumjs-util');

const getBigNumber = (number) => ethers.BigNumber.from(number);

describe('AFiBase', () => {
    let platformWallet; let recipient; let investor1; let investor2;
    let deadline;
    let aTokenConInstance;
    let aTokenConInstance1;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let bytesPayload2;

    beforeEach(async () => {
        const userAccounts = await ethers.getSigners();
        [platformWallet, recipient, investor1, investor2, other] = userAccounts;

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

        // LOCAL CONTRACTS
        aFiBaseInstace = await AFiBase.deploy("AFiBase", "AFB");
        aFiManagerInstance = await AFiManager.deploy();

        dataConsumerWithSequencerCheckInstance = await DataConsumerWithSequencerCheck.deploy();

        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();

        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address);

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);

        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address,aFiFactoryInstance.address);

        aFiTimeLockInstance = await AFiTimeDelayContract.deploy(investor1.address, 100, 172800);

        console.log("print the address of the aFiFactoryInstance", aFiFactoryInstance.address);
        
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
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            ["0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000"  ],
            ["0","0","0","0"],
            ["2500000", "2500000",
             "2500000", "2500000"
            ],
            [
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000", 
                "0x0000000000000000000000000000000000000000", 
            ],
            2
        ]

        bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);
        await aFiAFiOracleInstance.setOracleSequencer(dataConsumerWithSequencerCheckInstance.address);


        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"]);

        aTokenConInstance = await aFiFactoryInstance.aFiProducts(0);
        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance);

        await aFiPassiveRebalanceInstance.setPriceOracle( ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
            "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
            "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
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


        const accountToInpersonate = "0xF977814e90dA44bFA03b6295A0616a897441aceC"
        const accountToFund = "0x7Bc58bD67b258b445E4528039BE14824f04d2422"

        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [accountToInpersonate],
        });
        const signer = await ethers.getSigner(accountToInpersonate);

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

        // await daiConInstance.connect(investor1).approve(
        //     aTokenConInstance.address,
        //     ethers.constants.MaxUint256
        // );

        // await daiConInstance.connect(investor2).approve(
        //     aTokenConInstance.address,
        //     ethers.constants.MaxUint256
        // );

        // const daiBalance = await daiConInstance.balanceOf(accountToInpersonate)
        // console.log("whale dai balance", daiBalance / 1e18)
        // console.log("transfering to", accountToFund)


        // await daiConInstance.connect(signer).transfer(investor1.address, daiBalance);

        // const accountBalance = await daiConInstance.balanceOf(investor1.address)
        // console.log("transfer complete")
        // console.log("funded account balance", accountBalance / 1e18)

        var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
        let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate);
        // usdcBalance = usdcBalance / 100;

        console.log("usdcBalance",usdcBalance);
        await usdcConInstance.connect(signer).transfer(investor1.address, usdcBalance);

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 100;
        console.log("usdtBalance", usdtBalance)
        await usdtConInstance.connect(signer).transfer(investor1.address, "108790359575");
    
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
                "0x99dFc0126ED31E0169fc32dB6B89adF9FeE9a77e",  // pool WBTC - WETH
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // pool WETH - WETH
                "0xC24f7d8E51A64dc1238880BD00bb961D54cbeb29",   // pool UNI - WETH
                "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",
                "0xDfA19e743421C394d904f5a113121c2227d2364b"

            ],
            [
                "0x99dFc0126ED31E0169fc32dB6B89adF9FeE9a77e",  // pool WBTC - WETH
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // pool WETH - WETH
                "0xC24f7d8E51A64dc1238880BD00bb961D54cbeb29",   // pool UNI - WETH
                "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",
                "0xDfA19e743421C394d904f5a113121c2227d2364b"

            ],
            [
                [[
                    "0x42161084d0672e1d3F26a9B53E653bE2084ff19C", // Pool USDT-WETH (Stables- I/O tokens)
                    "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",  // Pool USDT-WETH (Stables- I/O tokens)
                    "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",  // Pool USDT-WETH (Stables- I/O tokens)
                    "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",  // Pool USDT-WETH (Stables- I/O tokens)
                    "0x42161084d0672e1d3F26a9B53E653bE2084ff19C"
                ]], [[
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F", // pool USDC-WETH (Stables- I/O tokens)
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",  // pool USDC-WETH (Stables- I/O tokens)
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",  // pool USDC-WETH (Stables- I/O tokens)
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",  // pool USDC-WETH (Stables- I/O tokens)
                    "0x6f38e884725a116C9C7fBF208e79FE8828a2595F"
                ]],
                [[
                    "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87",
                    "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87",
                    "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87",
                    "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87",
                    "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87"
                ]]
            ],
            [
                "0x42161084d0672e1d3F26a9B53E653bE2084ff19C",
                "0x6f38e884725a116C9C7fBF208e79FE8828a2595F",
                "0x0779450b087a86C40E074aC00a65Eabe1Cbc0f87"
            ]
        ]
        const unipooldata = await aFiPassiveRebalanceInstance.encodePoolData(poolPayload)
        await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], unipooldata);

        const investorusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
    
        console.log("transfer complete")
        console.log("funded account balance usdttttttttt", investorusdtBalance)
    });
    context('Reverts', () => {   
        it('should revert if Manager address is zero', async () => {
            await expect(
                aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address], false, aFiStorageInstance.address,
                    aFiPassiveRebalanceInstance.address, constants.ZERO_ADDRESS, [constants.ZERO_ADDRESS])
            ).to.be.reverted;
        });

        it('should revert if team wallets address is zero', async () => {
            await expect(
                aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [constants.ZERO_ADDRESS], false, aFiStorageInstance.address,
                    aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, [investor1.address])
            ).to.be.reverted;
        });

        it('should revert if storage address is zero', async () => {
            await expect(
                aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address], false, constants.ZERO_ADDRESS,
                    aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, [investor1.address])
            ).to.be.reverted;
        });

        it('should revert if array length mismatched', async () => {
            // when array length mismatched
            payload = [[
                "0x5Cf04716BA20127F1E2297AdDCf4B5035000c9eb", "0x5Cf04716BA20127F1E2297AdDCf4B5035000c9eb"  // USDT
            ],
            [
                "0xdAC17F958D2ee523a2206206994597C13D831ec7"
            ],
            [
                "0xF743aCE0Dd18b26ef95988486315dD7a39b07035"   // pool USDT - WETH
            ],
            [
                "0xF743aCE0Dd18b26ef95988486315dD7a39b07035"   // pool USDT - WETH
            ],
            [
                [[
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035" // Pool USDT-WETH (Stables- I/O tokens)
                ]], [[
                    "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"  // pool USDC-WETH (Stables- I/O tokens)
                ]]
            ],
            [
                "0xF743aCE0Dd18b26ef95988486315dD7a39b07035",
                "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"
            ]
            ]
            uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            payloadnew = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0x0000000000000000000000000000000000000000"
                  ],
                ["0"],
                ["10000000"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2
            ]

            const MismatchedPayloadbytes2 = await aFiFactoryInstance.encodePoolData(payloadnew);
            await expect(
                aFiFactoryInstance.createAToken("AFiBase", "ATOK", MismatchedPayloadbytes2, [investor1.address], false, aFiStorageInstance.address,
                    aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, [investor1.address], { gas: 2000000 })
            ).to.be.reverted;
        });

        it('should revert if underlying address is zero', async () => {
            // test if underlying address is zero
            payload = [
                [
                    "0x0000000000000000000000000000000000000000",
                    "0x5Cf04716BA20127F1E2297AdDCf4B5035000c9eb"
                ],
                [
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035",   // pool USDT - WETH
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035",   // pool USDT - WETH
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                ],
                [
                    [[
                        "0xF743aCE0Dd18b26ef95988486315dD7a39b07035", // Pool USDT-WETH (Stables- I/O tokens)
                        "0xF743aCE0Dd18b26ef95988486315dD7a39b07035"
                    ]], [[
                        "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d",  // pool USDC-WETH (Stables- I/O tokens)
                        "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"
                    ]]
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035",
                    "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"
                ]
            ]
            uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            payloadnew = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000",
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000",
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000"
                 ],
                ["0","0"],
                ["5000000", "5000000"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2,
            ]
            const zeroPayloadbytes2 = await aFiFactoryInstance.encodePoolData(payloadnew);

            await expect(
                aFiFactoryInstance.createAToken("AFiBase", "ATOK", zeroPayloadbytes2, [investor1.address], false, aFiStorageInstance.address,
                    aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, [investor1.address], { gas: 2000000 }), "zero addr"
            ).to.be.reverted;
        });

        it('should revert proportion sum is equal to zero', async () => {
            var payload = [
                [
                    "0x5Cf04716BA20127F1E2297AdDCf4B5035000c9eb"  // USDT
                ],
                [
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035"   // pool USDT - WETH
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035"   // pool USDT - WETH
                ],
                [
                    [[
                        "0xF743aCE0Dd18b26ef95988486315dD7a39b07035" // Pool USDT-WETH (Stables- I/O tokens)
                    ]], [[
                        "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"  // pool USDC-WETH (Stables- I/O tokens)
                    ]]
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035",
                    "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"
                ]
            ]
            var uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            var payloadnew = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0x0000000000000000000000000000000000000000"
               ],
                ["0"],
                ["3000000"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2
            ]

            const payloadbytes = await aFiFactoryInstance.encodePoolData(payloadnew);

            try {
                await aFiFactoryInstance.createAToken("AFiBase", "ATOK", payloadbytes, [investor1.address, investor2.address], false, aFiStorageInstance.address,
                    aFiPassiveRebalanceInstance.address, aFiAFiOracleInstance.address, ["0xdAC17F958D2ee523a2206206994597C13D831ec7"]);
                assert.fail("Expected transaction to be reverted");
            } catch (error) {
                assert.include(error.message, 'AF01', 'Revert message does not match');
            }

        });

        it('should revert if team wallets array length is not greater than 0', async () => {
            var payload = [
                [
                    "0x5Cf04716BA20127F1E2297AdDCf4B5035000c9eb"  // USDT
                ],
                [
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035"   // pool USDT - WETH
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035"   // pool USDT - WETH
                ],
                [
                    [[
                        "0xF743aCE0Dd18b26ef95988486315dD7a39b07035" // Pool USDT-WETH (Stables- I/O tokens)
                    ]], [[
                        "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"  // pool USDC-WETH (Stables- I/O tokens)
                    ]]
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035",
                    "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"
                ]
            ]
            var uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            var payloadnew = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0x0000000000000000000000000000000000000000"
                ],
                ["0"],
                ["10000000"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2
            ]
            const bytesPayload = await aFiFactoryInstance.encodePoolData(payloadnew);
            try {
                await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload, [], false, aFiStorageInstance.address,
                    aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, [investor1.address]);
                assert.fail("Expected transaction to be reverted");
            } catch (error) {
                assert.include(error.message, 'AF: Array Length', 'Revert message does not match');
            }
        });

        it('should revert if array lengths are not equal', async () => {
            var payload = [
                [
                    "0x5Cf04716BA20127F1E2297AdDCf4B5035000c9eb",  // USDT

                ],
                [
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035"   // pool USDT - WETH
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035"   // pool USDT - WETH
                ],
                [
                    [[
                        "0xF743aCE0Dd18b26ef95988486315dD7a39b07035" // Pool USDT-WETH (Stables- I/O tokens)
                    ]], [[
                        "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"  // pool USDC-WETH (Stables- I/O tokens)
                    ]]
                ],
                [
                    "0xF743aCE0Dd18b26ef95988486315dD7a39b07035",
                    "0xEe4Cf3b78A74aFfa38C6a926282bCd8B5952818d"
                ]
            ]
            var uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            var payloadnew = [
                ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"], //USDT, USDC - payment tokens
                uDataPayload,
                [
                    "0x0000000000000000000000000000000000000000",
                    "0xdAC17F958D2ee523a2206206994597C13D831ec7"
                ],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                ["0x0000000000000000000000000000000000000000"
                 ],
                ["0"],
                ["10000000"],
                [
                    "0x0000000000000000000000000000000000000000"
                ],
                2
            ]
            const invalidPayload = await aFiFactoryInstance.encodePoolData(payloadnew);
            try {
                await aFiFactoryInstance.createAToken("AFiBase", "ATOK", invalidPayload, [investor1.address], false, aFiStorageInstance.address,
                    aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, [investor1.address]);
                assert.fail("Expected transaction to be reverted");
            } catch (error) {
                assert.include(error.message, 'AF: Array lengths', 'Revert message does not match');
            }
        });
    })

    context('Basic check for states and deployment of product', async () => {
        beforeEach(async () => {
            result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
                aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"]);
            let txObject = await result.wait()
            aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI,await  aFiFactoryInstance.aFiProducts(0));
        })

        it('should deploy successfully', async () => {
             let afiCount = await aFiFactoryInstance.afiProductsCount();
             expect(afiCount).to.equal(2);

        })

        it('should deploy successfully', async () => {
            result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], false, aFiStorageInstance.address,
                aFiPassiveRebalanceInstance.address, aFiAFiOracleInstance.address, []);
            let txObject = await result.wait()
            
            aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, await aFiFactoryInstance.aFiProducts(0));
          
            // Call getPricePerFullShare and check if the return value is greater than 0
            let pricePerFullShare = await aFiFactoryInstance.getPricePerFullShare(
                aTokenConInstance.address,
                aFiStorageInstance.address
            );

            expect(pricePerFullShare).to.equal(1000000);

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            // Call getPricePerFullShare and check if the return value is greater than 0
            pricePerFullShare = await aFiFactoryInstance.getPricePerFullShare(
                aTokenConInstance.address,
                aFiStorageInstance.address
            );

            expect(pricePerFullShare).to.be.gt(0);
        });

        it('should return correct initilizeStatus and initializeTokenStatus for aFiContract', async function () {
            // Call getAFiInitStatus to get the statuses
            const [initStatus, initializeTokenStatus] = await aFiFactoryInstance.getAFiInitStatus(aTokenConInstance.address);
            // Check the returned values
            expect(initStatus).to.be.true;
            expect(initializeTokenStatus).to.be.true; // Assuming it was not updated for order 2
        });

        it('should return correct initilizeStatus and initializeTokenStatus for another aFiContract', async function () {
            // Call afiContractInitUpdate to update statuses with order 2
            let order = 2;
            await expect(aFiFactoryInstance.connect(investor1.address).afiContractInitUpdate(aTokenConInstance.address, order)).to.be.reverted;
            order = 1;
            await expect(aFiFactoryInstance.connect(investor1.address).afiContractInitUpdate(aTokenConInstance.address, order)).to.be.reverted;
        });

        it('should revert when create token invoked by other address', async function () {
            await expect(
                aFiFactoryInstance.connect(investor1).createAToken(
                    "AFiBase",
                    "ATOK",
                    bytesPayload2,
                    [investor1.address, investor2.address],
                    true,
                    aFiStorageInstance.address,
                    aFiPassiveRebalanceInstance.address,
                    aFiManagerInstance.address,
                    ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0x6B175474E89094C44Da98b954EedeAC495271d0F"]
                )
            ).to.be.revertedWith('Ownable: caller is not the owner');
        });

        // it('transfer Ownership', async () => {
        //     snapshotId = await ethers.provider.send('evm_snapshot');

        //     var timelockPaylod = await aFiTimeLockInstance.encodeTransferOwnership(other.address);

        //     const currentTime = await time.latest();
            
        //     const delayModuleaddress = await aTokenConInstance.getDelayModule();
        //     console.log("delay module address", `${delayModuleaddress}`);

        //     await aFiTimeLockInstance.queueTransaction(
        //         aTokenConInstance.address,
        //         0,
        //         timelockPaylod,
        //         `${currentTime}`+2
        //     )
    
        //     await expect(aFiTimeLockInstance.executeTransaction(
        //         aTokenConInstance.address,
        //         0,
        //         timelockPaylod,
        //         `${currentTime}`+2
        //     )).to.be.revertedWith("Timelock: Transaction hasn't surpassed time lock");
    
        //     await expect(aFiTimeLockInstance.connect(other).cancelTransaction(
        //         aTokenConInstance.address,
        //         0,
        //         timelockPaylod,
        //         `${currentTime}`+2
        //     )).to.be.revertedWith("Caller is not the rescind controller");
    
        //     await aFiTimeLockInstance.connect(investor1).updateRescindController(other.address);
        //     console.log("Rescind controller set")
    
        //     await aFiTimeLockInstance.connect(other).cancelTransaction(
        //         aTokenConInstance.address,
        //         0,
        //         timelockPaylod,
        //         `${currentTime}`+2
        //     );
    
        //     await expect(aFiTimeLockInstance.executeTransaction(
        //         aTokenConInstance.address,
        //         0,
        //         timelockPaylod,
        //         `${currentTime}`+2
        //     )).to.be.revertedWith("Timelock: Transaction not found");

        //     await aTokenConInstance.setDelayModule(aFiTimeLockInstance.address);
        //     console.log("new delay module set")

    
        //     await aFiTimeLockInstance.connect(other).updateDelay(1);

        //     await aFiTimeLockInstance.queueTransaction(
        //         aTokenConInstance.address,
        //         0,
        //         timelockPaylod,
        //         `${currentTime}`+0
        //     )

        //     await aFiTimeLockInstance.queueTransaction(
        //         aTokenConInstance.address,
        //         0,
        //         timelockPaylod,
        //         `${currentTime}`+0
        //     )

        //     await aFiTimeLockInstance.executeTransaction(
        //         aTokenConInstance.address,
        //         0,
        //         timelockPaylod,
        //         `${currentTime}`+0
        //     )
        // });
    })
})