class WebSocketClient {
  constructor() {
    this.ws = null;
    this.port = 47823;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageHandlers = new Set();
    this.statusHandlers = new Set();
    this.reconnectTimeout = null;
    this.heartbeatInterval = null;
    this.isManualDisconnect = false;
  }

  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.isManualDisconnect = false;
    
    try {
      // Clear any existing reconnect timeout
      this.clearReconnectTimeout();

      // Check if VS Code server is running with timeout
      await Promise.race([
        this.checkVSCodeServer(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Server check timeout')), 3000)
        )
      ]);

      const url = `ws://localhost:${this.port}`;

      return new Promise((resolve, reject) => {
        // Prevent multiple connection attempts
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
          resolve();
          return;
        }

        this.ws = new WebSocket(url);

        const connectionTimeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('Connection timeout'));
          }
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.notifyStatus(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle different message types
            if (data.type === 'connection') {
            } else if (data.type === 'pong') {
              // Heartbeat response
            } else {
              // Regular message
              this.messageHandlers.forEach(handler => {
                try {
                  handler(data);
                } catch (error) {
                }
              });
            }
          } catch (error) {
          }
        };

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          this.stopHeartbeat();
          this.notifyStatus(false);

          // Auto-reconnect if not a manual close
          if (!this.isManualDisconnect && 
              event.code !== 1000 && 
              this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          this.notifyStatus(false);
          reject(error);
        };
      });

    } catch (error) {
      this.notifyStatus(false);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  async checkVSCodeServer() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`http://localhost:${this.port}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (data.service !== 'websocket-bridge') {
        throw new Error('Different service running on port 47823');
      }


    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('VS Code is not responding. Please check that:\n1. VS Code is running\n2. Stylecast extension is installed and enabled\n3. Server is started (check status bar)');
      }
      throw new Error('Cannot connect to VS Code. Please:\n1. Install Stylecast VS Code extension\n2. Open VS Code\n3. Check that the server is running (green status bar)');
    }
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000);


    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
      }
    }, delay);
  }

  clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', timestamp: Date.now() });
      }
    }, 30000); // 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        return false;
      }
    }
    return false;
  }

  sendMessage(content, type = 'text', metadata = {}) {
    const message = {
      id: this.generateId(),
      type,
      source: 'browser',
      content,
      timestamp: Date.now(),
      metadata
    };

    return this.send(message);
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatusChange(handler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  notifyStatus(connected) {
    this.statusHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
      }
    });
  }

  disconnect() {
    this.isManualDisconnect = true;
    this.clearReconnectTimeout();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
  }

  getConnectionInfo() {
    return {
      connected: this.isConnected(),
      port: this.port,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
  }

  // Reset connection state for manual reconnection
  resetConnection() {
    this.reconnectAttempts = 0;
    this.isManualDisconnect = false;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSocketClient;
} else if (typeof window !== 'undefined') {
  window.WebSocketClient = WebSocketClient;
}