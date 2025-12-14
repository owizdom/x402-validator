// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/utils/cryptography/ECDSA.sol";
import "@openzeppelin/utils/cryptography/EIP712.sol";

/**
 * @title PaymentVerifier
 * @dev Verifies EIP-712 signed payment authorizations for x402 protocol
 */
contract PaymentVerifier is EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant PAYMENT_AUTHORIZATION_TYPEHASH = keccak256(
        "PaymentAuthorization(address client,address token,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    // Mapping to track used nonces
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    // Mapping to track authorized balances per client-token pair
    mapping(address => mapping(address => uint256)) public authorizedBalances;

    event PaymentAuthorized(
        address indexed client,
        address indexed token,
        uint256 amount,
        uint256 nonce
    );

    event PaymentVerified(
        address indexed client,
        address indexed token,
        uint256 amount,
        uint256 nonce
    );

    constructor() EIP712("x402-PaymentVerifier", "1") {}

    /**
     * @dev Verifies a payment authorization signature
     * @param client Address of the client making the payment
     * @param token Address of the payment token (e.g., USDC)
     * @param amount Amount to be paid
     * @param nonce Unique nonce to prevent replay attacks
     * @param deadline Expiration timestamp
     * @param signature EIP-712 signature from the client
     */
    function verifyPayment(
        address client,
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external returns (bool) {
        require(block.timestamp <= deadline, "PaymentVerifier: signature expired");
        require(!usedNonces[client][nonce], "PaymentVerifier: nonce already used");

        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_AUTHORIZATION_TYPEHASH,
                client,
                token,
                amount,
                nonce,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);

        require(signer == client, "PaymentVerifier: invalid signature");

        usedNonces[client][nonce] = true;
        authorizedBalances[client][token] += amount;

        emit PaymentVerified(client, token, amount, nonce);
        return true;
    }

    /**
     * @dev Checks if a payment authorization is valid
     */
    function isValidPayment(
        address client,
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external view returns (bool) {
        if (block.timestamp > deadline) return false;
        if (usedNonces[client][nonce]) return false;

        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_AUTHORIZATION_TYPEHASH,
                client,
                token,
                amount,
                nonce,
                deadline
            )
        );

        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);

        return signer == client;
    }

    /**
     * @dev Get authorized balance for a client-token pair
     */
    function getAuthorizedBalance(address client, address token) external view returns (uint256) {
        return authorizedBalances[client][token];
    }
}

