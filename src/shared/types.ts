/**
 * IPC message types for extension ↔ webview communication
 */

// Base message interface
export interface BaseMessage {
  type: string;
  id?: string;
  timestamp: number;
}

// Messages from Webview → Extension Host
export interface ReadyMessage extends BaseMessage {
  type: 'ready';
  payload?: Record<string, never>;
}

export interface ChatMessage extends BaseMessage {
  type: 'chat';
  payload: {
    content: string;
    role: 'user' | 'assistant';
  };
}

export interface CommandMessage extends BaseMessage {
  type: 'command';
  payload: {
    action: string;
    params?: Record<string, unknown>;
  };
}

export interface SandboxExecuteMessage extends BaseMessage {
  type: 'sandbox_execute';
  payload: {
    command: string;
    cwd?: string;
    timeout?: number;
  };
}

export interface ConfigUpdateMessage extends BaseMessage {
  type: 'config_update';
  payload: {
    key: string;
    value: unknown;
  };
}

export type OutgoingMessage = ReadyMessage | ChatMessage | CommandMessage | SandboxExecuteMessage | ConfigUpdateMessage;

// Messages from Extension Host → Webview
export interface SandboxOutputMessage extends BaseMessage {
  type: 'sandbox_output';
  payload: {
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    status: 'running' | 'completed' | 'error' | 'timeout';
  };
}

export interface FileChangeEvent extends BaseMessage {
  type: 'file_change';
  payload: {
    uri: string;
    type: 'create' | 'change' | 'delete';
    diff?: string;
  };
}

export interface AiResponseMessage extends BaseMessage {
  type: 'ai_response';
  payload: {
    content: string;
    isStreaming: boolean;
    tokensUsed?: {
      prompt: number;
      completion: number;
      total: number;
    };
  };
}

export interface ConfigResponseMessage extends BaseMessage {
  type: 'config_response';
  payload: {
    config: Record<string, unknown>;
  };
}

export interface ErrorMessage extends BaseMessage {
  type: 'error';
  payload: {
    message: string;
    code?: string;
    stack?: string;
  };
}

export type IncomingMessage = SandboxOutputMessage | FileChangeEvent | AiResponseMessage | ConfigResponseMessage | ErrorMessage;

// Union types
export type WebviewMessage = OutgoingMessage;
export type ExtensionMessage = IncomingMessage;
export type AnyMessage = WebviewMessage | ExtensionMessage;

// Helper to check message types
export function isOutgoingMessage(msg: AnyMessage): msg is OutgoingMessage {
  return ['ready', 'chat', 'command', 'sandbox_execute', 'config_update'].includes(msg.type);
}

export function isIncomingMessage(msg: AnyMessage): msg is IncomingMessage {
  return ['sandbox_output', 'file_change', 'ai_response', 'config_response', 'error'].includes(msg.type);
}
