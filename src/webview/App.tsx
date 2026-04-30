import { useEffect, useState } from 'react';
import { vscodeApi } from './utils/vscode';
import { useMessageStore } from './stores/MessageStore';
import { AnyMessage, IncomingMessage, OutgoingMessage } from '../shared/types';
import './App.css';

/**
 * Main App component for vicode webview
 */
function App() {
  const [inputValue, setInputValue] = useState('');
  const messages = useMessageStore((state) => state.messages);
  const sendMessage = useMessageStore((state) => state.sendMessage);
  const handleMessage = useMessageStore((state) => state.handleMessage);
  const clearMessages = useMessageStore((state) => state.clearMessages);

  useEffect(() => {
    // Initialize VS Code API
    vscodeApi.init((event: MessageEvent) => {
      const message = event.data as IncomingMessage;
      handleMessage(message);
    });

    // Send ready message
    vscodeApi.postMessage({
      type: 'ready',
      timestamp: Date.now(),
      payload: {}
    });

    // Cleanup
    return () => {
      clearMessages();
    };
  }, [handleMessage, clearMessages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    try {
      await sendMessage({
        type: 'chat',
        payload: {
          content: inputValue,
          role: 'user'
        },
        timestamp: Date.now()
      } as OutgoingMessage);

      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.type}`}>
                <div className="message-header">
                  <span className="message-type">{msg.type}</span>
                  <span className="message-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">
                  {msg.type === 'chat' && (
                    <p>{(msg as any).payload.content}</p>
                  )}
                  {msg.type === 'error' && (
                    <p className="error">{(msg as any).payload.message}</p>
                  )}
                  {msg.type === 'sandbox_output' && (
                    <pre>{(msg as any).payload.stdout || (msg as any).payload.stderr}</pre>
                  )}
                  {!['chat', 'error', 'sandbox_output'].includes(msg.type) && (
                    <pre>{JSON.stringify(msg.payload, null, 2)}</pre>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="placeholder">No messages yet. Start a conversation...</p>
            )}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
            />
            <button onClick={handleSend}>Send</button>
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
