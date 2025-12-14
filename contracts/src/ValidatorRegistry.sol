// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/token/ERC20/IERC20.sol";
import "@openzeppelin/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/access/Ownable.sol";

/**
 * @title ValidatorRegistry
 * @dev Manages validator staking, rewards, and slashing for x402 network
 */
contract ValidatorRegistry is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public nodeToken; // $NODE token for staking

    struct Validator {
        address validatorAddress;
        uint256 stakedAmount;
        uint256 totalRewards;
        uint256 totalPenalties;
        uint256 uptimeScore; // 0-10000 (100.00%)
        uint256 latencyScore; // Average latency in ms
        uint256 verifiedRequests;
        bool active;
        uint256 activationTime;
    }

    mapping(address => Validator) public validators;
    address[] public validatorList;

    // Staking requirements
    uint256 public minStakeAmount = 10000 * 10**18; // 10,000 NODE tokens
    uint256 public slashableRisk = 1000 * 10**18; // 1,000 NODE tokens

    // Uptime thresholds
    uint256 public minUptime = 9700; // 97% (9700/10000)
    uint256 public targetUptime = 9950; // 99.5% (9950/10000)

    // Reward parameters
    uint256 public baseRewardPerRequest = 1 * 10**18; // 1 NODE per request
    uint256 public uptimeMultiplier = 150; // 1.5x for target uptime
    uint256 public latencyBonusThreshold = 100; // ms

    event ValidatorRegistered(address indexed validator, uint256 stakedAmount);
    event ValidatorActivated(address indexed validator);
    event ValidatorDeactivated(address indexed validator);
    event RewardsDistributed(address indexed validator, uint256 amount);
    event PenaltyApplied(address indexed validator, uint256 amount, string reason);
    event StakeIncreased(address indexed validator, uint256 amount);
    event StakeWithdrawn(address indexed validator, uint256 amount);

    constructor(address _nodeToken) Ownable(msg.sender) {
        nodeToken = IERC20(_nodeToken);
    }

    /**
     * @dev Register as a validator by staking NODE tokens
     */
    function registerValidator(uint256 stakeAmount) external {
        require(stakeAmount >= minStakeAmount, "ValidatorRegistry: insufficient stake");
        require(!validators[msg.sender].active, "ValidatorRegistry: already registered");

        nodeToken.safeTransferFrom(msg.sender, address(this), stakeAmount);

        validators[msg.sender] = Validator({
            validatorAddress: msg.sender,
            stakedAmount: stakeAmount,
            totalRewards: 0,
            totalPenalties: 0,
            uptimeScore: 10000, // Start at 100%
            latencyScore: 0,
            verifiedRequests: 0,
            active: true,
            activationTime: block.timestamp
        });

        validatorList.push(msg.sender);
        emit ValidatorRegistered(msg.sender, stakeAmount);
        emit ValidatorActivated(msg.sender);
    }

    /**
     * @dev Record a verified request and distribute rewards
     */
    function recordVerification(
        address validator,
        uint256 latency
    ) external onlyOwner returns (uint256) {
        require(validators[validator].active, "ValidatorRegistry: inactive validator");

        Validator storage v = validators[validator];
        v.verifiedRequests++;

        // Calculate reward
        uint256 reward = baseRewardPerRequest;

        // Uptime bonus
        if (v.uptimeScore >= targetUptime) {
            reward = (reward * uptimeMultiplier) / 100;
        }

        // Latency bonus
        if (latency <= latencyBonusThreshold) {
            reward = (reward * 110) / 100; // 10% bonus
        }

        // Update latency score (moving average)
        if (v.latencyScore == 0) {
            v.latencyScore = latency;
        } else {
            v.latencyScore = (v.latencyScore * 9 + latency) / 10;
        }

        // Distribute reward
        v.totalRewards += reward;
        nodeToken.safeTransfer(validator, reward);

        emit RewardsDistributed(validator, reward);
        return reward;
    }

    /**
     * @dev Update validator uptime score
     */
    function updateUptime(address validator, uint256 uptime) external onlyOwner {
        require(validators[validator].active, "ValidatorRegistry: inactive validator");

        Validator storage v = validators[validator];
        v.uptimeScore = uptime;

        // Apply slashing if uptime is below minimum
        if (uptime < minUptime) {
            uint256 penalty = slashableRisk;
            if (v.stakedAmount >= penalty) {
                v.stakedAmount -= penalty;
                v.totalPenalties += penalty;
                // Burn or send to treasury
                nodeToken.safeTransfer(owner(), penalty);
                emit PenaltyApplied(validator, penalty, "Low uptime");
            }

            // Deactivate if stake is too low
            if (v.stakedAmount < minStakeAmount) {
                v.active = false;
                emit ValidatorDeactivated(validator);
            }
        }
    }

    /**
     * @dev Increase stake
     */
    function increaseStake(uint256 amount) external {
        require(validators[msg.sender].active, "ValidatorRegistry: not a validator");

        nodeToken.safeTransferFrom(msg.sender, address(this), amount);
        validators[msg.sender].stakedAmount += amount;
        emit StakeIncreased(msg.sender, amount);
    }

    /**
     * @dev Withdraw stake (only if validator is deactivated)
     */
    function withdrawStake(uint256 amount) external {
        Validator storage v = validators[msg.sender];
        require(!v.active || v.stakedAmount - amount >= minStakeAmount, "ValidatorRegistry: insufficient remaining stake");

        require(v.stakedAmount >= amount, "ValidatorRegistry: insufficient stake");
        v.stakedAmount -= amount;
        nodeToken.safeTransfer(msg.sender, amount);
        emit StakeWithdrawn(msg.sender, amount);
    }

    /**
     * @dev Get validator count
     */
    function getValidatorCount() external view returns (uint256) {
        return validatorList.length;
    }

    /**
     * @dev Get active validator count
     */
    function getActiveValidatorCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validators[validatorList[i]].active) {
                count++;
            }
        }
        return count;
    }

    /**
     * @dev Set minimum stake amount (only owner)
     */
    function setMinStakeAmount(uint256 _minStakeAmount) external onlyOwner {
        minStakeAmount = _minStakeAmount;
    }

    /**
     * @dev Set reward parameters (only owner)
     */
    function setRewardParameters(
        uint256 _baseRewardPerRequest,
        uint256 _uptimeMultiplier,
        uint256 _latencyBonusThreshold
    ) external onlyOwner {
        baseRewardPerRequest = _baseRewardPerRequest;
        uptimeMultiplier = _uptimeMultiplier;
        latencyBonusThreshold = _latencyBonusThreshold;
    }
}

