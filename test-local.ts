import { ethers } from 'ethers';
import axios from 'axios';

// Deployed contract addresses from local deployment
const CONTRACTS = {
  PaymentVerifier: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  Settlement: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  NodeToken: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  ValidatorRegistry: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  Governance: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
};

const RPC_URL = 'http://localhost:8545';
const FACILITATOR_URL = 'http://localhost:3000';

// Anvil default account #0
const PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function testFacilitatorHealth() {
  console.log('\n=== Testing Facilitator Health ===');
  try {
    const response = await axios.get(`${FACILITATOR_URL}/health`);
    console.log('[PASS] Health check:', response.data);
    return true;
  } catch (error: any) {
    console.log('[FAIL] Health check failed:', error.message);
    return false;
  }
}

async function testPaymentVerification() {
  console.log('\n=== Testing Payment Verification ===');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  // Create a payment authorization
  const client = wallet.address;
  const token = CONTRACTS.NodeToken; // Use NODE token
  const amount = ethers.parseUnits('100', 18);
  const nonce = Date.now();
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  
  // EIP-712 domain
  const domain = {
    name: 'x402-PaymentVerifier',
    version: '1',
    chainId: 31337, // Anvil default
    verifyingContract: CONTRACTS.PaymentVerifier
  };
  
  const types = {
    PaymentAuthorization: [
      { name: 'client', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
  };
  
  const message = {
    client,
    token,
    amount,
    nonce,
    deadline
  };
  
  // Sign the payment authorization
  const signature = await wallet.signTypedData(domain, types, message);
  
  console.log('Created payment authorization:');
  console.log('  Client:', client);
  console.log('  Token:', token);
  console.log('  Amount:', amount.toString());
  console.log('  Nonce:', nonce);
  console.log('  Signature:', signature);
  
  // Test verification via facilitator
  try {
    const response = await axios.post(`${FACILITATOR_URL}/api/payment/verify`, {
      client,
      token,
      amount: amount.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      signature
    });
    
    console.log('[PASS] Payment verification response:', response.data);
    return true;
  } catch (error: any) {
    console.log('[FAIL] Payment verification failed:', error.response?.data || error.message);
    return false;
  }
}

async function testContractInteraction() {
  console.log('\n=== Testing Direct Contract Interaction ===');
  
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  try {
    // Test PaymentVerifier contract
    const paymentVerifierABI = [
      'function isValidPayment(address client, address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external view returns (bool)'
    ];
    
    const paymentVerifier = new ethers.Contract(
      CONTRACTS.PaymentVerifier,
      paymentVerifierABI,
      provider
    );
    
    // Create a test signature
    const client = wallet.address;
    const token = CONTRACTS.NodeToken;
    const amount = ethers.parseUnits('50', 18);
    const nonce = Date.now();
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    
    const domain = {
      name: 'x402-PaymentVerifier',
      version: '1',
      chainId: 31337,
      verifyingContract: CONTRACTS.PaymentVerifier
    };
    
    const types = {
      PaymentAuthorization: [
        { name: 'client', type: 'address' },
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    };
    
    const message = { client, token, amount, nonce, deadline };
    const signature = await wallet.signTypedData(domain, types, message);
    
    const isValid = await paymentVerifier.isValidPayment(
      client,
      token,
      amount,
      nonce,
      deadline,
      signature
    );
    
    console.log('[PASS] Contract isValidPayment result:', isValid);
    return isValid;
  } catch (error: any) {
    console.log('[FAIL] Contract interaction failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('Starting Local Tests for x402 Validator\n');
  console.log('Using contracts:', CONTRACTS);
  console.log('RPC URL:', RPC_URL);
  console.log('Facilitator URL:', FACILITATOR_URL);
  
  const results = {
    health: await testFacilitatorHealth(),
    paymentVerification: await testPaymentVerification(),
    contractInteraction: await testContractInteraction()
  };
  
  console.log('\n=== Test Results ===');
  console.log('Health Check:', results.health ? '[PASS]' : '[FAIL]');
  console.log('Payment Verification:', results.paymentVerification ? '[PASS]' : '[FAIL]');
  console.log('Contract Interaction:', results.contractInteraction ? '[PASS]' : '[FAIL]');
  
  const allPassed = Object.values(results).every(r => r);
  console.log('\n' + (allPassed ? '[PASS] All tests passed!' : '[FAIL] Some tests failed'));
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);

