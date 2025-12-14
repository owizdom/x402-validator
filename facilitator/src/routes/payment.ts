import { Router, Request, Response } from 'express';
import { FacilitatorService } from '../services/FacilitatorService';
import { PaymentRequest, PaymentResponse } from '../types';
import { logger } from '../utils/logger';

export function PaymentRouter(facilitatorService: FacilitatorService): Router {
  const router = Router();

  /**
   * POST /api/payment/verify
   * Verify a payment authorization
   */
  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const paymentRequest: PaymentRequest = req.body;

      // Validate request
      if (!paymentRequest.client || !paymentRequest.token || !paymentRequest.signature) {
        return res.status(400).json({
          error: 'Missing required fields: client, token, signature'
        });
      }

      const result = await facilitatorService.verifyPayment(paymentRequest);

      if (result.valid) {
        res.json({
          status: 'verified',
          latency: result.latency,
          verifiedAt: result.verifiedAt
        });
      } else {
        res.status(400).json({
          status: 'error',
          error: result.error,
          latency: result.latency
        });
      }
    } catch (error) {
      logger.error('Payment verification error:', error);
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  /**
   * POST /api/payment/settle
   * Settle a payment after verification
   */
  router.post('/settle', async (req: Request, res: Response) => {
    try {
      const paymentRequest: PaymentRequest = req.body;
      const providerAddress = req.body.providerAddress;

      if (!providerAddress) {
        return res.status(400).json({
          error: 'Missing providerAddress'
        });
      }

      // First verify the payment
      const verification = await facilitatorService.verifyPayment(paymentRequest);
      if (!verification.valid) {
        return res.status(400).json({
          status: 'error',
          error: verification.error || 'Payment verification failed'
        });
      }

      // Then settle it
      const settlementId = await facilitatorService.settlePayment(
        paymentRequest,
        providerAddress
      );

      if (settlementId) {
        // Broadcast attestation
        await facilitatorService.broadcastAttestation(settlementId, paymentRequest);

        res.json({
          status: 'settled',
          settlementId,
          latency: verification.latency
        });
      } else {
        res.status(500).json({
          status: 'error',
          error: 'Failed to settle payment'
        });
      }
    } catch (error) {
      logger.error('Payment settlement error:', error);
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });

  return router;
}

