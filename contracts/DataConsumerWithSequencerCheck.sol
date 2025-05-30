// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {OwnableDelayModule} from "./Interfaces/OwnableDelayModule.sol";

interface AggregatorInterface {
    function latestAnswer() external view returns (int256);
    function latestTimestamp() external view returns (uint256);
    function latestRound() external view returns (uint256);
    function getAnswer(uint256 roundId) external view returns (int256);
    function getTimestamp(uint256 roundId) external view returns (uint256);

    event AnswerUpdated(int256 indexed current, uint256 indexed roundId, uint256 updatedAt);
    event NewRound(uint256 indexed roundId, address indexed startedBy, uint256 startedAt);
}

interface AggregatorV3Interface {

    struct Phase {
        uint16 id;
        AggregatorV2V3Interface aggregator;
    }

    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    /**
     * @notice returns the current phase's aggregator address.
     */
    function aggregator() external view returns (address);

    function minAnswer() external view returns(uint);

    function maxAnswer() external view returns(uint);
}

interface AggregatorV2V3Interface is AggregatorInterface, AggregatorV3Interface
{
}

interface IDataConsumerWithSequencerCheck {
    function getPrice(address dataFeed) external view returns (int);
}


contract DataConsumerWithSequencerCheck is OwnableDelayModule {
    AggregatorV2V3Interface public sequencerUptimeFeed;

    uint256 public gracePeriod = 3600;

    /**
     * Network: Arbitrum mainnet
     * Uptime Feed address: 0xFdB631F5EE196F0ed6FAa767959853A9F217697D
     * For a list of available Sequencer Uptime Feed proxy addresses, see:
     * https://docs.chain.link/docs/data-feeds/l2-sequencer-feeds
     */
    constructor() {
        sequencerUptimeFeed = AggregatorV2V3Interface(
            0xFdB631F5EE196F0ed6FAa767959853A9F217697D
        );
    }

    function updateSequencerUptimeFeed(address feed) external onlyOwner {
        require(feed != address(0), "Invalid address");

        sequencerUptimeFeed = AggregatorV2V3Interface(feed);
    }

    function updateGracePeriod(uint256 period) external onlyOwner {
        require(period > 0, "Value should be greater than 0");

        gracePeriod = period;
    }

    modifier isValid() {
        // prettier-ignore
        (
            /*uint80 roundID*/,
            int256 answer,
            uint256 startedAt,
            /*uint256 updatedAt*/,
            /*uint80 answeredInRound*/
        ) = sequencerUptimeFeed.latestRoundData();

        // Answer == 0: Sequencer is up
        // Answer == 1: Sequencer is down
        bool isSequencerUp = answer == 0;
        if (!isSequencerUp) {
            revert("Sequencer is down");
        }

        // Make sure the grace period has passed after the
        // sequencer is back up.
        uint256 timeSinceUp = block.timestamp - startedAt;
        if (timeSinceUp <= gracePeriod) {
            revert("Grace period not over");
        }
        _;
    }

    // Check the sequencer status and return the latest data
    function getPrice(address dataFeed) public isValid() view returns (int data) {
        // prettier-ignore
        (
            /*uint80 roundID*/,
            data,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = AggregatorV2V3Interface(dataFeed).latestRoundData();
    }
}
