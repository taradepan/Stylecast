export interface BridgeMessage {
  id: string;
  type: 'text' | 'notification' | 'command' | 'copilot' | 'code-extraction' | 'element-edit';
  source: 'vscode' | 'browser';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ElementEditData {
  original: {
    html: string;
    css: string;
    element: any;
    selector: string;
  };
  modified: {
    html: string;
    css: string;
    changes: string[];
  };
  context: {
    url: string;
    pageTitle: string;
    timestamp: string;
  };
}

export interface ConnectionStatus {
  connected: boolean;
  clientCount: number;
  port: number;
  uptime: number;
}

export interface ServerConfig {
  port: number;
  autoStart: boolean;
  maxConnections: number;
  messageHistoryLimit: number;
}