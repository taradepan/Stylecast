import * as http from 'http';
import { WebSocket, WebSocketServer as WSServer } from 'ws';
import * as vscode from 'vscode';
import { BridgeMessage, ConnectionStatus } from './types';

export class WebSocketServer {
  private httpServer: http.Server | null = null;
  private wsServer: WSServer | null = null;
  private readonly port: number;
  private running = false;
  private startTime = 0;
  private readonly maxConnections: number;
  private readonly outputChannel: vscode.OutputChannel;

  constructor(
    private onMessage: (message: BridgeMessage) => void,
    port = 47823,
    maxConnections = 10,
    private onConnectionChange?: () => void
  ) {
    this.port = port;
    this.maxConnections = maxConnections;
    this.outputChannel = vscode.window.createOutputChannel('Stylecast Server');
  }

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    try {
      // Create HTTP server with CORS support
      this.httpServer = http.createServer((req, res) => {
        this.handleHttpRequest(req, res);
      });

      // Create WebSocket server
      this.wsServer = new WSServer({ 
        server: this.httpServer,
        maxPayload: 1024 * 1024, // 1MB max message size
      });

      this.setupWebSocketHandlers();

      // Start listening
      await new Promise<void>((resolve, reject) => {
        if (!this.httpServer) {
          reject(new Error('HTTP server not initialized'));
          return;
        }

        this.httpServer.listen(this.port, 'localhost', () => {
          this.running = true;
          this.startTime = Date.now();
          vscode.window.showInformationMessage(
            `Stylecast running on port ${this.port}`
          );
          this.outputChannel.appendLine(`WebSocket server started on http://localhost:${this.port}`);
          resolve();
        });

        this.httpServer.on('error', (error: any) => {
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          if (error.code === 'EADDRINUSE') {
            vscode.window.showErrorMessage(
              `Port ${this.port} is already in use. Please close other applications using this port.`
            );
          } else {
            vscode.window.showErrorMessage(`Failed to start WebSocket server: ${errorMessage}`);
          }
          reject(error);
        });
      });

    } catch (error) {
      this.outputChannel.appendLine(`Failed to start WebSocket server: ${error}`);
      throw error;
    }
  }

  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === '/health') {
      const status: ConnectionStatus = {
        connected: this.running,
        clientCount: this.getClientCount(),
        port: this.port,
        uptime: this.running ? Date.now() - this.startTime : 0
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'websocket-bridge',
        ...status,
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.wsServer) return;

    this.wsServer.on('connection', (ws: WebSocket, req) => {
      const clientIp = req.socket.remoteAddress;
      this.outputChannel.appendLine(`Browser extension connected from ${clientIp}`);

      // Check connection limit
      if (this.getClientCount() > this.maxConnections) {
        ws.close(1013, 'Server overloaded');
        return;
      }

      // Notify connection change
      this.onConnectionChange?.();

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection',
        status: 'connected',
        timestamp: Date.now(),
        serverInfo: {
          version: '1.0.0',
          port: this.port
        }
      });

      ws.on('message', (data) => {
        // PARALLEL PROCESSING: Parse and validate simultaneously
        const parsePromise = new Promise<BridgeMessage>((resolve, reject) => {
          try {
            const message: BridgeMessage = JSON.parse(data.toString());
            resolve(message);
          } catch (error) {
            reject(error);
          }
        });

        const validationPromise = parsePromise.then(message => {
          if (this.isValidMessage(message)) {
            return message;
          } else {
            throw new Error('Invalid message structure');
          }
        });

        // Handle message processing in parallel
        validationPromise
          .then(message => {
            // Use process.nextTick for better performance and compatibility
            process.nextTick(() => {
              this.onMessage(message);
            });
          })
          .catch(error => {
            this.outputChannel.appendLine(`Message error: ${error}`);
            this.sendToClient(ws, {
              type: 'error',
              message: 'Invalid message format',
              timestamp: Date.now()
            });
          });
      });

      ws.on('close', (code, reason) => {
        this.outputChannel.appendLine(`Browser extension disconnected: ${code} ${reason}`);
        // Notify connection change
        this.onConnectionChange?.();
      });

      ws.on('error', (error) => {
        this.outputChannel.appendLine(`WebSocket connection error: ${error}`);
      });

      // Setup ping/pong for connection health
      (ws as any).isAlive = true;
      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });
    });

    // Setup connection health monitoring
    const interval = setInterval(() => {
      this.wsServer?.clients.forEach((ws) => {
        if ((ws as any).isAlive === false) {
          ws.terminate();
          return;
        }

        (ws as any).isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    this.wsServer.on('close', () => {
      clearInterval(interval);
    });
  }

  private isValidMessage(message: any): message is BridgeMessage {
    return (
      typeof message === 'object' &&
      typeof message.id === 'string' &&
      typeof message.type === 'string' &&
      typeof message.source === 'string' &&
      typeof message.content === 'string' &&
      typeof message.timestamp === 'number'
    );
  }

  private sendToClient(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  stop(): void {
    if (!this.running) return;

    try {
      // Close all WebSocket connections gracefully
      this.wsServer?.clients.forEach((ws) => {
        ws.close(1000, 'Server shutting down');
      });

      this.wsServer?.close();
      this.httpServer?.close();
      
      this.running = false;
      this.startTime = 0;
      
      vscode.window.showInformationMessage('Stylecast server stopped');
      this.outputChannel.appendLine('WebSocket server stopped');
    } catch (error) {
      this.outputChannel.appendLine(`Error stopping server: ${error}`);
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  getPort(): number {
    return this.port;
  }

  broadcast(message: BridgeMessage): void {
    if (!this.wsServer) return;

    const data = JSON.stringify(message);
    let sentCount = 0;

    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
        sentCount++;
      }
    });

    this.outputChannel.appendLine(`Broadcast message to ${sentCount} clients`);
  }

  getClientCount(): number {
    return this.wsServer?.clients.size || 0;
  }

  getStatus(): ConnectionStatus {
    return {
      connected: this.running,
      clientCount: this.getClientCount(),
      port: this.port,
      uptime: this.running ? Date.now() - this.startTime : 0
    };
  }
}