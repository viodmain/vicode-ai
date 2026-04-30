import { AnyMessage } from '../../shared/types';

// VS Code API type declaration
declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  setState(state: any): void;
  getState(): any;
};

/**
 * VS Code API wrapper for webview
 * Provides type-safe communication with extension host
 */
class VsCodeApiWrapper {
  private vscode: ReturnType<typeof acquireVsCodeApi> | null = null;
  private messageQueue: AnyMessage[] = [];
  private isReady = false;

  constructor() {
    try {
      this.vscode = (window as any).acquireVsCodeApi();
      this.isReady = true;
      // Process any queued messages
      this.flushQueue();
    } catch (e) {
      console.warn('VS Code API not available, messages will be queued');
    }
  }

  /**
   * Initialize message listener
   */
  init(listener: (event: MessageEvent) => void): void {
    window.addEventListener('message', listener);
  }

  /**
   * Send message to extension host
   */
  postMessage(message: AnyMessage): void {
    if (!this.vscode) {
      console.warn('VS Code API not available, queuing message');
      this.messageQueue.push(message);
      return;
    }

    // Ensure message has timestamp
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }

    this.vscode.postMessage(message);
  }

  /**
   * Flush queued messages
   */
  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.postMessage(message);
    }
  }

  /**
   * Check if VS Code API is ready
   */
  get ready(): boolean {
    return this.isReady;
  }
}

// Singleton instance
export const vscodeApi = new VsCodeApiWrapper();
