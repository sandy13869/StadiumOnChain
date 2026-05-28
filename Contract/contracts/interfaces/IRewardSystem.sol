// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IRewardSystem {
    function distributeReward(address user, uint256 eventId, uint256 amount) external;
    function getRewardBalance(address user) external view returns (uint256);
    function claimReward(address user, uint256 amount) external;
}
