import { ModalityType } from '../../../shared/types/index.js';

export interface IntentDecision {
  intent: 'IMAGE_ANALYSIS' | 'SCREEN_ANALYSIS' | 'DOCUMENT_ANALYSIS' | 'GENERAL_REASONING';
  modality: ModalityType;
  requiresVision: boolean;
  missingPrerequisiteNotice?: string;
}

export interface IntentContext {
  message: string;
  hasImage: boolean;
  hasScreenshot: boolean;
  isScreenActive?: boolean;
  hasDocument: boolean;
}

export class IntentRouter {
  public route(context: IntentContext): IntentDecision {
    const text = context.message.toLowerCase();

    // 1. Explicit Screen Analysis
    const screenKeywords = [
      'screen', 'screenshot', 'what am i looking at', 'on my screen',
      'this page', 'find the error', 'read the visible text', 'what is wrong here'
    ];
    const mentionsScreen = screenKeywords.some(k => text.includes(k));

    if (context.hasScreenshot || (context.isScreenActive && mentionsScreen)) {
      return {
        intent: 'SCREEN_ANALYSIS',
        modality: 'screen',
        requiresVision: true
      };
    }

    if (mentionsScreen && !context.hasScreenshot && !context.isScreenActive && !context.hasImage) {
      return {
        intent: 'SCREEN_ANALYSIS',
        modality: 'screen',
        requiresVision: false,
        missingPrerequisiteNotice: "I don't have a screen capture yet. Please start screen sharing or capture a screenshot."
      };
    }

    // 2. Image Analysis
    const imageKeywords = ['image', 'photo', 'picture', 'look at this', 'in this image'];
    const mentionsImage = imageKeywords.some(k => text.includes(k));

    if (context.hasImage) {
      return {
        intent: 'IMAGE_ANALYSIS',
        modality: 'image',
        requiresVision: true
      };
    }

    if (mentionsImage && !context.hasImage) {
      return {
        intent: 'IMAGE_ANALYSIS',
        modality: 'image',
        requiresVision: false,
        missingPrerequisiteNotice: "Please select or upload an image first so I can analyze it for you."
      };
    }

    // 3. Document Analysis
    const documentKeywords = [
      'document', 'pdf', 'docx', 'summarize this', 'summarize document', 
      'what does it say', 'main points', 'page', 'conclusion', 'section about'
    ];
    const mentionsDocument = documentKeywords.some(k => text.includes(k));

    if (context.hasDocument) {
      return {
        intent: 'DOCUMENT_ANALYSIS',
        modality: 'document',
        requiresVision: false
      };
    }

    if (mentionsDocument && !context.hasDocument) {
      return {
        intent: 'DOCUMENT_ANALYSIS',
        modality: 'document',
        requiresVision: false,
        missingPrerequisiteNotice: "Please upload a PDF, DOCX, or text document first so I can inspect and summarize it."
      };
    }

    // 4. Default: General reasoning
    return {
      intent: 'GENERAL_REASONING',
      modality: 'text',
      requiresVision: false
    };
  }
}

export const intentRouter = new IntentRouter();
