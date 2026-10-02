import { ModalityType } from '../../../shared/types/index.js';

export interface IntentDecision {
  intent: 'IMAGE_ANALYSIS' | 'SCREEN_ANALYSIS' | 'CAMERA_ANALYSIS' | 'DOCUMENT_ANALYSIS' | 'GENERAL_REASONING';
  modality: ModalityType;
  requiresVision: boolean;
  missingPrerequisiteNotice?: string;
}

export interface IntentContext {
  message: string;
  hasImage: boolean;
  hasScreenshot: boolean;
  isScreenActive?: boolean;
  hasCameraFrame?: boolean;
  isCameraActive?: boolean;
  hasDocument: boolean;
}

export class IntentRouter {
  public route(context: IntentContext): IntentDecision {
    const text = context.message.toLowerCase().trim();

    // 1. Explicit Screen Analysis
    const screenKeywords = [
      'screen', 'screenshot', 'what am i looking at', 'on my screen',
      'this page', 'find the error', 'read the visible text', 'what is wrong here',
      'on my display', 'in this window'
    ];
    const mentionsScreen = screenKeywords.some(k => text.includes(k));

    if (context.hasScreenshot || (context.isScreenActive && mentionsScreen)) {
      return {
        intent: 'SCREEN_ANALYSIS',
        modality: 'screen',
        requiresVision: true
      };
    }

    if (mentionsScreen && !context.hasScreenshot && !context.isScreenActive && !context.hasImage && !context.hasCameraFrame) {
      return {
        intent: 'SCREEN_ANALYSIS',
        modality: 'screen',
        requiresVision: false,
        missingPrerequisiteNotice: "I don't have a screen capture yet. Please start screen sharing or capture a screenshot."
      };
    }

    // 2. Camera Analysis (Physical environment, what user is holding/showing/wearing)
    const cameraKeywords = [
      'camera', 'webcam', 'holding', 'what am i holding', 'what is this object',
      'in front of me', 'showing you', 'can you see me', 'can you see the object',
      'what do you see', 'what is in front', 'what are you seeing',
      'look at this', 'read this paper', 'what is written on this paper', 'what is written here',
      'is this object damaged', 'can you identify this', 'describe what is happening in front of me',
      'describe what\'s in front of me', 'what am i showing', 'what color is this', 'what color is my',
      'look here', 'look at what i am holding', 'look at what i\'m holding', 'can you read this',
      'read what is on this', 'take a look at this', 'see what i have', 'in front of the camera'
    ];
    const mentionsCamera = cameraKeywords.some(k => text.includes(k));

    // If camera frame is explicitly provided with the turn
    if (context.hasCameraFrame) {
      return {
        intent: 'CAMERA_ANALYSIS',
        modality: 'camera',
        requiresVision: true
      };
    }

    // If camera is actively streaming and the user asks a visual/camera question
    if (context.isCameraActive && mentionsCamera) {
      return {
        intent: 'CAMERA_ANALYSIS',
        modality: 'camera',
        requiresVision: true
      };
    }

    // If user explicitly asks about the camera or what they are holding/showing, but camera is OFF
    if (mentionsCamera && !context.hasCameraFrame && !context.isCameraActive && !context.hasImage && !context.hasScreenshot) {
      return {
        intent: 'CAMERA_ANALYSIS',
        modality: 'camera',
        requiresVision: false,
        missingPrerequisiteNotice: "I can't see what you're showing yet. Please turn on your camera so I can see what you are holding or pointing to."
      };
    }

    // 3. Image Analysis
    const imageKeywords = ['image', 'photo', 'picture', 'in this image'];
    const mentionsImage = imageKeywords.some(k => text.includes(k));

    if (context.hasImage) {
      return {
        intent: 'IMAGE_ANALYSIS',
        modality: 'image',
        requiresVision: true
      };
    }

    if (mentionsImage && !context.hasImage && !context.hasCameraFrame) {
      return {
        intent: 'IMAGE_ANALYSIS',
        modality: 'image',
        requiresVision: false,
        missingPrerequisiteNotice: "Please select or upload an image first so I can analyze it for you."
      };
    }

    // 4. Document Analysis
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

    // 5. Default: General reasoning
    return {
      intent: 'GENERAL_REASONING',
      modality: 'text',
      requiresVision: false
    };
  }
}

export const intentRouter = new IntentRouter();
