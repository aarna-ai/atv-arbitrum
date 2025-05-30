// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import {SafeERC20} from "./Interfaces/SafeERC20.sol";
import {OwnableDelayModule} from "./Interfaces/OwnableDelayModule.sol";
import {IAFiStorage} from "./Interfaces/IAFiStorage.sol";
import {ISwapRouter} from "./Interfaces/ISwapRouter.sol";
import {IERC20Extended as IERC20} from "./Interfaces/IERC20Extended.sol";
import "./Interfaces/IUniswapV3Factory.sol";
import "./Libraries/ArrayUtils.sol";
import "./Libraries/OracleLibrary.sol";

interface IAFiManager {
  function getUTokenProportion(
    address aFiContract,
    address aFiStorage
  ) external view returns (uint256[] memory, uint256);

  function rebalanceController() external view returns (address);

  function inputTokenUSD(
    IAFi aFiContract,
    uint256 cSwapCounter,
    IAFiStorage _aFiStorage
  ) external view returns (uint256 totalPreDepositInUSD);
}

interface IAFi {
  function sendProfitOrFeeToManager(
    address wallet,
    uint profitShare,
    address oToken
  ) external;

  function swap(
    address inputToken,
    address uTok,
    uint256 amountAsPerProportion,
    uint _deadline,
    address middleToken,
    uint256 minimumReturnAmount
  ) external returns (uint256);

  function getcSwapCounter() external view returns (uint256);

  function getUTokens() external view returns (address[] memory uTokensArray);

  function getProportions() external view returns (uint[] memory, uint[] memory);

  function getReinitializeStatus() external view returns (bool vaultReInitialized);

  function updateCp(uint256[] memory newCp) external;

  function getPreSwapDepositLimit() external view returns (uint256);

  function getTVLandRebalContractandType()
    external
    view
    returns (uint256, address, uint256);

  function swapfromSelectiveDex(
    address from,
    address to,
    uint amount,
    uint deadline,
    address midTok,
    uint minimumReturnAmount,
    bytes calldata _oneInchSwapData
  ) external returns (uint256 _amountOut);
}

contract AtvPassiveRebalanceStrategies is OwnableDelayModule {
  using SafeERC20 for IERC20;

  address public afiManager;
  address public afiStorage;
  address public aFiOracle;

  bool internal paused;
  
  uint256 internal stalePricewindowLimit = 1 hours;
  uint256 internal preSwapDepositLimit;
  uint32 internal secondsAgo = 900;

  struct StablePools {
    address[] _pools;
  }

  // Enum for supported DEXs
  enum DexChoice {
    UNISWAP_V3,
    ONE_INCH,
    NONE
  }

  struct UniPoolData {
    address[] _underlyingTokens; //uTokens
    address[] _underlyingUniPoolToken; //uToken - MiddleToken
    address[] _underlyingUniPool; //uToken - Middle Token Pool
    address[] _underlyingPoolWithWETH; //uToken pool with WETH
    StablePools[] stablePools; //Stable - Middle pool
    address[] stableWethPool; //Stalbe - WETH Token
  }

  address internal constant UNISWAP_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
  address private constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

  mapping(address => uint) internal strategyNumber;
  mapping(address => mapping(address => address)) internal tokenUniPool;
  mapping(address => mapping(uint => bool)) public swapMethodPaused; // Mapping to keep track of paused swap methods
  mapping(address => mapping(address => uint24)) public _fee;
  mapping(address => address) internal underlyingUniPoolToken;
  mapping(address => address) internal priceOracles;
  mapping(address => mapping(address => DexChoice)) public tokenPairToDex;
  mapping(address => address) internal pauseDepositController;
  mapping(address => uint) internal stalePriceDelay;
  // Mapping of token addresses to their corresponding Morpho vault addresses
  mapping(address => mapping(address => address)) public atvContractTokenToVault;

  /**
   * @param account Address of the account that paused the contract.
   */
  event Paused(address account);
  /**
   * @param account Address of the account that unpaused the contract.
   */
  event Unpaused(address account);
  event UpdateRebalStrategyNumberByOwner(
    address indexed aFiContract,
    uint updatedStrategy
  );

  modifier contractUnpaused() {
    require(!paused, "AFP02");
    _;
  }

  modifier contractPaused() {
    require(paused, "AFP03");
    _;
  }

  function addressZero(address add1) internal pure {
    require(add1 != address(0), "AF03");
  }

  function greaterEqualComparison(uint256 valA, uint256 valB) internal pure {
    require(valA >= valB, "AB24");
  }

  modifier onlySpecificAddress(address _addr) {
    require(msg.sender == _addr, "AFPR: Not authorized"); //solhint-disable-line reason-string
    _;
  }

  /**
   * @notice To pause the contract.
   * @dev Requirements: It can only be invoked by owner.
   */
  function pause() external contractUnpaused onlyOwner {
    paused = true;
    emit Paused(msg.sender);
  }

  /**
   * @notice To resume/unpause the contract.
   * @dev Requirements: It can only be invoked by the owner.
   */
  function unPause() external contractPaused onlyOwner {
    paused = false;
    emit Unpaused(msg.sender);
  }

  /**
   * @notice Updates the global fees for Uniswap V3 pool operations.
   * @dev Only the contract owner can call this function.
   * @param fees New fee value to set for the token pair.
   */
  function updateGlobalFees(
    address[] memory tokenA,
    address[] memory tokenB,
    uint24[] memory fees
  ) external onlyOwner {
    for (uint i; i < fees.length; i++) {
      _fee[tokenA[i]][tokenB[i]] = fees[i];
    }
  }

  function getGlobalFee(
    address tokenIn,
    address tokenOut
  ) public view returns (uint24) {
    return _fee[tokenIn][tokenOut];
  }

  /**
   * @notice Returns a new proportions according to the strategy
   * @param _aFiContract AFi Contract.
   * @param _aFiManager AFi Manager.
   * @param _aFiStorage AFi Storage.
   * @param _tokens underlying tokens.
   * @return proportions i.e. a new proportions array according to the strategy.
   */
  function applyRebalForProportions(
    address _aFiContract,
    address _aFiManager,
    address _aFiStorage,
    address[] memory _tokens,
    uint256 strategy
  )
    public view returns (uint[] memory proportions, uint256 totalProp) 
  {
    uint[] memory uTokenProportions = new uint[](_tokens.length);
    if (strategy == 1) {
      (uTokenProportions, totalProp) = IAFiManager(_aFiManager).getUTokenProportion(
        _aFiContract,
        _aFiStorage
      );
    }
    return (uTokenProportions, totalProp);
  }

  /**
   * @notice Returns the pause status of the contract.
   * @return bool pause status of the contract.
   */
  function getPauseStatus() external view returns (bool) {
    return paused;
  }

  /**
   * @notice Returns current enabled strategy for passive rebalance.
   * @param aFiContract afi Contract.
   * @return uint strategy number.
   */
  function getRebalStrategyNumber(address aFiContract) public view returns (uint) {
    return strategyNumber[aFiContract];
  }

  /**
   * @notice Updates the current enabled strategy for passive rebalance for an afi contract.
   * @dev The contract must not be paused. It can only be invoked by owner of the contract.
   * @param aFiContract afi Contract.
   * @param updatedStrategy uint new strategy numebr to update.
   */
  function updateRebalStrategyNumberByOwner(
    address aFiContract,
    uint updatedStrategy
  ) external contractUnpaused onlyOwner {
    strategyNumber[aFiContract] = updatedStrategy;
    emit UpdateRebalStrategyNumberByOwner(aFiContract, updatedStrategy);
  }

  /**
   * @notice Sets the address of the AFiStorage contract.
   * @dev Only the owner of the contract can invoke this function.
   * @param _afiStorage The address of the AFiStorage contract.
   */
  function setStorage(address _afiStorage) external onlyOwner {
    require(_afiStorage != address(0), "AFP04");
    afiStorage = _afiStorage;
  }

  /**
   * @notice Sets the address of the AFiManager contract.
   * @dev Only the owner of the contract can invoke this function.
   * @param _aFiManager The address of the AFiManager contract.
   */
  function setManager(address _aFiManager) external onlyOwner {
    require(_aFiManager != address(0), "AFP05");
    afiManager = _aFiManager;
  }

  /**
   * @notice Sets the address of the AFiManager contract.
   * @dev Only the owner of the contract can invoke this function.
   * @param _aFiOracle The address of the AFiManager contract.
   */
  function setOracle(address _aFiOracle) external onlyOwner {
    require(_aFiOracle != address(0), "AFP05");
    aFiOracle = _aFiOracle;
  }

  /**
   * @notice Retrieves the UniSwap pool address for a given pair of tokens.
   * @param tok The address of the first token in the pair.
   * @param midTok The address of the second token in the pair.
   * @return Pool address.
   */
  function getPool(address tok, address midTok) public view returns (address) {
    return tokenUniPool[tok][midTok];
  }

  // the purpose of the function is to encode the pool data that follows the structure declared in IAFi.sol
  function swapData(
    ISwapRouter.ExactInputSingleParams memory swapData
  ) internal pure returns (bytes memory) {
    return (abi.encode(swapData));
  }

  function swapDataMultiHop(
    ISwapRouter.ExactInputParams memory swapData
  ) internal pure returns (bytes memory) {
    return (abi.encode(swapData));
  }

  function uniswapV3Oracle(
    address afiContract,
    address _tokenIn,
    address _tokenOut,
    uint _amountIn,
    uint _maxTime,
    address middleToken,
    uint256 minimumReturnAmount
  ) external onlySpecificAddress(afiContract) returns (bytes memory swapParams) {
    address poolTok;
    if (_tokenIn == WETH || _tokenOut == WETH) {
      if (_tokenIn == WETH) {
        poolTok = _tokenOut;
      } else {
        poolTok = _tokenIn;
      }
      ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
        .ExactInputSingleParams({
          tokenIn: _tokenIn,
          tokenOut: _tokenOut,
          // pool fee
          fee: IUniswapV3Pool(tokenUniPool[poolTok][WETH]).fee(),
          recipient: afiContract,
          deadline: _maxTime,
          amountIn: _amountIn,
          amountOutMinimum: minimumReturnAmount,
          // NOTE: In production, this value can be used to set the limit
          // for the price the swap will push the pool to,
          // which can help protect against price impact
          sqrtPriceLimitX96: 0
        });
      swapParams = swapData(params);
    } else if (_tokenIn == middleToken || _tokenOut == middleToken) {
      if (_tokenIn == middleToken) {
        poolTok = _tokenOut;
      } else {
        poolTok = _tokenIn;
      }
      ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
        .ExactInputSingleParams({
          tokenIn: _tokenIn,
          tokenOut: _tokenOut,
          // pool fee
          fee: IUniswapV3Pool(tokenUniPool[poolTok][middleToken]).fee(),
          recipient: afiContract,
          deadline: _maxTime,
          amountIn: _amountIn,
          amountOutMinimum: minimumReturnAmount,
          // NOTE: In production, this value can be used to set the limit
          // for the price the swap will push the pool to,
          // which can help protect against price impact
          sqrtPriceLimitX96: 0
        });
      swapParams = swapData(params);
    } else {
      ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
        path: abi.encodePacked(
          _tokenIn,
          IUniswapV3Pool(tokenUniPool[_tokenIn][middleToken]).fee(),
          middleToken,
          IUniswapV3Pool(tokenUniPool[_tokenOut][middleToken]).fee(),
          _tokenOut
        ),
        recipient: afiContract,
        deadline: _maxTime,
        amountIn: _amountIn,
        amountOutMinimum: minimumReturnAmount
      });
      swapParams = swapDataMultiHop(params);
    }
  }

  function initUniStructure(
    address[] memory inputTokens,
    bytes memory _poolData
  ) external {
    require(
      msg.sender == owner() ||
        msg.sender == IAFiManager(afiManager).rebalanceController() ||
        msg.sender == afiManager,
      "AFP00"
    );
    UniPoolData memory pooldata = abi.decode(_poolData, (UniPoolData));
    uint pLen = pooldata._underlyingUniPoolToken.length;
    uint iLen = pooldata.stablePools.length;
    unchecked {
      for (uint i = 0; i < pLen; i++) {
        updateUniTok(
          pooldata._underlyingTokens[i],
          pooldata._underlyingUniPoolToken[i],
          pooldata._underlyingUniPool[i]
        );
        updateUniTok(
          pooldata._underlyingTokens[i],
          WETH,
          pooldata._underlyingPoolWithWETH[i]
        );
      }
    }
    unchecked {
      for (uint i = 0; i < iLen; i++) {
        for (uint j = 0; j < pLen; j++) {
          updateUniTok(
            inputTokens[i],
            pooldata._underlyingUniPoolToken[j],
            pooldata.stablePools[i]._pools[j]
          );
        }
        updateUniTok(inputTokens[i], WETH, pooldata.stableWethPool[i]);
      }
    }
  }

  function updateUniTok(address tok, address midTok, address uniPool) internal {
    tokenUniPool[tok][midTok] = uniPool;
  }

  function encodePoolData(
    UniPoolData memory pooldata
  ) external pure returns (bytes memory) {
    return (abi.encode(pooldata));
  }

  function setPriceOracle(
    address[] memory iToken,
    address[] memory underlyingToken,
    address[] memory iTokenOracle,
    address[] memory underlyingTokenOracle
  ) external onlyOwner {
    uint256 iTokenLength = iToken.length;
    uint256 underlyingTokenLength = underlyingToken.length;
    uint uLen = underlyingTokenLength > iTokenLength
      ? underlyingTokenLength
      : iTokenLength;
    priceOracles[WETH] = 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612;
    for (uint256 i = 0; i < uLen; i++) {
      if (iTokenLength == uLen) {
        if (i < underlyingTokenLength) {
          priceOracles[underlyingToken[i]] = underlyingTokenOracle[i];
        }
        priceOracles[iToken[i]] = iTokenOracle[i];
      } else {
        if (i < iTokenLength) {
          priceOracles[iToken[i]] = iTokenOracle[i];
        }
        priceOracles[underlyingToken[i]] = underlyingTokenOracle[i];
      }
    }
  }

  function removeToken(
    address[] memory tokens,
    address token
  ) external pure returns (address[] memory) {
    (, bool isPresent) = ArrayUtils.indexOf(tokens, token);
    if (isPresent) {
      return ArrayUtils.remove(tokens, token);
    }
    return tokens;
  }

  function getMinimumAmountOut(
    address _tokenIn,
    uint256 _amountIn,
    address _tokenOut,
    address _uniPool
  ) public view returns (uint256 amountOut) {
    address uniPool;

    if (_tokenIn == (WETH) || _tokenOut == (WETH)) {
      amountOut = estimateAmountOut(_tokenIn, uint128(_amountIn), _tokenOut);
    } else if (
      _tokenIn == underlyingUniPoolToken[_tokenIn] ||
      _tokenOut == underlyingUniPoolToken[_tokenIn]
    ) {
      uniPool = getPool(_tokenIn, underlyingUniPoolToken[_tokenIn]);
      if (_uniPool != address(0)) {
        uniPool = _uniPool;
      }
      amountOut = estimateAmounts(
        _tokenIn,
        _amountIn,
        underlyingUniPoolToken[_tokenIn],
        uniPool
      );
    } else {
      uniPool = getPool(_tokenIn, underlyingUniPoolToken[_tokenIn]);
      address unipoolOut = getPool(_tokenOut, underlyingUniPoolToken[_tokenIn]);

      amountOut = estimateAmounts(
        _tokenIn,
        _amountIn,
        underlyingUniPoolToken[_tokenIn],
        uniPool
      );
      amountOut = estimateAmounts(
        underlyingUniPoolToken[_tokenIn],
        amountOut,
        _tokenOut,
        unipoolOut
      );
    }
  }

  function estimateAmounts(
    address intok,
    uint256 amt,
    address outTok,
    address uniPool
  ) internal view returns (uint256) {
    uint256 _amountOut = estimateAmountOutMin(intok, uint128(amt), outTok, uniPool);
    return _amountOut;
  }

  /**
   * @notice To get the number of "tokenOut" for aFi vault.
   * @param tokenIn Address of underlying token from set.
   * @param amountIn Amount of underlying token
   * @param tokenOut Address of the underlying token for aFi contract.
   */
  function estimateAmountOut(
    address tokenIn,
    uint128 amountIn,
    address tokenOut
  ) public view returns (uint amountOut) {
    address _pool = IUniswapV3Factory(UNISWAP_FACTORY).getPool(
      tokenOut,
      tokenIn,
      getGlobalFee(tokenIn, tokenOut)
    );
    addressZero(_pool);
    amountOut = getAmountOutMin(tokenIn, amountIn, tokenOut, _pool);
  }

  function estimateAmountOutMin(
    address tokenIn,
    uint128 amountIn,
    address tokenOut,
    address poolToConsider
  ) public view returns (uint amountOut) {
    addressZero(poolToConsider);
    amountOut = getAmountOutMin(tokenIn, amountIn, tokenOut, poolToConsider);
  }

  function getAmountOutMin(
    address tokenIn,
    uint128 amountIn,
    address tokenOut,
    address poolToConsider
  ) internal view returns (uint amountOut) {
    uint32[] memory secondsAgos = new uint32[](2);
    secondsAgos[0] = secondsAgo;
    secondsAgos[1] = 0;

    // int56 since tick * time = int24 * uint32
    // 56 = 24 + 32
    (int56[] memory tickCumulatives, ) = IUniswapV3Pool(poolToConsider).observe(
      secondsAgos
    );

    int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];

    // int56 / uint32 = int24
    // int24 tick = int24(tickCumulativesDelta / secondsAgo);
    int24 tick = int24(tickCumulativesDelta / int56(int32(secondsAgo)));
    // Always round to negative infinity
    /*
      int doesn't round down when it is negative

      int56 a = -3
      -3 / 10 = -3.3333... so round down to -4
      but we get
      a / 10 = -3

      so if tickCumulativeDelta < 0 and division has remainder, then round
      down
      */
    if (
      tickCumulativesDelta < 0 && (tickCumulativesDelta % int56(int32(secondsAgo)) != 0)
    ) {
      tick--;
    }

    amountOut = OracleLibrary.getQuoteAtTick(tick, amountIn, tokenIn, tokenOut);
  }

  function setDexForTokenPair(
    address tokenIn,
    address tokenOut,
    DexChoice dex
  ) external {
    require(msg.sender == IAFiManager(afiManager).rebalanceController(), "AFP09");
    require(tokenIn != address(0) && tokenOut != address(0), "Invalid token address");
    require(dex != DexChoice.NONE, "Invalid DEX choice");
    tokenPairToDex[tokenIn][tokenOut] = dex;
  }

  function getDexType(
    address tokenIn,
    address tokenOut
  ) external view returns (DexChoice) {
    DexChoice dex = tokenPairToDex[tokenIn][tokenOut];
    return dex == DexChoice.NONE ? DexChoice.UNISWAP_V3 : dex; // Default to Uniswap
  }

  function getPriceOracle(address tok) external view returns (address) {
    return priceOracles[tok];
  }

  /**
   * @notice Initializes the stale price delay for multiple underlying tokens.
   * @dev Only the contract owner can call this function.
   * @param underlyingTokens Array of underlying tokens.
   * @param _stalePriceDelay Array of stale price delays corresponding to each underlying token.
   */
  function intializeStalePriceDelay(
    address[] memory underlyingTokens,
    uint256[] memory _stalePriceDelay
  ) external {
    require(
      msg.sender == owner() ||
        msg.sender == IAFiManager(afiManager).rebalanceController(),
      "NA"
    );
    require(underlyingTokens.length == _stalePriceDelay.length, "AFP07");
    for (uint i = 0; i < underlyingTokens.length; i++) {
      setSPDelay(underlyingTokens[i], _stalePriceDelay[i]);
    }
  }

  function setSPDelay(address uToken, uint256 _stalePriceDelay) internal {
    require(_stalePriceDelay > stalePricewindowLimit, "AFP06");
    stalePriceDelay[uToken] = _stalePriceDelay;
  }

  function setstalepriceWindowLimit(uint256 _stalePWindow) external onlyOwner {
    stalePricewindowLimit = _stalePWindow;
  }

  function getstalepriceWindowLimit() external view returns (uint256) {
    return stalePricewindowLimit;
  }

  /**
   * @notice Gets the stale price delay for a specific underlying token.
   * @param uToken Address of the underlying token.
   * @return The stale price delay for the specified underlying token.
   */
  function getStalePriceDelay(address uToken) external view returns (uint256) {
    return stalePriceDelay[uToken];
  }

  /**
   * @notice updateOracleData Function updates the oracle address of the new underlying token
   * @dev it should be called by the AFiManager contract only.
   * @param _uToken  i.e the new underlying token.
   * @param _oracleAddress i.e the address of the oracle contract.
   */
  function updateOracleData(address _uToken, address _oracleAddress) external {
    require(msg.sender == owner() || msg.sender == afiManager, "AFP09");
    priceOracles[_uToken] = _oracleAddress;
  }

  function setPauseDepositController(
    address afiContract,
    address _pauseDepositController
  ) external onlyOwner {
    require(_pauseDepositController != address(0), "AFP08");
    pauseDepositController[afiContract] = _pauseDepositController;
  }

  function getPauseDepositController(
    address afiContract
  ) external view returns (address) {
    return pauseDepositController[afiContract];
  }

  function validateAndApplyRebalanceStrategy(
    address afiContract,
    address[] memory uTokens,
    uint256 toSwap,
    uint256 cSwapCounter
  ) external onlySpecificAddress(aFiOracle) returns (uint256) {
    greaterEqualComparison(toSwap, preSwapDepositLimit);

    (uint256[] memory uTokenProportions, ) = IAFi(afiContract).getProportions();

    bool vaultReInitialized = IAFi(afiContract).getReinitializeStatus();

    uint strategy = getRebalStrategyNumber(afiContract);
    uint256 _totalProp;
    // Rebal block starts
    if (strategy == 1 && cSwapCounter > 0 && !vaultReInitialized) {
      (uTokenProportions, _totalProp) = applyRebalForProportions(
        afiContract,
        afiManager,
        afiStorage,
        uTokens,
        strategy
      );
      IAFi(afiContract).updateCp(uTokenProportions);
    } else if (cSwapCounter == 0 || vaultReInitialized) {
      _totalProp = 10000000;
    }
    return (_totalProp);
  }

  function updateMidToken(address[] memory tok, address[] memory midTok) external {
    require(
      msg.sender == owner() ||
        msg.sender == afiManager ||
        msg.sender == IAFiManager(afiManager).rebalanceController(),
      "NA"
    );
    for (uint i; i < tok.length; i++) {
      addressZero(tok[i]);
      addressZero(midTok[i]);
      underlyingUniPoolToken[tok[i]] = midTok[i];
    }
  }
  
  /**
   * @notice Updates the time interval in seconds for retrieving historical prices.
   * @dev Only the contract owner can call this function.
   * @param sec New time interval in seconds.
   */
  function updateSecAgo(uint32 sec) external onlyOwner {
    secondsAgo = sec;
  }

  function getSecAgo() external view returns (uint256) {
    return secondsAgo;
  }

  function getMidToken(address tok) external view returns (address) {
    return underlyingUniPoolToken[tok];
  }

  /**
   * @notice Pauses / unpauses specific swap methods in the contract.
   * @dev Requirements: Can only be invoked by the Delay Module.
   * @param methods An array of swap method IDs to be paused or unpaused.
   * @param statuses The status to set (true to pause, false to unpause).
   */
  function pauseSwapMethods(
    address afiContract,
    uint[] memory methods,
    bool[] memory statuses
  ) external {
    require(msg.sender == delayModule, "AFP01");
    for (uint i = 0; i < methods.length; i++) {
      swapMethodPaused[afiContract][methods[i]] = statuses[i];
    }
  }

  /**
   * @notice Check if a swap method is paused.
   * @dev This function can be used in the `withdraw` function to validate if a swap method is paused.
   * @param swapMethod The ID of the swap method to check.
   */
  function isSwapMethodPaused(
    address afiContract,
    uint swapMethod
  ) external view returns (bool) {
    return swapMethodPaused[afiContract][swapMethod];
  }

  /**
   * @notice Updates the limit for pre-swap deposits.
   * @dev Only the contract owner can call this function.
   * @param _preSwapDepositLimit New limit for pre-swap deposits.
   */
  function updatePreSwapDepositLimit(uint256 _preSwapDepositLimit) external onlyOwner {
    preSwapDepositLimit = _preSwapDepositLimit;
  }

  function getPreSwapDepositLimit() public view returns (uint256) {
    return preSwapDepositLimit;
  }

  function checkUnderlyingToken(
    address afiContract,
    uint r,
    address oToken,
    uint256 _cSwapCounter,
    address[] memory _uTokens,
    uint256 deadline,
    uint256[] memory minimumReturnAmount
  ) external returns (uint256 available) {
    require(msg.sender == afiStorage, "AP01");
    {
      (, , uint256 typeOfProduct) = IAFi(afiContract).getTVLandRebalContractandType();
      require(typeOfProduct == 1 || typeOfProduct == 3, "AP05");
    }

    uint256 redemptionFromContract;
    uint256 balToConsider;

    {
      (uint index, bool present) = ArrayUtils.indexOf(_uTokens, oToken);
      if (present) {
        (,,redemptionFromContract,,) = IAFiStorage(afiStorage).calculateRedemptionFromContract(afiContract, _uTokens[index], r);
       
        balToConsider =
        IERC20(_uTokens[index]).balanceOf(afiContract) -
        IAFiStorage(afiStorage).getPreSwapDepositsTokens(afiContract, _cSwapCounter, _uTokens[index]);

        if (balToConsider >= redemptionFromContract){
          available += redemptionFromContract;
        } else {
          revert("Insufficient balance!");
        }
      }
    }

    for (uint i; i < _uTokens.length; i++) {
      if(_uTokens[i] != oToken){
        (, , redemptionFromContract, , ) = IAFiStorage(afiStorage).calculateRedemptionFromContract(
          afiContract,
          _uTokens[i],
          r
        );

        balToConsider = IERC20(_uTokens[i]).balanceOf(afiContract) - IAFiStorage(afiStorage).getPreSwapDepositsTokens(afiContract, _cSwapCounter,_uTokens[i]);
        if (balToConsider >= redemptionFromContract) {
          available += IAFi(afiContract).swapfromSelectiveDex(
            _uTokens[i],
            oToken,
            redemptionFromContract,
            deadline,
            WETH,
            minimumReturnAmount[i],
            new bytes(0)
          );
        } else {
          revert("AP0004");
        }
      }
    }  
  }
}
