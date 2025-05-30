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

describe('Stable product', (accounts) => {
    let platformWallet; let recipient; let investor1; let investor2;
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
        result = await aFiFactoryInstance.createAToken("AFiBase", "ATOK", bytesPayload2, [investor1.address, investor2.address], true, aFiStorageInstance.address,
            aFiPassiveRebalanceInstance.address, aFiManagerInstance.address, []);

        aTokenConInstance = await aFiFactoryInstance.aFiProducts(0);

        aTokenConInstance = await ethers.getContractAt(AFIBASE_ABI, aTokenConInstance);

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
        console.log("check11");
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
        await aFiPassiveRebalanceInstance.setPauseDepositController(aTokenConInstance.address, investor1.address);
        await aFiManagerInstance.setafiOracleContract(aFiAFiOracleInstance.address);
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
        await usdtConInstance.connect(signer).transfer(investor1.address, "3015160000");
        // await usdtConInstance.connect(signer).transfer(investor2.address, "100505337");

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
        //await aFiAFiOracleInstance.increaseObservation("0x468b88941e7Cc0B88c1869d68ab6b570bCEF62Ff", 2);

        console.log("funded account balance usdt", investorusdtBalance)
    });

    context('Basic checks for deposit and withdraw', () => {

        it('Stable product', async () => {
            snapshotId = await ethers.provider.send('evm_snapshot');

            await aTokenConInstance.connect(investor1).deposit(
                2000000000, usdtConInstance.address
            );

            // await aTokenConInstance.connect(investor1).deposit(
            //     1000000000, usdcConInstance.address
            // );

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
                newProviders: [0, 2, 0], // Fill this with the new providers' information
                _deadline: deadline,
                cometToClaim: ["0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf"],
                cometRewardTokens: ["0x354A6dA3fcde098F8389cad84b0182725c6C91dE"],
                rewardTokenMinReturnAmounts: [0]
            };

            await expect(aFiAFiOracleInstance.connect(investor2).cumulativeSwap(swapParams, 0, ["0x", "0x", "0x", "0x"], "0x")).to.be.reverted;
            await usdtConInstance.connect(investor1).transfer(aTokenConInstance.address, 100000000);

            var siloSwapData = {
                siloRewardTokens: [],
                minReturnSilo: [],
                siloOtoken: []
            };
            await aTokenConInstance.connect(investor1).pauseUnpauseDeposit(true);
            await aFiAFiOracleInstance.connect(investor1).cumulativeSwap(swapParams, 0, oneInchParam, "0x",  0);

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
    });
});