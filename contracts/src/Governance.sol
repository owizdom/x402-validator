// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/access/Ownable.sol";
import "./ValidatorRegistry.sol";

/**
 * @title Governance
 * @dev Allows validators to vote on network parameters
 */
contract Governance is Ownable {
    ValidatorRegistry public validatorRegistry;

    struct Proposal {
        uint256 id;
        string description;
        address proposer;
        uint256 votingDeadline;
        bool executed;
        mapping(address => bool) hasVoted;
        uint256 yesVotes;
        uint256 noVotes;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;

    uint256 public votingPeriod = 7 days;
    uint256 public quorumThreshold = 50; // 50% of active validators

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId);

    constructor(address _validatorRegistry) Ownable(msg.sender) {
        validatorRegistry = ValidatorRegistry(_validatorRegistry);
    }

    /**
     * @dev Create a governance proposal
     */
    function createProposal(string memory description) external returns (uint256) {
        (,,,,,,,bool active,) = validatorRegistry.validators(msg.sender);
        require(
            active,
            "Governance: only active validators can propose"
        );

        proposalCount++;
        Proposal storage proposal = proposals[proposalCount];
        proposal.id = proposalCount;
        proposal.description = description;
        proposal.proposer = msg.sender;
        proposal.votingDeadline = block.timestamp + votingPeriod;
        proposal.executed = false;

        emit ProposalCreated(proposalCount, msg.sender, description);
        return proposalCount;
    }

    /**
     * @dev Vote on a proposal
     */
    function vote(uint256 proposalId, bool support) external {
        (,,,,,,,bool active,) = validatorRegistry.validators(msg.sender);
        require(
            active,
            "Governance: only active validators can vote"
        );

        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp <= proposal.votingDeadline, "Governance: voting period ended");
        require(!proposal.hasVoted[msg.sender], "Governance: already voted");
        require(!proposal.executed, "Governance: proposal already executed");

        proposal.hasVoted[msg.sender] = true;
        if (support) {
            proposal.yesVotes++;
        } else {
            proposal.noVotes++;
        }

        emit VoteCast(proposalId, msg.sender, support);
    }

    /**
     * @dev Execute a proposal if it meets quorum and has majority support
     */
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.votingDeadline, "Governance: voting still active");
        require(!proposal.executed, "Governance: already executed");

        uint256 activeValidators = validatorRegistry.getActiveValidatorCount();
        uint256 totalVotes = proposal.yesVotes + proposal.noVotes;
        uint256 quorum = (activeValidators * quorumThreshold) / 100;

        require(totalVotes >= quorum, "Governance: quorum not met");
        require(proposal.yesVotes > proposal.noVotes, "Governance: proposal rejected");

        proposal.executed = true;
        emit ProposalExecuted(proposalId);

        // In a real implementation, this would call specific functions based on proposal type
        // For now, this is a placeholder
    }

    /**
     * @dev Set voting period (only owner)
     */
    function setVotingPeriod(uint256 _votingPeriod) external onlyOwner {
        votingPeriod = _votingPeriod;
    }

    /**
     * @dev Set quorum threshold (only owner)
     */
    function setQuorumThreshold(uint256 _quorumThreshold) external onlyOwner {
        quorumThreshold = _quorumThreshold;
    }
}

