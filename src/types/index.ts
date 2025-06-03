// Message types
export type MessageType = 'text' | 'image' | 'audio';

export interface Message {
  id: string;
  type: MessageType;
  content: string; // For text messages or data URLs for media
  timestamp: number;
  sender: 'self' | 'peer';
  encrypted: boolean;
  verified: boolean;
}

// Crypto types
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedData {
  iv: Uint8Array;
  data: Uint8Array;
}

export interface SignedData {
  data: any;
  signature: Uint8Array;
}

// Socket message types
export interface PairingRequest {
  type: 'pairing-request';
  pairingCode: string;
  publicKey: string; // Base64 encoded public key
}

export interface PairingResponse {
  type: 'pairing-response';
  publicKey: string; // Base64 encoded public key
  accepted: boolean;
}

export interface ChatMessage {
  type: 'chat-message';
  data: string; // Encrypted and Base64 encoded message
  iv: string; // Base64 encoded initialization vector
  signature: string; // Base64 encoded signature
}

export interface DisconnectMessage {
  type: 'disconnect';
}