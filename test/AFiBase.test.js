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
            "0x0000000000000000000000000000000000000000"  ],
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

        console.log("transfer complete")
        console.log("funded account balance usdttttttttt", investorusdtBalance)
    });

    context('whitelisted and non whitelisted testcases', () => {

        it('should remove a whitelisted deposit token', async function () {

            snapshotId = await ethers.provider.send('evm_snapshot');

            let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address);
            expect(depositTok).to.equal(true);
            await aTokenConInstance.removeFromWhitelist(usdcConInstance.address, usdtConInstance.address, deadline, 0, "0x");

            depositTok = await aTokenConInstance.getInputToken();
            console.log("uTokens", depositTok[0]);

            depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address);
            expect(depositTok).to.equal(false);
            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it("updatePreSwapDepositLimit check", async () => {
            await aFiPassiveRebalanceInstance.updatePreSwapDepositLimit(100000);
            var preswapdepLimit = await aFiPassiveRebalanceInstance.getPreSwapDepositLimit();
            expect(preswapdepLimit).to.be.gt(0);
        });

        it("should remove a whitelisted deposit token when there is balance in predepositTokens", async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');

            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`);

            console.log("check --1")
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // Fill this array if your function expects specific tokens expects specific tokens
                newProviders: [1, 1, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            console.log("cs calllllllllllllllllllllllllllllllll");
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

            console.log("Afterbal", `${Afterbal}`);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );


            let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address);
            expect(depositTok).to.equal(true);

            await aTokenConInstance.removeFromWhitelist(usdtConInstance.address, usdcConInstance.address, deadline, 0, 0);

            depositTok = await aTokenConInstance.getInputToken();
            console.log("uTokens", depositTok[0]);

            depositTok = await aTokenConInstance.isOTokenWhitelisted(usdtConInstance.address);
            expect(depositTok).to.equal(false);

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("should revert token and swap token are swame", async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');

            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`);



            console.log("check --1")
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // Fill this array if your function expects specific tokens expects specific tokens
                newProviders: [1, 1, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

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

            console.log("Afterbal", `${Afterbal}`);


            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );


            let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address);
            expect(depositTok).to.equal(true);

            await expect(aTokenConInstance.removeFromWhitelist(usdtConInstance.address, usdtConInstance.address, deadline, 0, "0x")).to.be.revertedWith("AB05");

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("should remove a whitelisted deposit token when there is balance in predepositTokens and deposit should fail after removal", async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');

            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`);

            console.log("check --1")
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // Fill this array if your function expects specific tokens expects specific tokens
                newProviders: [1, 1, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

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

            console.log("Afterbal", `${Afterbal}`);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );


            let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address);
            expect(depositTok).to.equal(true);

            await aTokenConInstance.removeFromWhitelist(usdtConInstance.address, usdcConInstance.address, deadline, 0, "0x");

            depositTok = await aTokenConInstance.getInputToken();
            console.log("uTokens", depositTok[0]);

            depositTok = await aTokenConInstance.isOTokenWhitelisted(usdtConInstance.address);
            expect(depositTok).to.equal(false);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await expect(aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            )).to.be.revertedWith("AB03");

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("should remove a whitelisted deposit token and NAV should be same", async () => {

            snapshotId = await ethers.provider.send('evm_snapshot');

            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`);

            console.log("check --1")
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // Fill this array if your function expects specific tokens expects specific tokens
                newProviders: [1, 1, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

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

            console.log("Afterbal", `${Afterbal}`);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );


            var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage before removal of token from whitelist", `${navfromStorage}`);


            let depositTok = await aTokenConInstance.isOTokenWhitelisted(usdcConInstance.address);
            expect(depositTok).to.equal(true);

            await aTokenConInstance.removeFromWhitelist(usdtConInstance.address, usdcConInstance.address, deadline, 0, "0x");

            var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage after removal of token from whitelist", `${navfromStorage}`);

            depositTok = await aTokenConInstance.getInputToken();
            console.log("uTokens", depositTok[0]);

            depositTok = await aTokenConInstance.isOTokenWhitelisted(usdtConInstance.address);
            expect(depositTok).to.equal(false);

            const controller = await aFiPassiveRebalanceInstance.getPauseDepositController(aTokenConInstance.address);
            expect(controller).to.equal(investor1.address);

            await ethers.provider.send('evm_revert', [snapshotId]);
        });
    });

    context('Basic checks for deposit and withdraw', () => {

        it('pause and unpause deposit', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            // await aTokenConInstance.pause(true);
            const isDeposit = await aTokenConInstance.isPaused();

            console.log("isDeposit:", isDeposit[0]);

            expect(isDeposit[0]).to.equal(true);
            expect(isDeposit[1]).to.equal(false);

            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);


            await expect(aTokenConInstance.connect(investor1).deposit(
                3000000000, usdtConInstance.address
            )).to.be.reverted;

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            const isDepositPause1 = await aTokenConInstance.isPaused();
            expect(isDepositPause1[0]).to.equal(false);
            expect(isDepositPause1[1]).to.equal(false);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);

            const isDepositPause2 = await aTokenConInstance.isPaused();
            console.log("Deposit Pause status is not updated and remained: ", isDepositPause2[0])

            expect(isDepositPause2[0]).to.equal(false);
            expect(isDepositPause2[1]).to.equal(false);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('pause and unpause withdraw', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aTokenConInstance.pauseWithdraw(true);
            const isWithdraw = await aTokenConInstance.isPaused();

            console.log("isWithdraw:", isWithdraw[0]);

            expect(isWithdraw[0]).to.equal(false);
            expect(isWithdraw[1]).to.equal(true);

            await aTokenConInstance.pauseWithdraw(false);
            const isWithdrawPause1 = await aTokenConInstance.isPaused();
            expect(isWithdrawPause1[0]).to.equal(false);
            expect(isWithdrawPause1[1]).to.equal(false);

            await aTokenConInstance.pauseWithdraw(true);
            await aTokenConInstance.pauseWithdraw(false);

            const isWithdrawPause2 = await aTokenConInstance.isPaused();
            console.log("Deposit Pause status is not updated and remained: ", isWithdrawPause2[0])

            expect(isWithdrawPause2[0]).to.equal(false);
            expect(isWithdrawPause2[1]).to.equal(false);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('pause and unpause desposit should be only be called by the owner', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await expect(aTokenConInstance.connect(other).pauseUnpauseDeposit(
                true
            )).to.be.reverted;

            await expect(aTokenConInstance.connect(other).pauseUnpauseDeposit(
                false
            )).to.be.reverted;

            await expect(aTokenConInstance.connect(other).pauseWithdraw(
                true
            )).to.be.reverted;

            await expect(aTokenConInstance.connect(other).pauseWithdraw(
                false
            )).to.be.reverted;

            const isWithdraw = await aTokenConInstance.isPaused();

            console.log("isWithdraw:", isWithdraw[0]);

            expect(isWithdraw[0]).to.equal(false);
            expect(isWithdraw[1]).to.equal(false);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('whitelist a deposit token should revert when not called by the owner', async function () {
            await expect(
                aTokenConInstance.connect(investor1).addToWhitelist(
                    "0x4ffc43a60e009b551865a93d232e33fce9f01507"
                )
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('whitelist a deposit token should revert if the token is already whitelisted', async function () {
            await expect(
                aTokenConInstance.addToWhitelist(
                    usdcConInstance.address
                )
            ).to.be.revertedWith("AB03");
        });

        it('should whitelist a new deposit token', async function () {
            let depositTok = await aTokenConInstance.getInputToken();
            console.log("uTokens", depositTok[0]);

            const tokToAdd = "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f";

            await aTokenConInstance.addToWhitelist(tokToAdd);

            depositTok = await aTokenConInstance.getInputToken();
            console.log("uTokens", depositTok[0]);

            depositTok = await aTokenConInstance.isOTokenWhitelisted(tokToAdd);
            expect(depositTok).to.equal(true);
        });

        it("deposit check", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            let depositAmount = 0;

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await expect(aTokenConInstance.connect(investor1).deposit(
                depositAmount, usdtConInstance.address
            )).to.be.reverted;

            console.log("Deposit call success -1");

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            //when payment token is not the whitelisted one
            await expect(aTokenConInstance.connect(investor1).deposit(
                1000000000, "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"
            )).to.be.reverted;

            console.log("Deposit call success");
            depositAmount = 1000000000;

            var nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1", `${nav1}`);

            var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                depositAmount, usdtConInstance.address
            );


            var nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1 after first deposit", `${nav1}`);

            var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage after first deposit", `${NavfromStorage}`);

            var totalSupply = await aTokenConInstance.totalSupply();
            var afiTokenBal = await aTokenConInstance.balanceOf(investor1.address);

            console.log(`balance of afi Token after deposit, ${afiTokenBal}`);
            console.log(`totalSupply Value, ${totalSupply}`);
            expect(`${totalSupply}`).to.not.equal(0);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                depositAmount, usdtConInstance.address
            );

            totalSupply = await aTokenConInstance.totalSupply();
            console.log(`totalSupply Value $$$$$$$$$$$$$$, ${totalSupply}`);

            var totalTVL = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            console.log(`totalTVL $$$$$$$$$$$$$$$$$, ${totalTVL}`);


            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("afi token transfer check", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            let depositAmount = 0;

            console.log("Deposit call success");
            depositAmount = 1000000000;

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                depositAmount, usdtConInstance.address
            );

            var totalSupply = await aTokenConInstance.totalSupply();
            var afiTokenBal = await aTokenConInstance.balanceOf(investor1.address);
            console.log(`balance of afi Token after deposit, ${afiTokenBal}`);
            console.log(`totalSupply Value, ${totalSupply}`);
            expect(`${totalSupply}`).to.not.equal(0);

            //revert as transferability is off
            await expect(aTokenConInstance.connect(investor1).transfer(
                investor2.address, afiTokenBal
            )).to.be.revertedWith("AB03");

            //turn on the transferability
            await aTokenConInstance.setAfiTransferability(true);

            //should revert due to non withdrawable shares 
            await expect(aTokenConInstance.connect(investor1).transfer(
                investor2.address, afiTokenBal
            )).to.be.revertedWith("AB24");

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
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            await aTokenConInstance.connect(investor1).increaseAllowance(investor2.address, 1000000000000000000n);
            let checkAllowance = await aTokenConInstance.allowance(investor1.address, investor2.address);
            console.log("checkAllowance-----", checkAllowance);
            await aTokenConInstance.connect(investor2).transferFrom(investor1.address, investor2.address, 1000000000000000000n);

            afiTokenBal = await aTokenConInstance.balanceOf(investor1.address);

            await aTokenConInstance.connect(investor1).transfer(
                investor2.address, afiTokenBal
            );

            afiTokenBal = await aTokenConInstance.balanceOf(investor1.address);
            expect(afiTokenBal).to.equal("0");
            console.log(`sender balance after transfer, ${afiTokenBal}`);


            afiTokenBal = await aTokenConInstance.balanceOf(investor2.address);
            expect(afiTokenBal).to.be.gt(0);

            console.log(`rcvr balance after receiving afi tokens, ${afiTokenBal}`);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                depositAmount, usdtConInstance.address
            );


            afiTokenBal = await aTokenConInstance.balanceOf(investor1.address);
            expect(afiTokenBal).to.be.gt(0);

            console.log(`sender balance after depositing again after afi tokens transfer, ${afiTokenBal}`);
            totalSupply = await aTokenConInstance.totalSupply();

            console.log(`totalSupply Value, ${totalSupply}`);

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("withdraw check", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                newProviders: [0, 4, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
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

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            await aTokenConInstance.connect(investor1).withdraw(
                Afterbal, usdtConInstance.address, deadline, returnString, 3, 0
            );

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("two times cs", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`);

            await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

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
                197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0
            );

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            var swapParams2 = {
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

            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams2, 0, oneInchParam, "0x", 0);

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('should revert if there is insufficient iTokens balance', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdcConInstance.address,
                cSwapFee: 0,
                cSwapCounter: 0,
                depositTokens: ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"],
                minimumReturnAmount: [0, 0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: ["0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // underlying - WBTC
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
                    "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",  // UNI
                    "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                ],  // Fill this array if your function expects specific tokens expects specific tokens
                newProviders: [2, 0, 2, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            console.log("before cumulative swap");
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            console.log("after cumulative swap ------------------------");

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                300000000, usdcConInstance.address
            );

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            console.log("breakkkkkkkkk");

            await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 100000000000000000000n);

            await expect(aTokenConInstance.connect(investor1).withdraw(
                1978011115763833000000n, usdtConInstance.address, deadline, returnString, 2, 100000000
            )).to.be.reverted;

            await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 100000000000000000000n);

            await aTokenConInstance.connect(investor1).withdraw(
                900780111157638000n, usdtConInstance.address, deadline, returnString, 3, 0
            );

            await ethers.provider.send('evm_revert', [snapshotId]);

        });

        it('should apply rebal for proportions', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);



            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                newProviders: [0, 0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)

            navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav after cswap", `${navfromStorage}`);

            const Afterbal1 = await aTokenConInstance.balanceOf(
                investor1.address
            );
            const minimumReturnAmount = [0, 0, 0, 0];
            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            await aTokenConInstance.connect(investor1).withdraw(
                `${Afterbal1}`, usdtConInstance.address, deadline, returnString, 3, 0
            );
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("withdraw check if tvl is not updated", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            var nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1 before deposit", `${nav1}`);

            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            const isOTokenWhitelisted = await aTokenConInstance.isOTokenWhitelisted(usdtConInstance.address);
            expect(isOTokenWhitelisted).to.equal(true);

            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                10000000000, usdtConInstance.address
            );

            let AfterusdtBalance1 = await usdtConInstance.balanceOf(investor1.address);
            console.log("After Deposit user usdt balance", `${AfterusdtBalance1}`);

            nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1 after deposit", `${nav1}`);

            const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            const swapParams = {
                afiContract: aTokenConInstance.address,
                oToken: usdtConInstance.address,
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
                ],
                newProviders: [0, 0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            // poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            // await aTokenConInstance.connect(investor2).deposit(
            //     10000000000, usdtConInstance.address, false
            // );

            // const NavfromStorageAfter = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            // console.log("Nav from storage after cswap", `${NavfromStorageAfter}`);

            // const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            // console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
            // const AfterusdcBalance = await usdcConInstance.balanceOf(aTokenConInstance.address)
            // console.log("After deposit user usdc balance", `${AfterusdcBalance}`)


            // const afibalance = await usdtConInstance.balanceOf(aTokenConInstance.address)
            // console.log("aficontract usdt balance", `${afibalance}`)

            // const Afterbal = await aTokenConInstance.balanceOf(
            //   investor1.address
            // );
            // console.log("Afterbal", `${Afterbal}`)


            // const minimumReturnAmount = [0, 0, 0, 0];

            // const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            // const returnString = Amount.map(bn => bn.toString());

            // await expect(aTokenConInstance.connect(investor1).withdraw(
            //     1978011115763833000n, usdtConInstance.address, deadline, returnString, 1
            // )).to.be.reverted;

            // const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            // console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
            // const AfterwithusdcBalance = await usdcConInstance.balanceOf(investor1.address)
            // console.log("After withdraw user usdc balance", `${AfterwithusdcBalance}`)
            // await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("nav check - 1", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            // const pool1 = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);

            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            console.log("pool1", `${poolValue}`);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdtConInstance.address
            );

            const nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1", `${nav1}`);

            var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);

            const nav3 = await aTokenConInstance.depositUserNav(investor2.address);
            console.log("user nav3", `${nav3}`);

            const pool2 = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            console.log("pool2", `${pool2}`);

            const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)

            const Afterbal = await aTokenConInstance.balanceOf(
                investor1.address
            );

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
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++++")

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            console.log("Pool before withdraw", `${poolValue}`);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage before withdraw", `${NavfromStorage}`);

            var totalSupply = await aTokenConInstance.totalSupply();
            console.log("Total supply", `${totalSupply}`);
            await aTokenConInstance.connect(investor1).withdraw(
                `${Afterbal}`, usdtConInstance.address, deadline, returnString, 3, 0
            );


            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);
            console.log("Pool after withdraw", `${poolValue}`);

            const totalsupply = await aTokenConInstance.totalSupply();
            console.log("totalSupply", `${totalsupply}`);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            const NavfromStorage2 = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage2}`);

            const nav4 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav4", `${nav4}`);

            const pool4 = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            console.log("pool4", `${pool4}`);

            const Afterbal1 = await aTokenConInstance.balanceOf(
                investor1.address
            );
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).withdraw(
                `${Afterbal1}`, usdtConInstance.address, deadline, returnString, 3, 0
            );

            const NavfromStorage3 = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage3}`);

            const pool5 = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address
            );
            console.log("pool5", `${pool5}`);

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdtConInstance.address
            );

            const NavfromStorage4 = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage4}`);

            const nav5 = await aTokenConInstance.depositUserNav(investor2.address);
            console.log("user nav5", `${nav5}`);

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            const NavfromStorage5 = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage5}`);

            const nav6 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav6", `${nav6}`);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it('profit distribution', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav after deposit", `${navfromStorage}`);

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
                newProviders: [1, 0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            //await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav after cswap", `${navfromStorage}`);

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
            // await aTokenConInstance.connect(investor1).updatePool(poolValue);

            var bal = await usdtConInstance.balanceOf(investor1.address);
            console.log("balance usdt before withdraw", `${bal}`);

            await aTokenConInstance.connect(investor1).withdraw(
                500000000000000000n, usdtConInstance.address, deadline, returnString, 3, 0
            );

            bal = await usdtConInstance.balanceOf(investor1.address);
            console.log("balance usdt after withdraw", `${bal}`);

            navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav after deposit2", `${navfromStorage}`);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("should withdraw tokens based on provider type", async function () {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                newProviders: [2, 0, 2, 1], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
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

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage after withdraw", `${NavfromStorage}`);

            // Call setAFiManager function to set investor1 as the new aFiManager
            await aFiStorageInstance.setAFiManager(investor1.address);

            // Add necessary setup for the provider and token
            // Assuming necessary setup for provider and token already done in the contract

            // Call _withdrawAll function with appropriate parameters
            var result = await aFiStorageInstance.connect(investor1)._withdrawAll(aTokenConInstance.address, "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f");

            // Check if the function returns true
            // expect(result).to.be.true;

            result = await aFiStorageInstance.connect(investor1)._withdrawAll(aTokenConInstance.address, "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1");

            // Check if the function returns true
            // expect(result).to.be.true;

            result = await aFiStorageInstance.connect(investor1)._withdrawAll(aTokenConInstance.address, "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4");
            await ethers.provider.send('evm_revert', [snapshotId]);
            // Check if the function returns true
            // expect(result).to.be.true;

            // Add further assertions as needed to validate the behavior of _withdrawAll function
        });

        it("aave check", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                newProviders: [1, 0, 0, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: [],
                cometRewardTokens: [],
                rewardTokenMinReturnAmounts: []
            };

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
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

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            await aTokenConInstance.connect(investor1).withdraw(
                4978011115763833000n, usdtConInstance.address, deadline, returnString, 3, 0
            );

            NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage after withdraw", `${NavfromStorage}`);

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("dforce check", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
            console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };

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
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it(" Deposits and withdraw and timelock staking", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const pool = await aFiPassiveRebalanceInstance.getPool("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1");
            console.log("uni pool ", `${pool}`);
            expect(pool).to.equal("0x31Fa55e03bAD93C7f8AFfdd2eC616EbFde246001");

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)
            const AfterusdcBalance = await usdcConInstance.balanceOf(investor1.address)
            console.log("After deposit user usdc balance", `${AfterusdcBalance}`)
            const Afterbal = await aTokenConInstance.balanceOf(
                investor1.address
            );
            console.log("afi token balance", `${Afterbal}`);

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
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            await aTokenConInstance.updateTimeLockContract(other.address);

            const lockAmount = 1000085485669041487n;
            await aTokenConInstance.connect(other).stakeShares(investor1.address, lockAmount, true);
            const AfterLockbal = await aTokenConInstance.balanceOf(
                investor1.address
            );
            console.log("afi token balance", `${AfterLockbal}`);

            const AfterLockbalOfStakingContract = await aTokenConInstance.balanceOf(
                other.address
            );
            console.log("afi token balance of staking contract", `${AfterLockbalOfStakingContract}`);

            var calc = BigNumber.from(AfterLockbal.toString()).sub(BigNumber.from(lockAmount.toString()));
            console.log("bal - locked", `${calc}`);

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            await aTokenConInstance.connect(investor1).withdraw(
                `${calc}`, usdtConInstance.address, deadline, returnString, 3, 0
            );

            const nav = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav", `${nav}`);

            await aTokenConInstance.connect(other).stakeShares(investor1.address, lockAmount, false);

            const AfterunLockbal = await aTokenConInstance.balanceOf(
                investor1.address
            );
            console.log("afi token balance after unlock", `${AfterunLockbal}`);

            const AfterunLockbalOfStakingContract = await aTokenConInstance.balanceOf(
                investor1.address
            );
            console.log("afi token balance of staking contract after unlock", `${AfterunLockbalOfStakingContract}`);
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("direct update pool data", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const payload = [[
                "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f"
            ],
            [
                "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            ],
            [
                "0x03a3bE7Ab4aa263D42d63B6CC594F4fb3D3F3951",
            ],
            [
                "0x03a3bE7Ab4aa263D42d63B6CC594F4fb3D3F3951",
            ],
            [
                [[
                    "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                ]], [[
                    "0xC6962004f452bE9203591991D15f6b388e09E8D0",
                ]]
            ],
            [
                "0x641C00A822e8b671738d32a431a4Fb6074E5c79d",
                "0xC6962004f452bE9203591991D15f6b388e09E8D0"
            ]
            ]
            const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

            const payloadnew = [
                ["0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"], //USDT, USDC - payment tokens
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
                ["0x0000000000000000000000000000000000000000"],
                ["0"],
                ["0x0000000000000000000000000000000000000000"],
                2,
            ]

            console.log(investor1.address)

            await aTokenConInstance.setplatformWallet(other.address);

            const uTokenProportion = await aTokenConInstance.getProportions();
            expect(`${uTokenProportion[0].length}`).to.equal('4');

            const uTokenProportionLater = await aTokenConInstance.getProportions();
            expect(`${uTokenProportionLater[0].length}`).to.equal('4');

            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        it("multiple transactions", async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');
            const balWhale = await usdtConInstance.balanceOf(investor1.address);
            console.log("balWhale", `${balWhale}`);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdtConInstance.address
            );

            const nav1 = await aTokenConInstance.depositUserNav(investor1.address);
            console.log("user nav1", `${nav1}`);

            const NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage}`);

            const AfterusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After Deposit user usdt balance", `${AfterusdtBalance}`)

            const Afterbal = await aTokenConInstance.balanceOf(
                investor2.address
            );

            console.log("balance", `${Afterbal}`);

            await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);

            var swapParams = {
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
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            console.log("CSwap checkkk");

            const minimumReturnAmount = [0, 0, 0, 0];

            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            await aTokenConInstance.connect(investor2).withdraw(
                `${Afterbal}`, usdtConInstance.address, deadline, returnString, 3, 0
            );

            console.log("Withdraw checkkk");

            const NavfromStorage7 = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage7}`);

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)

            const totalsupply = await aTokenConInstance.totalSupply();
            console.log("totalSupply", `${totalsupply}`);

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            await aTokenConInstance.connect(investor2).deposit(
                1000000000, usdtConInstance.address
            );

            const NavfromStorage9 = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
            console.log("Nav from storage", `${NavfromStorage9}`);

            swapParams.cSwapCounter = 1;
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            const Afterbal3 = await aTokenConInstance.balanceOf(
                investor1.address
            );

            await aTokenConInstance.connect(investor1).withdraw(
                `${Afterbal3}`, usdtConInstance.address, deadline, returnString, 3, 0
            );

            console.log("balance", `${Afterbal3}`);
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
            await aTokenConInstance.connect(investor1).deposit(
                1000000000, usdtConInstance.address
            );

            swapParams.cSwapCounter = 2;

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

            const Afterbal4 = await aTokenConInstance.balanceOf(
                investor1.address
            );

            await aTokenConInstance.connect(investor1).withdraw(
                `${Afterbal4}`, usdtConInstance.address, deadline, returnString, 3, 0
            );
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        describe('Sets New Manager and  test of  Manager specific function', async () => {

            before(async () => {
                const PLATFORM_WALLET = "0xB60C61DBb7456f024f9338c739B02Be68e3F545C";

                await hre.network.provider.request({
                    method: "hardhat_impersonateAccount",
                    params: [PLATFORM_WALLET],
                });
                const platform = await ethers.getSigner(PLATFORM_WALLET)

                const NewAFiManager = other.address;
                await aTokenConInstance.connect(platform).setAFiManager(NewAFiManager);

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    1000000000, usdtConInstance.address
                );
            });
        });

        describe('Deposit stable twice by investor', async () => {
            it("Deposit stable and balanceAave after deposit", async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    1000000000, usdtConInstance.address
                );

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
                var siloSwapData = {
                    siloRewardTokens: [],
                    minReturnSilo: [],
                    siloOtoken: []
                };
                await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it('Set the passiveRebal strategy number', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                // set rebal strategy to 1

                await aFiPassiveRebalanceInstance.updateRebalStrategyNumberByOwner(aTokenConInstance.address, 1);
                const strategyNumber = await aFiPassiveRebalanceInstance.getRebalStrategyNumber(aTokenConInstance.address);

                expect(`${strategyNumber}`).to.equal('1');
                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    1000000000, usdtConInstance.address
                );
                await ethers.provider.send('evm_revert', [snapshotId]);
            });
        });

        describe('Emergency withdraw and revert', async () => {

            it("revert when caller is not owner for updatePoolData", async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                const PLATFORM_WALLET = "0xB60C61DBb7456f024f9338c739B02Be68e3F545C";
                const payload = [[
                    "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"
                ],
                [
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
                ],
                [
                    "0x127452F3f9cDc0389b0Bf59ce6131aA3Bd763598",
                ],
                [
                    "0x127452F3f9cDc0389b0Bf59ce6131aA3Bd763598",
                ],
                [
                    [[
                        "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                    ]], [[
                        "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8",
                    ]]
                ],
                [
                    "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
                    "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
                ]
                ]
                const uDataPayload = await aFiFactoryInstance.encodeUnderlyingData(payload)

                const payloadnew = [
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
                    ["0"],
                    ["0x0000000000000000000000000000000000000000"],
                    2,
                ]

                const bytesData = await aFiFactoryInstance.encodePoolData(payloadnew);

                await expect(aTokenConInstance.connect(investor1).updatePoolData(bytesData)).to.be.reverted;
            });
            await ethers.provider.send('evm_revert', [snapshotId]);
        });

        describe('Pause and unpause deposit tokens', async () => {

            it("Pause deposit token", async () => {
                await aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdtConInstance.address, true);

                var isPausedForWithdrawals = await aTokenConInstance.isPausedForWithdrawals(usdtConInstance.address);
                expect(isPausedForWithdrawals).to.equal(true);
            });

            it("Unpause deposit token", async () => {
                await aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdtConInstance.address, true);

                var isPausedForWithdrawals = await aTokenConInstance.isPausedForWithdrawals(usdtConInstance.address);
                expect(isPausedForWithdrawals).to.equal(true);

                await aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdtConInstance.address, false);

                isPausedForWithdrawals = await aTokenConInstance.isPausedForWithdrawals(usdtConInstance.address);
                expect(isPausedForWithdrawals).to.equal(false);
            });

            it("Should not be able to withdraw in that token if it's paused", async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                await aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdtConInstance.address, true);
                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    1000000000, usdtConInstance.address
                );

                var NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
                console.log("Nav before cswap", `${NavfromStorage}`);

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
                        "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                    ],  // Fill this array if your function expects specific tokens
                    newProviders: [1, 1, 0, 0], // Fill this with the new providers' information
                    _deadline: deadline,
                    cometToClaim: [],
                    cometRewardTokens: [],
                    rewardTokenMinReturnAmounts: []
                };

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
                var siloSwapData = {
                    siloRewardTokens: [],
                    minReturnSilo: [],
                    siloOtoken: []
                };
                await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

                NavfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
                console.log("Nav after cswap", `${NavfromStorage}`);

                const minimumReturnAmount = [0, 0, 0, 0];

                const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
                const returnString = Amount.map(bn => bn.toString());

                await expect(aTokenConInstance.connect(investor1).withdraw(
                    197801111576383300n, usdtConInstance.address, deadline, returnString, 1, 0
                )).to.be.reverted;
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it("Should not be able to pause deposit token if not whitelisted", async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                await expect(aTokenConInstance.togglePauseDepositTokenForWithdrawals("0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", true)).to.be.reverted;
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it("Should not be able to unpause deposit token if not paused", async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                var isPausedForWithdrawals = await aTokenConInstance.isPausedForWithdrawals(usdtConInstance.address);
                expect(isPausedForWithdrawals).to.equal(false);

                await expect(aTokenConInstance.togglePauseDepositTokenForWithdrawals(usdcConInstance.address, false)).to.be.reverted;
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it("Should not be able to pause or unpause deposit token if not called by the owner", async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                await expect(aTokenConInstance.connect(other).togglePauseDepositTokenForWithdrawals(usdcConInstance.address, true)).to.be.reverted;
                await ethers.provider.send('evm_revert', [snapshotId]);
            });
        });

        describe('Should be called by the owne', async () => {
            it("Should be called by the owner", async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                await ethers.provider.send('evm_revert', [snapshotId]);
            });
        });

        describe('Emergency withdraw from compound and dydx ', async () => {

            it('emergency withdraw when product type is 2', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                var staleBal = await usdtConInstance.balanceOf(investor1.address);
                console.log("usdt balance of user before deposit ", `${staleBal}`);

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

                var siloSwapData = {
                    siloRewardTokens: [],
                    minReturnSilo: [],
                    siloOtoken: []
                };
                await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

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
                    [3000000, 3000000, 4000000]
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
                    [
                        5000000, 5000000
                    ]
                );

                await aTokenConInstance.emergencyWithdraw("0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0", platformWallet.address);

                await aFiManagerInstance.emergencyRebalance(
                    aTokenConInstance.address,
                    aFiStorageInstance.address,
                    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
                    [
                        10000000
                    ]
                );
                await aTokenConInstance.emergencyWithdraw("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", platformWallet.address);
                await ethers.provider.send('evm_revert', [snapshotId]);
            });
        });

        describe('Miscellaneous tests to increase coverage', async () => {

            it('deposit and withdraw when updated tvl has expired', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    1000000000, usdtConInstance.address
                );

                await aFiAFiOracleInstance.updateVaultControllers(aTokenConInstance.address, investor1.address, investor1.address);
                await aTokenConInstance.getplatformWallet();

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
                        "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                        // "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
                    ],  // Fill this array if your function expects specific tokens expects specific tokens
                    newProviders: [2, 0, 2, 0], // Fill this with the new providers' information
                    _deadline: deadline,
                    cometToClaim: [],
                    cometRewardTokens: [],
                    rewardTokenMinReturnAmounts: []
                };

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
                var siloSwapData = {
                    siloRewardTokens: [],
                    minReturnSilo: [],
                    siloOtoken: []
                };
                await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

                const minimumReturnAmount = [0, 0, 0, 0];

                const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
                const returnString = Amount.map(bn => bn.toString());

                await aTokenConInstance.connect(investor1).withdraw(
                    197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0
                );
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it('stake shares and update locked tokens edge cases', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                var staleBal = await usdtConInstance.balanceOf(investor1.address);
                console.log("usdt balance of user before deposit ", `${staleBal}`);

                var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
                // await aTokenConInstance.connect(investor1).updatePool(poolValue);

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    1000000000, usdtConInstance.address
                );

                await aTokenConInstance.updateTimeLockContract(other.address);

                await expect(aTokenConInstance.connect(other).stakeShares(other.address, 100, false)).to.be.reverted;

                const one_unit = 1000000000000000000n;

                const afibalanceBefore = await aTokenConInstance.balanceOf(investor1.address);

                await aTokenConInstance.connect(other).updateLockedTokens(investor1.address, one_unit, true, true, false, 0);

                const afibalanceAfter = await aTokenConInstance.balanceOf(investor1.address);

                expect(afibalanceBefore.sub(afibalanceAfter)).to.equal(one_unit);
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it('updateTimeLockContract and emergencyWithdraw should only be called by the owner', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 1000);

                await aTokenConInstance.updateTimeLockContract(other.address);

                await expect(aTokenConInstance.connect(other).updateTimeLockContract(investor1.address)).to.be.reverted;

                await expect(aTokenConInstance.connect(other).emergencyWithdraw(usdtConInstance.address, investor1.address)).to.be.reverted;
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it('updateInputTokens should update non-overlapping tokens', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                var inputTokens = await aTokenConInstance.getInputToken();
                console.log("Non-overlapping tokens", `${inputTokens[1]}`);

                await aTokenConInstance.updateInputTokens(["0xdAC17F958D2ee523a2206206994597C13D831ec7"]);

                inputTokens = await aTokenConInstance.getInputToken();
                console.log("Non-overlapping tokens", `${inputTokens[1]}`);
                await ethers.provider.send('evm_revert', [snapshotId]);

            });

            it('updateInputTokens should only be called by the owner', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                var inputTokens = await aTokenConInstance.getInputToken();
                console.log("Non-overlapping tokens", `${inputTokens[1]}`);

                await expect(aTokenConInstance.connect(other).updateInputTokens(["0xdAC17F958D2ee523a2206206994597C13D831ec7"])).to.be.reverted;

                inputTokens = await aTokenConInstance.getInputToken();
                console.log("Non-overlapping tokens", `${inputTokens[1]}`);
                await ethers.provider.send('evm_revert', [snapshotId]);
            });


            it('updatePreSwapDepositLimit should only be called by the owner', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                var preSwapDepositLimit = await aFiStorageInstance.getPreSwapDepositsTokens(aTokenConInstance.address, 0, usdtConInstance.address);
                console.log("preSwapDepositLimits", `${preSwapDepositLimit[1]}`);

                await expect(aFiPassiveRebalanceInstance.connect(other).updatePreSwapDepositLimit(100)).to.be.reverted;

                preSwapDepositLimit = await aFiStorageInstance.getPreSwapDepositsTokens(aTokenConInstance.address, 0, usdtConInstance.address);
                console.log("preSwapDepositLimits", `${preSwapDepositLimit[1]}`);
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it('should get deposit and underlying tokens', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                var tokens = await aTokenConInstance.getInputToken();
                console.log("deposit tokens", `${tokens[0]}`);

                var utokens = await aTokenConInstance.getUTokens();

                console.log("underlying tokens", `${utokens}`);

                expect((tokens[0]).length).to.equal(4);
                expect((utokens).length).to.equal(4);
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it('setUnstakeData should only be called by oracle', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                await expect(aTokenConInstance.connect(other).setUnstakeData(100)).to.be.reverted;
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it('updateTimeLockContract should not set zero address as TL contract', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                await expect(aTokenConInstance.updateTimeLockContract(ZERO_ADDRESS)).to.be.reverted;
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it('should revert if there is insufficient oToken balance', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');
                var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
                // await aTokenConInstance.connect(investor1).updatePool(poolValue);

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    1000000000, usdtConInstance.address
                );

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
                        "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                        // "0xD31a59c85aE9D8edEFeC411D448f90841571b89c"  // SOL
                    ],  // Fill this array if your function expects specific tokens expects specific tokens
                    newProviders: [2, 0, 2, 0], // Fill this with the new providers' information
                    _deadline: deadline,
                    cometToClaim: [],
                    cometRewardTokens: [],
                    rewardTokenMinReturnAmounts: []
                };

                poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
                // await aTokenConInstance.connect(investor1).updatePool(poolValue);
                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
                var siloSwapData = {
                    siloRewardTokens: [],
                    minReturnSilo: [],
                    siloOtoken: []
                };
                await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

                const minimumReturnAmount = [0, 0, 0, 0];

                const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
                const returnString = Amount.map(bn => bn.toString());

                poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
                // await aTokenConInstance.connect(investor1).updatePool(poolValue);

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    200000000, usdtConInstance.address
                );

                poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
                // await aTokenConInstance.connect(investor1).updatePool(poolValue);

                await expect(aTokenConInstance.connect(investor1).withdraw(
                    1978011115763833000n, usdtConInstance.address, deadline, returnString, 2, 0
                ))

                poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
                // await aTokenConInstance.connect(investor1).updatePool(poolValue);

                await expect(aTokenConInstance.connect(investor1).withdraw(
                    197801111576383300000n, usdtConInstance.address, deadline, returnString, 2, 0
                )).to.be.reverted;
                await ethers.provider.send('evm_revert', [snapshotId]);
            });

            it('should revert if there is insufficient uTokens balance', async () => {
                snapshotId = await ethers.provider.send('evm_snapshot');

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    1000000000, usdtConInstance.address
                );

                var navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
                console.log("Nav after deposit", `${navfromStorage}`);

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
                        "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
                    ],  // Fill this array if your function expects specific tokens expects specific tokens
                    newProviders: [1, 1, 0, 0], // Fill this with the new providers' information
                    _deadline: deadline,
                    cometToClaim: [],
                    cometRewardTokens: [],
                    rewardTokenMinReturnAmounts: []
                };

                poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
                // await aTokenConInstance.connect(investor1).updatePool(poolValue);
                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
                var siloSwapData = {
                    siloRewardTokens: [],
                    minReturnSilo: [],
                    siloOtoken: []
                };
                await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);

                navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
                console.log("Nav after cswap", `${navfromStorage}`);

                poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
                // await aTokenConInstance.connect(investor1).updatePool(poolValue);

                await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
                await aTokenConInstance.connect(investor1).deposit(
                    100000000, usdcConInstance.address
                );

                navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
                console.log("Nav after deposit2", `${navfromStorage}`);

                const minimumReturnAmount = [0, 0, 0, 0];

                const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
                const returnString = Amount.map(bn => bn.toString());

                await aFiStorageInstance.setStablesWithdrawalLimit(aTokenConInstance.address, usdtConInstance.address, 100000000000000000000n);

                await aTokenConInstance.connect(investor1).withdraw(
                    197801111576383300n, usdtConInstance.address, deadline, returnString, 3, 0
                );

                navfromStorage = await aFiFactoryInstance.getPricePerFullShare(aTokenConInstance.address, aFiStorageInstance.address);
                console.log("Nav after withdraw", `${navfromStorage}`);

                console.log("cut");

                // //TODO: why should this revert? what is the logic?
                // await expect(aTokenConInstance.connect(investor1).withdraw(
                //     19780111157638000n, usdtConInstance.address, deadline, returnString, 1, 0
                // )).to.be.reverted;
                // await ethers.provider.send('evm_revert', [snapshotId]);
                // await aTokenConInstance.updatePreSwapDepositLimit(100000000);
            });
        });
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

        // LOCAL CONTRACTS
        aFiBaseInstace = await AFiBase.deploy("AFi802", "AFi");
        aFiManagerInstance = await AFiManager.deploy();
        aFiPassiveRebalanceInstance = await PassiveRebalanceStrategies.deploy();
        aFiAFiOracleInstance = await AFiOracle.deploy(aFiPassiveRebalanceInstance.address);

        aFiFactoryInstance = await AFiFacotry.deploy(aFiBaseInstace.address);
        aFiStorageInstance = await AFiStorage.deploy(aFiManagerInstance.address, aFiAFiOracleInstance.address, aFiPassiveRebalanceInstance.address, aFiFactoryInstance.address);
        datasequencer = await DataConsumerWithSequencerCheck.deploy();
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
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000"
             ],
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

        // await aFiAFiOracleInstance.increaseObservation("0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff", 2);

        console.log("funded account balance usdt", investorusdtBalance)
    });

    context('Basic checks for deposit and withdraw', () => {

        it('Stable product', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
                minimumReturnAmount: [0, 0, 0],
                iMinimumReturnAmount: [0, 0, 0], // Adjust according to your contract's expectations
                underlyingTokens: [
                    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
                    "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
                ],
                newProviders: [3, 0, 3], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: ["0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf"],
                cometRewardTokens: ["0x354A6dA3fcde098F8389cad84b0182725c6C91dE"],
                rewardTokenMinReturnAmounts: [0]
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);

            await expect(aFiAFiOracleInstance.connect(investor2).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0)).to.be.reverted;

            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);

            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x", 0);



            const Afterbal1 = await aTokenConInstance.balanceOf(
                investor1.address
            );

            const minimumReturnAmount = [0, 0, 0, 0];
            const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
            const returnString = Amount.map(bn => bn.toString());

            const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

            await aTokenConInstance.connect(investor1).withdraw(
                Afterbal1, usdtConInstance.address, deadline, returnString, 3, 0
            );

            const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
            console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)

            await ethers.provider.send('evm_revert', [snapshotId]);
        });
    });
});

describe('Price appreciation product', () => {
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
            "0x0000000000000000000000000000000000000000"  ],
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
            1
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

        console.log("transfer complete")
        console.log("funded account balance usdttttttttt", investorusdtBalance)
    });

    it("withdraw check", async () => {
        snapshotId = await ethers.provider.send('evm_snapshot');
        const beforeUSDTDep = await usdtConInstance.balanceOf(investor1.address)
        console.log("before Deposit user usdt balance", `${beforeUSDTDep}`)

        var poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
        // await aTokenConInstance.connect(investor1).updatePool(poolValue);

        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(false);
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
            newProviders: [0, 4, 0, 0], // Fill this with the new providers' information
            _deadline: deadline,
            cometToClaim: [],
            cometRewardTokens: [],
            rewardTokenMinReturnAmounts: []
        };
        await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
        var siloSwapData = {
            siloRewardTokens: [],
            minReturnSilo: [],
            siloOtoken: []
        };
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

        poolValue = await aFiStorageInstance.calculatePoolInUsd(aTokenConInstance.address);
        // await aTokenConInstance.connect(investor1).updatePool(poolValue);

        const minimumReturnAmount = [0, 0, 0, 0];

        const Amount = minimumReturnAmount.map(num => BigNumber.from(num));
        const returnString = Amount.map(bn => bn.toString());

        const AfterwithusdcBalance = await usdtConInstance.balanceOf(investor1.address)
        console.log("Before withdraw user usdt balance", `${AfterwithusdcBalance}`)

        // await aTokenConInstance.connect(investor1).withdraw(
        //     Afterbal, usdtConInstance.address, deadline, returnString, 1, 0
        // );

        const AfterwithusdtBalance = await usdtConInstance.balanceOf(investor1.address)
        console.log("After withdraw user usdt balance", `${AfterwithusdtBalance}`)
        await ethers.provider.send('evm_revert', [snapshotId]);
    });
})