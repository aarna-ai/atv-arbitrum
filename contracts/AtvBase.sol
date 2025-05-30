// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
pragma abicoder v2;

import {IAFiStorage} from "./Interfaces/IAFiStorage.sol";
import {OwnableDelayModule} from "./Interfaces/OwnableDelayModule.sol";
import {ReentrancyGuard} from "./Interfaces/ReentrancyGuard.sol";
import {SafeCast} from "./Interfaces/SafeCast.sol";
import {SafeERC20} from "./Interfaces/SafeERC20.sol";
import {ERC20} from "./Interfaces/ERC20.sol";
import {ILendingPool} from "./Interfaces/ILendingPool.sol";
import {IPoolAddressesProvider} from "./Interfaces/ILendingPoolAddressesProvider.sol";
import {ISwapRouter} from "./Interfaces/ISwapRouter.sol";
import {IUniswapOracleV3} from "./Interfaces/IUniswapV3.sol";
import "./Interfaces/IAFi.sol";
import "./Interfaces/IPassiveRebal.sol";
import "./Libraries/ArrayUtils.sol";
import "./Interfaces/IUniswapV3Factory.sol";
import "./Interfaces/IDolomiteMargin.sol";

interface IMorphoVault {
  function deposit(uint256 assets, address receiver) external returns (uint256 shares);

  function withdraw(
    uint256 assets,
    address receiver,
    address owner
  ) external returns (uint256 shares);

  function redeem(
    uint256 shares,
    address receiver,
    address owner
  ) external returns (uint256 assets);
}

// Enum for supported DEXs
enum DexChoice {
  UNISWAP_V3,
  ONE_INCH,
  NONE
}

interface Compound {
  function mint(uint mintAmount) external returns (uint);
  function redeem(uint redeemTokens) external returns (uint);
  function redeemUnderlying(uint redeemAmount) external returns (uint);
  function exchangeRateStored() external view returns (uint);
}

interface CompoundV3 {
  function supply(address asset, uint amount) external;
  function withdraw(address asset, uint amount) external;
}

interface IAggregationExecutor {
  function callBytes(bytes calldata data) external payable;
}

interface IAggregationRouterV6 {
  struct SwapDescription {
    IERC20 srcToken;
    IERC20 dstToken;
    address srcReceiver;
    address dstReceiver;
    uint256 amount;
    uint256 minReturnAmount;
    uint256 flags;
  }

  function swap(
    IAggregationExecutor caller,
    SwapDescription calldata desc,
    bytes calldata data
  ) external payable returns (uint256 returnAmount, uint256 spentAmount);
}

interface IDForce {
  //dForce
  function mint(address _recipient, uint256 _mintAmount) external;
  function redeem(address _from, uint256 _redeemiToken) external;
  function balanceOfUnderlying(address _account) external view returns (uint256);
  function balanceOf(address _account) external view returns (uint256);
  function redeemUnderlying(address _from, uint256 _redeemUnderlying) external;
  function updateInterest() external returns (bool);
  function exchangeRateStored() external view returns (uint256);
}

interface IAFiFactory {
  function setIfUserInvesting(address user, address afiContract) external;
  function hasUserInvestedAlready(
    address afiContract,
    address user
  ) external view returns (bool);
  function withdrawAndResetInvestmentStatus(address user, address afiContract) external;
  function afiContractInitUpdate(address aFiContract, uint order) external;
}

interface LendingPoolAddressesProvider {
  function getLendingPool() external view returns (address);
  function getLendingPoolCore() external view returns (address);
}

contract AFiVariableStorage {
  uint internal pool;

  address[] internal token; // deposit stable coin
  address[] internal uTokens;

  uint[] internal uTokenProportions;
  uint[] internal defaultProportion;
 
  address payable internal platformWallet = payable(0xF977814e90dA44bFA03b6295A0616a897441aceC);
  mapping(address => bool) internal whitelistedTokens;
  mapping(address => address) internal dForceToken;
  mapping(address => uint) internal depositNAV;
}

contract AtvBase is
  ERC20,
  ReentrancyGuard,
  OwnableDelayModule,
  AFiVariableStorage,
  IAFi
{
  using SafeCast for uint256;
  using SafeERC20 for IERC20;
  using ArrayUtils for uint[];
  using ArrayUtils for address[];

  IPassiveRebal internal rebalContract;
  IAFiStorage internal aFiStorage;
  address internal aFiManager;
  address internal factory;
  address internal aFiOracle;
  address internal tLContract;

  bool internal depositPaused;
  bool internal withdrawPaused;
  bool public vaultReInitialized;
  bool internal isBase;
  bool internal isAfiTransferrable;

  uint internal typeOfProduct; // 1: one type product, 2: second and 3: for Algo
  uint256 internal cSwapCounter;
  uint256 public minimumDepositLimit;

  address[] internal nonOverlappingITokens; // Tokens that are not common between underlying and input tokens

  address private constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
  address private constant POOL_ADDRESS_PROVIDER = 0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb;
  ISwapRouter internal constant UNISWAP_EXCHANGE = ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564);
  address internal constant ONEINCH_ROUTER = 0x111111125421cA6dc452d289314280a0f8842A65;
  IDepositWithdrawalProxy public immutable depositWithdrawalProxy = IDepositWithdrawalProxy(0xAdB9D68c613df4AA363B42161E1282117C7B9594);
  IDolomiteMargin public immutable dolomiteMargin = IDolomiteMargin(0x6Bd780E7fDf01D77e4d475c821f1e7AE05409072);

  mapping(address => address) public compoundV3Comet;
  mapping(address => uint256) public userLockedAmount;
  mapping(address => bool) public isPausedForWithdrawals; // true if deposit token is paused(users can't withdraw in this token)
  mapping(address => mapping(uint => uint)) public nonWithdrawableShares;

  event UpdateShares(address user, uint256 amount, bool lock);
  event Withdraw(address indexed investor, uint256 amount, address withdrawnToken);
  event Initialized(address indexed afiContract);
  event UpdatePoolData(address indexed afiContract, bytes data);

  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

  function initialize(
    address newOwner,
    string memory tokenName,
    string memory tokenSymbol,
    bytes memory data,
    bool _isActiveRebalanced,
    IAFiStorage _aFiStorage,
    address[] memory _nonOverlappingITokens
  ) external override nonReentrant {
    checkFalse(isBase);
    addressCheck(newOwner, address(0));
    _name = tokenName;  
    _symbol = tokenSymbol;
    _transferOwnership(newOwner);
    delayModule = newOwner;
    aFiStorage = _aFiStorage;
    aFiOracle = aFiStorage.getAFiOracle();
    nonOverlappingITokens = _nonOverlappingITokens;
    IAFi.PoolsData memory pooldata = abi.decode(data, (IAFi.PoolsData));
    typeOfProduct = pooldata._typeOfProduct;
    factory = msg.sender;
    setInitialValues(data);
    defaultProportion = uTokenProportions;
    IAFiStorage(_aFiStorage).setAFiActive(address(this), true);
    IAFiStorage(_aFiStorage).setActiveRebalancedStatus(
      address(this),
      _isActiveRebalanced
    );

    updateInitCount(1);
    emit Initialized(address(this));
  }

  function initializeToken(
    address[] memory iToken,
    address[] memory _teamWallets,
    IPassiveRebal _rebalContract,
    address _aFiManager
  ) external override nonReentrant {
    checkFalse(isBase);
    isBase = true;
    aFiManager = _aFiManager;
    rebalContract = _rebalContract;
    aFiStorage.setTeamWallets(address(this), _teamWallets);
    uint iLen = iToken.length;
    unchecked {
      for (uint i = 0; i < iLen; i++) {
        updatetoken(iToken[i]);
        whitelistedTokens[iToken[i]] = true;
      }
    }
    minimumDepositLimit = 100;
    updateInitCount(2);
  }

  function updateInitCount(uint256 count) internal {
    IAFiFactory(factory).afiContractInitUpdate(address(this), count);
  }

  function updatetoken(address tok) internal {
    token.push(tok);
    approval(tok, aFiOracle, ~uint(0));
  }

  /**
   * @notice Pauses / unpause deposits in the contract.
   * @dev Requirements: Can only be invoked by the Owner wallet.
   */
  function pauseUnpauseDeposit(bool status) external override {
     twoAddressCompare(
      rebalContract.getPauseDepositController(address(this)),
      aFiOracle
    );
    depositPaused = status;
  }

  /**
   * @notice Pauses / unpause withdrawals in the contract.
   * @dev Requirements: Can only be invoked by the Delay Module.
   */
  function pauseWithdraw(bool status) external {
    checkDelayModule();
    withdrawPaused = status;
  }

  /**
   * @notice Returns the paused status of the contract.
   */
  function isPaused() external view override returns (bool, bool) {
    return (depositPaused, withdrawPaused);
  }

  /**
   * @notice To update the platform wallet address and zero address should not pass.
   * @dev Requirements: It can be invoked only by the owner.
   * @param _platformWallet Address of the platform wallet.
   */
  function setplatformWallet(address payable _platformWallet) external onlyOwner {
    addressCheck(_platformWallet, address(0));
    platformWallet = _platformWallet;
  }

  function setMinDepLimit(uint256 limit) external onlyOwner {
    greaterEqualComparison(limit, 100);
    minimumDepositLimit = limit;
  }

  function getplatformWallet() external view returns (address) {
    return platformWallet;
  }

  function getTVLandRebalContractandType()
    external
    view
    override
    returns (uint256, address, uint256)
  {
    return (pool, address(rebalContract), typeOfProduct);
  }

  function checkFalse(bool flag) internal pure {
    require(!flag, "AB03");
  }

  function addressEqual(address add1, address add2) internal pure {
    require(add1 == add2, "AB30");
  }

  function twoAddressCompare(address add1, address add2) internal view {
    require(msg.sender == add1 || msg.sender == add2, "AB32");
  }

  function addressCheck(address add1, address add2) internal pure {
    require(add1 != add2, "AB05"); //solhint-disable-line reason-string
  }

  function greaterEqualComparison(uint256 valA, uint256 valB) internal pure {
    require(valA >= valB, "AB24");
  }

  function togglePauseDepositTokenForWithdrawals(
    address tok,
    bool _pause
  ) external onlyOwner {
    if (_pause) {
      checkFalse(!whitelistedTokens[tok]);
    } else {
      checkFalse(!isPausedForWithdrawals[tok]);
    }
    isPausedForWithdrawals[tok] = _pause;
  }

  function addToWhitelist(address tok) external onlyOwner {
    checkFalse(whitelistedTokens[tok]);

    (bool isPresent, bool isInputTokenPresent) = checkTokInList(tok);

    if (!isPresent) {
      updatetoken(tok);
    }

    // Prevent duplication in nonOverlappingITokens

    (, bool isAlreadyInNonOverlapping) = nonOverlappingITokens.indexOf(tok);

    if (!isInputTokenPresent && !isAlreadyInNonOverlapping) {
      nonOverlappingITokens.push(tok);
    }

    whitelistedTokens[tok] = true;
  }

  function getPreDepositTokensBalance(
    address tok,
    uint256 _cSwapCounter
  ) internal view returns (uint) {
    return aFiStorage.getPreSwapDepositsTokens(address(this), _cSwapCounter, tok);
  }

  function removeFromWhitelist(
    address tok,
    address swapTok,
    uint256 deadline,
    uint256 amountOut,
    bytes calldata swapData
  ) external onlyOwner {
    checkFalse(!whitelistedTokens[tok]);
    checkFalse(!whitelistedTokens[swapTok]);
    delete whitelistedTokens[tok];
    if (getPreDepositTokensBalance(tok, cSwapCounter) > 0) {
      addressCheck(tok, swapTok);
      aFiStorage.doSwapForThewhiteListRemoval(
        tok,
        cSwapCounter,
        swapTok,
        deadline,
        amountOut,
        swapData
      );
    }

    token = rebalContract.removeToken(token, tok);
    resetApproval(tok, aFiOracle);

    // Remove tok from nonOverlappingITokens if present
    nonOverlappingITokens = rebalContract.removeToken(nonOverlappingITokens, tok);
  }

  function updateTVL() public override {
    pool = aFiStorage.calculatePoolInUsd(address(this));
  }

  function deposit(uint amount, address iToken) external nonReentrant {
    greaterEqualComparison((amount / (10 ** (IERC20(iToken).decimals()))), minimumDepositLimit);
    updateTVL();
    uint256 prevPool = pool;
    checkFalse(!whitelistedTokens[iToken]); // Added validation to check if the token is whitelisted
    checkFalse(depositPaused);
    IERC20(iToken).safeTransferFrom(msg.sender, address(this), amount);
    uint256 fee = (amount * 1) / (100); // 1% platform fees is deducted
    contractTransfers(iToken, platformWallet, fee);
    amount = amount - fee;
    setPreDep(iToken, (amount));

    (uint256 shares, uint256 newDepositNAV) = aFiStorage.calculateShares(
      address(this),
      amount, // assuming amount is defined somewhere
      prevPool,
      _totalSupply,
      iToken, // assuming iToken is defined somewhere
      depositNAV[msg.sender],
      _balances[msg.sender]
    );

    greaterEqualComparison(shares, 1);

    _mint(msg.sender, shares);
    depositNAV[msg.sender] = newDepositNAV;
    nonWithdrawableShares[msg.sender][cSwapCounter] += shares;
  }

  function contractTransfers(address tok, address to, uint256 amount) private {
    IERC20(tok).safeTransfer(to, amount);
  }

  /**
  * @dev This function is used to increase counter and to update the flag for vaultReInitialized
  */
  function underlyingTokensStaking(
  ) external override {
    checkOracle();
    if (vaultReInitialized) {
      vaultReInitialized = false;
    }
    cSwapCounter++;
  }

  function swap(
    address inputToken,
    address uTok,
    uint256 amountAsPerProportion,
    uint _deadline,
    address middleToken,
    uint256 minimumReturnAmount,
    bytes calldata swapData
  ) external override returns (uint256 returnAmount) {
    checkOracle();
    (returnAmount ) = _routeSwap(
      inputToken,
      uTok,
      amountAsPerProportion,
      _deadline,
      middleToken,
      minimumReturnAmount,
      swapData
    );
  }

  function isOTokenWhitelisted(address oToken) external view override returns (bool) {
    return whitelistedTokens[oToken];
  }

  function validateWithdraw(
    address user,
    address oToken,
    uint256 _shares
  ) public view override {
    checkFalse(!whitelistedTokens[oToken]); // Added validation to check if the token is whitelisted
    checkFalse(isPausedForWithdrawals[oToken]);
    validateShares(user, _shares);
    greaterEqualComparison(_shares, 1e17);
  }

  function validateShares(address user, uint256 _shares) internal view {
    greaterEqualComparison(
      _balances[user] -
        (userLockedAmount[user] + nonWithdrawableShares[user][cSwapCounter]),
      _shares
    );
  }

  function withdraw(
    uint _shares,
    address oToken,
    uint deadline,
    uint[] memory minimumReturnAmount,
    uint swapMethod,
    uint minAmountOut
  ) external nonReentrant {
    checkFalse((rebalContract.isSwapMethodPaused(address(this), swapMethod)));
    checkFalse(withdrawPaused);
    validateWithdraw(msg.sender, oToken, _shares);
    updateTVL();
    uint r = (pool * (_shares)) / (_totalSupply);
    greaterEqualComparison(r, 1);
    IAFiStorage.RedemptionParams memory params = IAFiStorage.RedemptionParams({
      baseContract: address(this),
      r: r,
      oToken: oToken,
      cSwapCounter: cSwapCounter,
      uTokens: uTokens,
      iTokens: token,
      deadline: deadline,
      minimumReturnAmount: minimumReturnAmount,
      _pool: pool,
      tSupply: _totalSupply,
      depositNAV: depositNAV[msg.sender],
      minAmountOut: minAmountOut
    });

    uint256 redFromContract = aFiStorage.handleRedemption(params, _shares, swapMethod, new bytes[](uTokens.length + token.length));
    
    burn(msg.sender, _shares);
    greaterEqualComparison(balance(oToken, address(this)), redFromContract);
    greaterEqualComparison(redFromContract, minAmountOut);
    checkNav(msg.sender);
    contractTransfers(oToken, msg.sender, redFromContract);

    emit Withdraw(msg.sender, _shares, oToken);
  }

  function burn(address account, uint256 amount) internal {
    _balances[account] -= amount;
    _totalSupply -= amount;
    emit Transfer(account, address(0), amount);
  }

  function swapfromSelectiveDex(
    address from,
    address to,
    uint amount,
    uint deadline,
    address midTok,
    uint minimumReturnAmount,
    bytes calldata _oneInchSwapData
  ) external override returns (uint256 _amountOut) {
    require(msg.sender == aFiManager || msg.sender == address(aFiStorage) || msg.sender == address(rebalContract), "AB00");
    (_amountOut) = _routeSwap(
      from,
      to,
      amount,
      deadline,
      midTok,
      minimumReturnAmount,
      _oneInchSwapData
    );
  }

  function getDexType(address tokIn, address tokOut) internal view returns (DexChoice) {
    return DexChoice(uint(rebalContract.getDexType(tokIn, tokOut)));
  }

  function _routeSwap(
    address _tokenIn,
    address _tokenOut,
    uint256 _amountIn,
    uint256 _maxTime,
    address middleToken,
    uint256 minimumReturnAmount,
    bytes calldata oneInchSwapData
  ) internal returns (uint256 amountOut) {
    DexChoice preferredDex = getDexType(_tokenIn, _tokenOut);

    if (preferredDex == DexChoice.UNISWAP_V3 || oneInchSwapData.length == 0) {
      (amountOut) = _uniswapV3Router(
        _tokenIn,
        _tokenOut,
        _amountIn,
        _maxTime,
        middleToken,
        minimumReturnAmount
      );
    } else if (preferredDex == DexChoice.ONE_INCH) {
      (amountOut) = _oneInchRouter(
        oneInchSwapData,
        _tokenIn,
        _amountIn,
        _tokenOut, // Pass destination token
        minimumReturnAmount, // Pass minimum return amount
        address(this) // Pass recipient (the contract itself)
      );
    }
    return (amountOut);
  }

  function getdatastruct(
    address _tokenIn,
    address _tokenOut,
    uint _amountIn,
    uint _maxTime,
    address middleToken,
    uint256 minimumReturnAmount
  ) internal returns (bytes memory) {
    return
      rebalContract.uniswapV3Oracle(
        address(this),
        _tokenIn,
        _tokenOut,
        _amountIn,
        _maxTime,
        middleToken,
        minimumReturnAmount
      );
  }

  function _uniswapV3Router(
    address _tokenIn,
    address _tokenOut,
    uint _amountIn,
    uint _maxTime,
    address middleToken,
    uint256 minimumReturnAmount
  ) internal returns (uint amountOut) {
    approval(_tokenIn, address(UNISWAP_EXCHANGE), _amountIn);
    if (
      _tokenIn == WETH ||
      _tokenOut == WETH ||
      _tokenIn == middleToken ||
      _tokenOut == middleToken
    ) {
      bytes memory swapParams = getdatastruct(
        _tokenIn,
        _tokenOut,
        _amountIn,
        _maxTime,
        middleToken,
        minimumReturnAmount
      );
      ISwapRouter.ExactInputSingleParams memory params = abi.decode(
        swapParams,
        (ISwapRouter.ExactInputSingleParams)
      );
      amountOut = UNISWAP_EXCHANGE.exactInputSingle(params);
    } else {
      bytes memory swapParams = getdatastruct(
        _tokenIn,
        _tokenOut,
        _amountIn,
        _maxTime,
        middleToken,
        minimumReturnAmount
      );
      ISwapRouter.ExactInputParams memory params = abi.decode(
        swapParams,
        (ISwapRouter.ExactInputParams)
      );
      amountOut = UNISWAP_EXCHANGE.exactInput(params);
    }
    greaterEqualComparison(amountOut, minimumReturnAmount);
    return (amountOut);
  }

  function _oneInchRouter(
    bytes calldata swapdata,
    address srcToken,
    uint256 srcAmount,
    address dstToken, // Add destination token parameter
    uint256 minReturnAmount, // Add minimum return amount parameter
    address recipient // Add recipient parameter
  ) internal returns (uint256 amountOut) {
    greaterEqualComparison(swapdata.length, 4);

    bytes calldata dataToValidate = swapdata[4:];
    (address executor1, SwapDescription memory desc, bytes memory data) = abi.decode(
      dataToValidate,
      (address, SwapDescription, bytes)
    );

    addressEqual(address(desc.srcToken), srcToken);
    addressEqual(address(desc.dstToken), dstToken);
    addressEqual(address(desc.dstReceiver), recipient);

    if (srcAmount != desc.amount) {
      desc.minReturnAmount = (desc.minReturnAmount * ((srcAmount * 1e18) / desc.amount)) / 1e18;
      desc.amount = srcAmount;
    } 

    approval(srcToken, ONEINCH_ROUTER, desc.amount);

    uint256 beforeDestBal = balance(dstToken, address(this));

    (bool success, bytes memory returnData) = ONEINCH_ROUTER.call{value: msg.value}(
      abi.encodeWithSelector(IAggregationRouterV6.swap.selector, executor1, desc, data)
    );

    if (!success) {
    // Decode revert reason if possible
      if (returnData.length > 0) {
        assembly {
          let revertReason := add(returnData, 0x20)
          let revertReasonSize := mload(returnData)
          revert(revertReason, revertReasonSize)
        }
      } else {
        revert("Call failed without reason");
      }
    }

    uint256 afterDestBal = balance(dstToken, address(this));
    greaterEqualComparison((afterDestBal - beforeDestBal), minReturnAmount);

    resetApproval(srcToken, ONEINCH_ROUTER);
    return (afterDestBal - beforeDestBal);
  }

  function resetApproval(address tok, address spender) internal {
    IERC20(tok).safeApprove(spender, 0);
  }

  /**
   * @notice Function sends profit to wallets in the process of proffir share.
   * @param wallet address to send profit to.
   * @param profitShare i.e. amount to be transferred.
   * @param oToken address of the token to consider for amount deduction.
   */
  function sendProfitOrFeeToManager(
    address wallet,
    uint profitShare,
    address oToken
  ) external override {
    twoAddressCompare(aFiManager, address(aFiStorage));
    contractTransfers(oToken, wallet, profitShare);
  }

  /**
   * @notice _supplyCompV3 function supply the fund of token to Compound V3 protocol for yield generation.
   * @dev this function should be called by AFiStorage only
   * @param tok address of the token to consider for supply.
   * @param amount i.e calculated amount of token to invest.
   */
  function _supplyCompV3(address tok, uint amount) external override {
    checkstorageAndApproval(tok, compoundV3Comet[tok], amount);
    CompoundV3(compoundV3Comet[tok]).supply(tok, amount);
  }

  /**
   * @notice _withdrawCompoundV3 function withdraws the fund of token from CompoundV3 protocol.
   * @param tok address of the token to consider to withdraw.
   * @param amount i.e calculated amount of token to withdraw.
   */
  function _withdrawCompoundV3(address tok, uint amount) external override {
    checkStorage();
    CompoundV3(compoundV3Comet[tok]).withdraw(tok, amount);
  }

  /**
   * @notice _supplyAave function supply the fund of token to AAVe protocol for yield generation.
   * @dev this function should be called by AFiStorage only
   * @param tok address of the token to consider for supply.
   * @param amount i.e calculated amount of token to invest.
   */
  function _supplyAave(address tok, uint amount) external override {
    checkstorageAndApproval(tok, address(_lendingPool()), amount);
    _lendingPool().deposit(tok, amount, address(this), 0);
  }

  function _supplyMorpho( address vault, address token, uint256 amount) external override  {
    checkstorageAndApproval(token, vault, amount);
    IMorphoVault(vault).deposit(amount, address(this));
  }

  function _withdrawMorpho(address vault, uint256 assetsRaw) external override  {
    checkStorage(); 
    IMorphoVault(vault).withdraw(assetsRaw, address(this), address(this));                                                                
  }

  function _supplydForce(address tok, uint amount) external override {
    checkstorageAndApproval(tok, dForceToken[tok], amount);
    IDForce(dForceToken[tok]).mint(address(this), amount);
  }

  function _supplyDolomite(address tok, uint amount, uint256 marketId) external override {
    checkstorageAndApproval(tok, address(dolomiteMargin), amount);
    depositWithdrawalProxy.depositWei(0, marketId, amount);
  }

  function checkstorageAndApproval(address from, address to, uint256 amount) internal {
    checkStorage();
    //approval
    approval(from, to, amount);
  }

  function approval(address tok, address sender, uint256 amount) internal {
    uint256 allowance = IERC20(tok).allowance(address(this), sender);
    if (allowance < amount) {
      IERC20(tok).safeIncreaseAllowance(sender, (amount - allowance));
    }
  }

  /**
   * @notice _withdrawAave function withdraws the fund of token from AAve protocol.
   * @param tok address of the token to consider to withdraw.
   * @param amount i.e calculated amount of token to withdraw.
   */
  function _withdrawAave(address tok, uint amount) external override {
    checkStorage();
    _lendingPool().withdraw(tok, amount, address(this));
  }

  function _withdrawdForce(address tok, uint amount) external override {
    checkStorage();
    IDForce(dForceToken[tok]).redeemUnderlying(address(this), amount);
  }

  function _withdrawDolomite(uint256 marketId, uint amount) external override {
    checkStorage();
    // Withdraw from Dolomite using DepositWithdrawalProxy
    depositWithdrawalProxy.withdrawWei(0, marketId, amount, 0);
  }

  /**
   * @notice updatePoolData function updates the pool data in the process of rebalance.
   * @param data encoded data to update.
   */
  function updatePoolData(bytes memory data) external override nonReentrant {
    checkManager();
    setInitialValues(data);
    emit UpdatePoolData(address(this), data);
  }

  /**
   * @notice Returns the array of underlying tokens.
   * @return uTokensArray Array of underlying tokens.
   */
  function getUTokens() external view override returns (address[] memory uTokensArray) {
    return uTokens;
  }

  /**
   * @notice Returns the cSwapCounter.
   */
  function getcSwapCounter() external view override returns (uint256) {
    return cSwapCounter;
  }

  function getProportions()
    external
    view
    override
    returns (uint[] memory, uint[] memory)
  {
    return (uTokenProportions, defaultProportion);
  }

  function transferValidationAndSet(address from, address to, uint256 amount) internal {
    checkFalse(!isAfiTransferrable);
    address owner = from;

    greaterEqualComparison(
      (_balances[owner] -
        (userLockedAmount[owner] + nonWithdrawableShares[owner][cSwapCounter])),
      amount
    );

    depositNAV[to] =
      ((depositNAV[to] * _balances[to]) + (depositNAV[owner] * amount)) /
      (_balances[to] + amount);
  }

  function checkNav(address target) internal {
    if (_balances[target] == 0) {
      deleteUserNAV(target);
    }
  }

  function deleteUserNAV(address user) internal {
    delete depositNAV[user];
  }

  function transfer(address to, uint256 amount) public virtual override returns (bool) {
    transferInternal(_msgSender(), to, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) public virtual override returns (bool) {
    address spender = _msgSender();
    _spendAllowance(from, spender, amount);
    transferInternal(from, to, amount);
    return true;
  }

  function transferInternal(address from, address to, uint256 amount) internal {
    transferValidationAndSet(from, to, amount);
    _transfer(from, to, amount);
    checkNav(from);
  }

  function setAfiTransferability(bool _afiTransferrable) external onlyOwner {
    isAfiTransferrable = _afiTransferrable;
  }

  function reinitializeHappened(bool status) external override {
    twoAddressCompare(aFiManager, aFiOracle);
    vaultReInitialized = status;
  }

  function getReinitializeStatus()
    external
    view
    override
    returns (bool _vaultReInitialized)
  {
    _vaultReInitialized = vaultReInitialized;
  }

  /**
   * @notice Sets unstaking data and returns necessary information.
   * @dev This function is used to set unstaking data and returns relevant information.
   * @param totalQueuedShares The total number of queued shares for unstaking.
   * @return token An array containing token addresses.
   * @return uTokens An array containing addresses of underlying tokens.
   * @return tSupply The total supply of tokens after considering queued shares.
   */
   function setUnstakeData(
    uint256 totalQueuedShares
  ) external override returns (address[] memory, address[] memory, uint256, uint256) {
    checkOracle();
    uint256 tSupply = _totalSupply;
    if (totalQueuedShares != 0) {
      _totalSupply -= totalQueuedShares;
    }
    return (token, uTokens, pool, tSupply);
  }

  /**
   * @notice Retrieves input tokens.
   * @dev This function is used to retrieve input token addresses and non-overlapping input token addresses.
   * @return token An array containing input token addresses.
   * @return nonOverlappingITokens An array containing non-overlapping input token addresses.
   */
  function getInputToken()
    external
    view
    override
    returns (address[] memory, address[] memory)
  {
    return (token, nonOverlappingITokens);
  }

  /**
   * @notice setInitialValues function initialises the pool and afi product data
   * @param data  i.e encoded data that contains pool, product data.
   */
  function setInitialValues(bytes memory data) internal {
    IAFi.PoolsData memory pooldata = abi.decode(data, (IAFi.PoolsData));
    IAFi.UnderlyingData memory uData = abi.decode(
      pooldata.underlyingData,
      (IAFi.UnderlyingData)
    );

    address tok;
    uint uLen = uData._underlyingTokens.length;
    for (uint i = 0; i < uLen; i++) {
      tok = uData._underlyingTokens[i];
      uTokens.push(uData._underlyingTokens[i]);
      uTokenProportions.push(pooldata._underlyingTokensProportion[i]);
      dForceToken[tok] = pooldata._dForceTokens[i];
      compoundV3Comet[tok] = pooldata.compoundV3Comet[i];
      aFiStorage.afiSync(
        address(this),
        tok,
        pooldata._aaveToken[i],
        compoundV3Comet[tok],
        dForceToken[tok],
        pooldata._morphoVaults[i],
        pooldata._dolomiteToken[i]
      );
    }
  }

  function updateuTokAndProp(address[] memory _uTokens) external override {
    checkManager();
    uTokens = _uTokens;
  }

  /**
   * @notice updateDp Function updates the default proportion after rebalance
   * @dev it should be called by the AFiManager contract only.
   * @param _defaultProportion i.e array of new default proportion
   */
  function updateDp(
    uint256[] memory _defaultProportion,
    uint256[] memory _uTokensProportion
  ) external override {
    checkManager();
    uTokenProportions = _uTokensProportion;
    defaultProportion = _defaultProportion;
  }

  /// @notice Retrieves Aave LendingPool address
  /// @return A reference to LendingPool interface
  function _lendingPool() internal view returns (ILendingPool) {
    return ILendingPool(IPoolAddressesProvider(POOL_ADDRESS_PROVIDER).getPool());
  }

  function checkOracle() internal {
    addressEqual(msg.sender, aFiOracle);
  }

  function checkManager() internal {
    addressEqual(msg.sender, aFiManager);
  }
  
  function checkStorage() internal view {
    addressEqual(msg.sender, address(aFiStorage));
  }

  function checkDelayModule() internal {
    addressEqual(msg.sender, delayModule);
  }

  /**
   * @notice updateShares Function locks/unlocks afi token
   * @dev it should be called by the time lock contract only.
   * @param user address to lock the afi token from.
   * @param amount i.e. amount to be locked/unlocked.
   * @param lock i.e. status if amount should be locked or unlocked.
   */
  function stakeShares(address user, uint256 amount, bool lock) external {
    addressCheck(user, tLContract);
    if (lock) {
      validateShares(user, amount);
    } else {
      greaterEqualComparison(userLockedAmount[user], amount);
    }
    updateLockedTokens(user, amount, lock, false, false, 0);
    emit UpdateShares(user, amount, lock);
  }

  function updateLockedTokens(
    address user,
    uint256 amount,
    bool lock,
    bool queue,
    bool unqueue,
    uint256 newNAV
  ) public override {
    twoAddressCompare(tLContract, aFiOracle);
    if (msg.sender == tLContract) {
      if (lock) {
        userLockedAmount[user] = userLockedAmount[user] + (amount);
      } else {
        userLockedAmount[user] = userLockedAmount[user] - (amount);
      }
    }

    if (queue) {
      _balances[user] -= amount;
      if (_balances[user] == 0 && userLockedAmount[user] == 0) {
        deleteUserNAV(user);
      }
      emit Transfer(user, address(0), amount);
    }
    if (unqueue) {
      depositNAV[user] = newNAV;
      _balances[user] += amount;
      emit Transfer(address(0), user, amount);
    }
  }

  function updateCp(uint256[] memory newCp) external {
    addressEqual(msg.sender, address(rebalContract));
    uTokenProportions = newCp;
  }

  /**
   * @notice updateTimeLockContract Function updates timelock contract address and zero address should not pass
   * @param newTL address of the timelock contract.
   */
  function updateTimeLockContract(address newTL) external onlyOwner {
    addressCheck(newTL, address(0));
    tLContract = newTL;
  }

  function checkTokInList(address tok) internal view returns( bool istok, bool isUTok) {
    (, istok) = token.indexOf(tok);
    (, isUTok) = uTokens.indexOf(tok);
  }

  /**
   * @notice Allows the owner to emergency withdraw tokens from the contract.
   * @dev Only the platform wallet can call this function.
   * @param tok Address of the token to be withdrawn.
   * @param wallet Address to receive the withdrawn tokens.
   */
  function emergencyWithdraw(address tok, address wallet) external {
    checkDelayModule();
    ( bool iPresent, bool present) = checkTokInList(tok);

    checkFalse(present);
    checkFalse(iPresent);
    contractTransfers(tok, wallet, balance(tok, address(this)));
  }

  /**
   * @notice Returns the balance of a specific token in the AFi contract.
   * @param tok The address of the token.
   * @param afiContract The address of the AFi contract.
   * @return The token balance.
   */
  function balance(address tok, address afiContract) internal view returns (uint) {
    return IERC20(tok).balanceOf(afiContract);
  }

  /**
   * @notice Updates the list of input tokens for the contract.
   * @dev Only the contract owner can call this function.
   * @param _nonOverlappingITokens Array of addresses representing input tokens.
   */
  function updateInputTokens(
    address[] memory _nonOverlappingITokens
  ) external override {
    twoAddressCompare(owner(), aFiManager);
    nonOverlappingITokens = _nonOverlappingITokens;
  }

  /**
   * @notice Returns the NAV (Net Asset Value) of a user's deposited funds.
   * @param user Address of the user.
   * @return The NAV of the user's deposited funds.
   */
  function depositUserNav(address user) external view override returns (uint256) {
    if (_balances[user] == 0) {
      return 0;
    } else {
      return depositNAV[user];
    }
  }

  function setPreDep(address tok, uint256 amt) internal {
    aFiStorage.setPreDepositedInputToken(cSwapCounter, amt, tok);
  }

  function handleOrphanTokens(
    address tok, 
    address oToken, 
    address middleTok, 
    uint256 _deadline, 
    uint256 minimumReturnAmount,
    bytes calldata swapData
    ) external onlyOwner {
    ( bool iPresent, ) = checkTokInList(oToken);
    checkFalse(!iPresent);
    bool present;
    (iPresent, present) = checkTokInList(tok);
    uint256 tokBal = balance(tok, address(this));
    if(iPresent && !present){
      uint256 preDep = getPreDepositTokensBalance(tok, cSwapCounter);
      if(tokBal >  preDep){
        setPreDep(tok, (tokBal - preDep));
      }
    }else if(!iPresent && !present){
      (uint256 returnAmount ) = _routeSwap(
        tok,
        oToken,
        tokBal,
        _deadline,
        middleTok,
        minimumReturnAmount,
        swapData
      );
      setPreDep(oToken, (returnAmount));
    }
  }
}
