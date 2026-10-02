import { logger } from '../utils/logger.js';

export interface VisionPayload {
  dataUrl: string;
  mimeType?: string;
  sourceType: 'image' | 'screenshot' | 'screen_share' | 'camera';
}

export class VisionAnalyzer {
  /**
   * Validate image data URL
   */
  public validateImageDataUrl(dataUrl: string): { isValid: boolean; error?: string } {
    if (!dataUrl || typeof dataUrl !== 'string') {
      return { isValid: false, error: 'Image data is missing or invalid' };
    }

    if (!dataUrl.startsWith('data:image/')) {
      return { isValid: false, error: 'Invalid image format. Expected data:image/...' };
    }

    // Size sanity check (base64 length < 25MB)
    if (dataUrl.length > 25 * 1024 * 1024) {
      return { isValid: false, error: 'Image is too large. Please upload an image under 15MB.' };
    }

    return { isValid: true };
  }

  /**
   * Constructs the vision message payload for OpenRouter
   */
  public formatVisionMessage(
    userPrompt: string,
    dataUrl: string,
    sourceType: 'image' | 'screenshot' | 'screen_share' | 'camera'
  ) {
    let contextualGuidance = '';
    if (sourceType === 'screenshot' || sourceType === 'screen_share') {
      contextualGuidance = 'The user has captured their screen. Prioritize identifying errors, status messages, UI state, and visible text relevant to the user\'s question.';
    } else if (sourceType === 'camera') {
      contextualGuidance = 'The user is showing their camera view. Answer what they are holding, showing, pointing to, wearing, or looking at in their physical space. Read any visible text accurately and answer clearly and concisely for natural voice synthesis.';
    } else {
      contextualGuidance = 'The user has provided an image. Identify visible elements, text, and answer the user\'s specific question directly.';
    }

    let defaultFallback = 'Describe and analyze what is visible.';
    if (sourceType === 'camera') {
      defaultFallback = 'Describe what is visible through the camera. Focus on key objects, colors, surroundings, and visible text.';
    } else if (sourceType === 'image') {
      defaultFallback = 'Describe and analyze what is visible in this image. Focus on key elements and any text.';
    } else {
      defaultFallback = 'Describe and analyze what is visible in this screenshot. Focus on key elements and any text.';
    }

    const effectiveText = userPrompt && userPrompt.trim().length > 0 
      ? `${userPrompt}\n\n[Context: ${contextualGuidance}]`
      : defaultFallback;

    return {
      role: 'user' as const,
      content: [
        {
          type: 'text' as const,
          text: effectiveText
        },
        {
          type: 'image_url' as const,
          image_url: {
            url: dataUrl
          }
        }
      ]
    };
  }
}

export const visionAnalyzer = new VisionAnalyzer();
