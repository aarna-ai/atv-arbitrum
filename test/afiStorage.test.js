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

describe('AFi Storage', function (accounts) {
    this.timeout(0);

    let platformWallet; let recipient; let investor1; let investor2; let investor3; let investor4;
    let deadline;
    let deployedAFiBase;
    let aTokenConInstance;

    // eslint-disable-next-line no-unused-vars
    let daiConInstance;
    let usdcConInstance;
    let usdtConInstance;
    let snapshotId;
    let datasequencer;
    let oneInchParam;

    beforeEach(async () => {

        oneInchParam = {
            firstIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationUnderlyingSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            firstIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"],
            secondIterationCumulativeSwap: ["0x", "0x", "0x", "0x", "0x", "0x"]
        }

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

        // await aTokenConInstance.updateTVLUpdatePeriod(3000);
        await aFiAFiOracleInstance.setAFiStorage(aFiStorageInstance.address);


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

        await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 5000000000000000000000000n);
        await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdcConInstance.address, 5000000000000000000000000n);
        await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, daiConInstance.address, 5000000000000000000000000n);

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
    });

    context('AFiStorage tests', () => {

        it("revert withdraw when all swap method are false", async () => {

            await expect(aFiPassiveRebalanceInstance.connect(investor2).pauseSwapMethods(aTokenConInstance.address, [1, 2, 3], [false, false, true])).to.be.reverted;

            await aFiPassiveRebalanceInstance.pauseSwapMethods(aTokenConInstance.address, [1, 2, 3], [false, false, true]);
            let status = await aFiPassiveRebalanceInstance.isSwapMethodPaused(aTokenConInstance.address, 3);
            expect(status).to.equal(true);


            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            await expect(aTokenConInstance.connect(investor1).withdraw(
                197801111576383300n, usdtConInstance.address, deadline, returnString, false, 3
            )).to.be.reverted;

            await aFiPassiveRebalanceInstance.pauseSwapMethods(aTokenConInstance.address, [1, 2, 3], [false, false, false]);

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
        });

        it("miscellaneous data sequencer test", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            await expect(datasequencer.connect(recipient).updateGracePeriod(500)).to.be.revertedWith('Ownable: caller is not the owner');
            await expect(datasequencer.updateGracePeriod(0)).to.be.revertedWith('Value should be greater than 0');

            await datasequencer.updateGracePeriod(10);

            expect(await datasequencer.gracePeriod()).to.equal(10);

            await expect(datasequencer.connect(recipient).updateSequencerUptimeFeed(recipient.address)).to.be.revertedWith('Ownable: caller is not the owner');
            await expect(datasequencer.updateSequencerUptimeFeed(ZERO_ADDRESS)).to.be.revertedWith('Invalid address');

            await datasequencer.updateSequencerUptimeFeed(recipient.address);
            expect(await datasequencer.sequencerUptimeFeed()).to.equal(recipient.address);
        });

        it('check the active status of team wallet', async () => {

            // Take EVM snapshot
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
        });

        it("dforce check", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            // var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address);
            console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`);

            const nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1", `${nav1}`);

            var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage before cswap", `${NavfromStorage}`);

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdtConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [3, 0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage after cswap", `${NavfromStorage}`);

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

            // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            await aTokenConInstance.connect(investor1).withdraw(
                978011115763833000n, usdtConInstance.address, deadline, returnString, 3, 0
            );

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage after withdraw", `${NavfromStorage}`);

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
        });

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

            const activeWallets = await aFiStorageInstance.getTotalActiveWallets(aTokenConInstance.address);
            console.log("activeWallets", `${activeWallets}`);
            await ethers.provider.send('evm_revert', [snapshotId]);

        })

        it('should set max swap fee and set stables withdrawal limit', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(aFiStorageInstance.connect(recipient).setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 500)).to.be.revertedWith('Ownable: caller is not the owner');
            await expect(aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 0)).to.be.revertedWith('AFS20');
            await expect(aFiStorageInstance.connect(recipient).setMaxSwapFee(500)).to.be.revertedWith('Ownable: caller is not the owner');
            await expect(aFiStorageInstance.setMaxSwapFee(10000)).to.be.revertedWith('AFS20');

            await aFiStorageInstance.setMaxSwapFee(
                500
            );

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

            const activeWallets = await aFiStorageInstance.getTotalActiveWallets(aTokenConInstance.address);
            console.log("activeWallets", `${activeWallets}`);
            await ethers.provider.send('evm_revert', [snapshotId]);
        })

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

        it('should revert if active team wallets is 0', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiStorageInstance.connect(recipient).setAFiActive(recipient.address, true);

            await aFiStorageInstance.setAFiManager(investor1.address);

            await expect(aFiStorageInstance.connect(recipient).setAFiActive(recipient.address, true)).to.be.revertedWith('AFS14');

            const newTeamWallet = investor3.address;

            await expect(aFiStorageInstance.connect(investor1).addTeamWallet(
                recipient.address,
                newTeamWallet,
                true,
                true
            )).to.be.revertedWith('AFS20');
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('should not set isActive and isPresent to true if already true', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiStorageInstance.setAFiActive(recipient.address, true);
            await aFiStorageInstance.connect(recipient).setTeamWallets(recipient.address, [investor1.address, investor3.address]);

            await aFiStorageInstance.setAFiManager(investor1.address);

            await aFiStorageInstance.connect(investor1).addTeamWallet(
                recipient.address,
                investor2.address,
                false,
                true
            );

            await aFiStorageInstance.connect(investor1).addTeamWallet(
                recipient.address,
                investor4.address,
                true,
                false
            );

            await expect(aFiStorageInstance.connect(recipient).setTeamWallets(recipient.address, [investor1.address, investor3.address])).to.be.revertedWith('AFS28');

            const newTeamWallet = investor3.address;

            await aFiStorageInstance.setAFiActive(investor2.address, true);

            await expect(aFiStorageInstance.connect(recipient).setAFiActive(
                recipient.address,
                true
            )).to.be.revertedWith('AFS14');
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('should not set afimanager to 0 address', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(aFiStorageInstance.setAFiManager(
                ZERO_ADDRESS
            )).to.be.revertedWith('AFS01');
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('setAfiManager should only be called by the owner', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(aFiStorageInstance.connect(investor2).setAFiManager(
                investor2.address,
            )).to.be.reverted;
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('addTeamWallet should only be called by the manager', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aFiStorageInstance.setAFiActive(investor2.address, true);
            await expect(aFiStorageInstance.connect(investor1).setAFiActive(
                investor2.address,
                true
            )).to.be.revertedWith('AFS04');
            await expect(aFiStorageInstance.addTeamWallet(
                investor2.address,
                investor3.address,
                true,
                true
            )).to.be.revertedWith('AFS27');
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('Underlying tokens length and providers length should be equal when calling rearrange', async () => {
            await expect(aFiStorageInstance.connect(investor1).rearrange(
                investor1.address,
                ["0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
                    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
                    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"],
                [1, 1]
            )).to.be.revertedWith('AFS21');
        });

        it("withdraw method 1", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

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
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [0, 0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
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

            await aTokenConInstance.connect(investor1).withdraw(
                197801111576383300n, usdtConInstance.address, deadline, returnString, 2, 0
            );

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('Check withdraw scenarios 1 and greater than 2', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            // var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
            // var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);
            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdtConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [1, 1, 0, 1], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);
            console.log("cumulative swap is done");


            const Afterbal1 = await aTokenConInstance.balanceOf(
                investor1.address
            );
            const minimumReturnAmount = [0, 0, 0, 0];
            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);
            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };

            await aTokenConInstance.connect(investor1).withdraw(
                500000000000000000n, usdtConInstance.address, deadline, returnString, 2, 0
            );

            // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await expect(aTokenConInstance.connect(investor1).withdraw(
                ether(10), usdtConInstance.address, deadline, returnString, 2, 0
            )).to.be.revertedWith('AB24');

            // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).withdraw(
                ether(5), usdtConInstance.address, deadline, returnString, 3, 0
            );
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('Check withdraw scenarios 0 and 2', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            checkNav = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("check nav ", `${checkNav}`);

            let nav2 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("User NAVVVVV", `${nav2}`)
            let usdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("after deposit usdtBalance", usdtBalance)
            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdtConInstance.address,
                cSwapFee: 1000000,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [1, 1, 0, 1], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);
            console.log("cumulative swap is done");


            const Afterbal1 = await aTokenConInstance.balanceOf(
                investor1.address
            );
            const minimumReturnAmount = [0, 0, 0, 0];
            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const ether = (amount) => {
                const weiString = ethers.utils.parseEther(amount.toString());
                return BigNumber.from(weiString);
            };

            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdtConInstance.address
            );

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdcConInstance.address
            );

            await aFiStorageInstance.setMaxSwapFee(1000);
            await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 5000000000000000000000000n);

            await aTokenConInstance.connect(investor1).withdraw(
                500000000000000000n, usdtConInstance.address, deadline, returnString, 2, 0
            );

            console.log("swap method 2 done");


            // await aTokenConInstance.connect(investor1).withdraw(
            //     ether(3), usdtConInstance.address, deadline, returnString, 2, 0
            // );

            // await expect(aTokenConInstance.connect(investor1).withdraw(
            //     ether(3), usdtConInstance.address, deadline, returnString, 2, 0
            // )).to.be.revertedWith('AFS0004');


            // await aTokenConInstance.connect(investor1).withdraw(
            //     ether(1), usdtConInstance.address, deadline, returnString, 2, 0
            // );
            // await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("withdraw check", async () => {
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
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],
                newProviders: [0, 0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);
            console.log("done ---2")

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

            // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            await aTokenConInstance.connect(investor1).withdraw(
                197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0
            );

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address);

            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`);
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it("should return the array of team wallet addresses", async function () {
            snapshotId = await ethers.provider.send('evm_snapshot');

            const expectedTeamWallets = [
                investor1.address, investor2.address
            ];

            // Assert: Check if the returned value matches the expected value
            const result = await aFiStorageInstance.getTeamWalletsOfAFi(aTokenConInstance.address);

            // Compare the arrays
            for (let i = 0; i < expectedTeamWallets.length; i++) {
                expect(result[i]).to.equal(expectedTeamWallets[i]);
            }
            await ethers.provider.send('evm_revert', [snapshotId]);

        })

        it("should return whether AFi is active and rebalanced", async function () {
            snapshotId = await ethers.provider.send('evm_snapshot');

            // Arrange: Set up the necessary data
            const aFiContract = aTokenConInstance.address;

            // Act: Call the function
            const result = await aFiStorageInstance.isAFiActiveRebalanced(aFiContract);

            // Assert: Check if the returned value is as expected
            expect(result).to.be.true; // Adjust the expectation based on your actual implementation
            await ethers.provider.send('evm_revert', [snapshotId]);

        });
    });

    describe('should add a team wallet successfully', async () => {

        beforeEach(async () => {
            await aFiStorageInstance.setAFiManager(investor1.address);
        });

        it("should withdraw all funds from Aave if Aave token exists", async function () {
            snapshotId = await ethers.provider.send('evm_snapshot');

            // Deploy or get instances of necessary contracts
            // Set up the necessary environment

            // Call the _withdrawAll function targeting Aave
            await aFiStorageInstance.setAFiManager(investor1.address);
            const result = await aFiStorageInstance.connect(investor1)._withdrawAll(aTokenConInstance.address, "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984");
            console.log("result", await result);
            // // Assert that the function call was successful
            // expect(result).to.be.true;

            // Add further assertions as needed, like checking the balance after withdrawal
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it("deactivateTeamWallet should revert if caller is not the owner", async function () {
            snapshotId = await ethers.provider.send('evm_snapshot');

            // Deploy or get instances of necessary contracts
            const [owner, nonOwner] = await ethers.getSigners();
            await expect(aFiStorageInstance.connect(investor2).deactivateTeamWallet(aTokenConInstance.address, investor1.address)).to.be.revertedWith('Ownable: caller is not the owner');

            // // Call the deactivateTeamWallet function with a non-owner account
            // await expect(aFiStorageInstance.connect(investor2).deactivateTeamWallet(aTokenConInstance.addTeamWallet, investor1.address))
            //     .to.be.revertedWith("Ownable: caller is not the owner");
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it("reActivateTeamWallet should revert if caller is not the owner", async function () {
            snapshotId = await ethers.provider.send('evm_snapshot');
            // Deploy or get instances of necessary contracts
            const [owner, nonOwner] = await ethers.getSigners();
            await expect(aFiStorageInstance.connect(investor2).reActivateTeamWallet(aTokenConInstance.address, investor1.address)).to.be.revertedWith('Ownable: caller is not the owner');

            // // Call the deactivateTeamWallet function with a non-owner account
            // await expect(aFiStorageInstance.connect(investor2).deactivateTeamWallet(aTokenConInstance.addTeamWallet, investor1.address))
            //     .to.be.revertedWith("Ownable: caller is not the owner");
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("setPriceOracle should revert if caller is not the owner", async function () {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await expect(aFiPassiveRebalanceInstance.connect(investor2).setPriceOracle(["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"],
                ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"],
                ["0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7"],
                ["0xd0C7101eACbB49F3deCcCc166d238410D6D46d57"])).to.be.revertedWith('Ownable: caller is not the owner');

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

    });

});