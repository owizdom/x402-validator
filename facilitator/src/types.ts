export interface PaymentRequest {
  client: string;
  token: string;
  amount: string; // BigNumber as string
  nonce: string;
  deadline: string;
  signature: string;
}

export interface PaymentResponse {
  status: 'verified' | 'settled' | 'error';
  settlementId?: string;
  message?: string;
  latency?: number;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
  latency: number;
  verifiedAt?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  validatorStatus?: any;
}

