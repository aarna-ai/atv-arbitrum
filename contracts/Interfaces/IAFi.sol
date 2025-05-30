// SPDX-License-Identifier: BUSL-1.1

pragma solidity ^0.8.0;

import {IERC20Extended as IERC20} from "./IERC20Extended.sol";
import "./IAFiStorage.sol";
import "./IPassiveRebal.sol";

/**
 * @title PassiveRebal.
 * @notice Interface of the Passive Rebalance contract.
 */
interface PassiveRebal {
  function applyRebalForProportions(
    address _aFiContract,
    address _aFiManager,
    address _aFiStorage,
    address[] memory _tokens,
    uint256 strategy
  ) external returns (uint[] memory proportions);

  function getPauseStatus() external returns (bool);

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
}

interface IAFiManager {
  function updateUTokenProportion(
    address aFiContract,
    address aFiStorage
  ) external returns (uint256[] memory);

  function uTokenslippage(
    address aFiContract,
    address uToken
  ) external view returns (uint uTokenSlippage);

  function inputTokenUSD(
    IAFi aFiContract,
    uint256 cSwapCounter,
    IAFiStorage _aFiStorage
  ) external view returns (uint256 totalPreDepositInUSD);

  function rebalanceController() external view returns (address);

  function pauseQueueWithdrawUnstaking(address afiContract, bool status) external;

  function isQueueWithdrawUnstakingPaused(
    address afiContract
  ) external view returns (bool);
}

/**
 * @title IAFi.
 * @notice Interface of the AToken.
 */
interface IAFi {
  struct UnderlyingData {
    address[] _underlyingTokens; //uTokens
    address[] _underlyingUniPoolToken; //uToken - MiddleToken
  }

  struct SwapParameters {
    address afiContract;
    address oToken;
    uint256 cSwapFee;
    uint256 cSwapCounter;
    address[] depositTokens;
    uint256[] minimumReturnAmount;
    uint256[] iMinimumReturnAmount; // minimum amount out expcted after swaps For deposit tokens
    address[] underlyingTokens;
    uint256[] newProviders;
    uint _deadline;
    address[] cometToClaim;
    address[] cometRewardTokens;
    uint256[] rewardTokenMinReturnAmounts;
  }

  struct MorphoRewardData {
    address[] rewardTokens; // Tokens to be claimed
    bytes32[][] proofs; // Merkle proofs for each claim
    uint256[] rewardTokenAmount;
    uint256[] minReturnAmounts; // Minimum return amounts for swaps to oToken
    bytes[] swapData; // Optional: Swap data (e.g., Uniswap V3 paths) for each reward token
  }

  struct SwapDescription {
    IERC20 srcToken;
    IERC20 dstToken;
    address payable srcReceiver;
    address payable dstReceiver;
    uint256 amount;
    uint256 minReturnAmount;
    uint256 flags;
  }

  struct PoolsData {
    address[] _depositStableCoin;
    bytes underlyingData;
    address[] _aaveToken;
    address[] _dForceTokens;
    address[] _morphoVaults;
    uint[] _dolomiteToken;
    uint[] _underlyingTokensProportion;
    address[] compoundV3Comet;
    uint _typeOfProduct;
  }

  struct SwapDataStructure {
    bytes[] firstIterationUnderlyingSwap;
    bytes[] secondIterationUnderlyingSwap;
    bytes[] firstIterationCumulativeSwap;
    bytes[] secondIterationCumulativeSwap;
  }

  /**
   * @param account Address of the account that paused the contract.
   * @param isDeposit True if we want to pause deposit otherwise false if want to pause withdraw.
   */
  event Paused(address account, bool isDeposit);
  /**
   * @param account Address of the account that unpaused the contract.
   * @param isDeposit True if we want to unpause deposit otherwise false if want to unpause withdraw.
   */
  event Unpaused(address account, bool isDeposit);

  /**
   * @notice Function to initialize the data, owner and afi token related data.
   * @dev the function should be called once only by factory
   * @param newOwner indicates the owner of the created afi product.
   * @param _name indicates the name of the afi Token
   * @param _symbol indicates symbol of the the afi Token.
   * @param data indicates the encoded data that follows the PoolsData struct format.
   * @param _isActiveRebalanced indicates the active rebalance status of the afi contract.
   * @param _aFiStorage indicates the afi storage contract address.
   */
  function initialize(
    address newOwner,
    string memory _name,
    string memory _symbol,
    bytes memory data,
    bool _isActiveRebalanced,
    IAFiStorage _aFiStorage,
    address[] memory _commonInputTokens
  ) external;

  /**
   * @notice Function to initialize accepted tokens in deposit and withdraw functions.
   * @dev  the function should be called once only by factory
   * @param iToken indicates the array of the accepted token addressess.
   */
  function initializeToken(
    address[] memory iToken,
    address[] memory _teamWallets,
    IPassiveRebal _rebalContract,
    address _aFiManager
  ) external;

  /**
   * @notice Returns the array of underlying tokens.
   * @return uTokensArray Array of underlying tokens.
   */
  function getUTokens() external view returns (address[] memory uTokensArray);

   function swapfromSelectiveDex(
    address from,
    address to,
    uint amount,
    uint deadline,
    address midTok,
    uint minimumReturnAmount,
    bytes calldata _oneInchSwapData
  ) external returns (uint256 _amountOut);

  /**
   * @notice Returns the paused status of the contract.
   */
  function isPaused() external view returns (bool, bool);

  function getProportions() external view returns (uint[] memory, uint[] memory);

  /**
   * @notice Updates the pool data during Active Rebalance.
   * @param data that follows PoolsData format indicates the data of the token being rebalanced in Active Rebalance.
   */
  function updatePoolData(bytes memory data) external;

  function getcSwapCounter() external view returns (uint256);

  function sendProfitOrFeeToManager(
    address wallet,
    uint profitShare,
    address oToken
  ) external;

  function updateDp(
    uint256[] memory _defaultProportion,
    uint256[] memory _uTokensProportion
  ) external;

  function updateuTokAndProp(address[] memory _uTokens) external;

  function _supplyCompV3(address tok, uint amount) external;

  function _supplyAave(address tok, uint amount) external;

  function _withdrawAave(address tok, uint amount) external;

  function _withdrawCompoundV3(address tok, uint amount) external;

  function _supplydForce(address tok, uint amount) external;

  function _withdrawdForce(address tok, uint amount) external;

  function getTVLandRebalContractandType()
    external
    view
    returns (uint256, address, uint256);

  function getInputToken() external view returns (address[] memory, address[] memory);

  function swap(
    address inputToken,
    address uTok,
    uint256 amountAsPerProportion,
    uint _deadline,
    address middleToken,
    uint256 minimumReturnAmount,
    bytes calldata swapData
  ) external returns (uint256);

  function underlyingTokensStaking() external;

  function depositUserNav(address user) external view returns (uint256);

  function setUnstakeData(
    uint256 totalQueuedShares
  ) external  returns (address[] memory, address[] memory, uint256, uint256);

  function isOTokenWhitelisted(address oToken) external view returns (bool);

  function validateWithdraw(address user, address oToken, uint256 _shares) external;

  function updateLockedTokens(
    address user,
    uint256 amount,
    bool lock,
    bool queue,
    bool unqueue,
    uint256 newNAV
  ) external;

  function updateTVL() external;

  function updateInputTokens(address[] memory _nonOverlappingITokens) external;

  function reinitializeHappened(bool status) external;

  function pauseUnpauseDeposit(bool status) external;

  function _supplyDolomite(address tok, uint amount, uint256 marketId) external;

  function _withdrawDolomite(uint256 marketId, uint amount) external;

  function getReinitializeStatus() external view returns (bool vaultReInitialized);

  function _supplyMorpho(address vault, address token, uint256 amount) external;
  function _withdrawMorpho(address token, uint256 amount) external;
}
