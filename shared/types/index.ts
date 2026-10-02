/**
 * Shared Type Definitions for Multimodal Voice Assistant
 */

export type ModalityType = 'text' | 'image' | 'screen' | 'document' | 'camera';

export type AgentStatus = 
  | 'IDLE' 
  | 'LISTENING' 
  | 'PROCESSING' 
  | 'ANALYZING_IMAGE' 
  | 'ANALYZING_SCREEN' 
  | 'ANALYZING_DOCUMENT' 
  | 'ANALYZING_CAMERA' 
  | 'SPEAKING' 
  | 'ERROR';

export type UserRole = 'user' | 'assistant' | 'system';

export interface ImageAttachment {
  type: 'image';
  id: string;
  name?: string;
  mimeType: string;
  dataUrl: string;
}

export interface ScreenshotAttachment {
  type: 'screenshot';
  id: string;
  timestamp: number;
  dataUrl: string;
}

export interface CameraAttachment {
  type: 'camera';
  id: string;
  timestamp: number;
  dataUrl: string;
}

export interface DocumentChunk {
  id: string;
  index: number;
  content: string;
  tokenEstimate: number;
}

export interface DocumentAttachment {
  type: 'document';
  id: string;
  name: string;
  mimeType: string;
  size: number;
  extractedText: string;
  summary?: string;
  chunks?: DocumentChunk[];
  totalPages?: number;
}

export type Attachment = ImageAttachment | ScreenshotAttachment | CameraAttachment | DocumentAttachment;

export interface Message {
  id: string;
  requestId?: string;
  role: UserRole;
  content: string;
  spokenText?: string;
  timestamp: number;
  modelUsed?: string;
  modality?: ModalityType;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  messages: Message[];
  activeDocument?: DocumentAttachment;
  createdAt: number;
  updatedAt: number;
}

export interface ChatRequestPayload {
  requestId: string;
  conversationId?: string;
  message: string;
  image?: {
    dataUrl: string;
    mimeType?: string;
    name?: string;
  };
  screenshot?: {
    dataUrl: string;
  };
  screenActive?: boolean;
  cameraFrame?: {
    dataUrl: string;
  };
  cameraActive?: boolean;
  documentId?: string;
  voiceMode?: boolean;
}

export interface ModelResponsePayload {
  id: string;
  requestId: string;
  conversationId: string;
  text: string;
  spokenText: string;
  modelUsed: string;
  provider: string;
  latencyMs: number;
  modality: ModalityType;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface DocumentUploadResponse {
  success: boolean;
  document: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    textLength: number;
    summary: string;
    chunksCount: number;
  };
}

export interface SystemStatusResponse {
  status: 'ok' | 'degraded' | 'error';
  primaryModel: string;
  visionModel: string;
  hasApiKey: boolean;
  uptime: number;
}

export interface APIErrorResponse {
  error: {
    code: string;
    message: string;
    userFriendlyMessage: string;
    details?: unknown;
  };
}
