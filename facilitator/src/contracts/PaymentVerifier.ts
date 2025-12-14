import { Contract, ContractRunner, InterfaceAbi } from 'ethers';

const ABI = [
  'function verifyPayment(address client, address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external returns (bool)',
  'function isValidPayment(address client, address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external view returns (bool)',
  'function getAuthorizedBalance(address client, address token) external view returns (uint256)'
] as InterfaceAbi;

export class PaymentVerifier extends Contract {
  constructor(address: string, runner?: ContractRunner | null) {
    super(address, ABI, runner);
  }
}

