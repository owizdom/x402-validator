# Decentralized x402 Validator on Ethereum

A complete implementation of a decentralized x402 validator that verifies and settles HTTP 402 payment transactions on Ethereum.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Terminal Commands](#terminal-commands)
- [Testing](#testing)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

## Overview

This project implements a decentralized validator for the x402 protocol, which enables APIs to require cryptocurrency payments before serving responses. The validator verifies payment proofs, records settlements, and broadcasts attestations.

## Architecture

- **Smart Contracts**: Ethereum contracts for payment verification, settlement, and validator staking
- **Facilitator Service**: Core validator node that processes x402 payment requests
- **Frontend UI**: Web-based terminal interface for deployment and testing
- **Test Suite**: End-to-end testing for the complete system

## Components

### 1. Smart Contracts (`contracts/`)

- `PaymentVerifier.sol`: Verifies EIP-712 payment authorizations
- `Settlement.sol`: Handles payment settlement and escrow
- `ValidatorRegistry.sol`: Manages validator staking and rewards
- `Governance.sol`: Network parameter governance
- `MockERC20.sol`: Test token for local development

### 2. Facilitator Service (`facilitator/`)

- HTTP server that processes x402 payment requests
- Verifies cryptographic proofs
- Records settlements on-chain
- Broadcasts attestations
- Terminal command execution API

### 3. Frontend UI (`frontend/`)

- Web-based terminal emulator
- Interactive command interface
- Short custom commands for deployment
- Real-time command execution
- Receipt-style test results display

## Prerequisites

- **Node.js** 18+ 
- **Foundry** (for smart contracts)
- **Anvil** (local blockchain, included with Foundry)

### Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Quick Start

### Step 1: Install Dependencies

```bash
# Install root dependencies (for testing)
npm install

# Install facilitator dependencies
cd facilitator
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Start Local Blockchain (Anvil)

Open a terminal and run:

```bash
cd contracts
anvil
```

Keep this terminal running. Anvil will start on `http://localhost:8545` with 10 pre-funded accounts.

### Step 3: Deploy Contracts

**Option A: Using Terminal UI**

1. Start the facilitator:
   ```bash
   cd facilitator
   npm start
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser

4. In the terminal UI, type:
   ```bash
   deploy
   ```

**Option B: Using Command Line**

```bash
cd contracts
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://localhost:8545 \
  --broadcast
```

You should see output with deployed contract addresses.

### Step 4: Configure Facilitator

Create `facilitator/.env` file with the deployed contract addresses:

```env
ETH_RPC_URL=http://localhost:8545
PAYMENT_VERIFIER_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
SETTLEMENT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
VALIDATOR_REGISTRY_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
VALIDATOR_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Step 5: Start Facilitator

```bash
cd facilitator
npm start
```

The facilitator will run on `http://localhost:3000`.

### Step 6: Start Frontend (Optional)

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

## Terminal Commands

The terminal UI supports the following custom commands:

- `deploy` - Deploy contracts to Anvil (fresh deployment)
- `deploy --key <private_key>` - Deploy with custom private key
- `build` - Build contracts
- `test` - Run validator tests (shows receipt-style results)
- `anvil` - Check Anvil status
- `status` - Check blockchain status
- `help` - Show available commands
- `clear` - Clear terminal

## Testing

### Quick Test

After deploying contracts and starting the facilitator, run the test suite:

```bash
# Make sure Anvil is running and contracts are deployed
npm test
```

Or use the terminal UI:
```bash
test
```

This will test:
- Facilitator health check
- Payment verification via facilitator API
- Direct contract interaction

Test results will be displayed in a receipt-style card with detailed information.

### Manual Testing

#### 1. Test Payment Verification

Create a payment authorization and verify it:

```bash
# In the terminal UI, type:
help

# Check if Anvil is running:
anvil

# Check blockchain status:
status
```

#### 2. Test via API

You can test the facilitator API directly:

```bash
# Health check
curl http://localhost:3000/health

# Payment verification (requires a signed payment authorization)
curl -X POST http://localhost:3000/api/payment/verify \
  -H "Content-Type: application/json" \
  -d '{
    "client": "0x...",
    "token": "0x...",
    "amount": "1000000000000000000",
    "nonce": "1234567890",
    "deadline": "1734567890",
    "signature": "0x..."
  }'
```

#### 3. Test Contract Functions

Use Foundry to interact with contracts:

```bash
cd contracts

# Check if payment is valid
forge script --rpc-url http://localhost:8545 \
  -c "PaymentVerifier.isValidPayment(...)"

# Check validator registry
cast call <ValidatorRegistryAddress> \
  "validators(address)" <validatorAddress> \
  --rpc-url http://localhost:8545
```

### End-to-End Test Flow

1. **Start Anvil** (in a separate terminal):
   ```bash
   cd contracts
   anvil
   ```

2. **Deploy Contracts** (in terminal UI):
   ```bash
   deploy
   ```

3. **Start Facilitator** (in a separate terminal):
   ```bash
   cd facilitator
   npm start
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```
   Or in terminal UI: `test`

5. **Verify Results**:
   - All tests should show `[PASS]`
   - Check facilitator logs for any errors
   - Check Anvil logs for transaction confirmations
   - View receipt-style test results card

## API Endpoints

### Facilitator Service

- `GET /health` - Health check endpoint
- `POST /api/payment/verify` - Verify a payment authorization
- `POST /api/payment/settle` - Settle a verified payment
- `POST /api/terminal/execute` - Execute terminal command
- `GET /api/terminal/status` - Check Anvil status

### Example: Verify Payment

```bash
curl -X POST http://localhost:3000/api/payment/verify \
  -H "Content-Type: application/json" \
  -d '{
    "client": "0x...",
    "token": "0x...",
    "amount": "100000000000000000000",
    "nonce": "1234567890",
    "deadline": "1700000000",
    "signature": "0x..."
  }'
```

## Project Structure

```
valid/
├── contracts/              # Smart contracts
│   ├── src/              # Contract source files
│   │   ├── PaymentVerifier.sol
│   │   ├── Settlement.sol
│   │   ├── ValidatorRegistry.sol
│   │   ├── Governance.sol
│   │   └── MockERC20.sol
│   ├── script/           # Deployment scripts
│   │   └── Deploy.s.sol
│   ├── foundry.toml      # Foundry configuration
│   └── lib/              # Dependencies (forge-std, openzeppelin)
├── facilitator/          # TypeScript service
│   ├── src/             # Source code
│   │   ├── index.ts
│   │   ├── services/
│   │   ├── routes/
│   │   ├── contracts/
│   │   └── utils/
│   ├── dist/            # Compiled output
│   ├── package.json
│   └── tsconfig.json
├── frontend/            # React frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Terminal.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── TestResultsCard.jsx
│   │   └── ...
│   ├── dist/           # Build output
│   ├── package.json
│   └── vite.config.js
├── test-local.ts       # Integration test script
├── package.json        # Root dependencies
├── README.md          # This file
└── .gitignore         # Git ignore rules
```

## Development

### Compile Contracts

```bash
cd contracts
forge build
```

### Run Tests

```bash
# Run local integration tests
npm test

# Or manually
npx ts-node test-local.ts
```

### Build Frontend

```bash
cd frontend
npm run build
```

### Build Facilitator

```bash
cd facilitator
npm run build
```

### Clean Build Artifacts

```bash
cd contracts
rm -rf broadcast cache out
```

## Troubleshooting

### Anvil not running
- Make sure Anvil is running on port 8545
- Check: `curl http://localhost:8545 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'`

### Contracts not deployed
- Verify Anvil is running
- Check you're using the correct private key
- Ensure you have enough balance (Anvil accounts are pre-funded)
- Use `deploy` command for fresh deployment (clears cache)

### Facilitator not connecting
- Verify contract addresses in `facilitator/.env` match deployed addresses
- Check RPC URL is correct: `http://localhost:8545`
- Ensure facilitator is built: `npm run build`

### Tests failing
- Ensure Anvil is running
- Ensure facilitator is running
- Check contract addresses in `test-local.ts` match deployed addresses
- Verify contracts are freshly deployed

### Terminal commands not working
- Ensure facilitator is running
- Check facilitator logs for errors
- Verify Foundry is installed and in PATH

## License

MIT
