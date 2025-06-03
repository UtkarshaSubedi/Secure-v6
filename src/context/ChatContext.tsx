import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { useCrypto } from './CryptoContext';

// Use localStorage for room storage
const getRooms = () => {
  const rooms = localStorage.getItem('chatRooms');
  return rooms ? JSON.parse(rooms) : {};
};

const saveRooms = (rooms: any) => {
  localStorage.setItem('chatRooms', JSON.stringify(rooms));
};

// Setup BroadcastChannel for cross-tab communication
const broadcastChannel = new BroadcastChannel('chat_channel');

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
  const [userId] = useState(() => uuidv4());
  const crypto = useCrypto();

  useEffect(() => {
    // Listen for messages from other tabs
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'message' && event.data.roomCode === pairingCode) {
        const newMessage: Message = {
          id: uuidv4(),
          content: event.data.content,
          type: event.data.messageType,
          timestamp: Date.now(),
          sender: 'peer',
          encrypted: true
        };
        setMessages(prev => [...prev, newMessage]);
      } else if (event.data.type === 'room_closed' && event.data.roomCode === pairingCode) {
        leaveChat();
      }
    };

    return () => {
      broadcastChannel.onmessage = null;
    };
  }, [pairingCode]);

  const generateCode = async (): Promise<string> => {
    try {
      await crypto.generateKeyPair();
      const code = await crypto.generatePairingCode();
      
      // Save room to localStorage
      const rooms = getRooms();
      rooms[code] = {
        creator: userId,
        created: Date.now()
      };
      saveRooms(rooms);
      
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
      const rooms = getRooms();
      const room = rooms[code];
      
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

      // Broadcast message to other tabs
      broadcastChannel.postMessage({
        type: 'message',
        roomCode: pairingCode,
        content,
        messageType: type
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const leaveChat = () => {
    if (pairingCode) {
      const rooms = getRooms();
      if (rooms[pairingCode]?.creator === userId) {
        delete rooms[pairingCode];
        saveRooms(rooms);
        
        // Notify other tabs that the room is closed
        broadcastChannel.postMessage({
          type: 'room_closed',
          roomCode: pairingCode
        });
      }
    }
    setMessages([]);
    setIsPaired(false);
    setPairingCode(null);
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