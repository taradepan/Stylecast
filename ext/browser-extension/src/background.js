// Import WebSocket client
importScripts('websocket-client.js');

let wsClient;
let messageHistory = [];
let extractionHistory = [];
const MAX_HISTORY = 50;

// Initialize WebSocket client on startup
chrome.runtime.onStartup.addListener(initializeWebSocket);
chrome.runtime.onInstalled.addListener(initializeWebSocket);

// Keep service worker alive
let keepAliveInterval;

function startKeepAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => {
      // This keeps the service worker alive
    });
  }, 20000); // 20 seconds
}

function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}

async function initializeWebSocket() {
  
  try {
    // Check if WebSocketClient is available
    if (typeof WebSocketClient === 'undefined') {
      throw new Error('WebSocketClient not loaded');
    }

    wsClient = new WebSocketClient();
    
    // Set up message handler with error protection
    wsClient.onMessage((message) => {
      try {
        handleIncomingMessage(message);
      } catch (error) {
      }
    });

    // Set up status change handler with error protection
    wsClient.onStatusChange((connected) => {
      try {
        handleConnectionStatusChange(connected);
      } catch (error) {
      }
    });

    // Load existing message history with error handling
    try {
      const result = await chrome.storage.local.get(['messageHistory']);
      messageHistory = result.messageHistory || [];
    } catch (error) {
      messageHistory = [];
    }

    // Try to connect with timeout
    try {
      await Promise.race([
        wsClient.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]);
    } catch (error) {
      updateBadge(false);
      // Don't throw - allow extension to work without connection
    }
    
    startKeepAlive();
    
  } catch (error) {
    updateBadge(false);
    
    // Try to recover after a delay
    setTimeout(() => {
      initializeWebSocket();
    }, 5000);
  }
}

function handleIncomingMessage(message) {
  
  // Add to history
  messageHistory.push(message);
  
  // Keep only recent messages
  if (messageHistory.length > MAX_HISTORY) {
    messageHistory = messageHistory.slice(-MAX_HISTORY);
  }
  
  // Save to storage
  chrome.storage.local.set({ messageHistory });
  
  // Handle different message types
  switch (message.type) {
    case 'text':
      showNotification('Message from VS Code', message.content);
      break;
    case 'notification':
      handleNotificationMessage(message);
      break;
    case 'command':
      handleCommandMessage(message);
      break;
    default:
  }
}

function handleNotificationMessage(message) {
  const level = message.metadata?.level || 'info';
  const title = `VS Code ${level.charAt(0).toUpperCase() + level.slice(1)}`;
  
  showNotification(title, message.content, {
    type: 'basic',
    iconUrl: getIconForLevel(level)
  });
}

async function handleCommandMessage(message) {
  const command = message.metadata?.command;
  
  switch (command) {
    case 'openTab':
      const url = message.metadata?.url;
      if (url) {
        chrome.tabs.create({ url });
      }
      break;
    case 'getCurrentTab':
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && wsClient.isConnected()) {
          wsClient.sendMessage(`Current tab: ${tab.title} (${tab.url})`, 'text', {
            replyTo: message.id,
            tabInfo: { title: tab.title, url: tab.url, id: tab.id }
          });
        }
      } catch (error) {
      }
      break;
    default:
  }
}

function handleConnectionStatusChange(connected) {
  updateBadge(connected);

  if (connected) {
    startKeepAlive();
    // Show success notification on reconnection
    if (wsClient.reconnectAttempts > 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Stylecast Connected',
        message: 'Successfully reconnected to VS Code!'
      });
    }
  } else {
    stopKeepAlive();
    // Show error notification on disconnect
    const retryInfo = wsClient.reconnectAttempts < wsClient.maxReconnectAttempts
      ? `Attempting to reconnect (${wsClient.reconnectAttempts}/${wsClient.maxReconnectAttempts})...`
      : 'Max reconnection attempts reached. Click the extension icon to retry.';

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Stylecast Disconnected',
      message: `Lost connection to VS Code. ${retryInfo}`,
      priority: 1
    });
  }
}

function updateBadge(connected) {
  const clientCount = connected ? '●' : '○';
  const color = connected ? '#4CAF50' : '#F44336';
  
  chrome.action.setBadgeText({ text: clientCount });
  chrome.action.setBadgeBackgroundColor({ color });
  
  const tooltip = connected 
    ? 'Connected to VS Code WebSocket Bridge'
    : 'Disconnected from VS Code';
  chrome.action.setTitle({ title: tooltip });
}

function showNotification(title, message, options = {}) {
  const notificationOptions = {
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title,
    message,
    ...options
  };
  
  chrome.notifications.create(notificationOptions);
}

function getIconForLevel(level) {
  // You could have different icons for different levels
  return 'icons/icon48.png';
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleRuntimeMessage(request, sender, sendResponse);
  return true; // Keep message channel open for async response
});

async function handleRuntimeMessage(request, sender, sendResponse) {
  const startTime = performance.now();

  try {
    switch (request.action) {
      case 'contentScriptReady':
        sendResponse({ success: true });
        break;
        
      case 'getConnectionStatus':
        const info = wsClient?.getConnectionInfo() || { connected: false };
        sendResponse({ 
          connected: info.connected,
          connectionInfo: info
        });
        break;

      case 'getInspectorState':
        try {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (tabs[0]) {
            const tab = tabs[0];
            const result = await chrome.tabs.sendMessage(tab.id, { action: 'getInspectorState' });
            sendResponse({ success: true, active: result?.active || false });
          } else {
            sendResponse({ success: false, active: false });
          }
        } catch (error) {
          sendResponse({ success: false, active: false });
        }
        break;

      case 'reconnect':
        try {
          
          // Reconnect WebSocket client
          if (wsClient) {
            wsClient.disconnect();
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            wsClient.connect();
          } else {
            // Initialize WebSocket client if it doesn't exist
            initializeWebSocket();
          }
          
          // Check connection status after reconnection attempt
          setTimeout(() => {
            const isConnected = wsClient?.isConnected() || false;
          }, 2000);
          
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
        break;

      case 'sendToVSCode':
        sendCodeToVSCode(request.data);
        sendResponse({ success: true });
        break;

      case 'sendMessage':
        if (wsClient && wsClient.isConnected()) {
          const success = wsClient.sendMessage(
            request.content,
            request.type || 'text',
            request.metadata || {}
          );
          
          if (success) {
            // Add to local history
            const message = {
              id: wsClient.generateId(),
              type: request.type || 'text',
              source: 'browser',
              content: request.content,
              timestamp: Date.now(),
              metadata: request.metadata || {}
            };
            
            messageHistory.push(message);
            if (messageHistory.length > MAX_HISTORY) {
              messageHistory = messageHistory.slice(-MAX_HISTORY);
            }
            
            chrome.storage.local.set({ messageHistory });
          }
          
          sendResponse({ success });
        } else {
          sendResponse({ success: false, error: 'Not connected' });
        }
        break;

      case 'getExtractionHistory':
        sendResponse({ history: extractionHistory.slice(-20) });
        break;

      case 'clearExtractionHistory':
        extractionHistory = [];
        chrome.storage.local.set({ extractionHistory: [] });
        sendResponse({ success: true });
        break;

      case 'reconnect':
        if (wsClient) {
          wsClient.resetConnection();
          try {
            await wsClient.connect();
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: 'Client not initialized' });
        }
        break;

      case 'disconnect':
        if (wsClient) {
          wsClient.disconnect();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false });
        }
        break;

      case 'getMessageHistory':
        const result = await chrome.storage.local.get(['messageHistory']);
        sendResponse({ 
          history: result.messageHistory || [],
          count: (result.messageHistory || []).length
        });
        break;

      case 'clearHistory':
        messageHistory = [];
        await chrome.storage.local.set({ messageHistory: [] });
        sendResponse({ success: true });
        break;

      case 'toggleInspector':
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
          const tab = tabs[0];
          
          // Check if it's a restricted page
          if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('moz-extension://')) {
            sendResponse({ success: false, error: 'Inspector not available on browser internal pages' });
            break;
          }
          
          try {
            const result = await chrome.tabs.sendMessage(tab.id, { action: 'toggleInspector' });
            sendResponse({ success: true, active: result.active });
          } catch (error) {
            
            // Try to inject the content script
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/content/element-inspector.js']
              });
              
              
              // Wait longer for the script to initialize and send ready signal
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Try sending the message again with retry logic
              let retries = 3;
              let result = null;
              
              while (retries > 0) {
                try {
                  result = await chrome.tabs.sendMessage(tab.id, { action: 'toggleInspector' });
                  break;
                } catch (retryError) {
                  retries--;
                  if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                  }
                }
              }
              
              if (result) {
                sendResponse({ success: true, active: result.active });
              } else {
                throw new Error('Failed to get response after injection');
              }
            } catch (injectError) {
              sendResponse({ 
                success: false, 
                error: 'Failed to load inspector. Please refresh the page and try again.' 
              });
            }
          }
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
        break;

      case 'openLiveEditor':
        // Forward to popup by storing in chrome.storage for popup to read
        await chrome.storage.local.set({
          pendingElementEdit: request.elementData,
          pendingEditTimestamp: Date.now()
        });

        // Open the popup programmatically
        try {
          await chrome.action.openPopup();
        } catch (error) {
          // Fallback: show notification to user
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: 'Stylecast',
            message: 'Click the Stylecast icon to edit the selected element'
          });
        }

        sendResponse({ success: true });
        break;

      case 'editSelected':
        const editTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (editTabs[0]) {
          const tab = editTabs[0];
          
          // Check if it's a restricted page
          if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://') || tab.url.startsWith('moz-extension://')) {
            sendResponse({ success: false, error: 'Edit mode not available on browser internal pages' });
            break;
          }
          
          try {
            const result = await chrome.tabs.sendMessage(tab.id, { action: 'editSelected' });
            sendResponse({ success: true, active: result.active });
          } catch (error) {
            
            // Try to inject the content script
            try {
              await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/content/element-inspector.js']
              });
              
              // Wait a bit for the script to initialize
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Try sending the message again
              const result = await chrome.tabs.sendMessage(tab.id, { action: 'editSelected' });
              sendResponse({ success: true, active: result.active });
            } catch (injectError) {
              sendResponse({ 
                success: false, 
                error: 'Failed to load inspector. Please refresh the page and try again.' 
              });
            }
          }
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
        break;

      // Live preview mode actions
      case 'resetElement':
        const resetTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (resetTabs[0]) {
          try {
            const result = await chrome.tabs.sendMessage(resetTabs[0].id, { action: 'resetElement' });
            sendResponse({ success: result?.success || false });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
        break;

      case 'submitChanges':
        const submitTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (submitTabs[0]) {
          try {
            const result = await chrome.tabs.sendMessage(submitTabs[0].id, { action: 'submitChanges' });
            sendResponse({ success: result?.success || false });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
        break;

      case 'closeEditMode':
        const closeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (closeTabs[0]) {
          try {
            const result = await chrome.tabs.sendMessage(closeTabs[0].id, { action: 'closeEditMode' });
            sendResponse({ success: result?.success || false });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
        break;

      // Forward live preview messages from content script to popup
      case 'livePreviewStarted':
        forwardToPopup({
          type: 'livePreviewStarted',
          element: request.element
        });
        sendResponse({ success: true });
        break;

      case 'livePreviewStopped':
        forwardToPopup({
          type: 'livePreviewStopped'
        });
        sendResponse({ success: true });
        break;

      case 'elementUpdated':
        forwardToPopup({
          type: 'elementUpdated',
          element: request.element
        });
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    const duration = performance.now() - startTime;

    // Send detailed error response
    sendResponse({ 
      success: false, 
      error: error.message,
      errorType: error.name,
      duration: duration
    });
  }
}

function sendCodeToVSCode(data) {
  if (!wsClient?.isConnected()) {
    return;
  }


  let message;
  let elementType = 'unknown';

  // Handle different data formats
  if (data.type === 'element-edit') {
    // Element editing data - send directly to VS Code

    try {
      const editData = JSON.parse(data.content);
      const { original, context } = editData;

      elementType = original?.element?.tagName || 'element';
      const url = context?.url || '';

      message = {
        id: Date.now().toString(),
        type: 'element-edit',
        source: 'browser',
        content: data.content,
        timestamp: Date.now(),
        metadata: {
          action: 'element-edit',
          elementType: elementType,
          url: url
        }
      };

    } catch (error) {
      return;
    }
  } else {
    return;
  }

  // Send the message
  wsClient.send(message);

  // Add to extraction history
  extractionHistory.push({
    ...data,
    extractedAt: Date.now()
  });

  // Keep only last 50 extractions
  if (extractionHistory.length > 50) {
    extractionHistory = extractionHistory.slice(-50);
  }

  // Save to storage
  chrome.storage.local.set({ extractionHistory });

}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open popup when notification is clicked
  chrome.action.openPopup();
});

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup automatically due to default_popup in manifest
});

// Cleanup on suspend
chrome.runtime.onSuspend.addListener(() => {
  stopKeepAlive();
  if (wsClient) {
    wsClient.disconnect();
  }
});

// Handle connection port for popup communication
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    port.onDisconnect.addListener(() => {
    });
    
    // Send initial status
    if (wsClient) {
      port.postMessage({
        type: 'status',
        connected: wsClient.isConnected(),
        info: wsClient.getConnectionInfo()
      });
    }
  }
});

// Store popup port for message forwarding
let popupPort = null;

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'popup') {
    popupPort = port;
    
    port.onDisconnect.addListener(() => {
      popupPort = null;
    });
    
    // Send initial status
    if (wsClient) {
      port.postMessage({
        type: 'status',
        status: wsClient.isConnected() ? 'connected' : 'disconnected',
        text: wsClient.isConnected() ? 'Connected' : 'Disconnected'
      });
    }
  }
});

// Forward live preview messages to popup
function forwardToPopup(message) {
  if (popupPort) {
    try {
      popupPort.postMessage(message);
    } catch (error) {
    }
  }
}

