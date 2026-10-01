import express from 'express';
import cors from 'cors';
import path from 'path';
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

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'],
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

// Serve frontend in production if built
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    next();
    return;
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // In development, client is served by Vite on port 3000
      res.status(200).send('Voice Assistant API Server is active. In development mode, open the Vite client at http://localhost:3000');
    }
  });
});

// Error handling middleware
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`Voice Assistant Backend running on http://localhost:${config.port}`);
  logger.info(`Primary Nemotron Model: ${config.primaryModel}`);
  logger.info(`Vision Model: ${config.visionModel}`);
});

export { app, server };
