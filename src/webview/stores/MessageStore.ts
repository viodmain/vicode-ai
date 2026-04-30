import { create } from 'zustand';
import { AnyMessage, IncomingMessage, OutgoingMessage } from '../../shared/types';
import { vscodeApi } from '../utils/vscode';

interface MessageState {
  messages: AnyMessage[];
  pendingResponses: Map<string, { resolve: (value: any) => void; reject: (error: Error) => void }>;

  // Actions
  addMessage: (message: AnyMessage) => void;
  sendMessage: <T = any>(message: OutgoingMessage, timeout?: number) => Promise<T>;
  handleMessage: (message: IncomingMessage) => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  pendingResponses: new Map(),

  addMessage: (message: AnyMessage) => {
    set((state) => ({
      messages: [...state.messages, message]
    }));
  },

  sendMessage: <T = any>(message: OutgoingMessage, timeout = 30000): Promise<T> => {
    return new Promise((resolve, reject) => {
      const id = message.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      message.id = id;

      // Set timeout
      const timer = setTimeout(() => {
        get().pendingResponses.delete(id);
        reject(new Error(`Message timeout: ${message.type}`));
      }, timeout);

      get().pendingResponses.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          get().pendingResponses.delete(id);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          get().pendingResponses.delete(id);
          reject(error);
        }
      });

      get().addMessage(message);
      vscodeApi.postMessage(message);
    });
  },

  handleMessage: (message: IncomingMessage) => {
    get().addMessage(message);

    // Resolve pending promise if this is a response
    if (message.id) {
      const pending = get().pendingResponses.get(message.id);
      if (pending) {
        pending.resolve(message.payload);
      }
    }
  },

  clearMessages: () => {
    set({ messages: [], pendingResponses: new Map() });
  }
}));
