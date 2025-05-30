// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IPassiveRebal {
  function applyRebalForProportions(
    address _aFiContract,
    address _aFiManager,
    address _aFiStorage,
    address[] memory _tokens,
    uint256 strategy
  ) external returns (uint[] memory proportions, uint256 totalProp);

  function getPauseStatus() external returns (bool);

  function getDexType(address tokenIn, address tokenOut) external view returns (uint8);

  function getPauseDepositController(address afiContract) external view returns (address);

  function getRebalPeriod(address aFiContract) external returns (uint);

  function updateRebalPeriod(address aFiContract, uint _newRebalPeiod) external;

  function setPassiveRebalancedStatus(address aFiContract, bool status) external;

  function isAFiPassiveRebalanced(
    address aFiContract
  ) external returns (bool _isPassiveRebalanced);

  function getRebalStrategyNumber(address aFiContract) external returns (uint);

  function updateRebalStrategyNumber(
    address aFiContract,
    uint updatedStrategy
  ) external;

  function swap(
    address afiContract,
    address _tokenIn,
    address _tokenOut,
    uint _amountIn,
    uint _maxTime,
    address middleToken,
    uint256 minimumReturnAmount
  ) external returns (bytes memory swapParams);

  function updateuniPool(address tok, address midTok) external;

  function uniswapV3Oracle(
    address afiContract,
    address _tokenIn,
    address _tokenOut,
    uint _amountIn,
    uint _maxTime,
    address middleToken,
    uint256 minimumReturnAmount
  ) external returns (bytes memory swapParams);

  function getPool(address tok, address midTok) external view returns (address);

  function upDateInputTokPool(address[] memory iToken, bytes memory uniData) external;

  function getPriceOracle(address tok) external view returns (address);

  function updateOracleData(address _uToken, address _oracleAddress) external;

  function removeToken(
    address[] memory tokens,
    address token
  ) external pure returns (address[] memory);

  function calculateShares(
    address afiContract,
    uint256 amount,
    uint256 prevPool,
    uint256 _totalSupply,
    address iToken,
    uint256 currentDepositNAV
  ) external view returns (uint256 shares, uint256 newDepositNAV);

  function convertInUSDAndTok(
    address tok,
    uint256 amt,
    bool usd
  ) external view returns (uint256);
   function initUniStructure(
    address[] memory inputTokens,
    bytes memory _poolData
  ) external;

  function getGlobalFee(address tokenIn, address tokenOut) external view returns(uint24);

  function getStalePriceDelay(address uToken) external view returns (uint256);

  function isSwapMethodPaused(address afiContract,uint swapMethod) external view returns (bool);

  function updateMidToken(address[] memory tok, address[] memory midTok) external;

  function getMidToken(address tok) external view returns (address);

  function getPreSwapDepositLimit() external view returns (uint256);

  function getMinimumAmountOut(
    address _tokenIn,
    uint256 _amountIn,
    address _tokenOut,
    address _uniPool
  ) external view returns (uint256 amountOut);

  function validateAndApplyRebalanceStrategy(
    address afiContract,
    address[] memory uTokens,
    uint256 toSwap,
    uint256 cSwapCounter
  ) external returns ( uint256 );

  function checkUnderlyingToken(
    address afiContract,
    uint r,
    address oToken,
    uint256 _cSwapCounter,
    address[] memory _uTokens,
    uint256 deadline,
    uint256[] memory minimumReturnAmount
  ) external returns (uint256 available);
}