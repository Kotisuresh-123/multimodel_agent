import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { documentService } from '../services/document.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const documentRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.maxUploadSizeBytes
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];
    const allowedExts = ['.pdf', '.docx', '.txt', '.md'];
    const hasValidExt = allowedExts.some(ext => file.originalname.toLowerCase().endsWith(ext));

    if (allowedMimes.includes(file.mimetype) || hasValidExt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported formats: PDF, DOCX, TXT.'));
    }
  }
});

documentRouter.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: { message: 'No file was uploaded.' } });
      return;
    }

    const file = req.file;
    logger.info(`Received file upload: ${file.originalname} (${file.size} bytes)`);

    const doc = await documentService.processDocument(
      file.buffer,
      file.originalname,
      file.mimetype,
      file.size
    );

    res.json({
      success: true,
      document: {
        id: doc.id,
        name: doc.name,
        size: doc.size,
        mimeType: doc.mimeType,
        textLength: doc.extractedText.length,
        summary: doc.summary,
        chunksCount: doc.chunks?.length || 0,
        totalPages: doc.totalPages
      }
    });
  } catch (err: unknown) {
    next(err);
  }
});

documentRouter.get('/:id', (req: Request, res: Response): void => {
  const doc = documentService.getDocument(req.params.id);
  if (!doc) {
    res.status(404).json({ error: { message: 'Document not found.' } });
    return;
  }
  res.json({
    id: doc.id,
    name: doc.name,
    size: doc.size,
    mimeType: doc.mimeType,
    summary: doc.summary,
    totalPages: doc.totalPages,
    chunksCount: doc.chunks?.length || 0
  });
});

documentRouter.delete('/:id', (req: Request, res: Response): void => {
  const success = documentService.deleteDocument(req.params.id);
  res.json({ success });
});
