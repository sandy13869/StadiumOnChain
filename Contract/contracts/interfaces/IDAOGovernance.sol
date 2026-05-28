// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IDAOGovernance {
    function propose(string calldata description) external returns (uint256 proposalId);
    function vote(uint256 proposalId, bool support) external;
    function execute(uint256 proposalId) external;
    function getProposalCount() external view returns (uint256);
}
