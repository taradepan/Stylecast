import * as vscode from 'vscode';
import { WebSocketServer } from './websocket-server';
import { MessageManager } from './message-manager';
import { BridgeMessage } from './types';
import { EditorDetector } from './editor-detection';

let server: WebSocketServer | undefined;
let messageManager: MessageManager | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let isActivated = false;

export function activate(context: vscode.ExtensionContext) {
  // Prevent double activation
  if (isActivated) {
    return;
  }
  isActivated = true;

  // Proper resource management following best practices
  const disposables: vscode.Disposable[] = [];

  try {
    const outputChannel = vscode.window.createOutputChannel('Stylecast');
    const editorName = EditorDetector.getEditorName();
    outputChannel.appendLine(`Stylecast extension activating in ${editorName}...`);
    disposables.push(outputChannel);

    // Initialize components with validation
    const config = vscode.workspace.getConfiguration('stylecast');
    const port = Math.max(1024, Math.min(65535, config.get<number>('port', 47823)));
    const maxConnections = Math.max(1, Math.min(100, config.get<number>('maxConnections', 10)));
    
    messageManager = new MessageManager(context);

    server = new WebSocketServer(
      (message) => {
        messageManager?.handleBrowserMessage(message);
      },
      port,
      maxConnections,
      () => {
        // Update status bar when connection count changes
        updateStatusBar();
      }
    );

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right, 
      100
    );
    statusBarItem.command = 'stylecast.toggleServer';
    updateStatusBar();
    statusBarItem.show();
    disposables.push(statusBarItem);

    // Register commands with proper disposal
    const commandDisposables = registerCommands(context);
    disposables.push(...commandDisposables);

    // Auto-start server if configured
    if (config.get('autoStart', true)) {
      server.start()
        .then(() => {
          updateStatusBar();
          outputChannel.appendLine('Stylecast server started successfully');
        })
        .catch((error: any) => {
          outputChannel.appendLine(`Failed to auto-start server: ${error}`);
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          vscode.window.showErrorMessage(`Failed to start Stylecast: ${errorMessage}`);
          updateStatusBar();
        });
    }

    // Listen for configuration changes
    const configListener = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
      if (event.affectsConfiguration('stylecast')) {
        handleConfigurationChange();
      }
    });
    disposables.push(configListener);

    // Add all disposables to context
    context.subscriptions.push(...disposables);

    outputChannel.appendLine('Stylecast extension activated');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to activate Stylecast: ${error}`);
    // Cleanup on activation failure
    disposables.forEach(d => d.dispose());
  }
}

function registerCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
  // Send message command
  const sendCommand = vscode.commands.registerCommand(
    'stylecast.sendMessage',
    async () => {
      if (!server || !messageManager) {
        vscode.window.showErrorMessage('Extension not properly initialized');
        return;
      }
      
      if (!server.isRunning()) {
        const start = await vscode.window.showWarningMessage(
          'WebSocket server is not running. Start it now?',
          'Start Server',
          'Cancel'
        );
        
        if (start === 'Start Server') {
          try {
            await server.start();
            updateStatusBar();
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to start server: ${error}`);
            return;
          }
        } else {
          return;
        }
      }

      const message = await vscode.window.showInputBox({
        prompt: 'Enter message to send to browser extensions',
        placeHolder: 'Type your message here...',
        validateInput: (value: string) => {
          if (!value.trim()) {
            return 'Message cannot be empty';
          }
          if (value.length > 1000) {
            return 'Message too long (max 1000 characters)';
          }
          return null;
        }
      });

      if (message) {
        const bridgeMessage = messageManager.createVSCodeMessage(message.trim());
        server.broadcast(bridgeMessage);
        
        const clientCount = server.getClientCount();
        vscode.window.showInformationMessage(
          `Message sent to ${clientCount} browser extension${clientCount !== 1 ? 's' : ''}`
        );
      }
    }
  );

  // Toggle server command
  const toggleCommand = vscode.commands.registerCommand(
    'stylecast.toggleServer',
    async () => {
      if (!server) {
        vscode.window.showErrorMessage('Extension not properly initialized');
        return;
      }
      
      try {
        if (server.isRunning()) {
          server.stop();
          vscode.window.showInformationMessage('Stylecast server stopped');
        } else {
          await server.start();
          vscode.window.showInformationMessage(
            `Stylecast server started on port ${server.getPort()}`
          );
        }
        updateStatusBar();
      } catch (error) {
        vscode.window.showErrorMessage(`Server operation failed: ${error}`);
      }
    }
  );

  // Show server status command
  const statusCommand = vscode.commands.registerCommand(
    'stylecast.showStatus',
    () => {
      if (!server) {
        vscode.window.showErrorMessage('Extension not properly initialized');
        return;
      }
      
      const status = server.getStatus();
      const uptime = status.uptime > 0 ? 
        `${Math.floor(status.uptime / 1000)}s` : 'Not running';
      
      vscode.window.showInformationMessage(
        `Stylecast - Port: ${status.port}, ` +
        `Clients: ${status.clientCount}, Uptime: ${uptime}`
      );
    }
  );

  // Show message history command
  const historyCommand = vscode.commands.registerCommand(
    'stylecast.showHistory',
    () => {
      if (!messageManager) {
        vscode.window.showErrorMessage('Extension not properly initialized');
        return;
      }
      messageManager.showMessageHistory();
    }
  );

  // Clear message history command
  const clearHistoryCommand = vscode.commands.registerCommand(
    'stylecast.clearHistory',
    async () => {
      if (!messageManager) {
        vscode.window.showErrorMessage('Extension not properly initialized');
        return;
      }
      
      const confirm = await vscode.window.showWarningMessage(
        'Clear all message history?',
        'Clear',
        'Cancel'
      );
      
      if (confirm === 'Clear') {
        messageManager.clearHistory();
      }
    }
  );

  // Internal command for broadcasting messages
  const broadcastCommand = vscode.commands.registerCommand(
    'stylecast.broadcastMessage',
    (message: BridgeMessage) => {
      if (server && server.isRunning()) {
        server.broadcast(message);
      }
    }
  );

  // Send notification command
  const notificationCommand = vscode.commands.registerCommand(
    'stylecast.sendNotification',
    async () => {
      if (!server || !messageManager) {
        vscode.window.showErrorMessage('Extension not properly initialized');
        return;
      }
      
      const content = await vscode.window.showInputBox({
        prompt: 'Enter notification message',
        placeHolder: 'Notification content...'
      });

      if (content) {
        const level = await vscode.window.showQuickPick(
          ['info', 'warning', 'error'],
          { placeHolder: 'Select notification level' }
        );

        const message = messageManager.createVSCodeMessage(content, 'notification');
        message.metadata = { level: level || 'info' };

        server.broadcast(message);
        vscode.window.showInformationMessage('Notification sent to browser extensions');
      }
    }
  );

  // Paste to Copilot Chat command
  const copilotCommand = vscode.commands.registerCommand(
    'stylecast.sendToCopilot',
    async () => {
      if (!messageManager) {
        vscode.window.showErrorMessage('Extension not properly initialized');
        return;
      }
      
      const content = await vscode.window.showInputBox({
        prompt: 'Enter message to paste into GitHub Copilot Chat',
        placeHolder: 'Ask Copilot something...'
      });

      if (content) {
        const options = await vscode.window.showQuickPick([
          { label: 'Paste as-is', value: 'direct' },
          { label: 'Add context prefix', value: 'context' },
          { label: 'Debug - Test Copilot commands', value: 'debug' }
        ], { placeHolder: 'How to paste to Copilot?' });

        if (options) {
          if (options.value === 'debug') {
            // Debug mode - test available commands
            const debugChannel = vscode.window.createOutputChannel('Stylecast Debug');
            await testCopilotCommands(debugChannel);
            return;
          }

          let prefix = '';
          if (options.value === 'context') {
            prefix = 'From Stylecast:';
          }

          const success = await messageManager.sendMessageToCopilot(content);

          if (success) {
            vscode.window.showInformationMessage('Message processed for GitHub Copilot Chat');
          } else {
            vscode.window.showErrorMessage('Failed to process for Copilot Chat. Check Output panel for details.');
          }
        }
      }
    }
  );

  // Reset processing flag command
  const resetCommand = vscode.commands.registerCommand(
    'stylecast.resetProcessing',
    () => {
      if (messageManager) {
        messageManager.resetProcessingFlag();
        vscode.window.showInformationMessage('Processing flag reset');
      } else {
        vscode.window.showErrorMessage('Message manager not initialized');
      }
    }
  );

  // Debug function to test Copilot commands
  async function testCopilotCommands(outputChannel: vscode.OutputChannel) {
    const testCommands = [
      'github.copilot.chat.focus',
      'workbench.panel.chat.view.copilot.focus',
      'workbench.view.extension.github-copilot-chat',
      'workbench.action.chat.open',
      'workbench.action.quickchat.toggle',
      'workbench.view.chat',
      'github.copilot.generate',
      'github.copilot.sendChatMessage'
    ];

    outputChannel.appendLine('🔍 Testing Copilot commands...');
    
    for (const command of testCommands) {
      try {
        await vscode.commands.executeCommand(command);
        outputChannel.appendLine(`✅ SUCCESS: ${command}`);
        vscode.window.showInformationMessage(`Working command found: ${command}`);
        break;
      } catch (error) {
        outputChannel.appendLine(`❌ FAILED: ${command} - ${error}`);
      }
    }
    
    outputChannel.show();
  }

  // Return all command disposables
  return [
    sendCommand,
    toggleCommand,
    statusCommand,
    historyCommand,
    clearHistoryCommand,
    broadcastCommand,
    notificationCommand,
    copilotCommand,
    resetCommand
  ];
}

function updateStatusBar() {
  if (!statusBarItem || !server) return;

  const isRunning = server.isRunning();
  const clientCount = server.getClientCount();

  if (isRunning) {
    if (clientCount > 0) {
      statusBarItem.text = `$(globe) Stylecast: Connected`;
      statusBarItem.tooltip = `Stylecast connected to ${clientCount} browser(s)\nPort: ${server.getPort()}\nClick to stop server`;
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    } else {
      statusBarItem.text = `$(circle-outline) Stylecast: Waiting`;
      statusBarItem.tooltip = `Stylecast server running on port ${server.getPort()}\nWaiting for browser connection...\nClick to stop server`;
      statusBarItem.backgroundColor = undefined;
    }
  } else {
    statusBarItem.text = '$(circle-slash) Stylecast: Offline';
    statusBarItem.tooltip = 'Stylecast server is stopped\nClick to start server';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

function handleConfigurationChange() {
  if (!server || !messageManager) return;
  
  const config = vscode.workspace.getConfiguration('stylecast');
  const newPort = config.get<number>('port', 47823);
  
  // If port changed and server is running, restart it
  if (server.isRunning() && newPort !== server.getPort()) {
    vscode.window.showInformationMessage(
      'Port configuration changed. Restart the server to apply changes.',
      'Restart Now'
    ).then((selection: string | undefined) => {
      if (selection === 'Restart Now') {
        server?.stop();
        // Use VS Code's timer instead of setTimeout
        const timer = setTimeout(() => {
          // Create new server with new port
          server = new WebSocketServer(
            (message) => {
              messageManager?.handleBrowserMessage(message);
            },
            newPort,
            10,
            () => {
              updateStatusBar();
            }
          );
          
          server?.start().then(() => {
            updateStatusBar();
          }).catch((error: any) => {
            vscode.window.showErrorMessage(`Failed to restart server: ${error}`);
          });
        }, 1000);
      }
    });
  }
}

export function deactivate() {
  // Cleanup is handled by context.subscriptions
  if (server) {
    server.stop();
  }

  if (messageManager) {
    messageManager.dispose();
  }

  if (statusBarItem) {
    statusBarItem.dispose();
  }

  // Reset activation flag
  isActivated = false;
}