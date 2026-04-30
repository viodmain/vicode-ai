# Project Plan: vicode — VS Code AI Sandbox Visualizer Extension

## 1. Project Overview
**Objective:** Build **vicode**, a VS Code extension that integrates an AI coding assistant with a real-time, visual sandbox execution panel. The left panel hosts code editing & chat; the right panel visualizes AI-driven sandbox execution (terminal streams, file changes, step timeline).

**Value Proposition:** Developers can see exactly what the AI is doing in an isolated environment without switching contexts or manually running commands.

---

## 2. Technical Architecture & Stack

| Layer | Technology | Rationale | Alternatives Considered |
|-------|------------|-----------|-------------------------|
| **Extension Host** | TypeScript + VS Code Extension API | Mandatory for marketplace distribution, native file/terminal access | N/A |
| **Webview UI** | React 18 + TypeScript + Vite | Fast HMR, component ecosystem, official VS Code recommendation | Svelte/Vue (less ecosystem), raw HTML/JS (harder to maintain) |
| **State Management** | Zustand | Lightweight, serializable, perfect for webview ↔ host sync | Redux/Context (overkill for webview scope) |
| **Sandbox Execution** | `node-pty` + `child_process` (MVP) → Docker (v2) | Low latency, native PTY support, easy to sandbox with resource limits | WebContainers (browser-only), raw `exec` (no interactive shells) |
| **File Change Tracking** | VS Code `FileSystemWatcher` + `diff` library | Leverages VS Code's native FS events, generates clean patches | Manual polling (inefficient), git hooks (requires repo) |
| **AI Integration (Cloud API)** | OpenAI / Anthropic / Azure OpenAI API | Standard Function Calling, SSE streaming, no local GPU required, plug-and-play | Ollama local (GPU needed, v2 optional) |
| **API Key Management** | `vscode.SecretStorage` + Settings UI | Encrypted in VS Code keychain, multi-key rotation, no plaintext on disk | Env vars (less secure), plain config files (not recommended) |
| **Streaming Communication** | Server-Sent Events (SSE) + `fetch` | Official standard, auto-reconnect, token-by-token rendering, low perceived latency | WebSocket (complex server), polling (high latency) |
| **Token Usage Tracking** | Response header parsing + local counter | Real-time display, quota alerts, per-session accumulation | No tracking (users may overspend) |
| **Retry & Fallback** | Exponential backoff + multi-Provider failover | Auto-retry on network jitter, automatic fallback when primary key exhausted | Single-fail error (poor UX) |
| **Sensitive Info Filtering** | Regex + AST scanning (local pre-processing) | Filter API keys/passwords/tokens before sending, reduce leakage risk | Blind forwarding (privacy risk) |
| **IPC Communication** | `vscode.postMessage()` / `window.onmessage` | Official, secure, supports structured JSON | Custom WebSocket server (unnecessary complexity) |
| **Build Pipeline** | `esbuild` (extension host) + `vite` (webview) | Sub-second builds, tree-shaking, source maps | `webpack` (slower), `rollup` (requires more config) |

### Architecture Diagram
```
┌──────────────────────────────────────────────────────────────────────┐
│                        VS Code Instance                              │
│  ┌──────────────────────────────┐    ┌────────────────────────────┐ │
│  │  Extension Host              │    │       Webview Panel        │ │
│  │  (Node.js / TS)              │    │   (React / Vite / TS)      │ │
│  │                              │    │                            │ │
│  │ • AI Context Manager         │◄──►│ • Chat Interface (Left)    │ │
│  │ • API Key Mgmt (SecretStorage)│IPC│ • Execution Visualizer     │ │
│  │ • Sandbox Executor           │    │   (Terminal + File Tree    │ │
│  │ • FS Watcher & Diff          │    │    + Step Timeline)        │ │
│  │ • Token Counter & Rate Limiter│   │ • Token Usage Display      │ │
│  │ • Sensitive Info Filter      │    │                            │ │
│  └──────────────┬───────────────┘    └────────────────────────────┘ │
│                 │ HTTPS (SSE Streaming)                              │
└─────────────────┼───────────────────────────────────────────────────┘
                  │
          ┌───────▼────────┐
          │  Cloud AI       │
          │  OpenAI/Anthropic│
          │  (Function Call)│
          └────────────────┘
```

---

## 3. Phased Task Plan

### 🔹 Phase 1: Foundation & MVP (Weeks 1–2)
| Task ID | Task | Deliverables | Acceptance Criteria |
|---------|------|--------------|---------------------|
| `1.1` | Project Scaffolding & Toolchain | `package.json`, `tsconfig`, `vite.config`, `esbuild.config`, `.vscodeignore` | `npm run dev` launches extension in debug mode with hot-reload |
| `1.2` | Extension Host & Webview Bridge | `extension.ts`, `WebviewProvider.ts`, IPC message types | Two-way JSON messaging works without data loss |
| `1.3` | UI Layout & Navigation | React app with left/right split, VS Code theme variables | Layout matches wireframe, adapts to light/dark mode |
| `1.4` | Basic Sandbox Executor | `SandboxRunner.ts` (spawn process, capture stdout/stderr, timeout) | Can run `node script.js` or `python main.py` and stream output to UI |

**Milestone 1 Deliverable:** Runnable MVP where user types a command in chat, extension spawns a process, and terminal output appears in the right panel.

---

### 🔹 Phase 2: AI Integration & Real-time Visualization (Weeks 3–4)
| Task ID | Task | Deliverables | Acceptance Criteria |
|---------|------|--------------|---------------------|
| `2.0` | **API Key Configuration & Storage** | `ApiKeyManager.ts`, settings panel UI | Secure input/save in VS Code settings; `SecretStorage` encryption; multi-Provider switching |
| `2.1` | Chat Interface & Context Management | `ChatPanel.tsx`, `ConversationStore.ts`, message history persistence | Supports multi-turn chat, preserves history across panel reopen |
| `2.2` | AI Tool Calling & Execution Flow | Tool definitions (`read_file`, `write_file`, `run_command`), LLM client wrapper | AI can request file reads/writes and command execution via structured tool calls |
| `2.3` | Streaming Response & Token-by-Token Rendering | `StreamHandler.ts` (SSE parsing), `ChatMessage.tsx` (typewriter effect) | First-token latency <1s; smooth per-token rendering without stutter |
| `2.4` | Token Usage Tracking & Alerts | `TokenCounter.ts`, status bar usage indicator | Real-time input/output token count per session; alert when threshold exceeded |
| `2.5` | Sandbox Output Streaming & File Tracking | `TerminalStream.ts`, `FileWatcher.ts`, `DiffGenerator.ts` | Terminal output renders in real-time; file changes show as green/red highlights |
| `2.6` | Visual Execution Timeline | `TimelineView.tsx`, step markers, status indicators | Shows sequential AI steps (e.g., `Read → Edit → Run → Pass`), clickable to expand details |
| `2.7` | **Retry & Fallback Mechanism** | `RetryPolicy.ts` (exponential backoff), `FallbackProvider.ts` | Auto-retry 3 times on timeout; automatic fallback when primary key exhausted/429 |
| `2.8` | **Sensitive Info Filtering** | `Sanitizer.ts` (regex + config rules) | Auto-replace API keys/passwords/tokens with `[REDACTED]` before sending; configurable custom rules |

**Milestone 2 Deliverable:** Full AI loop: chat → AI proposes changes → sandbox executes → UI visualizes terminal + file diffs + step timeline. API keys securely stored, token usage visible, network failures auto-recovered.

---

### 🔹 Phase 3: Security, Polish & Distribution (Weeks 5–6)
| Task ID | Task | Deliverables | Acceptance Criteria |
|---------|------|--------------|---------------------|
| `3.1` | Sandbox Security & Resource Limits | `SandboxLimiter.ts` (CPU/memory caps, timeout, allowlist) | Processes cannot exceed 512MB RAM, 10s timeout, blocked from destructive commands |
| `3.2` | Performance & UX Polish | Virtualized terminal, debounced file events, skeleton loaders | Handles 10k+ terminal lines without UI freeze; panel opens in <300ms |
| `3.3` | Testing & Packaging | Unit tests (`vitest`), E2E smoke tests, `vsce` packaging config | All core flows pass; `npm run package` produces `.vsix` |
| `3.4` | Documentation & Marketplace Prep | `README.md`, `CHANGELOG.md`, icon, screenshots, `extension.json` metadata | Ready for VS Code Marketplace submission |

**Milestone 3 Deliverable:** Production-ready extension, documented, tested, and packaged for distribution.

---

## 4. Key Technical Challenges & Mitigation

| Challenge | Risk Level | Mitigation Strategy |
|-----------|------------|---------------------|
| **Network dependency & offline degradation** | High | Detect network state, disable AI features when offline with clear messaging; support offline mode (sandbox-only, no AI) |
| **Webview performance with high-frequency terminal output** | High | Batch messages (50ms window), use `xterm.js` for virtualized rendering, drop non-visible frames |
| **Token cost runaway** | High | Smart context pruning (changed files + recent messages only), per-session usage cap, auto-pause on overage |
| **API Key leakage risk** | High | `vscode.SecretStorage` encrypted storage, no disk writes, no logging, support key rotation |
| **Sandbox security isolation** | High | Start with strict allowlists + `ulimit`/`timeout`; migrate to Docker/gVisor in v2 for full isolation |
| **Sensitive code/credentials leaking to cloud** | Medium | Local pre-processing to filter API keys/passwords/tokens (regex + AST); user-configurable file exclusion patterns |
| **Rate limiting (429 errors)** | Medium | Exponential backoff retry, multi-Provider failover, request queuing (notify user when queue full) |
| **Streaming response interruption / network jitter** | Medium | SSE auto-reconnect, checkpoint resume, cache generated content to avoid duplicate requests |
| **File change race conditions (AI edit vs user edit)** | Medium | Use VS Code `WorkspaceEdit` API with atomic transactions; show conflict warnings if user modifies same region |
| **Cross-platform compatibility (macOS/Windows/Linux)** | Medium | Abstract PTY spawning, use `node-pty` which handles OS differences; test on all 3 platforms in CI |

---

## 5. Development Workflow & Tooling

```bash
# Recommended dev commands
npm run dev          # Watch mode: extension + webview
npm run test         # Vitest unit tests
npm run lint         # ESLint + Prettier
npm run package      # Build production .vsix
npm run publish      # Publish to Marketplace (requires token)
```

**Repository Structure:**
```
vicode/
├── src/
│   ├── extension.ts          # VS Code entry point
│   ├── host/                 # Extension host logic
│   │   ├── ai/               # LLM client & tool routing
│   │   │   ├── LLMClient.ts          # Unified LLM interface (OpenAI/Anthropic adapter)
│   │   │   ├── ApiKeyManager.ts      # SecretStorage encryption + multi-key rotation
│   │   │   ├── StreamHandler.ts      # SSE streaming parser + auto-reconnect
│   │   │   ├── TokenCounter.ts       # Usage tracking + alerts
│   │   │   ├── RetryPolicy.ts        # Exponential backoff + failover
│   │   │   └── Sanitizer.ts          # Local sensitive info filtering
│   │   ├── sandbox/          # Process executor & limiter
│   │   │   ├── SandboxRunner.ts
│   │   │   └── SandboxLimiter.ts
│   │   └── fs/               # File watcher & diff generator
│   │       ├── FileWatcher.ts
│   │       └── DiffGenerator.ts
│   └── webview/              # React frontend
│       ├── components/       # Chat, Timeline, Terminal, FileTree components
│       │   ├── ChatPanel.tsx
│       │   ├── ChatMessage.tsx       # Typewriter effect rendering
│       │   ├── TimelineView.tsx
│       │   ├── TerminalView.tsx
│       │   └── FileTree.tsx
│       ├── stores/           # Zustand stores
│       │   ├── ConversationStore.ts
│       │   └── SandboxStore.ts
│       └── utils/            # IPC bridge, formatters
├── tests/
├── assets/                   # Icons, screenshots
├── package.json
├── tsconfig.json
├── vite.config.ts
└── esbuild.config.js
```

---

## 6. Next Steps

1. **Approve this plan** or request adjustments to scope/tech choices
2. **Initialize repository** with scaffolding (Phase 1.1)
3. **Set up AI provider** (choose OpenAI/Anthropic, configure API Key in `SecretStorage`)
4. **Begin Phase 1.2** (Extension Host + Webview Bridge)
5. **Begin Phase 2.0** (API Key management panel + streaming response integration)

---

## Appendix: Cloud API vs Local Model Comparison

| Dimension | Cloud API (This Plan) | Local Model (Ollama, etc.) |
|-----------|----------------------|----------------------------|
| **Hardware requirement** | None (network only) | GPU / high RAM required (typically 16GB+) |
| **Response latency** | Network RTT + inference (first token 0.5–2s) | Inference only (hardware-dependent, typically 2–10s) |
| **Model capability** | Latest & strongest (GPT-4o, Claude 3.5) | Limited to open-source models (Llama 3, Mistral, etc.) |
| **Cost** | Per-token billing (~$5–20/month/person) | Electricity + hardware depreciation (one-time) |
| **Privacy** | Code sent to third-party servers (filtering required) | Code never leaves local (maximum privacy) |
| **Offline available** | ❌ Requires network | ✅ Fully offline |
| **Rate limiting** | Yes (RPM/TPM limits, requires retry/queuing) | No (limited by local compute) |
| **Use case** | Individual developers, standard team development | Enterprise intranet, classified projects, offline environments |

**Recommendation:** Prioritize cloud API implementation (covers 90%+ users), add local model as optional v2 Provider via unified interface.
