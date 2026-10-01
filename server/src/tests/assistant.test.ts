import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTextForVoice } from '../utils/textCleaner.js';
import { IntentRouter } from '../agents/intentRouter.js';
import { ConversationMemory } from '../services/memory.js';
import { DocumentService } from '../services/document.js';
import { VisionAnalyzer } from '../services/vision.js';
import { doesModelSupportVision } from '../config/models.js';

test('TextCleaner converts markdown symbols and headers for voice synthesis', () => {
  const raw = '### System Status\n\n**Notice**: The database is `healthy`. For more info see [Docs](https://example.com).';
  const cleaned = cleanTextForVoice(raw);

  assert.ok(!cleaned.includes('###'));
  assert.ok(!cleaned.includes('**'));
  assert.ok(!cleaned.includes('`'));
  assert.ok(!cleaned.includes('https://'));
  assert.ok(cleaned.includes('System Status.'));
  assert.ok(cleaned.includes('database is healthy'));
});

test('TextCleaner removes robotic assistant filler greetings', () => {
  const raw = "Sure! I'd be happy to help you with that. The weather today is sunny.";
  const cleaned = cleanTextForVoice(raw);

  assert.ok(!cleaned.toLowerCase().startsWith('sure'));
  assert.ok(!cleaned.toLowerCase().includes('happy to help'));
  assert.ok(cleaned.includes('weather today is sunny'));
});

test('Model capability correctly distinguishes vision-capable models', () => {
  assert.equal(doesModelSupportVision('nvidia/nemotron-3-ultra-550b-a55b:free'), false);
  assert.equal(doesModelSupportVision('nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'), true);
  assert.equal(doesModelSupportVision('google/gemma-4-26b-a4b-it:free'), true);
  assert.equal(doesModelSupportVision('qwen/qwen-2-vl-72b-instruct:free'), true);
});

test('IntentRouter detects image analysis when image is attached', () => {
  const router = new IntentRouter();
  const decision = router.route({
    message: 'What is this?',
    hasImage: true,
    hasScreenshot: false,
    hasDocument: false
  });

  assert.equal(decision.intent, 'IMAGE_ANALYSIS');
  assert.equal(decision.modality, 'image');
  assert.equal(decision.requiresVision, true);
});

test('IntentRouter detects missing screenshot when screen analysis requested without capture', () => {
  const router = new IntentRouter();
  const decision = router.route({
    message: 'What is wrong on my screen?',
    hasImage: false,
    hasScreenshot: false,
    isScreenActive: false,
    hasDocument: false
  });

  assert.equal(decision.intent, 'SCREEN_ANALYSIS');
  assert.ok(decision.missingPrerequisiteNotice?.includes('screen capture'));
});

test('IntentRouter detects document analysis when document is active', () => {
  const router = new IntentRouter();
  const decision = router.route({
    message: 'Summarize the introduction',
    hasImage: false,
    hasScreenshot: false,
    hasDocument: true
  });

  assert.equal(decision.intent, 'DOCUMENT_ANALYSIS');
  assert.equal(decision.modality, 'document');
});

test('ConversationMemory manages sliding window and contextual compaction', () => {
  const memory = new ConversationMemory();
  const convId = 'test-session-1';

  // Add 15 turns
  for (let i = 1; i <= 15; i++) {
    memory.addMessage(convId, 'user', `Question number ${i}`);
    memory.addMessage(convId, 'assistant', `Answer number ${i}`);
  }

  const recent = memory.getRecentMessages(convId);
  assert.ok(recent.length <= 10);
  assert.ok(recent[recent.length - 1].content.includes('15'));

  const summary = memory.getContextSummary(convId);
  assert.ok(summary !== undefined);
  assert.ok(summary.includes('Previous conversation context'));
});

test('DocumentService chunks plain text and finds relevant chunks', async () => {
  const service = new DocumentService();
  const textBuffer = Buffer.from(
    'Chapter 1: The Foundations of AI Architecture.\nNeural networks are trained on large corpora.\n\n' +
    'Chapter 2: Audio Synthesis and Text-to-Speech.\nSpeech synthesis converts written text into phonetic sounds.\n\n' +
    'Chapter 3: Database Optimization and Indexing.\nB-tree indexes accelerate query lookup times.'
  );

  const doc = await service.processDocument(textBuffer, 'guide.txt', 'text/plain', textBuffer.length);
  assert.equal(doc.name, 'guide.txt');
  assert.ok(doc.chunks && doc.chunks.length > 0);

  const relevant = service.getRelevantChunksForQuery(doc, 'speech synthesis audio');
  assert.ok(relevant.length > 0);
  assert.ok(relevant[0].content.includes('Audio Synthesis'));
});

test('VisionAnalyzer validates data URL structure and bounds', () => {
  const analyzer = new VisionAnalyzer();
  const valid = analyzer.validateImageDataUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
  assert.equal(valid.isValid, true);

  const invalid = analyzer.validateImageDataUrl('not-an-image');
  assert.equal(invalid.isValid, false);
});
