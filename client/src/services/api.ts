import { ChatRequestPayload, ModelResponsePayload, DocumentUploadResponse, SystemStatusResponse } from '../../../shared/types/index.js';

export class ApiService {
  private baseUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
    ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
    : '/api';

  public async sendChatTurn(payload: ChatRequestPayload, signal?: AbortSignal): Promise<ModelResponsePayload> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      let errorMessage = 'Failed to communicate with voice assistant backend';
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.error?.userFriendlyMessage || errorJson.error?.message || errorMessage;
      } catch {
        // use default
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  public async interruptAssistant(conversationId?: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/chat/interrupt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      });
    } catch (e) {
      console.warn('Interruption signal failed to send:', e);
    }
  }

  public async resetConversation(conversationId?: string): Promise<void> {
    await fetch(`${this.baseUrl}/chat/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId })
    });
  }

  public async uploadDocument(file: File): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/documents/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      let errorMsg = 'Failed to upload document';
      try {
        const errJson = await response.json();
        errorMsg = errJson.error?.userFriendlyMessage || errJson.error?.message || errorMsg;
      } catch {
        // use default
      }
      throw new Error(errorMsg);
    }

    return await response.json();
  }

  public async getSystemStatus(): Promise<SystemStatusResponse> {
    const response = await fetch(`${this.baseUrl}/status`);
    if (!response.ok) {
      throw new Error('Status endpoint unreachable');
    }
    return await response.json();
  }
}

export const apiService = new ApiService();
