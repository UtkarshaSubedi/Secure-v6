import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { useCrypto } from './CryptoContext';

// Simple in-memory room storage
const rooms = new Map<string, {
  creator: string,
  listeners: Set<(message: any) => void>
}>();

interface ChatContextType {
  messages: Message[];
  isConnected: boolean;
  isPaired: boolean;
  pairingCode: string | null;
  sendMessage: (content: string, type: 'text' | 'image' | 'audio') => Promise<void>;
  generateCode: () => Promise<string>;
  joinChat: (code: string) => Promise<boolean>;
  leaveChat: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isPaired, setIsPaired] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [messageCallback, setMessageCallback] = useState<((message: any) => void) | null>(null);
  const [userId] = useState(() => uuidv4()); // Unique ID for each user session
  const crypto = useCrypto();

  // Cleanup when component unmounts or room changes
  useEffect(() => {
    return () => {
      if (pairingCode && messageCallback) {
        const room = rooms.get(pairingCode);
        if (room) {
          room.listeners.delete(messageCallback);
          if (room.listeners.size === 0) {
            rooms.delete(pairingCode);
          }
        }
      }
    };
  }, [pairingCode, messageCallback]);

  const generateCode = async (): Promise<string> => {
    try {
      await crypto.generateKeyPair();
      const code = await crypto.generatePairingCode();
      
      // Create a new room with creator ID
      rooms.set(code, {
        creator: userId,
        listeners: new Set()
      });
      
      setPairingCode(code);
      setIsPaired(true);
      return code;
    } catch (error) {
      console.error('Failed to generate code:', error);
      throw error;
    }
  };

  const joinChat = async (code: string): Promise<boolean> => {
    try {
      const room = rooms.get(code);
      if (!room) {
        console.log('Room not found:', code);
        return false;
      }

      // Don't allow creator to join their own room
      if (room.creator === userId) {
        console.log('Cannot join your own room');
        return false;
      }

      await crypto.generateKeyPair();
      setPairingCode(code);
      
      const callback = async (message: any) => {
        try {
          const newMessage: Message = {
            id: uuidv4(),
            content: message.content,
            type: message.type,
            timestamp: Date.now(),
            sender: 'peer',
            encrypted: true
          };
          
          setMessages(prev => [...prev, newMessage]);
        } catch (error) {
          console.error('Failed to process message:', error);
        }
      };
      
      setMessageCallback(callback);
      room.listeners.add(callback);
      setIsPaired(true);
      return true;
    } catch (error) {
      console.error('Failed to join chat:', error);
      return false;
    }
  };

  const sendMessage = async (content: string, type: 'text' | 'image' | 'audio'): Promise<void> => {
    if (!isPaired || !pairingCode) {
      throw new Error('Not connected or paired');
    }

    try {
      const message: Message = {
        id: uuidv4(),
        content,
        type,
        timestamp: Date.now(),
        sender: 'self',
        encrypted: true
      };

      setMessages(prev => [...prev, message]);

      // Broadcast to all listeners in the room
      const room = rooms.get(pairingCode);
      if (room) {
        room.listeners.forEach(listener => {
          if (listener !== messageCallback) {
            listener({ content, type });
          }
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const leaveChat = () => {
    if (pairingCode && messageCallback) {
      const room = rooms.get(pairingCode);
      if (room) {
        room.listeners.delete(messageCallback);
        if (room.listeners.size === 0) {
          rooms.delete(pairingCode);
        }
      }
    }
    setMessages([]);
    setIsPaired(false);
    setPairingCode(null);
    setMessageCallback(null);
    crypto.reset();
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isConnected,
        isPaired,
        pairingCode,
        sendMessage,
        generateCode,
        joinChat,
        leaveChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};