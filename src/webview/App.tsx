import { useState, useEffect } from 'react';
import './App.css';

/**
 * Main App component for vicode webview
 */
function App() {
  const [vscode, setVscode] = useState<any>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get VS Code API
    const vscodeAPI = (window as any).acquireVsCodeApi();
    setVscode(vscodeAPI);

    // Send ready message
    vscodeAPI.postMessage({ type: 'ready' });

    // Listen for messages from extension host
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'configChanged':
          console.log('Config changed');
          break;
      }
    };
    window.addEventListener('message', handler);

    return () => window.removeEventListener('message', handler);
  }, []);

  const sendMessage = () => {
    if (vscode && message.trim()) {
      vscode.postMessage({ type: 'command', payload: message });
      setMessage('');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>vicode</h1>
        <p className="subtitle">AI Sandbox Visualizer</p>
      </header>

      <main className="main">
        <div className="chat-section">
          <h2>Chat</h2>
          <div className="chat-input">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a command..."
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>

        <div className="sandbox-section">
          <h2>Sandbox Output</h2>
          <div className="sandbox-output">
            <p className="placeholder">Waiting for commands...</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
