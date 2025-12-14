import { Contract, ContractRunner, InterfaceAbi } from 'ethers';

const ABI = [
  'function recordVerification(address validator, uint256 latency) external returns (uint256)',
  'function updateUptime(address validator, uint256 uptime) external',
  'function validators(address) external view returns (address validatorAddress, uint256 stakedAmount, uint256 totalRewards, uint256 totalPenalties, uint256 uptimeScore, uint256 latencyScore, uint256 verifiedRequests, bool active, uint256 activationTime)',
  'function getActiveValidatorCount() external view returns (uint256)'
] as InterfaceAbi;

export class ValidatorRegistry extends Contract {
  constructor(address: string, runner?: ContractRunner | null) {
    super(address, ABI, runner);
  }
}

