export interface ModelCapability {
  id: string;
  name: string;
  supportsImages: boolean;
  supportsStreaming: boolean;
  maxTokens: number;
  isVisionSpecialist: boolean;
}

export const KNOWN_MODELS: Record<string, ModelCapability> = {
  'nvidia/nemotron-3-ultra-550b-a55b:free': {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'NVIDIA Nemotron 3 Ultra (Free)',
    supportsImages: false,
    supportsStreaming: true,
    maxTokens: 4096,
    isVisionSpecialist: false
  },
  'nvidia/nemotron-3-ultra-550b-a55b': {
    id: 'nvidia/nemotron-3-ultra-550b-a55b',
    name: 'NVIDIA Nemotron 3 Ultra',
    supportsImages: false,
    supportsStreaming: true,
    maxTokens: 4096,
    isVisionSpecialist: false
  },
  'nvidia/nemotron-3.5-lightning:free': {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'NVIDIA Nemotron 3.5 Lightning (Free)',
    supportsImages: false,
    supportsStreaming: true,
    maxTokens: 4096,
    isVisionSpecialist: false
  },
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    name: 'NVIDIA Nemotron 3 Nano Omni Vision (Free)',
    supportsImages: true,
    supportsStreaming: true,
    maxTokens: 4096,
    isVisionSpecialist: true
  },
  'openrouter/free': {
    id: 'openrouter/free',
    name: 'OpenRouter Free Multimodal Router',
    supportsImages: true,
    supportsStreaming: true,
    maxTokens: 4096,
    isVisionSpecialist: true
  }
};

export function doesModelSupportVision(modelId: string): boolean {
  if (KNOWN_MODELS[modelId]) {
    return KNOWN_MODELS[modelId].supportsImages;
  }
  // Generic heuristics for vision identifiers
  const lower = modelId.toLowerCase();
  return (
    lower.includes('vision') ||
    lower.includes('vl') ||
    lower.includes('omni') ||
    lower.includes('gemma-4') ||
    lower.includes('gemini') ||
    lower.includes('qwen-vl') ||
    lower.includes('qwen3.8')
  );
}
