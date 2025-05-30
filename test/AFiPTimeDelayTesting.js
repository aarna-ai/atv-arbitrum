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


describe('AFiTimeDelayModule', () => {
    let platformWallet; let recipient; let investor1; let investor2;
    let deadline;
    let aTokenConInstance;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;

    beforeEach(async () => {
        const userAccounts = await ethers.getSigners();
        [platformWallet, recipient, investor1, investor2, investor3, investor4, owner, other] = userAccounts;

        const currentTime = await time.latest();
        deadline = currentTime + (60 * 60);

        const feeData = await hre.ethers.provider.getFeeData();

        const AFiBase = await ethers.getContractFactory('AtvBase');
        const AFiManager = await ethers.getContractFactory('AtvManager');
        const PassiveRebalanceStrategies = await ethers.getContractFactory('AtvPassiveRebalanceStrategies');

        const AFiStorage = await ethers.getContractFactory('AtvStorage');
        const AFiFacotry = await ethers.getContractFactory('AtvFactory');
        const AFiOracle = await ethers.getContractFactory('AtvOracle');
        const DataConsumerWithSequencerCheck = await ethers.getContractFactory('DataConsumerWithSequencerCheck');
        const AFiTimeDelayContract = await ethers.getContractFactory('TimeDelayModule');

        datasequencer = await DataConsumerWithSequencerCheck.deploy();

        // LOCAL CONTRACTS
        aFiBaseInstace = await AFiBase.deploy("AFi802", "AFi");
        aFiManagerInstance = await AFiManager.deploy({
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });

        aFiTimeLockInstance = await AFiTimeDelayContract.deploy(investor1.address, 100, 172800, {
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            maxFeePerGas: feeData.maxFeePerGas,
            type: 2
        });

        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy({
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
                "0xD3204E4189BEcD9cD957046A8e4A643437eE0aCC",
                "0x0000000000000000000000000000000000000000",
                "0x46Eca1482fffb61934C4abCA62AbEB0b12FEb17A",
                "0x013ee4934ecbFA5723933c4B08EA5E47449802C8",
            ],
            [
                "0x727354712BDFcd8596a3852Fd2065b3C34F4F770",
                "0x0dF5dfd95966753f01cb80E76dc20EA958238C46",
                "0x0000000000000000000000000000000000000000",
                "0x0000000000000000000000000000000000000000",
            ],
            ["0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",],
            ["0", "0", "0", "0"],
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

        const bytesPayload2 = await aFiFactoryInstance.encodePoolData(payloadnew);

        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"]);

        deployedAFiBase = await aFiFactoryInstance.aFiProducts(0)

        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, deployedAFiBase);

        await aFiPassiveRebalanceInstance.setPriceOracle(
            [
                "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
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

        await aFiAFiOracleInstance.setOracleSequencer(datasequencer.address);

        await aFiAFiOracleInstance.intializeStalePriceDelay([
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

        // await aTokenConInstance.updateTVLUpdatePeriod(3000);
        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);


        await aFiAFiOracleInstance.updateMidToken(
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
                "0x03a3bE7Ab4aa263D42d63B6CC594F4fb3D3F3951",  // pool WBTC - WETH
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",  // pool WETH - WETH
                "0xC24f7d8E51A64dc1238880BD00bb961D54cbeb29",   // pool UNI - WETH
                "0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff",
                "0xDfA19e743421C394d904f5a113121c2227d2364b"

            ],
            [
                "0x03a3bE7Ab4aa263D42d63B6CC594F4fb3D3F3951",  // pool WBTC - WETH
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
        await aFiPassiveRebalanceInstance.initUniStructure(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"], unipooldata)

        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);
        await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

        await aFiPassiveRebalanceInstance.setStorage(aFiStorageInstance.address);
        await aFiPassiveRebalanceInstance.setOracle(aFiAFiOracleInstance.address);
        await aFiPassiveRebalanceInstance.setManager(aFiManagerInstance.address);
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
        await aFiAFiOracleInstance.updateAFiManager(aFiManagerInstance.address);
        await aTokenConInstance.setplatformWallet(platformWallet.address);

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

        await daiConInstance.connect(investor1).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        await daiConInstance.connect(investor2).approve(
            aTokenConInstance.address,
            ethers.constants.MaxUint256
        );

        const daiBalance = await daiConInstance.balanceOf(accountToInpersonate)
        console.log("whale dai balance", daiBalance / 1e18)
        console.log("transfering to", accountToFund)

        // const accountBalance = await daiConInstance.balanceOf(investor1.address)
        console.log("transfer complete")
        // console.log("funded account balance", accountBalance / 1e18)

        var usdtBalance = await usdtConInstance.balanceOf(accountToInpersonate);
        let usdcBalance = await usdcConInstance.balanceOf(accountToInpersonate2);
        // usdcBalance = usdcBalance / 100;

        console.log("usdcBalance", usdcBalance);
        await usdcConInstance.connect(signer2).transfer(investor1.address, usdcBalance);

        console.log("usdtBalance", usdtBalance)
        usdtBalance = usdtBalance / 100;
        console.log("usdtBalance", usdtBalance)

        await usdtConInstance.connect(signer).transfer(investor1.address, "20000000000");
        await usdtConInstance.connect(signer).transfer(investor2.address, "20000000000");

        await aFiTimeLockInstance.connect(investor1).updateRescindController(other.address);
        await aFiTimeLockInstance.connect(other).updateExpirationPeriod(300);
    });

    context('Basic checks for deposit and withdraw', () => {

        it('pause withdraw', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            var pausePayload = await aFiTimeLockInstance.encodepauseWithdraw(false);

            const currentTime = await time.latest();

            await aFiTimeLockInstance.connect(investor1).updateRescindController(other.address);

            console.log("Rescind controller set")

            await aFiTimeLockInstance.connect(other).updateDelay(1);

            const delayModuleaddress = await aTokenConInstance.getDelayModule();
            console.log("delay module address", `${delayModuleaddress}`);

            const ownerOfBase = await aTokenConInstance.owner();
            console.log("owner of the vault", `${ownerOfBase}`);

            await aFiTimeLockInstance.queueTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            )

            await expect(aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            )).to.be.revertedWith("Timelock: Transaction hasn't surpassed time lock");

            await expect(aFiTimeLockInstance.connect(platformWallet).cancelTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            )).to.be.revertedWith("Caller is not the rescind controller");

            await aFiTimeLockInstance.connect(other).cancelTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            );

            await expect(aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            )).to.be.revertedWith("Timelock: Transaction not found");

            await aTokenConInstance.setDelayModule(aFiTimeLockInstance.address);

            await aFiTimeLockInstance.connect(other).updateDelay(1);

            await aFiTimeLockInstance.queueTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 0
            )

            // await time.increaseTo(currentTime + 1);
            // comment out the following line in TimeDelayModule.sol before running executeTransaction()
            // require(block.timestamp >= eta, "Timelock: Transaction hasn't surpassed time lock");
            // if not commented, find a way to increase time in hardhat(forked mainnet) before executing

            await aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 0
            )

            console.log("staleTokenBalOfAfiBase wallet's balance", `${staleTokenBalOfAfiBase}`);
        });

        it('unpause withdraw', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            var pausePayload = await aFiTimeLockInstance.encodepauseWithdraw(false);

            const currentTime = await time.latest();

            await aFiTimeLockInstance.connect(investor1).updateRescindController(other.address);
            console.log("Rescind controller set")

            await aFiTimeLockInstance.connect(other).updateDelay(1);

            const delayModuleaddress = await aTokenConInstance.getDelayModule();
            console.log("delay module address", `${delayModuleaddress}`);

            const ownerOfBase = await aTokenConInstance.owner();
            console.log("owner of the vault", `${ownerOfBase}`);

            await aFiTimeLockInstance.queueTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            )

            await expect(aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            )).to.be.revertedWith("Timelock: Transaction hasn't surpassed time lock");

            await expect(aFiTimeLockInstance.connect(platformWallet).cancelTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            )).to.be.revertedWith("Caller is not the rescind controller");

            await aFiTimeLockInstance.connect(other).cancelTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            );

            await expect(aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 1
            )).to.be.revertedWith("Timelock: Transaction not found");

            await aTokenConInstance.setDelayModule(aFiTimeLockInstance.address);

            await aFiTimeLockInstance.connect(other).updateDelay(1);

            await aFiTimeLockInstance.queueTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 0
            )

            // await time.increaseTo(currentTime + 1);
            // comment out the following line in TimeDelayModule.sol before running executeTransaction()
            // require(block.timestamp >= eta, "Timelock: Transaction hasn't surpassed time lock");
            // if not commented, find a way to increase time in hardhat(forked mainnet) before executing

            await aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                pausePayload,
                `${currentTime}` + 0
            )

            console.log("staleTokenBalOfAfiBase wallet's balance", `${staleTokenBalOfAfiBase}`);
        });

        it('update admin', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            var padminPayload = await aFiTimeLockInstance.encodeUpdateAdmin(investor1.address);

            const currentTime = await time.latest();

            await aFiTimeLockInstance.connect(investor1).updateRescindController(other.address);
            console.log("Rescind controller set")


            await aFiTimeLockInstance.connect(other).updateDelay(1);

            const delayModuleaddress = await aTokenConInstance.getDelayModule();
            console.log("delay module address", `${delayModuleaddress}`);

            const ownerOfBase = await aTokenConInstance.owner();
            console.log("owner of the vault", `${ownerOfBase}`);

            await aFiTimeLockInstance.queueTransaction(
                aFiTimeLockInstance.address,
                0,
                padminPayload,
                `${currentTime}` + 1
            )

            await expect(aFiTimeLockInstance.executeTransaction(
                aFiTimeLockInstance.address,
                0,
                padminPayload,
                `${currentTime}` + 1
            )).to.be.revertedWith("Timelock: Transaction hasn't surpassed time lock");

            await expect(aFiTimeLockInstance.connect(platformWallet).cancelTransaction(
                aFiTimeLockInstance.address,
                0,
                padminPayload,
                `${currentTime}` + 1
            )).to.be.revertedWith("Caller is not the rescind controller");

            await aFiTimeLockInstance.connect(other).cancelTransaction(
                aFiTimeLockInstance.address,
                0,
                padminPayload,
                `${currentTime}` + 1
            );

            await expect(aFiTimeLockInstance.executeTransaction(
                aFiTimeLockInstance.address,
                0,
                padminPayload,
                `${currentTime}` + 1
            )).to.be.revertedWith("Timelock: Transaction not found");

            await aTokenConInstance.setDelayModule(aFiTimeLockInstance.address);

            await aFiTimeLockInstance.connect(other).updateDelay(1);

            await aFiTimeLockInstance.queueTransaction(
                aFiTimeLockInstance.address,
                0,
                padminPayload,
                `${currentTime}` + 0
            )

            // await time.increaseTo(currentTime + 1);
            // comment out the following line in TimeDelayModule.sol before running executeTransaction()
            // require(block.timestamp >= eta, "Timelock: Transaction hasn't surpassed time lock");
            // if not commented, find a way to increase time in hardhat(forked mainnet) before executing

            await aFiTimeLockInstance.executeTransaction(
                aFiTimeLockInstance.address,
                0,
                padminPayload,
                `${currentTime}` + 0
            )

            console.log("staleTokenBalOfAfiBase wallet's balance", `${staleTokenBalOfAfiBase}`);
        });

        it('emergency withdraw', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("After emergency rebalance nav from storage value", `${NavfromStorage}`);

            var uTokenProp2 = await aTokenConInstance.getProportions();
            console.log("uTokenProp", `${uTokenProp2[0]}`);

            var utokensafter = await aTokenConInstance.getUTokens();
            console.log(utokensafter);

            const linkTokenInstance = await ethers.getContractAt(DAI_ABI, usdcConInstance.address);

            var staleBal = await linkTokenInstance.balanceOf(aTokenConInstance.address);
            console.log("staleBal = ", `${staleBal}`);

            var timelockPaylod = await aFiTimeLockInstance.encodeEmergencyWithdraw(usdcConInstance.address, platformWallet.address);

            const currentTime = await time.latest();

            await aFiTimeLockInstance.connect(investor1).updateRescindController(other.address);
            console.log("Rescind controller set")

            await aFiTimeLockInstance.connect(other).updateDelay(1);

            const delayModuleaddress = await aTokenConInstance.getDelayModule();
            console.log("delay module address", `${delayModuleaddress}`);

            const ownerOfBase = await aTokenConInstance.owner();
            console.log("owner of the vault", `${ownerOfBase}`);

            await aFiTimeLockInstance.queueTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 1
            )

            // await expect(aFiTimeLockInstance.executeTransaction(
            //     aTokenConInstance.address,
            //     0,
            //     timelockPaylod,
            //     `${currentTime}`+1
            // )).to.be.revertedWith("Timelock: Transaction hasn't surpassed time lock");

            await expect(aFiTimeLockInstance.connect(platformWallet).cancelTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 1
            )).to.be.revertedWith("Caller is not the rescind controller");

            await aFiTimeLockInstance.connect(other).cancelTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 1
            );

            await expect(aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 1
            )).to.be.revertedWith("Timelock: Transaction not found");

            await aTokenConInstance.setDelayModule(aFiTimeLockInstance.address);

            await aFiTimeLockInstance.connect(other).updateDelay(1);

            await aFiTimeLockInstance.queueTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 0
            )

            // await time.increaseTo(currentTime + 1);
            // comment out the following line in TimeDelayModule.sol before running executeTransaction()
            // require(block.timestamp >= eta, "Timelock: Transaction hasn't surpassed time lock");
            // if not commented, find a way to increase time in hardhat(forked mainnet) before executing

            await aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 0
            )

            staleBal = await daiConInstance.balanceOf(platformWallet.address);
            staleTokenBalOfAfiBase = await daiConInstance.balanceOf(aTokenConInstance.address);

            console.log("platform wallet's balance", `${staleBal}`);
            console.log("staleTokenBalOfAfiBase wallet's balance", `${staleTokenBalOfAfiBase}`);
        });

        it('transfer Ownership', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            var timelockPaylod = await aFiTimeLockInstance.encodeTransferOwnership(other.address);

            const currentTime = await time.latest();

            const delayModuleaddress = await aTokenConInstance.getDelayModule();
            console.log("delay module address", `${delayModuleaddress}`);

            await aFiTimeLockInstance.queueTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 2
            )

            // await expect(aFiTimeLockInstance.executeTransaction(
            //     aTokenConInstance.address,
            //     0,
            //     timelockPaylod,
            //     `${currentTime}`+2
            // )).to.be.revertedWith("Timelock: Transaction hasn't surpassed time lock");

            await expect(aFiTimeLockInstance.connect(investor1).cancelTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 2
            )).to.be.revertedWith("Caller is not the rescind controller");

            await aFiTimeLockInstance.connect(investor1).updateRescindController(other.address);
            console.log("Rescind controller set")

            await aFiTimeLockInstance.connect(other).cancelTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 2
            );

            await expect(aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 2
            )).to.be.revertedWith("Timelock: Transaction not found");

            await aTokenConInstance.setDelayModule(aFiTimeLockInstance.address);

            await aFiTimeLockInstance.connect(other).updateDelay(1);

            await aFiTimeLockInstance.queueTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 0
            )

            await aFiTimeLockInstance.queueTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 0
            )

            // comment out the following line in TimeDelayModule.sol before running executeTransaction()
            // require(block.timestamp >= eta, "Timelock: Transaction hasn't surpassed time lock");
            // if not commented, find a way to increase time in hardhat(forked mainnet) before executing

            await aFiTimeLockInstance.executeTransaction(
                aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` + 0
            );

            await aTokenConInstance.connect(other).acceptOwnership();
            expect(await aTokenConInstance.owner()).to.equal(other.address);
        });


        //Test case for Erequire statement
        it("should revert if eta is less than block.timestamp + delay", async function () {

            const currentTime = await time.latest();
            var timelockPaylod = await aFiTimeLockInstance.encodeUpdateTVLUpdatePeriod(15);
            await aFiTimeLockInstance.queueTransaction(aTokenConInstance.address,
                0,
                timelockPaylod,
                `${currentTime}` - `${1}`).to.be.reverted;

        });

        it("should revert if transaction does not exist", async function () {
            // Prepare parameters for the transaction
            const target = investor1.address; // Example address
            const value = 0; // Example value
            const data = "0x"; // Example data
            const eta = 1000; // Example eta

            // Ensure the transaction does not exist in queuedTransactions mapping
            await expect(
                aFiTimeLockInstance.cancelTransaction(target, value, data, eta)
            ).to.be.revertedWith("Timelock: Transaction not found");
        });

        // Test case for updateDelay: Revert if new delay is not greater than zero
        it("should revert if new delay is not greater than zero", async function () {
            const newDelay = 0; // Setting delay to zero, which is not allowed
            await expect(
                aFiTimeLockInstance.updateDelay(newDelay)
            ).to.be.revertedWith("Timelock: Delay must be greater than zero");
        });

        // Test case for updateRescindController: Revert if not called by the rescind controller
        it("should revert if not called by the rescind controller", async function () {
            const newController = investor1.address; // Assuming accounts[3] is not the rescind controller
            await expect(
                aFiTimeLockInstance.connect(investor2).updateRescindController(newController)
            ).to.be.revertedWith("Timelock: Caller is not the rescindChangeController");
        });

        // Test case for updateAdmin: Revert if not called by the admin
        it("should revert if not called by the admin", async function () {
            aFiTimeLockInstance.updateAdmin(investor1.address);
            const newAdmin = investor1.address; // Assuming accounts[3] is not the admin
            await expect(
                aFiTimeLockInstance.connect(investor2).updateAdmin(newAdmin)
            ).to.be.revertedWith("Timelock: must be called by this contract only");
        });

        // Test case for updateDelay: Revert if new delay is not greater than zero
        it("should revert if new delay is not greater than zero", async function () {
            await aFiTimeLockInstance.updateDelay(1);

            const newDelay = 0; // Setting delay to zero, which is not allowed
            await expect(
                aFiTimeLockInstance.updateDelay(newDelay)
            ).to.be.revertedWith("Timelock: Delay must be greater than zero");
        });
    });
});