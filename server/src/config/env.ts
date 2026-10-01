import path from 'path';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

// Load .env from root workspace or server folder
const envPath = path.resolve(process.cwd(), '../.env');
const localEnvPath = path.resolve(process.cwd(), '.env');

dotenv.config({ path: localEnvPath });
dotenv.config({ path: envPath });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  clientPort: parseInt(process.env.CLIENT_PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  primaryModel: process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free',
  fallbackModel: 'nvidia/nemotron-3.5-lightning:free',
  visionModel: process.env.OPENROUTER_VISION_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  fallbackVisionModel: 'openrouter/free',
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  maxUploadSizeBytes: 15 * 1024 * 1024, // 15MB
  requestTimeoutMs: 45000 // 45 seconds
};

export function validateEnvironment(): { isValid: boolean; warning?: string } {
  if (!config.openRouterApiKey) {
    const warning = 'OPENROUTER_API_KEY is not set in environment or .env. The voice assistant will start, but AI inference calls will fail until a key is provided.';
    logger.warn(warning);
    return { isValid: false, warning };
  }
  logger.info(`Environment configured. Primary Model: ${config.primaryModel}, Vision Model: ${config.visionModel}`);
  return { isValid: true };
}
