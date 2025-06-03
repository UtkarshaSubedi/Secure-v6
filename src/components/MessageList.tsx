import React from 'react';
import { Message } from '../types';
import { Lock, AlertTriangle } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
}

const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Group messages by day
  const groupedMessages = messages.reduce<{ date: string; messages: Message[] }[]>((groups, message) => {
    const date = new Date(message.timestamp).toLocaleDateString();
    
    // Find existing group or create new one
    const group = groups.find(g => g.date === date);
    if (group) {
      group.messages.push(message);
    } else {
      groups.push({ date, messages: [message] });
    }
    
    return groups;
  }, []);
  
  return (
    <div className="space-y-6">
      {groupedMessages.map((group) => (
        <div key={group.date}>
          <div className="flex justify-center mb-4">
            <div className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">
              {group.date}
            </div>
          </div>
          
          <div className="space-y-3">
            {group.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'self' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === 'self'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-gray-700 text-gray-100 rounded-bl-none'
                  }`}
                >
                  {/* Message content based on type */}
                  {message.type === 'text' && <p>{message.content}</p>}
                  
                  {message.type === 'image' && (
                    <div className="my-1">
                      <img
                        src={message.content}
                        alt="Encrypted image"
                        className="rounded max-h-60 max-w-full"
                      />
                    </div>
                  )}
                  
                  {message.type === 'audio' && (
                    <div className="my-1">
                      <audio controls className="w-full max-w-[240px]">
                        <source src={message.content} type="audio/wav" />
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  )}
                  
                  {/* Message footer with time and encryption status */}
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <span className="text-xs opacity-70">
                      {formatTime(message.timestamp)}
                    </span>
                    
                    {message.encrypted ? (
                      <Lock className="w-3 h-3 opacity-70" />
                    ) : (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-gray-500">
          <Lock className="w-8 h-8 mb-2 opacity-50" />
          <p>Your conversation is end-to-end encrypted</p>
          <p className="text-sm mt-1">Messages will disappear when you close this chat</p>
        </div>
      )}
    </div>
  );
};

export default MessageList;