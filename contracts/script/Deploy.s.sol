// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {PaymentVerifier} from "../src/PaymentVerifier.sol";
import {Settlement} from "../src/Settlement.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {ValidatorRegistry} from "../src/ValidatorRegistry.sol";
import {Governance} from "../src/Governance.sol";

contract DeployScript is Script {
    function run() external {
        // Try to get private key from env, or use default anvil key for testing
        uint256 deployerPrivateKey;
        try vm.envUint("PRIVATE_KEY") returns (uint256 key) {
            deployerPrivateKey = key;
        } catch {
            // Default Anvil account #0 private key for local testing
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        }
        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying x402 Validator contracts...");

        // Deploy PaymentVerifier
        console.log("\n1. Deploying PaymentVerifier...");
        PaymentVerifier paymentVerifier = new PaymentVerifier();
        console.log("PaymentVerifier deployed to:", address(paymentVerifier));

        // Deploy Settlement
        console.log("\n2. Deploying Settlement...");
        Settlement settlement = new Settlement(address(paymentVerifier));
        console.log("Settlement deployed to:", address(settlement));

        // Deploy Mock NODE Token
        console.log("\n3. Deploying Mock NODE Token...");
        MockERC20 nodeToken = new MockERC20("NODE Token", "NODE", 18);
        console.log("NODE Token deployed to:", address(nodeToken));

        // Deploy ValidatorRegistry
        console.log("\n4. Deploying ValidatorRegistry...");
        ValidatorRegistry validatorRegistry = new ValidatorRegistry(address(nodeToken));
        console.log("ValidatorRegistry deployed to:", address(validatorRegistry));

        // Deploy Governance
        console.log("\n5. Deploying Governance...");
        Governance governance = new Governance(address(validatorRegistry));
        console.log("Governance deployed to:", address(governance));

        console.log("\n=== Deployment Summary ===");
        console.log("PaymentVerifier:", address(paymentVerifier));
        console.log("Settlement:", address(settlement));
        console.log("NODE Token:", address(nodeToken));
        console.log("ValidatorRegistry:", address(validatorRegistry));
        console.log("Governance:", address(governance));

        vm.stopBroadcast();
    }
}

