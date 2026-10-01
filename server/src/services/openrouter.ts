import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { doesModelSupportVision } from '../config/models.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
}

export interface CompletionOptions {
  model?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
  isVisionRequest?: boolean;
}

export interface CompletionResult {
  content: string;
  modelUsed: string;
  provider: string;
  latencyMs: number;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.openRouterApiKey;
    this.baseUrl = config.openRouterBaseUrl;
  }

  public updateApiKey(key: string) {
    this.apiKey = key;
  }

  public hasKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Execute chat completion with timeout, retries, fallback chain, and abort support
   */
  public async createChatCompletion(options: CompletionOptions): Promise<CompletionResult> {
    if (!this.hasKey()) {
      throw new Error('CONFIG_ERROR: OpenRouter API key is missing. Please set OPENROUTER_API_KEY in your environment or .env file.');
    }

    // Determine target model
    let targetModel = options.model || (options.isVisionRequest ? config.visionModel : config.primaryModel);

    // If this is a vision request, ensure the model actually supports images
    if (options.isVisionRequest && !doesModelSupportVision(targetModel)) {
      logger.warn(`Configured model ${targetModel} does not support vision! Dynamically routing to vision model: ${config.visionModel}`);
      targetModel = config.visionModel;
    }

    const fallbackList = options.isVisionRequest 
      ? [targetModel, 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', 'openrouter/free']
      : [targetModel, 'nvidia/nemotron-3-super-120b-a12b:free', 'nvidia/nemotron-3.5-lightning:free', 'openrouter/free'];

    let lastError: Error | null = null;

    for (const modelToTry of fallbackList) {
      if (!modelToTry) continue;
      
      const startTime = Date.now();
      try {
        logger.info(`Sending chat completion to OpenRouter using model: ${modelToTry} (vision: ${!!options.isVisionRequest})`);
        
        const result = await this.executeRequestWithRetry(modelToTry, options, 2);
        const latencyMs = Date.now() - startTime;
        
        logger.info(`Received completion from ${result.model || modelToTry} in ${latencyMs}ms`);

        const choice = result.choices?.[0];
        const content = choice?.message?.content || (choice?.message as { reasoning?: string; reasoning_content?: string })?.reasoning || (choice?.message as { reasoning?: string; reasoning_content?: string })?.reasoning_content || '';

        return {
          content,
          modelUsed: result.model || modelToTry,
          provider: (result as { provider?: string }).provider || 'OpenRouter',
          latencyMs,
          tokens: result.usage ? {
            prompt: result.usage.prompt_tokens,
            completion: result.usage.completion_tokens,
            total: result.usage.total_tokens
          } : undefined
        };
      } catch (err: unknown) {
        lastError = err as Error;
        const msg = (err as Error).message || String(err);
        
        // If the request was aborted by user interruption, do NOT try fallbacks, throw immediately
        if (options.signal?.aborted || msg.includes('aborted') || msg.includes('AbortError')) {
          logger.info(`Request was cancelled by user interruption.`);
          throw new Error('REQUEST_ABORTED: The request was interrupted by the user.');
        }

        logger.warn(`Model ${modelToTry} failed: ${msg}. Attempting next candidate in fallback chain if available...`);
      }
    }

    throw lastError || new Error('All model candidates failed to respond.');
  }

  private async executeRequestWithRetry(
    model: string, 
    options: CompletionOptions, 
    maxRetries = 2
  ): Promise<{ choices?: Array<{ message?: { content?: string } }>; model?: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
    let attempt = 0;
    let delay = 1000;

    while (attempt <= maxRetries) {
      attempt++;
      
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), config.requestTimeoutMs);

      // Merge signals if an external signal was passed
      const combinedSignal = options.signal ? 
        this.combineAbortSignals(options.signal, timeoutController.signal) : 
        timeoutController.signal;

      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Multimodal Voice Assistant'
          },
          body: JSON.stringify({
            model,
            messages: options.messages,
            max_tokens: options.maxTokens || 1024,
            temperature: options.temperature ?? 0.6
          }),
          signal: combinedSignal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = (await response.json()) as {
            error?: { message?: string; code?: number };
            choices?: Array<{ message?: { content?: string } }>;
            model?: string;
            usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
          };

          if (json.error || !json.choices || json.choices.length === 0) {
            throw new Error(`OpenRouter Upstream Error: ${json.error?.message || 'No choices returned by model'}`);
          }

          return json;
        }

        const status = response.status;
        const errorText = await response.text();
        let parsedError: { error?: { message?: string; code?: number } } = {};
        try {
          parsedError = JSON.parse(errorText);
        } catch {
          // raw string
        }

        const errorMessage = parsedError.error?.message || errorText || `HTTP ${status}`;

        // Rate limit (429) or transient provider overload (503 / 502)
        if ((status === 429 || status === 502 || status === 503) && attempt <= maxRetries) {
          logger.warn(`Transient OpenRouter ${status} error for ${model}. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        throw new Error(`OpenRouter Error (${status}): ${errorMessage}`);
      } catch (err: unknown) {
        clearTimeout(timeoutId);

        if (options.signal?.aborted) {
          throw new Error('REQUEST_ABORTED: Cancelled by user.');
        }

        if ((err as Error).name === 'AbortError') {
          throw new Error(`OpenRouter request timed out after ${config.requestTimeoutMs / 1000}s`);
        }

        if (attempt <= maxRetries && !((err as Error).message.includes('CONFIG_ERROR'))) {
          logger.warn(`Network/Request error on attempt ${attempt}: ${(err as Error).message}. Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        throw err;
      }
    }

    throw new Error(`Exceeded maximum retries for model ${model}`);
  }

  private combineAbortSignals(signal1: AbortSignal, signal2: AbortSignal): AbortSignal {
    const controller = new AbortController();
    const abortHandler = () => controller.abort();
    signal1.addEventListener('abort', abortHandler);
    signal2.addEventListener('abort', abortHandler);
    if (signal1.aborted || signal2.aborted) {
      controller.abort();
    }
    return controller.signal;
  }
}

export const openRouterClient = new OpenRouterClient();
