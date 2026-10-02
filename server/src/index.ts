import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config, validateEnvironment } from './config/env.js';
import { logger } from './utils/logger.js';
import { chatRouter } from './routes/chat.js';
import { documentRouter } from './routes/documents.js';
import { statusRouter } from './routes/status.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Validate configuration
validateEnvironment();

// Middleware: allow local dev, Vercel frontend, Render, and production clients
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/chat', chatRouter);
app.use('/api/documents', documentRouter);
app.use('/api/status', statusRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: Date.now() });
});

// Resolve client dist path across development (src/) and compiled (dist/server/src/) structures
const candidateDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../../../../client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), '../client/dist')
];
const clientDistPath = candidateDistPaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || candidateDistPaths[0];

app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('Voice Assistant API Server is active. In development mode, open the Vite client at http://localhost:3000');
  }
});

// Error handling middleware
app.use(errorHandler);

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Voice Assistant Backend running on http://0.0.0.0:${config.port}`);
  logger.info(`Serving static client bundle from: ${clientDistPath}`);
  logger.info(`Primary Nemotron Model: ${config.primaryModel}`);
  logger.info(`Vision Model: ${config.visionModel}`);
});

export { app, server };
