import * as vscode from 'vscode';
import { AnyMessage, ExtensionMessage, IncomingMessage, OutgoingMessage, isIncomingMessage } from '../shared/types';

/**
 * Webview provider for the vicode chat panel
 * Handles bidirectional IPC communication with webview
 */
export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private messageHandlers: Map<string, (message: OutgoingMessage) => Promise<any>> = new Map();

  constructor(private readonly extensionUri: vscode.Uri) {
    this.registerDefaultHandlers();
  }

  /**
   * Register default message handlers
   */
  private registerDefaultHandlers() {
    // Chat message handler
    this.registerHandler('chat', async (message) => {
      console.log('Chat message received:', message.payload);
      // TODO: Forward to AI service
      return { status: 'received' };
    });

    // Command handler
    this.registerHandler('command', async (message) => {
      console.log('Command received:', message.payload);
      // TODO: Route to appropriate command handler
      return { status: 'executed' };
    });

    // Sandbox execution handler
    this.registerHandler('sandbox_execute', async (message) => {
      console.log('Sandbox execution requested:', message.payload);
      // TODO: Execute in sandbox
      return { status: 'started' };
    });

    // Config update handler
    this.registerHandler('config_update', async (message) => {
      console.log('Config update:', message.payload);
      // TODO: Update configuration
      return { status: 'updated' };
    });
  }

  /**
   * Register a custom message handler
   */
  registerHandler(type: string, handler: (message: OutgoingMessage) => Promise<any>) {
    this.messageHandlers.set(type, handler);
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (rawMessage: AnyMessage) => {
      console.log('Received message from webview:', rawMessage.type);

      // Validate message
      if (!rawMessage.type || !rawMessage.timestamp) {
        this.sendError({
          message: 'Invalid message format',
          code: 'INVALID_FORMAT'
        });
        return;
      }

      // Route to appropriate handler
      const handler = this.messageHandlers.get(rawMessage.type);
      if (handler) {
        try {
          const result = await handler(rawMessage as OutgoingMessage);

          // Send response back to webview if message has ID
          if (rawMessage.id) {
            this.postMessage({
              type: 'response',
              id: rawMessage.id,
              timestamp: Date.now(),
              payload: result
            } as ExtensionMessage);
          }
        } catch (error) {
          console.error('Error handling message:', error);
          this.sendError({
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'HANDLER_ERROR',
            stack: error instanceof Error ? error.stack : undefined
          });
        }
      } else {
        console.warn('No handler for message type:', rawMessage.type);
        this.sendError({
          message: `Unknown message type: ${rawMessage.type}`,
          code: 'UNKNOWN_TYPE'
        });
      }
    });
  }

  /**
   * Send message to webview
   */
  postMessage(message: ExtensionMessage): boolean {
    if (!this.view) {
      console.warn('Webview not available, cannot send message');
      return false;
    }

    this.view.webview.postMessage(message);
    return true;
  }

  /**
   * Send error to webview
   */
  private sendError(error: { message: string; code?: string; stack?: string }) {
    this.postMessage({
      type: 'error',
      timestamp: Date.now(),
      payload: error
    });
  }

  /**
   * Handle configuration changes
   */
  handleConfigChange() {
    this.postMessage({
      type: 'config_response',
      timestamp: Date.now(),
      payload: {
        config: vscode.workspace.getConfiguration('vicode').inspect('')?.workspaceValue || {}
      }
    });
  }

  /**
   * Get HTML for the webview
   */
  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'index.D_z23b8Q.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'index.CEDSY7Tl.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
  <link href="${styleUri}" rel="stylesheet">
  <title>vicode</title>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
