import * as vscode from 'vscode';
import { WebviewProvider } from './host/WebviewProvider';

/**
 * vicode - AI Sandbox Visualizer
 * Extension entry point
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('vicode extension is now active');

  // Register the webview panel provider
  const webviewProvider = new WebviewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('vicode.chat', webviewProvider)
  );

  // Register command to open panel
  context.subscriptions.push(
    vscode.commands.registerCommand('vicode.openPanel', () => {
      vscode.commands.executeCommand('vicode.chat.focus');
    })
  );

  // Register configuration change listener
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('vicode')) {
        webviewProvider.handleConfigChange();
      }
    })
  );
}

export function deactivate() {
  console.log('vicode extension deactivated');
}
