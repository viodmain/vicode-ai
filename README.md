# vicode - AI Sandbox Visualizer

A VS Code extension that integrates an AI coding assistant with a real-time, visual sandbox execution panel.

## Features

- **Left Panel**: Code editing & chat interface
- **Right Panel**: Real-time visualization of AI-driven sandbox execution
  - Terminal output streaming
  - File change tracking
  - Step-by-step timeline

## Development

### Prerequisites
- Node.js 18+
- npm 10+

### Setup
```bash
npm install
```

### Build
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Package
```bash
npm run package
```

## Project Structure
```
vicode/
├── src/
│   ├── extension.ts          # VS Code extension entry point
│   ├── host/                 # Extension host logic
│   │   ├── ai/               # LLM client & tool routing
│   │   ├── sandbox/          # Process executor & limiter
│   │   └── fs/               # File watcher & diff generator
│   └── webview/              # React frontend
│       ├── components/       # Chat, Timeline, Terminal, FileTree
│       ├── stores/           # Zustand state management
│       └── utils/            # IPC bridge, formatters
├── dist/                     # Build output
├── tests/
└── assets/
```

## License
MIT
