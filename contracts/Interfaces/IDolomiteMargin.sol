// SPDX-License-Identifier: Unlicensed

pragma solidity ^0.8.0;

interface IDepositWithdrawalProxy {
    function depositWei(
        uint256 _toAccountNumber,
        uint256 _marketId,
        uint256 _amountWei
    ) external;

    function withdrawWei(
        uint256 _fromAccountNumber,
        uint256 _marketId,
        uint256 _amountWei,
        uint8 _balanceCheckFlag
    ) external;

    function depositETH(uint256 _toAccountNumber) external payable;
    
    function withdrawETH(
        uint256 _fromAccountNumber,
        uint256 _amountWei,
        uint8 _balanceCheckFlag
    ) external;
}

// Extended IDolomiteMargin interface with new getter functions
interface IDolomiteMargin {
    struct AccountInfo {
        address owner;
        uint256 number;
    }
    
    struct Wei {
        bool sign;
        uint256 value;
    }
    
    struct Par {
        bool sign;
        uint128 value;
    }
    
    struct TotalPar {
        uint128 borrow;
        uint128 supply;
    }
    
    function getAccountWei(AccountInfo calldata account, uint256 marketId) external view returns (Wei memory);
    function getAccountPar(AccountInfo calldata account, uint256 marketId) external view returns (Par memory);
    function getMarketIsClosing(uint256 marketId) external view returns (bool);
    function getMarketTokenAddress(uint256 marketId) external view returns (address);
    function getMarketIdByTokenAddress(address token) external view returns (uint256);
    function getAccountBalances(AccountInfo calldata account) 
        external view returns (
            uint256[] memory,
            address[] memory,
            Par[] memory,
            Wei[] memory
        );
}