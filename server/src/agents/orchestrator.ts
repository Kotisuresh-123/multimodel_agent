import { ChatRequestPayload, ModelResponsePayload } from '../../../shared/types/index.js';
import { openRouterClient, ChatMessage } from '../services/openrouter.js';
import { conversationMemory } from '../services/memory.js';
import { documentService } from '../services/document.js';
import { visionAnalyzer } from '../services/vision.js';
import { intentRouter } from './intentRouter.js';
import { cleanTextForVoice } from '../utils/textCleaner.js';
import { logger } from '../utils/logger.js';

const SYSTEM_PROMPT = `You are a helpful multimodal voice assistant.
Primary Guidelines:
- Listen carefully, understand context, and answer naturally.
- Be concise and direct in voice mode. Avoid long rambling explanations unless the user specifically asks for detail.
- Do NOT use repetitive filler phrases like "Sure!", "Of course!", "Certainly!", "I'd be happy to help!", or "As an AI...".
- Do NOT repeat the user's question before answering.
- Do not speak markdown symbols, bullet asterisks, or code headers.
- When analyzing images or screenshots, answer the user's question first, read visible text accurately, and highlight any errors or warnings.
- If visual text or details are blurry or unreadable, state clearly that it is unclear rather than inventing content.
- Do not claim to see the user's screen or an image unless visual data was actually provided.
- When answering questions about an uploaded document, prioritize the provided document excerpts. If the information is not in the document, state: "I couldn't find that in the document."
- Maintain conversational context naturally.`;

export class AgentOrchestrator {
  // Map of active request controllers by conversation ID to support immediate cancellation upon interruption
  private activeControllers: Map<string, AbortController> = new Map();

  /**
   * Cancel any in-flight request for this conversation
   */
  public cancelActiveRequest(conversationId: string): void {
    const existing = this.activeControllers.get(conversationId);
    if (existing) {
      logger.info(`Interrupting and aborting active inference for conversation: ${conversationId}`);
      existing.abort();
      this.activeControllers.delete(conversationId);
    }
  }

  /**
   * Process a multimodal turn from the user
   */
  public async processTurn(payload: ChatRequestPayload): Promise<ModelResponsePayload> {
    const convId = payload.conversationId || 'default-session';
    const requestId = payload.requestId || `req_${Date.now()}`;

    // 1. Interrupt/cancel any previous in-flight inference for this session
    this.cancelActiveRequest(convId);

    // Create a new AbortController for this request
    const abortController = new AbortController();
    this.activeControllers.set(convId, abortController);

    try {
      const userMessage = payload.message?.trim() || '';
      const hasImage = Boolean(payload.image?.dataUrl);
      const hasScreenshot = Boolean(payload.screenshot?.dataUrl);
      const isScreenActive = Boolean(payload.screenActive);
      const hasCameraFrame = Boolean(payload.cameraFrame?.dataUrl);
      const isCameraActive = Boolean(payload.cameraActive);

      // Check document context
      const docId = payload.documentId || conversationMemory.getActiveDocument(convId);
      const activeDoc = docId ? documentService.getDocument(docId) : undefined;
      const hasDocument = Boolean(activeDoc);

      if (payload.documentId) {
        conversationMemory.setActiveDocument(convId, payload.documentId);
      }

      // 2. Intent Routing
      const intentDecision = intentRouter.route({
        message: userMessage,
        hasImage,
        hasScreenshot,
        isScreenActive,
        hasCameraFrame,
        isCameraActive,
        hasDocument
      });

      logger.info(`Turn routed - Intent: ${intentDecision.intent}, Modality: ${intentDecision.modality}, RequiresVision: ${intentDecision.requiresVision}`);

      // Handle missing prerequisites gracefully without making unnecessary API calls
      if (intentDecision.missingPrerequisiteNotice) {
        const spoken = cleanTextForVoice(intentDecision.missingPrerequisiteNotice);
        
        conversationMemory.addMessage(convId, 'user', userMessage || `[User invoked ${intentDecision.intent}]`);
        conversationMemory.addMessage(convId, 'assistant', intentDecision.missingPrerequisiteNotice, {
          requestId,
          spokenText: spoken,
          modelUsed: 'system-guidance',
          modality: intentDecision.modality
        });

        return {
          id: `resp_${Date.now()}`,
          requestId,
          conversationId: convId,
          text: intentDecision.missingPrerequisiteNotice,
          spokenText: spoken,
          modelUsed: 'system-guidance',
          provider: 'Local Orchestrator',
          latencyMs: 10,
          modality: intentDecision.modality
        };
      }

      // 3. Prepare Prompt Messages
      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT }
      ];

      // Add conversation summary if history was compacted
      const contextSummary = conversationMemory.getContextSummary(convId);
      if (contextSummary) {
        messages.push({
          role: 'system',
          content: contextSummary
        });
      }

      // Add recent turns for context
      const recentHistory = conversationMemory.getRecentMessages(convId);
      for (const msg of recentHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      // 4. Handle Modality Specific Context Injection
      let activeDataUrl: string | undefined;
      let sourceType: 'image' | 'screenshot' | 'screen_share' | 'camera' = 'image';

      if (hasCameraFrame) {
        activeDataUrl = payload.cameraFrame?.dataUrl;
        sourceType = 'camera';
      } else if (hasScreenshot) {
        activeDataUrl = payload.screenshot?.dataUrl;
        sourceType = 'screenshot';
      } else if (hasImage) {
        activeDataUrl = payload.image?.dataUrl;
        sourceType = 'image';
      }

      if (intentDecision.requiresVision && activeDataUrl) {
        const visionValidation = visionAnalyzer.validateImageDataUrl(activeDataUrl);
        if (!visionValidation.isValid) {
          throw new Error(visionValidation.error || 'Invalid visual data payload');
        }

        const visionMessage = visionAnalyzer.formatVisionMessage(userMessage, activeDataUrl, sourceType);
        messages.push(visionMessage);
      } else if (intentDecision.intent === 'DOCUMENT_ANALYSIS' && activeDoc) {
        // Extract relevant chunks for user query
        const relevantChunks = documentService.getRelevantChunksForQuery(activeDoc, userMessage || 'summarize');
        const documentContext = `[Context from uploaded document "${activeDoc.name}":\n` + 
          relevantChunks.map((c, i) => `Excerpt ${i + 1}:\n${c.content}`).join('\n\n') +
          `\n---\nBased on the document excerpts above, please answer:\n${userMessage || 'Please summarize the main points of this document.'}]`;

        messages.push({
          role: 'user',
          content: documentContext
        });
      } else {
        // Standard text turn
        messages.push({
          role: 'user',
          content: userMessage
        });
      }

      // Add turn to memory
      conversationMemory.addMessage(convId, 'user', userMessage || `[Uploaded ${intentDecision.modality}]`);

      // 5. Model Inference via OpenRouter
      const completion = await openRouterClient.createChatCompletion({
        messages,
        isVisionRequest: intentDecision.requiresVision,
        signal: abortController.signal
      });

      const responseText = completion.content || 'I processed your request, but received an empty response.';
      const spokenText = cleanTextForVoice(responseText);

      // Record assistant turn in memory
      conversationMemory.addMessage(convId, 'assistant', responseText, {
        requestId,
        spokenText,
        modelUsed: completion.modelUsed,
        modality: intentDecision.modality
      });

      return {
        id: `resp_${Date.now()}`,
        requestId,
        conversationId: convId,
        text: responseText,
        spokenText,
        modelUsed: completion.modelUsed,
        provider: completion.provider,
        latencyMs: completion.latencyMs,
        modality: intentDecision.modality,
        tokens: completion.tokens
      };
    } finally {
      // Clean up controller
      if (this.activeControllers.get(convId) === abortController) {
        this.activeControllers.delete(convId);
      }
    }
  }
}

export const agentOrchestrator = new AgentOrchestrator();
