import { ethers } from 'ethers';
import { PaymentVerifier } from '../contracts/PaymentVerifier';
import { Settlement } from '../contracts/Settlement';
import { ValidatorRegistry } from '../contracts/ValidatorRegistry';
import { logger } from '../utils/logger';
import { PaymentRequest, PaymentResponse, VerificationResult } from '../types';

export class FacilitatorService {
  private provider: ethers.Provider;
  private paymentVerifier?: PaymentVerifier;
  private settlement?: Settlement;
  private validatorRegistry?: ValidatorRegistry;
  private validatorAddress?: string;
  private validatorPrivateKey: string;

  constructor() {
    // Initialize Ethereum provider
    const rpcUrl = process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/AFjoSzKjqv6Eq53OsF2xe';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    // Load contract addresses from environment or deployment
    const paymentVerifierAddress = process.env.PAYMENT_VERIFIER_ADDRESS || '';
    const settlementAddress = process.env.SETTLEMENT_ADDRESS || '';
    const validatorRegistryAddress = process.env.VALIDATOR_REGISTRY_ADDRESS || '';

    // Initialize contracts
    if (paymentVerifierAddress) {
      this.paymentVerifier = new PaymentVerifier(paymentVerifierAddress, this.provider);
    }
    if (settlementAddress) {
      this.settlement = new Settlement(settlementAddress, this.provider);
    }
    if (validatorRegistryAddress) {
      this.validatorRegistry = new ValidatorRegistry(validatorRegistryAddress, this.provider);
    }

    // Validator credentials
    this.validatorPrivateKey = process.env.VALIDATOR_PRIVATE_KEY || '';
    if (this.validatorPrivateKey) {
      const wallet = new ethers.Wallet(this.validatorPrivateKey, this.provider);
      this.validatorAddress = wallet.address;
    }

    logger.info('FacilitatorService initialized');
  }

  /**
   * Verify a payment authorization
   */
  async verifyPayment(request: PaymentRequest): Promise<VerificationResult> {
    const startTime = Date.now();

    try {
      if (!this.paymentVerifier) {
        return {
          valid: false,
          error: 'PaymentVerifier contract not initialized',
          latency: Date.now() - startTime
        };
      }

      // Verify the payment signature on-chain
      const isValid = await (this.paymentVerifier as any).isValidPayment(
        request.client,
        request.token,
        BigInt(request.amount),
        BigInt(request.nonce),
        BigInt(request.deadline),
        request.signature
      );

      if (!isValid) {
        return {
          valid: false,
          error: 'Invalid payment authorization',
          latency: Date.now() - startTime
        };
      }

      // Record verification in validator registry (if validator is registered)
      if (this.validatorAddress && this.validatorRegistry && this.validatorPrivateKey) {
        try {
          const signer = new ethers.Wallet(this.validatorPrivateKey, this.provider);
          const registryWithSigner = this.validatorRegistry.connect(signer);
          await (registryWithSigner as any).recordVerification(
            this.validatorAddress,
            BigInt(Date.now() - startTime)
          );
        } catch (error) {
          logger.warn('Failed to record verification in registry:', error);
        }
      }

      const latency = Date.now() - startTime;

      return {
        valid: true,
        latency,
        verifiedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Payment verification error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Settle a payment
   */
  async settlePayment(request: PaymentRequest, providerAddress: string): Promise<string | null> {
    try {
      if (!this.settlement) {
        throw new Error('Settlement contract not initialized');
      }

      if (!this.validatorPrivateKey) {
        throw new Error('Validator private key not configured');
      }

      const signer = new ethers.Wallet(this.validatorPrivateKey, this.provider);
      const settlementWithSigner = this.settlement.connect(signer);

      const tx = await (settlementWithSigner as any).settlePayment(
        request.client,
        providerAddress,
        request.token,
        BigInt(request.amount),
        BigInt(request.nonce),
        BigInt(request.deadline),
        request.signature
      );

      const receipt = await tx.wait();
      const settlementId = receipt.logs[0]?.topics[1]; // Extract settlement ID from event

      logger.info(`Payment settled: ${settlementId}`);
      return settlementId || null;
    } catch (error) {
      logger.error('Payment settlement error:', error);
      throw error;
    }
  }

  /**
   * Get validator status
   */
  async getValidatorStatus(): Promise<any> {
    if (!this.validatorAddress || !this.validatorRegistry) {
      return null;
    }

    try {
      const validator = await this.validatorRegistry.validators(this.validatorAddress);
      return {
        address: validator.validatorAddress,
        stakedAmount: validator.stakedAmount.toString(),
        totalRewards: validator.totalRewards.toString(),
        uptimeScore: validator.uptimeScore.toString(),
        latencyScore: validator.latencyScore.toString(),
        verifiedRequests: validator.verifiedRequests.toString(),
        active: validator.active
      };
    } catch (error) {
      logger.error('Error fetching validator status:', error);
      return null;
    }
  }

  /**
   * Broadcast attestation to gateways
   */
  async broadcastAttestation(settlementId: string, paymentData: PaymentRequest): Promise<void> {
    // In a real implementation, this would broadcast to gateway nodes
    // For now, we'll just log it
    logger.info('Broadcasting attestation:', {
      settlementId,
      client: paymentData.client,
      amount: paymentData.amount.toString()
    });
  }
}

