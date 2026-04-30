import * as vscode from 'vscode';

/**
 * Webview provider for the vicode chat panel
 */
export class WebviewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(private readonly extensionUri: vscode.Uri) {}

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
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'ready':
          this.view?.show?.(true);
          break;
        case 'command':
          // Handle commands from webview
          break;
      }
    });
  }

  /**
   * Handle configuration changes
   */
  handleConfigChange() {
    if (this.view) {
      this.view.webview.postMessage({ type: 'configChanged' });
    }
  }

  /**
   * Get HTML for the webview
   */
  private getHtml(webview: vscode.Webview): string {
    // In production, this would load the built webview assets
    // For now, we return a placeholder
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'main.css')
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
  <div id="root">
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; color: var(--vscode-editor-foreground);">
      Loading vicode...
    </div>
  </div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
