/**
 * Centralized API & WebSocket Configuration for SentinelSwarm SOC
 */

const getBackendHost = () => {
  if (typeof window !== 'undefined' && window.location) {
    return window.location.hostname || '127.0.0.1';
  }
  return '127.0.0.1';
};

const getProtocol = (secureProtocol, defaultProtocol) => {
  if (typeof window !== 'undefined' && window.location && window.location.protocol === 'https:') {
    return secureProtocol;
  }
  return defaultProtocol;
};

// API Base URL
export const API_URL = import.meta.env.VITE_API_URL || `${getProtocol('https:', 'http:')}//${getBackendHost()}:8000`;

// WebSocket URL
export const WS_URL = import.meta.env.VITE_WS_URL || `${getProtocol('wss:', 'ws:')}//${getBackendHost()}:8000/ws`;
