# 项目计划书：vicode —— VS Code AI 沙箱可视化插件

## 1. 项目概述
**目标：** 开发一款名为 **vicode** 的 VS Code 插件，将 AI 编程助手与实时可视化的沙箱执行面板集成。左侧面板提供代码编辑与聊天界面；右侧面板可视化 AI 驱动的沙箱执行过程（终端输出流、文件变更、步骤时间轴）。

**核心价值：** 开发者无需切换上下文或手动运行命令，即可直观看到 AI 在隔离环境中执行的具体操作。

---

## 2. 技术架构与选型

| 层级 | 技术栈 | 选型理由 | 备选方案 |
|------|--------|----------|----------|
| **扩展主机 (Extension Host)** | TypeScript + VS Code Extension API | 官方强制要求，支持原生文件/终端访问，可发布至插件市场 | 无 |
| **Webview 界面** | React 18 + TypeScript + Vite | 热更新快、组件生态丰富、VS Code 官方推荐 | Svelte/Vue（生态较小）、原生 HTML/JS（维护成本高） |
| **状态管理** | Zustand | 轻量、可序列化、完美适配 webview ↔ host 同步 | Redux/Context（对 webview 来说过重） |
| **沙箱执行** | `node-pty` + `child_process` (MVP) → Docker (v2) | 低延迟、原生 PTY 支持、易于通过资源限制实现沙箱隔离 | WebContainers（仅限浏览器）、原生 `exec`（不支持交互式 Shell） |
| **文件变更追踪** | VS Code `FileSystemWatcher` + `diff` 库 | 利用 VS Code 原生文件系统事件，生成干净的代码补丁 | 手动轮询（效率低）、Git Hooks（需依赖仓库） |
| **AI 集成 (云端 API)** | OpenAI / Anthropic / Azure OpenAI API | 标准 Function Calling、流式响应 (SSE)、无需本地 GPU、开箱即用 | Ollama 本地（需 GPU，v2 可选） |
| **API Key 管理** | `vscode.SecretStorage` + 设置面板 | 加密存储于 VS Code 密钥链、支持多 Key 轮换、不写入磁盘明文 | 环境变量（不够安全）、配置文件明文（不推荐） |
| **流式通信** | Server-Sent Events (SSE) + `fetch` | 官方标准、自动重连、逐 Token 渲染、低延迟感知 | WebSocket（服务端复杂）、轮询（延迟高） |
| **Token 用量统计** | 响应头解析 + 本地计数器 | 实时显示消耗、配额预警、按会话累计 | 无统计（用户可能超支） |
| **重试与降级** | 指数退避 + 多 Provider 故障转移 | 网络抖动自动重试、主 Key 耗尽自动切换备用 | 单次请求失败即报错（体验差） |
| **敏感信息过滤** | 正则 + AST 扫描（本地预处理） | 发送前过滤 API Key/密码/Token，降低泄露风险 | 全量发送（隐私风险） |
| **IPC 通信** | `vscode.postMessage()` / `window.onmessage` | 官方安全方案、支持结构化 JSON | 自定义 WebSocket 服务（不必要的复杂度） |
| **构建流水线** | `esbuild` (扩展主机) + `vite` (webview) | 亚秒级构建、支持 Tree-shaking 与 Source Maps | `webpack`（较慢）、`rollup`（配置繁琐） |

### 架构图
```
┌──────────────────────────────────────────────────────────────────────┐
│                        VS Code 实例                                  │
│  ┌──────────────────────────────┐    ┌────────────────────────────┐ │
│  │  扩展主机 (Host)             │    │       Webview 面板         │ │
│  │  (Node.js / TS)              │    │   (React / Vite / TS)      │ │
│  │                              │    │                            │ │
│  │ • AI 上下文管理器            │◄──►│ • 聊天界面 (左侧)          │ │
│  │ • API Key 管理 (SecretStorage)│ IPC│ • 执行可视化面板           │ │
│  │ • 沙箱执行器                 │    │   (终端 + 文件树           │ │
│  │ • 文件监听 & 差异生成        │    │    + 步骤时间轴)           │ │
│  │ • Token 计数器 & 速率限制    │    │ • Token 用量显示           │ │
│  │ • 敏感信息过滤器             │    │                            │ │
│  └──────────────┬───────────────┘    └────────────────────────────┘ │
│                 │ HTTPS (SSE 流式)                                   │
└─────────────────┼───────────────────────────────────────────────────┘
                  │
          ┌───────▼────────┐
          │  云端 AI 服务   │
          │  OpenAI/Anthropic│
          │  (Function Calling)│
          └────────────────┘
```

---

## 3. 分阶段任务计划

### 🔹 第一阶段：基础架构与 MVP（第 1–2 周）
| 任务 ID | 任务名称 | 交付物 | 验收标准 |
|---------|----------|--------|----------|
| `1.1` | 项目脚手架与工具链配置 | `package.json`, `tsconfig`, `vite.config`, `esbuild.config`, `.vscodeignore` | `npm run dev` 可启动调试模式并支持热重载 |
| `1.2` | 扩展主机与 Webview 通信桥接 | `extension.ts`, `WebviewProvider.ts`, IPC 消息类型定义 | 双向 JSON 消息通信稳定，无数据丢失 |
| `1.3` | UI 布局与主题适配 | React 左右分栏布局，集成 VS Code 主题变量 | 布局符合线框图，自动适配浅色/深色模式 |
| `1.4` | 基础沙箱执行器 | `SandboxRunner.ts`（进程启动、标准输出/错误捕获、超时控制） | 可运行 `node script.js` 或 `python main.py`，并将输出流式渲染至 UI |

**里程碑 1 交付物：** 可运行的 MVP。用户在聊天框输入命令，插件启动进程，右侧面板实时显示终端输出。

---

### 🔹 第二阶段：AI 集成与实时可视化（第 3–4 周）
| 任务 ID | 任务名称 | 交付物 | 验收标准 |
|---------|----------|--------|----------|
| `2.0` | **API Key 配置与存储** | `ApiKeyManager.ts`、设置面板 UI | 支持在 VS Code 设置中安全输入/保存 Key；`SecretStorage` 加密存储；支持多 Provider 切换 |
| `2.1` | 聊天界面与上下文管理 | `ChatPanel.tsx`, `ConversationStore.ts`, 消息历史持久化 | 支持多轮对话，面板重新打开时保留历史记录 |
| `2.2` | AI 工具调用与执行流 | 工具定义 (`read_file`, `write_file`, `run_command`)，LLM 客户端封装 | AI 可通过结构化工具调用请求文件读写与命令执行 |
| `2.3` | 流式响应与逐 Token 渲染 | `StreamHandler.ts` (SSE 解析)、`ChatMessage.tsx` (打字机效果) | 响应首字延迟 <1s；Token 逐字渲染流畅不卡顿 |
| `2.4` | Token 用量统计与预警 | `TokenCounter.ts`、状态栏用量指示器 | 实时显示当前会话输入/输出 Token 数；超过阈值时弹出预警 |
| `2.5` | 沙箱输出流与文件追踪 | `TerminalStream.ts`, `FileWatcher.ts`, `DiffGenerator.ts` | 终端输出实时渲染；文件变更以绿/红高亮显示 |
| `2.6` | 可视化执行时间轴 | `TimelineView.tsx`, 步骤标记、状态指示器 | 展示 AI 顺序步骤（如 `读取 → 编辑 → 运行 → 通过`），可点击展开详情 |
| `2.7` | **重试与降级机制** | `RetryPolicy.ts` (指数退避)、`FallbackProvider.ts` | 网络超时自动重试 3 次；主 Key 耗尽/429 时自动切换备用 Key |
| `2.8` | **敏感信息过滤** | `Sanitizer.ts` (正则 + 配置规则) | 发送前自动替换 API Key/密码/Token 为 `[REDACTED]`；可配置自定义规则 |

**里程碑 2 交付物：** 完整 AI 闭环：聊天 → AI 提出变更 → 沙箱执行 → UI 可视化终端输出 + 文件差异 + 步骤时间轴。API Key 安全存储，Token 用量可见，网络故障自动恢复。

---

### 🔹 第三阶段：安全加固、体验优化与发布（第 5–6 周）
| 任务 ID | 任务名称 | 交付物 | 验收标准 |
|---------|----------|--------|----------|
| `3.1` | 沙箱安全与资源限制 | `SandboxLimiter.ts`（CPU/内存上限、超时、命令白名单） | 进程内存不超过 512MB，超时 10s，拦截破坏性命令 |
| `3.2` | 性能与 UX 优化 | 虚拟化终端、文件事件防抖、骨架屏加载 | 渲染 10k+ 终端行不卡顿；面板打开时间 <300ms |
| `3.3` | 测试与打包 | 单元测试 (`vitest`)、E2E 冒烟测试、`vsce` 打包配置 | 核心流程测试通过；`npm run package` 生成 `.vsix` |
| `3.4` | 文档与市场发布准备 | `README.md`, `CHANGELOG.md`, 图标、截图、`extension.json` 元数据 | 符合 VS Code 插件市场提交标准 |

**里程碑 3 交付物：** 生产级插件，含完整文档、测试覆盖、打包就绪，可提交至插件市场。

---

## 4. 核心技术挑战与应对策略

| 挑战 | 风险等级 | 应对策略 |
|------|----------|----------|
| **网络依赖与断网降级** | 高 | 检测网络状态，断网时禁用 AI 功能并提示；支持离线模式（仅沙箱执行，无 AI） |
| **高频终端输出导致 Webview 性能下降** | 高 | 消息批处理（50ms 窗口）、使用 `xterm.js` 虚拟化渲染、丢弃不可见帧 |
| **Token 成本失控** | 高 | 智能上下文裁剪（仅保留变更文件 + 近期消息）、会话级用量上限、超额自动暂停 |
| **API Key 泄露风险** | 高 | `vscode.SecretStorage` 加密存储、不写入磁盘、不记录日志、支持 Key 轮换 |
| **沙箱安全隔离** | 高 | 初期采用严格白名单 + `ulimit`/`timeout`；v2 迁移至 Docker/gVisor 实现完全隔离 |
| **敏感代码/凭据外泄至云端** | 中 | 本地预处理过滤 API Key/密码/Token（正则 + AST）；支持用户配置排除文件模式 |
| **速率限制 (Rate Limit) 与 429 错误** | 中 | 指数退避重试、多 Provider 故障转移、排队限流（队列满时提示用户） |
| **流式响应中断/网络抖动** | 中 | SSE 自动重连机制、断点续传、已生成内容缓存避免重复请求 |
| **文件变更竞态条件 (AI 编辑 vs 用户编辑)** | 中 | 使用 VS Code `WorkspaceEdit` API 保证原子事务；同区域冲突时弹出警告 |
| **跨平台兼容性 (macOS/Windows/Linux)** | 中 | 抽象 PTY 启动逻辑，使用 `node-pty` 屏蔽 OS 差异；CI 覆盖三大平台测试 |

---

## 5. 开发工作流与工具链

```bash
# 推荐开发命令
npm run dev          # 监听模式：扩展主机 + webview 同步热更新
npm run test         # Vitest 单元测试
npm run lint         # ESLint + Prettier 代码规范检查
npm run package      # 构建生产环境 .vsix 包
npm run publish      # 发布至插件市场（需配置 Token）
```

**仓库目录结构：**
```
vicode/
├── src/
│   ├── extension.ts          # VS Code 插件入口
│   ├── host/                 # 扩展主机逻辑
│   │   ├── ai/               # LLM 客户端与工具路由
│   │   │   ├── LLMClient.ts          # 统一 LLM 接口 (OpenAI/Anthropic 适配)
│   │   │   ├── ApiKeyManager.ts      # SecretStorage 加密存储 + 多 Key 轮换
│   │   │   ├── StreamHandler.ts      # SSE 流式解析 + 自动重连
│   │   │   ├── TokenCounter.ts       # 用量统计 + 预警
│   │   │   ├── RetryPolicy.ts        # 指数退避 + 故障转移
│   │   │   └── Sanitizer.ts          # 敏感信息本地过滤
│   │   ├── sandbox/          # 进程执行器与资源限制器
│   │   │   ├── SandboxRunner.ts
│   │   │   └── SandboxLimiter.ts
│   │   └── fs/               # 文件监听与差异生成器
│   │       ├── FileWatcher.ts
│   │       └── DiffGenerator.ts
│   └── webview/              # React 前端
│       ├── components/       # 聊天、时间轴、终端、文件树组件
│       │   ├── ChatPanel.tsx
│       │   ├── ChatMessage.tsx       # 打字机效果渲染
│       │   ├── TimelineView.tsx
│       │   ├── TerminalView.tsx
│       │   └── FileTree.tsx
│       ├── stores/           # Zustand 状态管理
│       │   ├── ConversationStore.ts
│       │   └── SandboxStore.ts
│       └── utils/            # IPC 桥接、格式化工具
├── tests/
├── assets/                   # 图标、截图资源
├── package.json
├── tsconfig.json
├── vite.config.ts
└── esbuild.config.js
```

---

## 6. 下一步行动

1. **确认本计划书** 或调整范围/技术选型
2. **初始化代码仓库** 并生成脚手架（第一阶段 1.1）
3. **配置 AI 供应商**（选定 OpenAI/Anthropic，配置 API Key 至 `SecretStorage`）
4. **启动第一阶段 1.2**（扩展主机与 Webview 通信桥接开发）
5. **启动第二阶段 2.0**（API Key 管理面板 + 流式响应链路联调）

---

## 附录：云端 API 方案 vs 本地模型方案对比

| 维度 | 云端 API (本方案) | 本地模型 (Ollama 等) |
|------|-------------------|----------------------|
| **硬件要求** | 无（仅需网络） | 需 GPU / 大内存（通常 16GB+） |
| **响应延迟** | 网络 RTT + 推理（首字 0.5–2s） | 仅推理延迟（取决于硬件，通常 2–10s） |
| **模型能力** | 最新最强模型（GPT-4o、Claude 3.5） | 受限于开源模型（Llama 3、Mistral 等） |
| **成本** | 按 Token 计费（~$5–20/月/人） | 电费 + 硬件折旧（一次性投入） |
| **隐私** | 代码发送至第三方服务器（需过滤） | 代码不出本地（最高隐私） |
| **离线可用** | ❌ 需网络 | ✅ 完全离线 |
| **速率限制** | 有（RPM/TPM 限制，需重试/排队） | 无（受限于本地算力） |
| **适用场景** | 个人开发者、团队标准开发 | 企业内网、涉密项目、无网环境 |

**建议：** 优先实现云端 API 方案（覆盖 90%+ 用户），本地模型作为 v2 可选 Provider 通过统一接口接入。
