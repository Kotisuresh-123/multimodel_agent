import { Message, UserRole, ModalityType } from '../../../shared/types/index.js';
import { logger } from '../utils/logger.js';

export interface StoredConversation {
  id: string;
  summary?: string;
  messages: Message[];
  activeDocumentId?: string;
  createdAt: number;
  updatedAt: number;
}

const MAX_ACTIVE_TURNS = 8; // Number of recent turns to retain verbatim

export class ConversationMemory {
  private conversations: Map<string, StoredConversation> = new Map();

  public getOrCreate(conversationId: string): StoredConversation {
    let conv = this.conversations.get(conversationId);
    if (!conv) {
      conv = {
        id: conversationId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      this.conversations.set(conversationId, conv);
    }
    return conv;
  }

  public addMessage(
    conversationId: string, 
    role: UserRole, 
    content: string, 
    options?: {
      requestId?: string;
      spokenText?: string;
      modelUsed?: string;
      modality?: ModalityType;
    }
  ): Message {
    const conv = this.getOrCreate(conversationId);
    const msg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      requestId: options?.requestId,
      role,
      content,
      spokenText: options?.spokenText,
      timestamp: Date.now(),
      modelUsed: options?.modelUsed,
      modality: options?.modality
    };

    conv.messages.push(msg);
    conv.updatedAt = Date.now();

    // Check if context needs compaction
    this.compactHistoryIfNeeded(conv);

    return msg;
  }

  public setActiveDocument(conversationId: string, documentId: string | undefined): void {
    const conv = this.getOrCreate(conversationId);
    conv.activeDocumentId = documentId;
  }

  public getActiveDocument(conversationId: string): string | undefined {
    return this.conversations.get(conversationId)?.activeDocumentId;
  }

  public getRecentMessages(conversationId: string): Message[] {
    const conv = this.conversations.get(conversationId);
    if (!conv) return [];
    return conv.messages.slice(-MAX_ACTIVE_TURNS);
  }

  public getAllMessages(conversationId: string): Message[] {
    const conv = this.conversations.get(conversationId);
    return conv ? [...conv.messages] : [];
  }

  public getContextSummary(conversationId: string): string | undefined {
    return this.conversations.get(conversationId)?.summary;
  }

  public clear(conversationId: string): void {
    this.conversations.delete(conversationId);
    logger.info(`Cleared conversation memory for ${conversationId}`);
  }

  /**
   * Compaction: If conversation grows beyond MAX_ACTIVE_TURNS,
   * creates a compact contextual memory note of older turns so context is never lost.
   */
  private compactHistoryIfNeeded(conv: StoredConversation): void {
    if (conv.messages.length <= MAX_ACTIVE_TURNS + 4) {
      return;
    }

    const messagesToSummarize = conv.messages.slice(0, conv.messages.length - MAX_ACTIVE_TURNS);
    const points: string[] = [];

    for (const m of messagesToSummarize) {
      // Summarize key user topics and assistant responses concisely
      const snippet = m.content.length > 100 ? m.content.substring(0, 100) + '...' : m.content;
      points.push(`${m.role.toUpperCase()}: ${snippet}`);
    }

    const newSummary = `Previous conversation context:\n${points.join('\n')}`;
    conv.summary = conv.summary ? `${conv.summary}\n${newSummary}` : newSummary;

    // Retain only the recent turns in the active list
    conv.messages = conv.messages.slice(-MAX_ACTIVE_TURNS);
    logger.info(`Compacted conversation ${conv.id} history. Kept ${conv.messages.length} recent turns.`);
  }
}

export const conversationMemory = new ConversationMemory();
