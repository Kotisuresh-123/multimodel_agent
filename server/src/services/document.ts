import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { DocumentAttachment, DocumentChunk } from '../../../shared/types/index.js';
import { logger } from '../utils/logger.js';

export class DocumentService {
  private documents: Map<string, DocumentAttachment> = new Map();

  /**
   * Process an uploaded file buffer and extract text, chunks, and metadata
   */
  public async processDocument(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    fileSize: number
  ): Promise<DocumentAttachment> {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    logger.info(`Processing document: ${originalName} (${mimeType}, ${fileSize} bytes)`);

    let extractedText = '';
    let totalPages = 1;

    try {
      if (mimeType === 'application/pdf' || originalName.toLowerCase().endsWith('.pdf')) {
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text || '';
        totalPages = pdfData.numpages || 1;
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        originalName.toLowerCase().endsWith('.docx')
      ) {
        const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
        extractedText = docxResult.value || '';
      } else if (
        mimeType.startsWith('text/') ||
        originalName.toLowerCase().endsWith('.txt') ||
        originalName.toLowerCase().endsWith('.md')
      ) {
        extractedText = fileBuffer.toString('utf-8');
      } else {
        throw new Error(`Unsupported document type: ${mimeType}. Please upload PDF, DOCX, or TXT.`);
      }

      // Clean whitespace
      extractedText = extractedText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

      if (!extractedText) {
        extractedText = 'Notice: No readable text could be extracted from this document (it may contain scanned image-only pages).';
      }

      // Chunk the document
      const chunks = this.chunkText(docId, extractedText);

      // Create high-level preview summary (first 500 chars or summary chunk)
      const previewSummary = extractedText.length > 500 
        ? extractedText.substring(0, 500) + '...'
        : extractedText;

      const docAttachment: DocumentAttachment = {
        type: 'document',
        id: docId,
        name: originalName,
        mimeType,
        size: fileSize,
        extractedText,
        summary: previewSummary,
        chunks,
        totalPages
      };

      this.documents.set(docId, docAttachment);
      logger.info(`Successfully processed ${originalName}. Total chunks: ${chunks.length}, length: ${extractedText.length} characters`);
      return docAttachment;
    } catch (err) {
      logger.error(`Document processing failed for ${originalName}:`, err);
      throw new Error(`Failed to extract text from document: ${(err as Error).message}`);
    }
  }

  public getDocument(docId: string): DocumentAttachment | undefined {
    return this.documents.get(docId);
  }

  public deleteDocument(docId: string): boolean {
    return this.documents.delete(docId);
  }

  /**
   * Split document into manageable chunks with overlap
   */
  private chunkText(docId: string, text: string, chunkSize = 1200, overlap = 150): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const content = text.slice(start, end).trim();

      if (content.length > 0) {
        chunks.push({
          id: `${docId}_chunk_${index}`,
          index,
          content,
          tokenEstimate: Math.ceil(content.length / 4)
        });
        index++;
      }

      if (end >= text.length) break;
      start += (chunkSize - overlap);
    }

    return chunks;
  }

  /**
   * Select the most relevant chunks for a user query using keyword and relevance scoring
   */
  public getRelevantChunksForQuery(doc: DocumentAttachment, query: string, maxChunks = 3): DocumentChunk[] {
    if (!doc.chunks || doc.chunks.length <= maxChunks) {
      return doc.chunks || [];
    }

    // Tokenize query words
    const queryTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['what', 'this', 'that', 'with', 'from', 'about', 'document', 'file', 'tell'].includes(w));

    if (queryTokens.length === 0) {
      // Return first few chunks if general query (e.g. "summarize this document")
      return doc.chunks.slice(0, maxChunks);
    }

    // Score chunks based on token matches and term frequencies
    const scored = doc.chunks.map(chunk => {
      const lower = chunk.content.toLowerCase();
      let score = 0;
      for (const token of queryTokens) {
        const matches = lower.split(token).length - 1;
        score += matches;
      }
      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);

    // If top scores have zero matches, fall back to first chunks
    if (scored[0].score === 0) {
      return doc.chunks.slice(0, maxChunks);
    }

    return scored.slice(0, maxChunks).map(s => s.chunk);
  }
}

export const documentService = new DocumentService();
