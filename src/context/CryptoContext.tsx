import React, { createContext, useContext, useState, ReactNode } from 'react';
import { KeyPair, EncryptedData } from '../types';

interface CryptoContextType {
  keyPair: KeyPair | null;
  sharedSecret: CryptoKey | null;
  generateKeyPair: () => Promise<KeyPair>;
  generatePairingCode: () => Promise<string>;
  encryptMessage: (message: string) => Promise<EncryptedData>;
  decryptMessage: (encryptedData: EncryptedData) => Promise<string>;
  exportPublicKey: (key: CryptoKey) => Promise<string>;
  importPublicKey: (keyData: string) => Promise<CryptoKey>;
  reset: () => void;
}

const CryptoContext = createContext<CryptoContextType | null>(null);

export const useCrypto = () => {
  const context = useContext(CryptoContext);
  if (!context) {
    throw new Error('useCrypto must be used within a CryptoProvider');
  }
  return context;
};

export const CryptoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [sharedSecret, setSharedSecret] = useState<CryptoKey | null>(null);

  // Generate a new key pair
  const generateKeyPair = async (): Promise<KeyPair> => {
    const newKeyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      ['deriveKey']
    );

    const pair = {
      publicKey: newKeyPair.publicKey,
      privateKey: newKeyPair.privateKey
    };

    setKeyPair(pair);
    return pair;
  };

  // Generate a secure random pairing code
  const generatePairingCode = async (): Promise<string> => {
    const array = new Uint8Array(4);
    window.crypto.getRandomValues(array);
    const code = Array.from(array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .slice(0, 6);
    return code;
  };

  // Encrypt a message using AES-GCM
  const encryptMessage = async (message: string): Promise<EncryptedData> => {
    if (!sharedSecret) {
      throw new Error('No shared secret established');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      sharedSecret,
      data
    );

    return {
      data: new Uint8Array(encryptedData),
      iv
    };
  };

  // Decrypt a message using AES-GCM
  const decryptMessage = async (encryptedData: EncryptedData): Promise<string> => {
    if (!sharedSecret) {
      throw new Error('No shared secret established');
    }

    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encryptedData.iv
      },
      sharedSecret,
      encryptedData.data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  };

  // Export public key as base64
  const exportPublicKey = async (key: CryptoKey): Promise<string> => {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  };

  // Import public key from base64
  const importPublicKey = async (keyData: string): Promise<CryptoKey> => {
    const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    return window.crypto.subtle.importKey(
      'raw',
      binaryKey,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      []
    );
  };

  // Reset the crypto context
  const reset = () => {
    setKeyPair(null);
    setSharedSecret(null);
  };

  return (
    <CryptoContext.Provider
      value={{
        keyPair,
        sharedSecret,
        generateKeyPair,
        generatePairingCode,
        encryptMessage,
        decryptMessage,
        exportPublicKey,
        importPublicKey,
        reset
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
};