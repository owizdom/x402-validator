import express from 'express';
import cors from 'cors';
import { FacilitatorService } from './services/FacilitatorService';
import { PaymentRouter } from './routes/payment';
import { HealthRouter } from './routes/health';
import { TerminalRouter } from './routes/terminal';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize facilitator service
const facilitatorService = new FacilitatorService();

// Routes
app.use('/api/payment', PaymentRouter(facilitatorService));
app.use('/health', HealthRouter());
app.use('/api/terminal', TerminalRouter());

// Start server
app.listen(PORT, () => {
  logger.info(`x402 Facilitator running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

