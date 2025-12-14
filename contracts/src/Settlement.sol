// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/token/ERC20/IERC20.sol";
import "@openzeppelin/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/access/Ownable.sol";
import "./PaymentVerifier.sol";

/**
 * @title Settlement
 * @dev Handles payment settlement and escrow for x402 protocol
 */
contract Settlement is Ownable {
    using SafeERC20 for IERC20;

    PaymentVerifier public paymentVerifier;

    // Mapping to track settled payments
    mapping(bytes32 => bool) public settledPayments;

    // Escrow balances: client => token => amount
    mapping(address => mapping(address => uint256)) public escrowBalances;

    // Challenge period (in seconds)
    uint256 public challengePeriod = 7 days;

    // Settlement struct
    struct SettlementData {
        address client;
        address provider;
        address token;
        uint256 amount;
        uint256 nonce;
        uint256 timestamp;
        bool disputed;
    }

    mapping(bytes32 => SettlementData) public settlements;

    event PaymentSettled(
        bytes32 indexed settlementId,
        address indexed client,
        address indexed provider,
        address token,
        uint256 amount
    );

    event PaymentDisputed(
        bytes32 indexed settlementId,
        address indexed client
    );

    event EscrowDeposited(
        address indexed client,
        address indexed token,
        uint256 amount
    );

    event EscrowWithdrawn(
        address indexed client,
        address indexed token,
        uint256 amount
    );

    constructor(address _paymentVerifier) Ownable(msg.sender) {
        paymentVerifier = PaymentVerifier(_paymentVerifier);
    }

    /**
     * @dev Settle a payment after verification
     * @param client Address of the client
     * @param provider Address of the service provider
     * @param token Payment token address
     * @param amount Payment amount
     * @param nonce Payment nonce
     * @param deadline Payment deadline
     * @param signature Client's payment authorization signature
     */
    function settlePayment(
        address client,
        address provider,
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bytes32) {
        // Verify the payment authorization
        require(
            paymentVerifier.verifyPayment(client, token, amount, nonce, deadline, signature),
            "Settlement: invalid payment authorization"
        );

        bytes32 settlementId = keccak256(
            abi.encodePacked(client, provider, token, amount, nonce, block.timestamp)
        );

        require(!settledPayments[settlementId], "Settlement: already settled");

        // Check if client has sufficient escrow balance
        require(
            escrowBalances[client][token] >= amount,
            "Settlement: insufficient escrow balance"
        );

        // Transfer from escrow to provider
        escrowBalances[client][token] -= amount;
        IERC20(token).safeTransfer(provider, amount);

        // Record settlement
        settledPayments[settlementId] = true;
        settlements[settlementId] = SettlementData({
            client: client,
            provider: provider,
            token: token,
            amount: amount,
            nonce: nonce,
            timestamp: block.timestamp,
            disputed: false
        });

        emit PaymentSettled(settlementId, client, provider, token, amount);
        return settlementId;
    }

    /**
     * @dev Deposit tokens into escrow
     */
    function depositEscrow(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        escrowBalances[msg.sender][token] += amount;
        emit EscrowDeposited(msg.sender, token, amount);
    }

    /**
     * @dev Withdraw tokens from escrow (with challenge period)
     */
    function withdrawEscrow(address token, uint256 amount) external {
        require(
            escrowBalances[msg.sender][token] >= amount,
            "Settlement: insufficient balance"
        );

        escrowBalances[msg.sender][token] -= amount;
        IERC20(token).safeTransfer(msg.sender, amount);
        emit EscrowWithdrawn(msg.sender, token, amount);
    }

    /**
     * @dev Dispute a settlement (within challenge period)
     */
    function disputeSettlement(bytes32 settlementId) external {
        SettlementData memory settlement = settlements[settlementId];
        require(settlement.client != address(0), "Settlement: invalid settlement");
        require(
            block.timestamp <= settlement.timestamp + challengePeriod,
            "Settlement: challenge period expired"
        );
        require(msg.sender == settlement.client, "Settlement: only client can dispute");
        require(!settlement.disputed, "Settlement: already disputed");

        settlements[settlementId].disputed = true;
        emit PaymentDisputed(settlementId, msg.sender);
    }

    /**
     * @dev Set challenge period (only owner)
     */
    function setChallengePeriod(uint256 _challengePeriod) external onlyOwner {
        challengePeriod = _challengePeriod;
    }
}

