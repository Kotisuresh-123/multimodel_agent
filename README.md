# 🎙️ Multimodal AI Voice Assistant

A real-time, production-quality conversational multimodal voice assistant powered by **NVIDIA Nemotron 3 Ultra** and **OpenRouter**. Designed primarily as an interactive voice agent rather than a traditional text chatbot, featuring speech-to-text, natural voice synthesis with instant interruption handling, screenshot & screen sharing intelligence, image perception, and document analysis.

---

## 📑 Table of Contents
1. [Project Overview](#-project-overview)
2. [Architecture](#-architecture)
3. [Key Features](#-key-features)
4. [Prerequisites](#-prerequisites)
5. [Installation](#-installation)
6. [Environment Variables & Security](#-environment-variables--security)
7. [OpenRouter & Model Configuration](#-openrouter--model-configuration)
8. [Speech-to-Text (STT) & Text-to-Speech (TTS) Setup](#-speech-to-text-stt--text-to-speech-tts-setup)
9. [Running in Development Mode](#-running-in-development-mode)
10. [Building & Running in Production](#-building--running-in-production)
11. [How Multimodal Analysis Works](#-how-multimodal-analysis-works)
    - [Image Analysis](#image-analysis)
    - [Screenshot Capture & Analysis](#screenshot-capture--analysis)
    - [Permission-Based Screen Sharing](#permission-based-screen-sharing)
    - [Document Processing & QA](#document-processing--qa)
12. [Voice Interruption Architecture](#-voice-interruption-architecture)
13. [Privacy & Security Considerations](#-privacy--security-considerations)
14. [Testing & Verification](#-testing--verification)
15. [Troubleshooting & Known Limitations](#-troubleshooting--known-limitations)

---

## 🌟 Project Overview

The **Multimodal AI Voice Assistant** provides a hands-free conversational voice experience:
- **Natural Voice Interaction**: Speak directly to the assistant; receive concise, articulate spoken responses.
- **Instant Interruption**: If the assistant is speaking, start talking or tap the orb to immediately cut off speech and capture your new intent.
- **Multimodal Intelligence**: Seamlessly incorporate images, on-demand screenshots, active screen share streams, or documents (PDF, DOCX, TXT) into your voice conversation.
- **Zero API Key Leakage**: API credentials remain strictly confined to the backend server environment. The frontend client never has access to secrets.

---

## 🏗️ Architecture

```
[ CAPTURE LAYER ]
  │── Microphone (Browser Web Audio / MediaStream)
  │── Screenshot Capture (Single-frame DisplayMedia capture)
  │── Screen Sharing (Continuous permission-based stream)
  │── Image Upload (Drag-and-drop / File input for PNG, JPG, WEBP)
  └── Document Upload (PDF, DOCX, TXT)
        │
        ▼
[ PERCEPTION LAYER ]
  │── Speech-to-Text Service (Web Speech API with interim results & speech onset detection)
  │── Document Extraction & Chunking (pdf-parse, mammoth, token estimation, semantic scoring)
  └── Image / Vision Formatter (Base64 data URL validation & size control)
        │
        ▼
[ AGENT ORCHESTRATION LAYER ]
  │── Intent Router (Detects image, screen, document, or general reasoning intent)
  │── Conversation Memory (Sliding window + automatic contextual compaction)
  │── Model Router (Directs queries to Nemotron or Vision model dynamically)
  └── Request Deduplication & Abort Controller (Instant in-flight cancellation)
        │
        ▼
[ INFERENCE LAYER ]
  │── OpenRouter API Client (Endpoint: https://openrouter.ai/api/v1)
  │── Primary Reasoning: NVIDIA Nemotron 3 Ultra (`nvidia/nemotron-3-ultra-550b-a55b:free`)
  │── Fallback Reasoning: NVIDIA Nemotron 3 Super (`nvidia/nemotron-3-super-120b-a12b:free`)
  └── Vision Intelligence: NVIDIA Nemotron Omni (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`)
        │
        ▼
[ RESPONSE LAYER ]
  │── Text Sanitizer (Strips markdown headers, backticks, asterisks, URLs, and robotic fillers)
  │── TTS Service (Browser SpeechSynthesis with instant cancellation)
  └── Visual Transcript Panel (Attribution with model tags, timestamps, and attachment chips)
        │
        ▼
[ USER ] (Audio playback + interactive visual UI)
```

---

## 🚀 Key Features

1. **Central Voice Orb**:
   - Dynamic animated states: `IDLE`, `LISTENING`, `PROCESSING`, `ANALYZING_IMAGE`, `ANALYZING_SCREEN`, `ANALYZING_DOCUMENT`, `SPEAKING`, and `ERROR`.
   - Equalizer frequency bars during speech playback.
   - Interim speech bubble displaying transcribed words in real-time.
2. **Instant Interruption Handling**:
   - `speechSynthesis.cancel()` halts audio immediately.
   - Dispatches `/api/chat/interrupt` to terminate in-flight OpenRouter requests.
   - Switches instantly to `LISTENING` to capture the new turn without robotic filler apologies.
3. **Smart Model Routing**:
   - Text & Document QA routes to **NVIDIA Nemotron 3 Ultra**.
   - Visual queries route to **NVIDIA Nemotron 3 Nano Omni Vision** or **OpenRouter Multimodal Router**.
   - Transient 503/429 errors trigger controlled exponential backoff and seamless fallback to companion Nemotron models.
4. **Document Intelligence**:
   - Upload PDF, DOCX, or TXT documents up to 15MB.
   - In-memory chunking with overlap and relevance keyword scoring. Only relevant excerpts are passed into inference context.
5. **Screen Perception**:
   - One-click screen capture (snaps current screen/browser tab).
   - Live permission-based screen sharing with active indicator.
   - Say: *"What is happening on my screen?"* or *"Read the visible error"* to analyze on demand without flooding the API with continuous frames.

---

## 📦 Prerequisites

- **Node.js**: `v20.0.0` or higher (`v22.14.0+` recommended)
- **npm**: `v10.0.0` or higher
- **Modern Browser**: Google Chrome, Microsoft Edge, or Safari with Web Speech API and MediaDevices support.
- **OpenRouter API Key**: A valid key from [openrouter.ai/keys](https://openrouter.ai/keys).

---

## 🛠️ Installation

1. **Clone or navigate to the workspace directory**:
   ```bash
   cd "d:/hackathon 3"
   ```

2. **Install all dependencies** across root, server, and client:
   ```bash
   npm install
   ```

---

## 🔐 Environment Variables & Security

Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```

Configure your environment variables in `.env`:
```env
# OpenRouter API Key (Required for remote LLM inference)
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Primary Reasoning Model
OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free

# Vision-Capable Model for Image, Screenshot, and Screen Share Analysis
OPENROUTER_VISION_MODEL=nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free

# Ports
PORT=5000
CLIENT_PORT=3000
```

### Security Guarantees:
- **No Client Exposure**: `OPENROUTER_API_KEY` is loaded exclusively on the Node.js backend.
- **Safe Health Endpoint**: `/api/status` returns `{ hasApiKey: true }`, never leaking the key string.
- **Redacting Logger**: The server logger automatically redacts API keys, Bearer tokens, and secrets from all log streams.
- **Git Protection**: `.gitignore` prevents `.env` and uploaded files from being tracked in version control.

---

## 🧠 OpenRouter & Model Configuration

| Role | Model ID | Purpose |
| :--- | :--- | :--- |
| **Primary Reasoning** | `nvidia/nemotron-3-ultra-550b-a55b:free` | Core voice conversations, reasoning, calculations, and document QA. |
| **Fallback Reasoning** | `nvidia/nemotron-3-super-120b-a12b:free` | Activated automatically if upstream Nemotron 3 Ultra experiences transient provider overload. |
| **Vision Intelligence** | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Analyzes uploaded images, captured screenshots, and screen share frames. |
| **Vision Fallback** | `openrouter/free` | Fallback multimodal routing for vision queries. |

---

## 🔊 Speech-to-Text (STT) & Text-to-Speech (TTS) Setup

### Speech-to-Text (`SpeechRecognitionService`)
- Implemented in `client/src/services/stt.ts`.
- Uses the browser's native `window.webkitSpeechRecognition` / `window.SpeechRecognition`.
- Provides interim live speech transcription, silence detection, and immediate speech onset detection (`onspeechstart`).
- Fully isolated behind a modular interface allowing drop-in replacement with Whisper or custom STT backends.

### Text-to-Speech (`TTSService`)
- Implemented in `client/src/services/tts.ts`.
- Uses `window.speechSynthesis` with `SpeechSynthesisUtterance`.
- Automatically selects natural English neural voices (`Google US English`, `Microsoft Natural`, `Samantha`).
- Speed and voice selection configurable in the Settings modal.
- `cancel()` method enables instant, jitter-free interruption.

### Voice Text Sanitization (`textCleaner.ts`)
Before synthesis, all assistant outputs pass through `cleanTextForVoice()`:
- Converts markdown headers (`### Header` -> `Header.`)
- Strips backticks, code blocks, bold/italics, and URLs.
- Iteratively removes robotic filler openings (e.g. *"Sure! I'd be happy to help you with that"*).

---

## 💻 Running in Development Mode

Run both the backend server and frontend client concurrently:
```bash
npm run dev
```

Or run them individually in separate terminals:
- **Backend Server** (runs on `http://localhost:5000`):
  ```bash
  npm run dev:server
  ```
- **Frontend Client** (runs on `http://localhost:3000`):
  ```bash
  npm run dev:client
  ```

Open your browser to:
👉 **`http://localhost:3000`**

---

## 🏗️ Building & Running in Production

1. **Build both server and client bundles**:
   ```bash
   npm run build
   ```
   - Compiles TypeScript for the server into `server/dist/`.
   - Bundles the React application into `client/dist/`.

2. **Start the production server**:
   ```bash
   npm start
   ```
   The backend serves the compiled API endpoints and the static frontend from `http://localhost:5000`.

---

## 📷 How Multimodal Analysis Works

### Image Analysis
1. User clicks the **Image Upload** icon in the action dock or drops an image (PNG, JPG, WEBP).
2. The client renders an attachment chip with thumbnail preview.
3. The user speaks their question (e.g., *"What is in this image?"*).
4. The backend `IntentRouter` routes the payload to the configured vision model (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`).
5. Spoken analysis is synthesized and the attachment chip clears for follow-up turns.

### Screenshot Capture & Analysis
1. User clicks **Capture Screenshot** in the action dock.
2. The browser requests permission to select a window or screen.
3. A single high-resolution frame is captured to canvas, downscaled if necessary (max 1920px), and converted to a base64 JPEG.
4. User speaks: *"Explain this error on my screen"*.
5. The vision model analyzes UI state, errors, and visible text, returning a spoken summary.

### Permission-Based Screen Sharing
1. User clicks **Screen Sharing** in the dock.
2. An active status badge displays: `● Live Screen Sharing`.
3. The assistant does **NOT** stream continuous frames to OpenRouter (preserving bandwidth and token limits).
4. When the user asks: *"What am I looking at?"*, a single frame is extracted on demand and analyzed.
5. User can stop screen sharing anytime via the dock button or browser banner.

### Document Processing & QA
1. User clicks **Upload Document** and selects a PDF, DOCX, or TXT file (up to 15MB).
2. Backend extracts text (`pdf-parse` for PDF, `mammoth` for DOCX).
3. The document is chunked into overlapping segments with token estimation.
4. When the user asks a question, keyword and semantic scoring ranks the most relevant chunks.
5. Only the relevant excerpts are injected into the prompt context for **NVIDIA Nemotron 3 Ultra**, preventing token overflow.

---

## 🛑 Voice Interruption Architecture

The assistant supports real-time interruption:
```
Assistant is speaking (TTS active)
        │
        ▼
User speaks into microphone (or clicks Orb / Interrupt button)
        │
        ├── 1. Client calls `ttsService.cancel()` (Audio stops immediately)
        ├── 2. Client calls `AbortController.abort()` (Halts in-flight fetch)
        ├── 3. Client sends `POST /api/chat/interrupt` (Aborts backend model inference)
        └── 4. State switches to `LISTENING` (Captures new speech as latest turn)
```
The conversation continues naturally without meta-apologies like *"Sure, I understand you want me to stop"*.

---

## 🧪 Testing & Verification

### Running Automated Backend Tests
Run the unit test suite covering text cleaning, intent routing, memory compaction, document processing, and model capabilities:
```bash
npm test
```
All 9 unit test suites execute and validate:
- Markdown removal and robotic filler elimination
- Model vision capability detection
- Intent detection for images, screens, documents, and general queries
- Conversation memory sliding window & compaction
- Document text extraction and chunk selection
- Vision data URL validation

---

## 🛡️ Privacy & Security Considerations

- **Microphone**: Active only when the orb/dock button is in `LISTENING` state. Never recorded secretly.
- **Screen Capture**: Permission is required via standard browser `getDisplayMedia` dialog. Frames are captured on-demand only.
- **Document Handling**: Files are processed in memory and retained temporarily in session memory. No permanent disk persistence.
- **API Keys**: Stored in backend `.env`. Never sent to client JavaScript or stored in localStorage.

---

## ❓ Troubleshooting & Known Limitations

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **"Microphone access was denied"** | Browser permissions blocked mic | Click the lock/settings icon in the browser URL bar and allow microphone permissions. |
| **"Screen capture permission was cancelled"** | User dismissed browser screen picker | Click the camera or monitor icon again and select a window/screen to share. |
| **"The AI service is temporarily busy (429/503)"** | Upstream OpenRouter rate limit or provider overload | The system automatically retries with exponential backoff and switches to companion Nemotron models. Retry after a few seconds. |
| **STT not working in Firefox** | Firefox lacks default Web Speech STT | Use Chrome, Edge, or Safari for native voice recognition, or use the built-in Text Input fallback. |
| **Offline Banner Visible** | Network disconnected | Check your internet connection. Voice recognition and remote Nemotron inference require network access. |

---

## 📄 License
MIT License. Built for hackathon showcase with NVIDIA Nemotron and OpenRouter.
