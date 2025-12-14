import { Contract, ContractRunner, InterfaceAbi } from 'ethers';

const ABI = [
  'function settlePayment(address client, address provider, address token, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature) external returns (bytes32)',
  'function depositEscrow(address token, uint256 amount) external',
  'function withdrawEscrow(address token, uint256 amount) external',
  'function disputeSettlement(bytes32 settlementId) external'
] as InterfaceAbi;

export class Settlement extends Contract {
  constructor(address: string, runner?: ContractRunner | null) {
    super(address, ABI, runner);
  }
}

