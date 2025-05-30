// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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


contract OneInch is Ownable {
    using SafeERC20 for IERC20;
    address public immutable ONEINCH_ROUTER;
    event SwapExecuted(
        address indexed srcToken,
        address indexed dstToken,
        uint256 srcAmount,
        uint256 dstAmount
    );

    constructor(address _router){
        require(_router != address(0), "Invalid router address");
        ONEINCH_ROUTER = _router;
    }

    function swapTokensOneInchV6(
        bytes calldata swapdata,
        address srcToken,
        uint256 srcAmount
    ) external payable returns (uint256 amountOut) {
        require(swapdata.length >= 4, "Invalid swap data length");
        // Transfer tokens first if not ETH
        if (srcToken != address(0)) {
            IERC20(srcToken).safeTransferFrom(msg.sender, address(this), srcAmount);
            // Approve 1inch router
            IERC20(srcToken).safeIncreaseAllowance(ONEINCH_ROUTER, 0); // Reset approval
            IERC20(srcToken).safeIncreaseAllowance(ONEINCH_ROUTER, srcAmount);
        }

        // Forward the call to 1inch router
        (bool success, bytes memory returnData) = ONEINCH_ROUTER.call{value: msg.value}(swapdata);
        require(success, "Swap failed");
        // Decode the return value
        if (returnData.length >= 64) {
            amountOut = abi.decode(returnData, (uint256));
        }
        // Reset approval
        if (srcToken != address(0)) {
            IERC20(srcToken).safeIncreaseAllowance(ONEINCH_ROUTER, 0);
        }
        return amountOut;
    }

    receive() external payable {}
    fallback() external payable {}
}