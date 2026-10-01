import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error & { status?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.status || 500;
  const rawMessage = err.message || 'An unexpected internal error occurred.';

  logger.error(`API Error [${status}]:`, err.stack || rawMessage);

  // Map technical error strings into user-friendly explanations
  let userFriendlyMessage = 'An unexpected error occurred. Please try again.';

  if (rawMessage.includes('CONFIG_ERROR') || rawMessage.includes('API key is missing')) {
    userFriendlyMessage = 'The AI service is not configured with an API key. Please check server settings.';
  } else if (rawMessage.includes('REQUEST_ABORTED') || rawMessage.includes('interrupted')) {
    userFriendlyMessage = 'Request was cancelled.';
    res.status(499).json({
      error: {
        code: 'REQUEST_ABORTED',
        message: rawMessage,
        userFriendlyMessage
      }
    });
    return;
  } else if (rawMessage.includes('429') || rawMessage.includes('rate limit') || rawMessage.includes('rate-limited')) {
    userFriendlyMessage = 'The AI service is temporarily busy due to high demand. Please try speaking again in a few moments.';
  } else if (rawMessage.includes('503') || rawMessage.includes('overloaded') || rawMessage.includes('502')) {
    userFriendlyMessage = 'The upstream AI model is temporarily overloaded. Please try again shortly.';
  } else if (rawMessage.includes('timed out') || rawMessage.includes('timeout')) {
    userFriendlyMessage = 'The request timed out waiting for the AI response. Please try with a shorter query.';
  } else if (rawMessage.includes('Unsupported document type') || rawMessage.includes('Invalid file type')) {
    userFriendlyMessage = 'Unsupported file format. Please upload a PDF, Word document (DOCX), or plain text file.';
  } else if (rawMessage.includes('File too large') || rawMessage.includes('too large')) {
    userFriendlyMessage = 'The file is too large. Please select a file smaller than 15MB.';
  } else if (rawMessage.includes('Invalid visual data')) {
    userFriendlyMessage = 'The image could not be processed. Please try taking a fresh screenshot or selecting another image.';
  } else if (rawMessage.includes('ENOTFOUND') || rawMessage.includes('fetch failed')) {
    userFriendlyMessage = 'Unable to reach the AI cloud service. Please check your internet connection.';
  }

  res.status(status).json({
    error: {
      code: err.code || 'API_ERROR',
      message: rawMessage,
      userFriendlyMessage
    }
  });
}
