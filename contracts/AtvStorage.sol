// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Interfaces/IAFiStorage.sol";
import "./Interfaces/IAFi.sol";
import "./Interfaces/IUniswapV3.sol";
import {ReentrancyGuard} from "./Interfaces/ReentrancyGuard.sol";
import {SafeCast} from "./Interfaces/SafeCast.sol";
import {OwnableDelayModule} from "./Interfaces/OwnableDelayModule.sol";
import "./Libraries/ArrayUtils.sol";
import "./Interfaces/IPassiveRebal.sol";
import "./Interfaces/IAFiFactory.sol";
import "./Interfaces/IDolomiteMargin.sol";
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

// Add this interface
interface IMorphoVault {
  function convertToAssets(uint256 shares) external view returns (uint256);
}

/**
 * @title AtvStorage.
 * @notice Storage conntract for storing investors and teamwallets details and performig the storage changes.
 */
contract AtvStorage is OwnableDelayModule, IAFiStorage, ReentrancyGuard {
  using ArrayUtils for uint[];
  using ArrayUtils for address[];
  using SafeCast for uint256;

  address public aFiManager;
  address public immutable aFiFactory;
  address public immutable uniswapOracleV3;

  uint256 public tempCounter;
  uint256 internal tempMultiplier;
  uint256 internal tempStorage;

  // List of TeamWallets, helpful when fetching team wallets report
  mapping(address => address[]) internal teamWalletsOfAFi;
  // aFiContract => teamWallet => TeamWallet Struct
  mapping(address => mapping(address => TeamWallet)) internal teamWalletInAFi;
  mapping(address => uint) internal totalActiveTeamWallets;
  mapping(address => bool) internal onlyOnce;
  mapping(address => bool) public isAFiActive;
  mapping(address => mapping(address => uint256)) public stablesWithdrawalLimit; // Amount in USD that can be withdrawn in between cumulative swaps
  mapping(address => mapping(address => mapping(uint256 => uint256)))
  public stablesWithdrawn; // Amount in USD that has been withdrawn in between cumulative swaps


  uint256 public maxSwapFee; // We set this parameter in % to calculate max fee that can be deducted in a swap
  uint256 internal redFromContract;
  address internal rebal;
  address internal _afiTemp;
  uint256 internal preDep;
  uint256 public stakingPercentage = 90;

  address private constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
  IDolomiteMargin public immutable dolomiteMargin =
    IDolomiteMargin(0x6Bd780E7fDf01D77e4d475c821f1e7AE05409072);

  //synData
  mapping(address => mapping(address => address)) public aaveTokenCopy; // aaveToken address for various u tokens
  mapping(address => mapping(address => address)) public compoundCometCopy;
  mapping(address => mapping(address => address)) public dForceTokenCopy; // aaveToken address for various u tokens
  mapping(address => mapping(address => uint)) public dolomiteToken;
  // Mapping of token addresses to their corresponding Morpho vault addresses
  mapping(address => mapping(address => address)) public morphoVault;

  mapping(address => mapping(address => uint)) public provider; // Protocol where each u token is invested
  mapping(address => mapping(address => bool)) internal _isStaked;
  mapping(address => mapping(uint256 => mapping(address => uint256)))
    internal preDepositedInputTokens;
  mapping(address => bool) internal isActiveRebalanced;

  event SetActiveRebalancedStatus(address indexed aFiContract, bool status);
  event SetAFiActive(address indexed aFiContract, bool status);
  event ReActivateTeamWallet(address aFiContract, address wallet);
  event DeactivateTeamWallet(address aFiContract, address wallet);
  event SetAFiManager(address indexed afiContract, address manager);
  event ProfitShareDistributed(
    address indexed aFiContract,
    address indexed teamWallet,
    uint256 amount
  );

  constructor(
    address _aFiManager,
    address oracleV3,
    address _passiveRebal,
    address _aFiFactory
  ) {
    validateAddress(_aFiManager, address(0));
    validateAddress(oracleV3, address(0));
    validateAddress(_aFiFactory, address(0));
    aFiManager = _aFiManager;
    uniswapOracleV3 = oracleV3;
    rebal = _passiveRebal;
    aFiFactory = _aFiFactory;
  }

  function validateAddress(address addA, address addB) internal pure {
    require(addA != addB, "AFS01");
  }

  function aFiVaultCaller(address aFiContract, address _owner1) internal view {
    validateFlag(IAFiFactory(aFiFactory).getAFiTokenStatus(aFiContract));
    compareTwoAddress(_owner1, aFiContract);
  }

  /**
  * @notice Returns the maximum amount of underlying tokens that can be withdrawn from Morpho vault
  * @param tok The address of the underlying token
  * @param afiContract The address of the contract holding the Morpho vault shares
  * @return The amount of underlying tokens that can be withdrawn
  */
  function balanceMorpho(address tok, address afiContract) public view returns (uint256) {
    address vaultAddress = morphoVault[afiContract][tok];
    uint256 vaultBalance = IERC20(vaultAddress).balanceOf(afiContract);
    return IMorphoVault(vaultAddress).convertToAssets(vaultBalance);
  }

  /**
   * @notice To add a new team wallet.
   * @param aFiContract Address of the AFi contract.
   * @param wallet Wallet address that has to be added in the `teamWallets` array.
   * @param isActive Boolean indicating whether to set the wallet to either active/inactive.
   * @param isPresent Boolean indicating the present status of the wallet.
   */
  function addTeamWallet(
    address aFiContract,
    address wallet,
    bool isActive,
    bool isPresent
  ) external override nonReentrant {
    validateFlag(isAFiActive[aFiContract]);
    validateCaller(msg.sender, aFiManager);
    validateAddress(wallet, address(0));
    validateGreater(totalActiveTeamWallets[aFiContract], 0);
    if (!teamWalletInAFi[aFiContract][wallet].isPresent && isPresent) {
      teamWalletsOfAFi[aFiContract].push(wallet);
      teamWalletInAFi[aFiContract][wallet].isPresent = isPresent;
      // Write to contract storage
      if (!teamWalletInAFi[aFiContract][wallet].isActive && isActive) {
        teamWalletInAFi[aFiContract][wallet].isActive = isActive;
        totalActiveTeamWallets[aFiContract]++;
      }
      teamWalletInAFi[aFiContract][wallet].walletAddress = wallet;
    }
    emit TeamWalletAdd(wallet, true);
  }

  /**
   * @notice To deactivate a team wallet.
   * @param aFiContract Address of the AFi contract.
   * @param wallet Wallet address that has to be deactivated.
   */
  function deactivateTeamWallet(
    address aFiContract,
    address wallet
  ) external onlyOwner nonReentrant {
    // solhint-disable-next-line reason-string
    validateFlag(isAFiActive[aFiContract]);
    validateFlag(teamWalletInAFi[aFiContract][wallet].isActive);
    totalActiveTeamWallets[aFiContract]--;
    // Write to contract storage
    teamWalletInAFi[aFiContract][wallet].isActive = false;
    emit DeactivateTeamWallet(aFiContract, wallet);
  }

  /**
   * @notice To reactivated a team wallet.
   * @param aFiContract Address of the AFi contract.
   * @param wallet address that has to be reactivated.
   */
  function reActivateTeamWallet(
    address aFiContract,
    address wallet
  ) external onlyOwner nonReentrant {
    // solhint-disable-next-line reason-string
    validateFlag(isAFiActive[aFiContract]);
    validateFlag(teamWalletInAFi[aFiContract][wallet].isPresent);
    validateFlag(!teamWalletInAFi[aFiContract][wallet].isActive);
    totalActiveTeamWallets[aFiContract]++;
    // Write to contract storage
    teamWalletInAFi[aFiContract][wallet].isActive = true;
    emit ReActivateTeamWallet(aFiContract, wallet);
  }

  function getTotalActiveWallets(
    address aFiContract
  ) public view override returns (uint) {
    return totalActiveTeamWallets[aFiContract];
  }

  /**
   * @notice To add given wallet address to the contract storage.
   * @param aFiContract Address of the AFi contract.
   * @param _teamWallets An array of wallet addresses.
   */
  function setTeamWallets(
    address aFiContract,
    address[] memory _teamWallets
  ) external override nonReentrant {
    validateFlag(!onlyOnce[aFiContract]);
    validateCaller(msg.sender, aFiContract);

    validateEqual(totalActiveTeamWallets[aFiContract], 0);
    uint tWalletLength = _teamWallets.length;

    totalActiveTeamWallets[aFiContract] = tWalletLength;
    for (uint i = 0; i < tWalletLength; i++) {
      address wallet = _teamWallets[i];
      TeamWallet memory tWallet = teamWalletInAFi[aFiContract][wallet];

      if (!tWallet.isPresent) {
        teamWalletsOfAFi[aFiContract].push(wallet);
        tWallet.isPresent = true;
        tWallet.isActive = true;
        tWallet.walletAddress = wallet;

        // Write to contract storage
        teamWalletInAFi[aFiContract][wallet] = tWallet;
        emit TeamWalletActive(wallet, true);
      } else {
        //only for duplicacy
        totalActiveTeamWallets[aFiContract]--;
      }
    }
    onlyOnce[aFiContract] = true;
  }

  function validateEqual(uint256 val1, uint256 val2) internal pure {
    require(val1 == val2, "AFS21");
  }

  function setActiveRebalancedStatus(
    address aFiContract,
    bool status
  ) external override {
    aFiVaultCaller(aFiContract, aFiManager);
    isActiveRebalanced[aFiContract] = status;
    emit SetActiveRebalancedStatus(aFiContract, status);
  }

  /**
   * @notice Returns the team wallet details.
   * @param aFiContract Address of the AFi contract.
   * @param _wallet Team wallet address.
   * @return isActive Boolean indicating whether to set the wallet to either active/inactive.
   * @return isPresent Boolean indicating the present status of the wallet.
   */
  function getTeamWalletDetails(
    address aFiContract,
    address _wallet
  ) public view override returns (bool isActive, bool isPresent) {
    return (
      teamWalletInAFi[aFiContract][_wallet].isActive,
      teamWalletInAFi[aFiContract][_wallet].isPresent
    );
  }

  /**
   * @notice Returns the array of team wallet addresses.
   * @param aFiContract Address of the AFi contract.
   * @return _teamWallets Array of teamWallets.
   */
  function getTeamWalletsOfAFi(
    address aFiContract
  ) public view override returns (address[] memory _teamWallets) {
    _teamWallets = teamWalletsOfAFi[aFiContract];
  }

  function isAFiActiveRebalanced(
    address aFiContract
  ) external view override returns (bool _isActiveRebalanced) {
    _isActiveRebalanced = isActiveRebalanced[aFiContract];
  }

  function compareTwoAddress(address add1, address add2) internal view {
    require(msg.sender == add1 || msg.sender == add2, "AFS04");
  }

  /**
   * @notice To set the AFi contract status.
   * @dev Requirements: It can be invoked only by the contract owner.
   * @param aFiContract Address of the AFiContract.
   * @param active status for afiContracts.
   */
  function setAFiActive(address aFiContract, bool active) external override {
    compareTwoAddress(aFiContract, owner());
    // Check if the contract is already active and trying to activate it again
    require(active != isAFiActive[aFiContract], "AFS14");
    isAFiActive[aFiContract] = active;
    emit SetAFiActive(aFiContract, isAFiActive[aFiContract]);
  }

  function afiSync(
    address afiContract,
    address tok,
    address aaveTok,
    address compComet,
    address dForceTok,
    address _morphoVault,
    uint256 dolomiteTok
  ) external override {
    (address controller1, ) = IUniswapOracleV3(uniswapOracleV3).getControllers(afiContract);
    
    require(
      msg.sender == afiContract || msg.sender == controller1,
      "Not authorized"
    );

    if (msg.sender == afiContract) {
      aaveTokenCopy[afiContract][tok] = aaveTok;
      compoundCometCopy[afiContract][tok] = compComet;
      dForceTokenCopy[afiContract][tok] = dForceTok;
      dolomiteToken[afiContract][tok] = dolomiteTok;
      morphoVault[afiContract][tok] = _morphoVault;
    }
   
    else if (msg.sender == controller1) {
      require(getStakedStatus(afiContract, tok) == false, "ATS01");
      morphoVault[afiContract][tok] = _morphoVault;
    }
  }


  /**
   * @notice Returns the balance of Aave tokens in the AFi contract for a specific token.
   * @param tok The address of the token.
   * @param afiContract The address of the AFi contract.
   * @return The Aave token balance.
   */
  function balanceAave(address tok, address afiContract) internal view returns (uint) {
    return balance(aaveTokenCopy[afiContract][tok], afiContract);
  }

  function balancedForce(
    address tok,
    address afiContract
  ) internal view returns (uint) {
    if (dForceTokenCopy[afiContract][tok] != address(0)) {
      uint256 rate = IDForce(dForceTokenCopy[afiContract][tok]).exchangeRateStored();
      return ((rate * balance(dForceTokenCopy[afiContract][tok], afiContract)) /
        10 ** 18);
    } else {
      return 0;
    }
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
   * @notice Returns the balance of compound v3 wrapper tokens in the AFi contract for a specific token.
   * @param tok The address of the token.
   * @param afiContract The address of the AFi contract.
   * @return bal cUSDCv3 token balance.
   */
  function balanceCompV3(
    address tok,
    address afiContract
  ) internal view returns (uint256 bal) {
    if (compoundCometCopy[afiContract][tok] != address(0)) {
      bal = balance(compoundCometCopy[afiContract][tok], afiContract);
    }
  }

  /**
   * @notice To set the AFiManager contract address.
   * @dev Requirements: It can be invoked only by the platform wallet.
   * @param _aFiManager Address of the AFiManager contract.
   */
  function setAFiManager(address _aFiManager) external onlyOwner {
    validateAddress(_aFiManager, address(0));
    aFiManager = _aFiManager;
    emit SetAFiManager(address(this), _aFiManager);
  }

  /**
   * @notice Calculates the total value of a token locked by the AFi contract in USD.
   * @param tok The address of the token.
   * @param afiContract The address of the AFi contract.
   * @return The total value of the token in USD.
   */
  function calcPoolValue(
    address tok,
    address afiContract
  ) public view override returns (uint) {
    (uint256 price, uint256 multiplier) = getPriceInUSD(tok);
    (uint256 bal, uint256 uTokensDecimal) = tvlRead(tok, afiContract);
    if (price != 0) {
      bal = (bal) * (uint(price));
      bal = ((bal * (10 ** uTokensDecimal)) / (10 ** multiplier));
    }
    return bal;
  }

  function tvlRead(
    address tok,
    address afiContract
  ) public view override returns (uint, uint256) {
    uint256 uTokensDecimal = validateAndGetDecimals(tok);
    uint256 bal = balanceOfUnderlyingInPoolsAndContract(tok, afiContract);
    return (bal, uTokensDecimal);
  }

  /**
   * @notice Calculates the balance of underlying tokens in the AFi contract for a specific token.
   * @param tok The address of the token.
   * @param afiContract The address of the AFi contract.
   * @return bal balance of underlying tokens.
   */
  function balanceOfUnderlyingInPoolsAndContract(
    address tok,
    address afiContract
  ) public view returns (uint256 bal) {
    if (
      aaveTokenCopy[afiContract][tok] != address(0) && provider[afiContract][tok] == 1
    ) {
      bal += balanceAave(tok, afiContract);
    }
    if (
      compoundCometCopy[afiContract][tok] != address(0) &&
      provider[afiContract][tok] == 2
    ) {
      bal += balanceCompV3(tok, afiContract);
    }
    if (
      dForceTokenCopy[afiContract][tok] != address(0) && provider[afiContract][tok] == 3
    ) {
      bal += balancedForce(tok, afiContract);
    }
    if (provider[afiContract][tok] == 4) {  
      bal += balanceDolomite(afiContract, dolomiteToken[afiContract][tok]);
    }
    if (
        provider[afiContract][tok] == 5 && morphoVault[afiContract][tok] != address(0)
    ) {
        bal += balanceMorpho(tok, afiContract);
    }
    bal = (bal + (balance(tok, afiContract)));
  }

  // returns the TVL by the external protocols
  function calcPoolValueSomeRead(
    address tok,
    address afiContract,
    uint256 price,
    uint256 multiplier
  ) internal view returns (uint) {
    (uint bal, uint256 uTokensDecimal) = tvlRead(tok, afiContract);
    if (price != 0) {
      bal = (bal - (balance(tok, afiContract))) * (uint(price));
      bal = ((bal * (10 ** uTokensDecimal)) / (10 ** multiplier));
    }
    return bal;
  }

  /**
   * @notice Validates and returns the number of decimals for a given token.
   * @param tok The address of the token.
   * @return The number of decimals.
   */
  function validateAndGetDecimals(address tok) public view override returns (uint256) {
    uint uTokensDecimal = IERC20(tok).decimals();
    validateGreaterEqual(18, uTokensDecimal);
    return (18 - uTokensDecimal);
  }

  /**
   * @notice Validates that two addresses are equal.
   * @param add1 The first address.
   * @param add2 The second address.
   */
  function validateCaller(address add1, address add2) internal pure {
    require(add1 == add2, "AFS27");
  }

  /**
   * @notice Validates a boolean flag.
   * @param flag The boolean flag to validate.
   */
  function validateFlag(bool flag) internal pure {
    require(flag, "AFS28");
  }

  /**
   * @notice Validates that one value is greater than or equal to another.
   * @param val1 The first value.
   * @param val2 The second value.
   */
  function validateGreaterEqual(uint256 val1, uint256 val2) internal pure {
    require(val1 >= val2, "AFS19");
  }

  function validateGreater(uint256 val1, uint256 val2) internal pure {
    require(val1 > val2, "AFS20");
  }

  /**
   * @notice Rearranges the staking of uTokens, withdrawing from existing pools and staking in recommended pools.
   * @param aFiContract The address of the AFi contract.
   */
  // stakingPercentage% uTokens will be staked in the pool, and the rest will remain in the contract.
  function rearrange(
    address aFiContract,
    address[] memory underlyingTokens,
    uint256[] memory newProviders
  ) external override {
    validateEqual(underlyingTokens.length, newProviders.length);
    (, , uint256 productType) = getDataFromVault(aFiContract);
    if (productType == 2) {
      validateCaller(msg.sender, getAFiOracle());

      for (uint i = 0; i < underlyingTokens.length; i++) {
        address uToken = underlyingTokens[i];
        uint256 newProvider = newProviders[i];

        if (newProvider != provider[aFiContract][uToken]) {
          _isStaked[aFiContract][uToken] = false;
          _withdrawAll(aFiContract, uToken);
        }

        uint256 stakeAmount = calculateToStake(balance(uToken, aFiContract));
        if (stakeAmount > 0) {
          if (newProvider == 1 && aaveTokenCopy[aFiContract][uToken] != address(0)) {
            _isStaked[aFiContract][uToken] = true;
            IAFi(aFiContract)._supplyAave(uToken, stakeAmount);
          } else if (
            newProvider == 2 && compoundCometCopy[aFiContract][uToken] != address(0)
          ) {
            _isStaked[aFiContract][uToken] = true;
            IAFi(aFiContract)._supplyCompV3(uToken, stakeAmount);
          } else if (
            newProvider == 3 && dForceTokenCopy[aFiContract][uToken] != address(0)
          ) {
            _isStaked[aFiContract][uToken] = true;
            IAFi(aFiContract)._supplydForce(uToken, stakeAmount);
          } else if (newProvider == 4) {
            _isStaked[aFiContract][uToken] = true;
            IAFi(aFiContract)._supplyDolomite(
              uToken,
              stakeAmount,
              dolomiteToken[aFiContract][uToken]
            );
          } else if (newProvider == 5 && morphoVault[aFiContract][uToken] != address(0)) {        
            _isStaked[aFiContract][uToken] = true;
            IAFi(aFiContract)._supplyMorpho(morphoVault[aFiContract][uToken],uToken, stakeAmount);
          }
        }

        provider[aFiContract][uToken] = newProvider;
      }
    }
  }

  // Function to calculate the staking amount dynamically based on stakingPercentage
  function calculateToStake(uint256 amount) internal view returns (uint256) {
    return (amount * stakingPercentage) / 100;
  }

  // Function to update the staking percentage
  function setStakingPercentage(uint256 newPercentage) external onlyOwner {
    require(newPercentage <= 100, "Invalid percentage");
    stakingPercentage = newPercentage;
  }

  /**
   * @notice Checks the staked status of a uToken.
   * @param aFiContract The address of the AFi contract.
   * @param uToken The address of the uToken.
   * @return Whether the uToken is staked or not.
   */
  function getStakedStatus(
    address aFiContract,
    address uToken
  ) public view override returns (bool) {
    return _isStaked[aFiContract][uToken];
  }

  function calculateShares(
    address afiContract,
    uint256 amount,
    uint256 prevPool,
    uint256 _totalSupply,
    address iToken,
    uint256 currentDepositNAV,
    uint256 prevBalance
  ) external view override returns (uint256 shares, uint256 newDepositNAV) {
    validateAddress(afiContract, address(0));
    validateCaller(msg.sender, afiContract);
    (uint256 price, uint256 dec) = getPriceInUSD(iToken);
    uint256 decimals = validateAndGetDecimals(iToken);
    uint256 amountCheck = (amount * price * (10 ** decimals)) / (10 ** dec);

    if (_totalSupply == 0) {
      shares = amountCheck / 100;
    } else {
      validateGreater(prevPool, 0);
      shares = (amountCheck * _totalSupply) / prevPool;
    }

    if (currentDepositNAV == 0) {
      if (_totalSupply == 0) {
        newDepositNAV = 1000000;
      } else {
        newDepositNAV = (prevPool * 10000) / _totalSupply;
      }
    } else {
      uint256 newNav = (prevPool * 10000) / _totalSupply;
      newDepositNAV =
        ((currentDepositNAV * prevBalance) + (shares * newNav)) /
        (prevBalance + shares);
    }
  }

  function handleRedemption(
    RedemptionParams memory params,
    uint _shares,
    uint swapMethod,
    bytes[] calldata swapData
  ) external override returns (uint256 redemptionFromContract) {
    validateAddress(params.baseContract, address(0));
    aFiVaultCaller(msg.sender, params.baseContract);
    if (swapMethod == 1) {
      preDep = callinputTokenUSD(
        params.baseContract,
        params.cSwapCounter,
        address(this)
      );

      redemptionFromContract = IPassiveRebal(rebal).checkUnderlyingToken(
        params.baseContract,
        params.r,
        params.oToken,
        params.cSwapCounter,
        params.uTokens,
        params.deadline,
        params.minimumReturnAmount
      );
    } else if (swapMethod == 2) {
      redemptionFromContract = withdrawStableTokens(
        params.baseContract,
        params.r,
        params.oToken,
        params.iTokens,
        params.deadline,
        params.minimumReturnAmount,
        swapData
      );
    } else {
      redemptionFromContract = swapForOtherProduct(
        params.baseContract,
        params.r,
        params.oToken,
        params.deadline,
        params.minimumReturnAmount,
        params.uTokens,
        swapData
      );
    }

    uint256 redemptionNAV = (params._pool * 10000) / params.tSupply;
    if (redemptionNAV > params.depositNAV) {
      redemptionFromContract -= _distributeProfitShare(
        params.baseContract,
        _shares,
        params.oToken,
        params.depositNAV,
        redemptionNAV
      );
    }

    return redemptionFromContract;
  }

  /**
   * @notice Swaps tokens in the AFi contract for another product.
   * @param afiContract The address of the AFi contract.
   * @param r A parameter for the swap.
   * @param oToken The address of the output token.
   * @param deadline The deadline for the swap.
   * @return The total amount swapped from the contract.
   */
  function swapForOtherProduct(
    address afiContract,
    uint r,
    address oToken,
    uint deadline,
    uint[] memory minimumReturnAmount,
    address[] memory uToken,
    bytes[] calldata swapData
  ) public override returns (uint256) {
    validateAddress(afiContract, address(0));
    aFiVaultCaller(afiContract, uniswapOracleV3);
    (, rebal, ) = getDataFromVault(afiContract);
    redFromContract = 0;
    _afiTemp = afiContract;
    preDep = callinputTokenUSD(
      afiContract,
      getCSwapCounterFromVault(afiContract),
      address(this)
    );

    tempStorage = deadline;
    checkIfTokenPresent(uToken, r, oToken, afiContract, minimumReturnAmount, swapData);
    swapInternal(uToken, r, oToken, minimumReturnAmount, swapData);
    return redFromContract;
  }

  function callinputTokenUSD(
    address afiContract,
    uint256 csCounter,
    address afiStorage
  ) internal view returns (uint256) {
    return
      IAFiManager(aFiManager).inputTokenUSD(
        IAFi(afiContract),
        csCounter,
        IAFiStorage(afiStorage)
      );
  }

  function getCSwapCounterFromVault(
    address afiContract
  ) internal view returns (uint256) {
    return IAFi(afiContract).getcSwapCounter();
  }

  function calculateRedemptionFromContract(
    address afiContract,
    address tok,
    uint256 r
  )
    public
    view
    override
    returns (
      uint256 price,
      bool stakedStatus,
      uint256 redemptionValueFromContract,
      uint256 multiplier,
      uint256 tvl
    )
  {
    validateAddress(afiContract, address(0));
    (price, multiplier) = getPriceInUSD(tok);
    (tvl, , ) = getDataFromVault(afiContract);
    uint256 tokPreDep = preDepositedInputTokens[afiContract][
      getCSwapCounterFromVault(afiContract)
    ][tok];
    if (price != 0) {
      uint256 uTokensDecimal = validateAndGetDecimals(tok);
      uint256 tokPredepInUSD = (tokPreDep) * (uint(price));
      tokPredepInUSD = ((tokPredepInUSD * (10 ** uTokensDecimal)) / (10 ** multiplier));
      redemptionValueFromContract = (((r) *
        (calcPoolValue(tok, afiContract) - tokPredepInUSD)) * (10 ** multiplier));
      redemptionValueFromContract =
        (redemptionValueFromContract) /
        (((tvl - preDep) * (uint(price)) * (10 ** (validateAndGetDecimals(tok)))));
      tvl -= preDep;
      return (
        price,
        getStakedStatus(afiContract, tok),
        redemptionValueFromContract,
        multiplier,
        tvl
      );
    }
  }

  function getDataFromVault(
    address afiContract
  ) internal view returns (uint256 tvl, address rebalContract, uint256 prodType) {
    (tvl, rebalContract, prodType) = IAFi(afiContract).getTVLandRebalContractandType();
  }

  /**
   * @notice Withdraws funds from pools and performs an internal swap.
   * @param tok The address of the token.
   * @param r A parameter for the withdrawal.
   * @param oToken The address of the output token.
   * @param redemptionFromContract The redemption amount from the contract.
   */
  function withdrawFromPools(
    address tok,
    uint r,
    address oToken,
    uint redemptionFromContract,
    uint256 price,
    uint256 minimumReturnAmount,
    uint256 tvl,
    bytes calldata _swapData
  ) internal {
    address midTok = IPassiveRebal(rebal).getMidToken(tok);
    {
      uint256 redemptionFromPool = calcPoolValueSomeRead(
        tok,
        _afiTemp,
        price,
        tempMultiplier
      );
      redemptionFromPool = redemptionFromPool * (r) * (10 ** tempMultiplier);
      redemptionFromPool =
        (redemptionFromPool) /
        ((tvl) * (uint(price)) * (10 ** validateAndGetDecimals(tok)));
      _withdrawSome(_afiTemp, tok, redemptionFromPool);
    }
    internalSwap(
      _afiTemp,
      tok,
      oToken,
      midTok,
      tempStorage,
      redemptionFromContract,
      minimumReturnAmount,
      _swapData
    );
  }

  function internalSwap(
    address afiContract,
    address tok,
    address oToken,
    address midTok,
    uint deadline,
    uint redeem,
    uint minimumReturnAmount,
    bytes calldata swapData
  ) internal {
    if (tok != oToken) {
      if (balance(tok, afiContract) > 0) {
        redFromContract += doSwapUsingDex(
          afiContract,
          tok,
          oToken,
          redeem,
          deadline,
          midTok,
          minimumReturnAmount,
          swapData
        );
      }
    } else {
      redFromContract = redFromContract + redeem;
    }
  }

  /**
   * @notice Returns pool to invest in, amount to invest and
   * deducted amount if there is a fluctuation or insufficient balance(rare case).
   */
  function _withdrawSome(
    address afiContract,
    address tok,
    uint _amount
  ) internal returns (bool withdrawal) {
    if (
      aaveTokenCopy[afiContract][tok] != address(0) && provider[afiContract][tok] == 1
    ) {
      if (balanceAave(tok, afiContract) >= 1) {
        if (_amount > balanceAave(tok, afiContract)) {
          insufficientRevert();
        } else {
          withdrawFromAave(afiContract, tok, _amount);
        }
      }
      return true;
    }
    if (
      dForceTokenCopy[afiContract][tok] != address(0) && provider[afiContract][tok] == 3
    ) {
      if (balancedForce(tok, afiContract) >= 1) {
        if (_amount > balancedForce(tok, afiContract)) {
          insufficientRevert();
        } else {
          withdrawFromdForce(afiContract, tok, _amount);
        }
      }
      return true;
    }
    if (
      compoundCometCopy[afiContract][tok] != address(0) &&
      provider[afiContract][tok] == 2
    ) {
      if (balanceCompV3(tok, afiContract) >= 1) {
        if (_amount > balanceCompV3(tok, afiContract)) {
          insufficientRevert();
        } else {
          withdrawFromCompoundV3(afiContract, tok, _amount);
        }
      }
      return true;
    }
    if (provider[afiContract][tok] == 4) {
      if (balanceDolomite(afiContract, dolomiteToken[afiContract][tok]) >= 1) {
        if (_amount > balanceDolomite(afiContract, dolomiteToken[afiContract][tok])) {
          insufficientRevert();
        } else {
          withdrawFromDolomite(afiContract, dolomiteToken[afiContract][tok], _amount);
        }
      }
      return true;
    }
    if (
        provider[afiContract][tok] == 5 && morphoVault[afiContract][tok] != address(0)
    ) {
        uint256 poolBal = balanceMorpho(tok, afiContract);
        if (poolBal >= 1) {
            if (_amount > poolBal) {
                revert("Insufficient redemption balance!");
            } else {
              IAFi(afiContract)._withdrawMorpho(morphoVault[afiContract][tok], _amount);
            }
        }
        return true;
    }
  }

  function insufficientRevert() internal pure {
    revert("Insufficient redemption balance!");
  }

  /**
   * @notice Checks if a token is of type USDC and retrieves its price and multiplier.
   * @param tok The address of the token.
   * @return The token's price and multiplier.
   */
  function getPriceInUSD(address tok) public view override returns (uint256, uint256) {
    return (IUniswapOracleV3(uniswapOracleV3).getPriceInUSD(tok));
  }

  /**
   * @notice Checks if a specific token is present, calculates redemption, and withdraws from pools.
   * @param uToken An array of token addresses.
   * @param r A parameter for calculation.
   * @param oToken The address of the output token.
   * @param afiContract The address of the AFi contract.
   */
  function checkIfTokenPresent(
    address[] memory uToken,
    uint r,
    address oToken,
    address afiContract,
    uint[] memory minimumReturnAmount,
    bytes[] calldata swapData
  ) internal {
    uint256 redemptionFromContract;
    bool stakedStatus;
    uint256 price;
    uint256 tvl;
    {
      (uint index, bool present) = ArrayUtils.indexOf(uToken, oToken);
      if (present) {
        (
          price,
          stakedStatus,
          redemptionFromContract,
          tempMultiplier,
          tvl
        ) = calculateRedemptionFromContract(afiContract, uToken[index], r);
        if (!stakedStatus) {
          redFromContract += redemptionFromContract;
        }
        if (stakedStatus) {
          if (price != 0) {
            withdrawFromPools(
              uToken[index],
              r,
              oToken,
              redemptionFromContract,
              price,
              minimumReturnAmount[index],
              tvl,
              swapData[index]
            );
          }
        }
      }
    }
  }

  function swapInternal(
    address[] memory uToken,
    uint r,
    address oToken,
    uint[] memory minimumReturnAmount,
    bytes[] calldata swapData
  ) internal {
    address midTok;
    uint256 price;
    bool stakedStatus;
    uint256 redemptionFromContract;
    uint256 tvl;
    unchecked {
      for (uint n = 0; n < uToken.length; n++) {
        (
          price,
          stakedStatus,
          redemptionFromContract,
          tempMultiplier,
          tvl
        ) = calculateRedemptionFromContract(_afiTemp, uToken[n], r);
        if (!stakedStatus && uToken[n] != oToken) {
          if (balance(uToken[n], _afiTemp) > 0) {
            midTok = IPassiveRebal(rebal).getMidToken(uToken[n]);
            if (redemptionFromContract <= balance(uToken[n], _afiTemp)) {
              redFromContract += doSwapUsingDex(
                _afiTemp,
                uToken[n],
                oToken,
                redemptionFromContract,
                tempStorage,
                midTok,
                minimumReturnAmount[n],
                swapData[n]
              );
            } else {
              redFromContract += doSwapUsingDex(
                _afiTemp,
                uToken[n],
                oToken,
                IERC20(uToken[n]).balanceOf(_afiTemp),
                tempStorage,
                midTok,
                minimumReturnAmount[n],
                swapData[n]
              );
            }
          }
          continue;
        }
        if (stakedStatus && uToken[n] != oToken) {
          if (price != 0) {
            withdrawFromPools(
              uToken[n],
              r,
              oToken,
              redemptionFromContract,
              price,
              minimumReturnAmount[n],
              tvl,
              swapData[n]
            );
          }
        }
      }
    }
  }

 function _withdrawAll(
    address afiContract,
    address tok
  ) public override returns (bool) {
    compareTwoAddress(uniswapOracleV3, aFiManager);

    uint poolBal;
    if (
      provider[afiContract][tok] == 1 && aaveTokenCopy[afiContract][tok] != address(0)
    ) {
      poolBal = balanceAave(tok, afiContract);
      if (poolBal >= 1) {
        withdrawFromAave(afiContract, tok, poolBal);
      }
    }
    if (
      provider[afiContract][tok] == 2 &&
      compoundCometCopy[afiContract][tok] != address(0)
    ) {
      poolBal = balanceCompV3(tok, afiContract);
      if (poolBal >= 1) {
        withdrawFromCompoundV3(afiContract, tok, poolBal);
      }
    }
    if (
      provider[afiContract][tok] == 3 && dForceTokenCopy[afiContract][tok] != address(0)
    ) {
      poolBal = balancedForce(tok, afiContract);
      if (poolBal >= 1) {
        withdrawFromdForce(afiContract, tok, poolBal);
      }
    }
    if (provider[afiContract][tok] == 4) {
      poolBal = balanceDolomite(afiContract, dolomiteToken[afiContract][tok]);
      if (poolBal >= 1) {
        withdrawFromDolomite(
          afiContract,
          dolomiteToken[afiContract][tok],
          poolBal
        );
      }
    }
    if (provider[afiContract][tok] == 5 && morphoVault[afiContract][tok] != address(0)) {
      poolBal = balanceMorpho(tok, afiContract);
      if (poolBal >= 1) {
        IAFi(afiContract)._withdrawMorpho(morphoVault[afiContract][tok], poolBal);
      }
    }
    return true;
  }

  function withdrawFromAave(address afiContract, address tok, uint256 amt) internal {
    IAFi(afiContract)._withdrawAave(tok, amt);
  }

  function withdrawFromdForce(address afiContract, address tok, uint256 amt) internal {
    IAFi(afiContract)._withdrawdForce(tok, amt);
  }

  function withdrawFromDolomite(address afiContract, uint256 id, uint256 amt) internal {
    IAFi(afiContract)._withdrawDolomite(id, amt);
  }

  function withdrawFromCompoundV3(
    address afiContract,
    address tok,
    uint256 amt
  ) internal {
    IAFi(afiContract)._withdrawCompoundV3(tok, amt);
  }

  function getAFiOracle() public view override returns (address) {
    return uniswapOracleV3;
  }

  function convertInUSDAndTok(
    address tok,
    uint256 amt,
    bool usd
  ) public view override returns (uint256) {
    (uint256 price, uint256 decimal) = getPriceInUSD(tok);

    uint iTokenDecimal = validateAndGetDecimals(tok);
    if (!usd) {
      return ((((amt) * (price)) * (10 ** iTokenDecimal)) / (10 ** decimal));
    } else {
      return (amt * (10 ** decimal)) / ((price) * (10 ** iTokenDecimal));
    }
  }

  function setStablesWithdrawalLimit(
    address afiContract,
    address iToken,
    uint256 limit
  ) external onlyOwner {
    validateGreater(limit, 0);
    stablesWithdrawalLimit[afiContract][iToken] = limit;
  }

  function setMaxSwapFee(uint256 fee) external onlyOwner {
    validateGreater(fee, 0);
    validateGreater(10000, fee);
    maxSwapFee = fee; // 100 = 1%
  }

  function setPreDepositedInputToken(
    uint256 _cSwapCounter,
    uint256 _amount,
    address _oToken
  ) external override {
    preDepositedInputTokens[msg.sender][_cSwapCounter][_oToken] += _amount;
  }

  /**
   * @notice sets the pre-swap deposits of a specific stable token and request should come from afimanager.
   * @param aficontract Address of the afi vault.
   * @param _cSwapCounter value of the current cswap counter of the aficontract.
   * @param _amount of oToken.
   * @param _oToken address of oToken.
   */
  function setPreDepositedInputTokenInRebalance(
    address aficontract,
    uint256 _cSwapCounter,
    uint256 _amount,
    address _oToken
  ) external override {
    compareTwoAddress(aFiManager, uniswapOracleV3);
    preDepositedInputTokens[aficontract][_cSwapCounter][_oToken] += _amount;
  }

  function setPreDepositedInputTokenInReInitialize(
    address aficontract,
    uint256 _cSwapCounter,
    uint256 _amount,
    address _oToken
  ) external override {
    validateCaller(msg.sender, aFiManager);
    preDepositedInputTokens[aficontract][_cSwapCounter][_oToken] -= _amount;
  }

  function deletePreDepositedInputToken(
    address aFiContract,
    address oToken,
    uint256 currentCounter
  ) external override {
    validateCaller(msg.sender, aFiManager);
    delete preDepositedInputTokens[aFiContract][currentCounter][oToken];
  }

  struct SwapContext {
    uint256 _cSwapCounter;
    uint256 temp1;
    uint256 amountOut;
  }

  /**
   * @notice Checks the iToken and performs necessary deductions.
   * @dev This external function checks the iToken and performs deductions based on specified conditions.
   * @param r The redemption amount to be deducted.
   * @param oToken The address of the output token.
   * @param deadline The deadline for the transaction.
   * @return redemptionBalance The amount to be deducted.
   */
  function withdrawStableTokens(
    address afiContract,
    uint r,
    address oToken,
    address[] memory token,
    uint256 deadline,
    uint256[] memory minimumReturnAmount,
    bytes[] calldata swapData
  ) public override returns (uint256 redemptionBalance) {
    aFiVaultCaller(afiContract, uniswapOracleV3);
    tempCounter = IAFi(afiContract).getcSwapCounter();
    redemptionBalance = preDepositedInputTokens[afiContract][tempCounter][oToken];
    uint temp = convertInUSDAndTok(oToken, redemptionBalance, false);

    uint256 totalUSDCovered = temp;

    if (temp >= r) {
      redemptionBalance = convertInUSDAndTok(oToken, r, true);
      preDepositedInputTokens[afiContract][tempCounter][oToken] -= redemptionBalance;
    } else {
      delete preDepositedInputTokens[afiContract][tempCounter][oToken];
      temp = r - temp;
      uint temp1;
      uint256 preDepositedStableValue;
      for (uint i; i < token.length; i++) {
        preDepositedStableValue = preDepositedInputTokens[afiContract][tempCounter][
          token[i]
        ];
        if (preDepositedStableValue > 0 && token[i] != oToken) {
          totalUSDCovered += convertInUSDAndTok(token[i], preDepositedStableValue, false);
          temp1 = convertInUSDAndTok(token[i], temp, true);
          if (temp1 > preDepositedStableValue) {
            redemptionBalance += IAFi(afiContract).swapfromSelectiveDex(
              token[i],
              oToken,
              preDepositedStableValue,
              deadline,
              WETH,
              minimumReturnAmount[i],
              swapData[i]
            );
            temp -= convertInUSDAndTok(token[i], preDepositedStableValue, false);
            delete preDepositedInputTokens[afiContract][tempCounter][token[i]];
          } else {
            (redemptionBalance, temp) = handleSmallSwap(
              afiContract,
              token[i],
              oToken,
              tempCounter,
              temp1,
              deadline,
              minimumReturnAmount[i],
              swapData[i],
              redemptionBalance
            );

            break;
          }
        }
      }
    }

    uint256 tempInUSD = convertInUSDAndTok(oToken, redemptionBalance, false);
    require(totalUSDCovered >= r, "AFS10");

    if (msg.sender == afiContract) {
      if (
        (stablesWithdrawn[msg.sender][oToken][tempCounter] + tempInUSD) >
        stablesWithdrawalLimit[msg.sender][oToken]
      ) {
        revert("Insufficient balance!!");
      } else {
        stablesWithdrawn[msg.sender][oToken][tempCounter] += tempInUSD;
      }
    }
  }

  function handleSmallSwap(
    address afiContract,
    address tokenIn,
    address tokenOut,
    uint256 _cSwapCounter,
    uint256 temp1,
    uint256 deadline,
    uint256 minimumReturnAmount,
    bytes calldata swapData,
    uint256 currentBalance
  ) private returns (uint256, uint256) {
    uint256 returnAmount;
    (returnAmount) = callSwap(
      afiContract,
      tokenIn,
      tokenOut,
      temp1,
      deadline,
      minimumReturnAmount,
      swapData
    );
    currentBalance += returnAmount;
    preDepositedInputTokens[afiContract][_cSwapCounter][tokenIn] -= temp1;
    return (currentBalance, 0); // 0 replaces the deleted temp
  }

  /**
   * @notice Returns the pre-swap deposits of a specific stable token.
   * @param stableToken Address of the stable token.
   * @return The amount of pre-swap deposits for the specified stable token.
   */
  function getPreSwapDepositsTokens(
    address aFiContract,
    uint256 _cSwapCounter,
    address stableToken
  ) external view override returns (uint256) {
    return preDepositedInputTokens[aFiContract][_cSwapCounter][stableToken];
  }

  /**
   * @notice Distributes the profit share amongst team wallets.
   * @dev Only a specific address can call this function.
   * @param aFiContract Address of the aFi contract.
   * @param share The profit amount that is distributed amongst team wallets.
   * @param oToken Output token.
   * @param depositNAV NAV (Net Asset Value) at the time of deposit.
   * @param redemptionNAV NAV at the time of redemption.
   * @return totalProfitShare Returns the total profit share that was distributed amongst the team wallets.
   */
  function _distributeProfitShare(
    address aFiContract,
    uint share,
    address oToken,
    uint256 depositNAV,
    uint256 redemptionNAV
  ) internal returns (uint totalProfitShare) {
    validateCaller(msg.sender, aFiContract);
    uint256 profitShare;
    (uint256 price, uint256 multiplier) = getPriceInUSD(oToken);
    if (price != 0) {
      profitShare =
        ((redemptionNAV - (depositNAV)) * (share) * (10 ** multiplier)) /
        (((uint(price)) * (10 ** (validateAndGetDecimals(oToken)))) * (10000));
      totalProfitShare = profitDistribution(aFiContract, profitShare, oToken);
    }
  }

  function profitDistribution(
    address aFiContract,
    uint256 profitShare,
    address oToken
  ) internal returns (uint totalProfitShare) {
    // Investor has made a profit, let us distribute the profit share amongst team wallet
    address[] memory _teamWallets = getTeamWalletsOfAFi(aFiContract);
    uint256 teamProfitShare;
    uint256 totalProfit = IUniswapOracleV3(uniswapOracleV3).getTotalProfit();
    uint256 daoProfit = IUniswapOracleV3(uniswapOracleV3).getDaoProfit();
    // Alpha Creator gets 4% of gain

    uint totalActive = getTotalActiveWallets(aFiContract);
    if (totalActive > 1) {
      teamProfitShare =
        (profitShare * (totalProfit - daoProfit)) /
        ((totalActive - 1) * (100));
    }

    for (uint i = 0; i < _teamWallets.length; i++) {
      (bool isActive, ) = getTeamWalletDetails(aFiContract, _teamWallets[i]);

      if (isActive) {
        if (i == 0) {
          // /**
          //   Always at i==0 address must be of Aarna Dao
          //   Aarna DAO gets 6% of gain
          // */
          uint256 daoProfitShare = (profitShare * (daoProfit)) / (100);
          profitShare = daoProfitShare;
        } else {
          profitShare = teamProfitShare;
        }

        totalProfitShare = totalProfitShare + profitShare;

        IAFi(aFiContract).sendProfitOrFeeToManager(
          _teamWallets[i],
          profitShare,
          oToken
        );

        emit ProfitShareDistributed(aFiContract, _teamWallets[i], profitShare);
      }
    }
  }

  /**
   * @notice Calculates the total value of all tokens locked by the AFi contract in USD.
   * @param afiContract The address of the AFi contract.
   * @return The total value of all tokens in USD.
   */
  function calculatePoolInUsd(
    address afiContract
  ) external view override returns (uint) {
    uint bal = 0;
    address[] memory uToken = IAFi(afiContract).getUTokens();
    (, address[] memory iToken) = IAFi(afiContract).getInputToken();
    uint uLen = uToken.length > iToken.length ? uToken.length : iToken.length;
    uint256 cSwapCounter = getCSwapCounterFromVault(afiContract);
    uint256 preDepositStableBalance;
    for (uint i = 0; i < uLen; i++) {
      if (uLen == iToken.length) {
        if (i < uToken.length) {
          bal = bal + (calcPoolValue(uToken[i], afiContract));
        }
        preDepositStableBalance = convertInUSDAndTok(
          iToken[i],
          preDepositedInputTokens[afiContract][cSwapCounter][iToken[i]],
          false
        );
        bal = bal + (preDepositStableBalance);
      } else {
        if (i < iToken.length) {
          preDepositStableBalance = convertInUSDAndTok(
            iToken[i],
            preDepositedInputTokens[afiContract][cSwapCounter][iToken[i]],
            false
          );
          bal = bal + (preDepositStableBalance);
        }

        bal = bal + (calcPoolValue(uToken[i], afiContract));
      }
    }
    return bal;
  }

  function callSwap(
    address aficontract,
    address from,
    address to,
    uint amount,
    uint deadline,
    uint minimumReturnAmount,
    bytes calldata swapDdata
  ) internal returns (uint256) {
    uint256 _amountOut;
    (_amountOut) = IAFi(aficontract).swapfromSelectiveDex(
      from,
      to,
      amount,
      deadline,
      WETH,
      minimumReturnAmount,
      swapDdata
    );
    return _amountOut;
  }

  function doSwapUsingDex(
    address aFiContract,
    address tok,
    address oToken,
    uint256 amount,
    uint256 deadline,
    address midTok,
    uint256 _minimumReturnAmount,
    bytes calldata swapDdata
  ) internal returns (uint256 returnAmount) {
    (returnAmount) = IAFi(aFiContract).swapfromSelectiveDex(
      tok,
      oToken,
      amount,
      deadline,
      midTok,
      _minimumReturnAmount,
      swapDdata
    );
  }

  function doSwapForThewhiteListRemoval(
    address tok,
    uint256 _cSwapCounter,
    address swapToken,
    uint256 deadline,
    uint256 minAmountOut,
    bytes calldata swapData
  ) external override {
    uint256 redemptionBalance = preDepositedInputTokens[msg.sender][_cSwapCounter][tok];
    address[] memory uTokens = IAFi(msg.sender).getUTokens();
    (, bool isPresent) = uTokens.indexOf(tok);
    uint256 balToConsider = IERC20(swapToken).balanceOf(msg.sender);
    uint256 totalBalanceInputToken = IERC20(tok).balanceOf(msg.sender);
    if (totalBalanceInputToken > redemptionBalance && !isPresent) {
      redemptionBalance = totalBalanceInputToken;
    }
    callSwap(
      msg.sender,
      tok,
      swapToken,
      redemptionBalance,
      deadline,
      minAmountOut,
      swapData
    );
    balToConsider = balance(swapToken, msg.sender) - balToConsider;
    delete preDepositedInputTokens[msg.sender][_cSwapCounter][tok];
    preDepositedInputTokens[msg.sender][_cSwapCounter][swapToken] += balToConsider;
  }

  function balanceDolomite(
    address user,
    uint256 marketId
  ) public view returns (uint256) {
    IDolomiteMargin.AccountInfo memory account = IDolomiteMargin.AccountInfo({
      owner: user,
      number: 0
    });

    IDolomiteMargin.Wei memory balances = dolomiteMargin.getAccountWei(
      account,
      marketId
    );
    return balances.value;
  }
}
