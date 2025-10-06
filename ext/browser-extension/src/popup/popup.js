class ElementInspectorPopup {
  constructor() {
    this.port = null;
    this.settings = {
      autoReconnect: true,
      showNotifications: true
    };
    this.inspectorActive = false;
    this.livePreviewActive = false;
    this.editingElement = null;
    this.init();
  }

  async init() {
    
    try {
      // Ensure DOM is ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
      }
      
      await this.loadSettings();
      this.setupEventListeners();
      this.setupMessageListener();
      this.setupStorageListener();
      this.connectToBackground();
      await this.checkConnectionStatus();
      this.startStatusPolling();

      // Check for pending element edits on startup
      await this.checkPendingElementEdit();
      
      // Initialize UI state
      await this.checkInspectorState();
      this.clearElementSelection();
      
    } catch (error) {
      this.showError(`Failed to initialize: ${error.message}`);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['popupSettings']);
      if (result.popupSettings) {
        this.settings = { ...this.settings, ...result.popupSettings };
      }
    } catch (error) {
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({ popupSettings: this.settings });
    } catch (error) {
    }
  }

  connectToBackground() {
    try {
      this.port = chrome.runtime.connect({ name: 'popup' });
      
      this.port.onMessage.addListener((message) => {
        this.handleBackgroundMessage(message);
      });

      this.port.onDisconnect.addListener(() => {
        this.updateStatus('disconnected', 'Disconnected');
        if (this.settings.autoReconnect) {
          setTimeout(() => this.connectToBackground(), 2000);
        }
      });

    } catch (error) {
      this.updateStatus('disconnected', 'Connection failed');
    }
  }

  handleBackgroundMessage(message) {
    switch (message.type) {
      case 'status':
        this.updateStatus(message.status, message.text);
        break;
      case 'elementSelected':
        this.updateElementSelection(message.element);
        break;
      case 'elementDeselected':
        this.clearElementSelection();
        break;
      case 'extractionComplete':
        this.showSuccess('Code extracted and sent to VS Code!');
        break;
      case 'editComplete':
        this.showSuccess('Changes sent to VS Code!');
        break;
      case 'livePreviewStarted':
        this.startLivePreviewMode(message.element);
        break;
      case 'livePreviewStopped':
        this.stopLivePreviewMode();
        break;
      case 'elementUpdated':
        this.updateEditingElement(message.element);
        break;
      case 'error':
        this.showError(message.message);
        break;
    }
  }

  setupEventListeners() {
    try {
      // Main controls
      const toggleInspector = document.getElementById('toggleInspector');

      if (toggleInspector) {
        toggleInspector.addEventListener('click', () => this.toggleInspector());
      }

      // Reconnect button
      const reconnectButton = document.getElementById('reconnectButton');
      if (reconnectButton) {
        reconnectButton.addEventListener('click', () => this.handleReconnect());
      }

      // Removed unnecessary buttons - keeping only essential controls
      
      // Settings inputs
      const autoReconnect = document.getElementById('autoReconnect');
      const showNotifications = document.getElementById('showNotifications');
      
      if (autoReconnect) {
        autoReconnect.addEventListener('change', (e) => {
          this.settings.autoReconnect = e.target.checked;
        });
      }
      if (showNotifications) {
        showNotifications.addEventListener('change', (e) => {
          this.settings.showNotifications = e.target.checked;
        });
      }
      
    } catch (error) {
    }
  }

  async toggleInspector() {
    const button = document.getElementById('toggleInspector');
    const text = document.getElementById('inspectorText');

    try {
      // Show loading state
      if (button) {
        button.disabled = true;
      }
      if (text) {
        text.textContent = 'Processing...';
      }

      const response = await chrome.runtime.sendMessage({ action: 'toggleInspector' });

      if (response && response.success) {
        const isActive = response.active;
        this.updateInspectorButton(isActive);
        this.showSuccess(isActive ? 'Inspector activated! Click on any element to select it.' : 'Inspector deactivated.');
      } else {
        const errorMsg = response?.error || 'Failed to toggle inspector';
        if (errorMsg.includes('refresh')) {
          this.showError('🔄 Please refresh the page and try again');
        } else {
          this.showError(errorMsg);
        }
        // Restore to default state on error
        this.updateInspectorButton(false);
      }
    } catch (error) {
      this.showError('🔄 Please refresh the page and try again');
      // Restore to default state on error
      this.updateInspectorButton(false);
    } finally {
      // Re-enable button
      if (button) {
        button.disabled = false;
      }
    }
  }


  async extractCode() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'extractSelected' });
      
      if (response && response.success) {
        this.showSuccess('Code extracted and sent to VS Code!');
      } else {
        this.showError('No element selected. Please select an element first.');
      }
    } catch (error) {
      this.showError('Failed to extract code');
    }
  }

  async sendToVSCode() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'sendToVSCode' });
      
      if (response && response.success) {
        this.showSuccess('Sent to VS Code!');
      } else {
        this.showError('No element selected. Please select an element first.');
      }
    } catch (error) {
      this.showError('Failed to send to VS Code');
    }
  }

  async handleReconnect() {
    const reconnectButton = document.getElementById('reconnectButton');
    if (reconnectButton) {
      reconnectButton.disabled = true;
    }

    try {
      this.updateStatus('connecting', 'Reconnecting...');

      // Send reconnect message to background script
      const response = await chrome.runtime.sendMessage({ action: 'reconnect' });

      if (response && response.success) {
        this.updateStatus('connected', 'Connected');
        this.showSuccess('Reconnected successfully!');

        // Also refresh inspector state after reconnecting
        await this.checkInspectorState();
      } else {
        const errorMsg = response?.error || 'Reconnection failed';
        this.updateStatus('disconnected', 'Reconnection failed');
        this.showError(`Reconnection failed: ${errorMsg}`);
      }
    } catch (error) {
      this.updateStatus('disconnected', 'Reconnection failed');
      this.showError('Failed to reconnect. Please try again.');
    } finally {
      if (reconnectButton) {
        reconnectButton.disabled = false;
      }
    }
  }

  async reconnect() {
    return this.handleReconnect();
  }

  openSettings() {
    document.getElementById('settingsModal').style.display = 'flex';
    
    // Load current settings into modal
    document.getElementById('autoReconnect').checked = this.settings.autoReconnect;
    document.getElementById('showNotifications').checked = this.settings.showNotifications;
  }

  closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
  }


  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

      if (message.action === 'openLiveEditor') {
        this.openLiveEditor(message.elementData);
        sendResponse({ success: true });
      }

      return true;
    });
  }

  setupStorageListener() {
    // Listen for storage changes (when element data is stored)
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.pendingElementEdit) {
        this.checkPendingElementEdit();
      }
    });

    // Also check when window regains focus
    window.addEventListener('focus', () => {
      this.checkPendingElementEdit();
    });
  }

  async checkPendingElementEdit() {
    try {
      const data = await chrome.storage.local.get(['pendingElementEdit', 'pendingEditTimestamp']);

      if (data.pendingElementEdit && data.pendingEditTimestamp) {
        // Check if it's recent (within last 5 seconds)
        const age = Date.now() - data.pendingEditTimestamp;
        if (age < 5000) {
          this.openLiveEditor(data.pendingElementEdit);

          // Clear the pending edit
          await chrome.storage.local.remove(['pendingElementEdit', 'pendingEditTimestamp']);
        } else {
        }
      }
    } catch (error) {
    }
  }

  openLiveEditor(elementData) {

    // Hide instructions when live editor opens
    const instructions = document.getElementById('instructions');
    if (instructions) {
      instructions.style.display = 'none';
    }

    // Show the live preview card
    const livePreviewCard = document.getElementById('livePreviewCard');
    livePreviewCard.style.display = 'block';

    // Update element info
    document.getElementById('editingElementTag').textContent = elementData.tag;
    document.getElementById('editingElementId').textContent = elementData.id;
    document.getElementById('editingElementClasses').textContent = elementData.classes;
    document.getElementById('editingElementSize').textContent = elementData.size;

    // Populate style inputs with current values
    this.populateStyleEditor(elementData.styles);

    // Setup live editing event listeners
    this.setupLiveEditing();

    this.livePreviewActive = true;
  }

  populateStyleEditor(styles) {
    // Text content
    if (styles.textContent) document.getElementById('editTextContent').value = styles.textContent;

    // Typography
    if (styles.fontFamily) document.getElementById('editFontFamily').value = styles.fontFamily;

    const fontSize = parseInt(styles.fontSize);
    document.getElementById('editFontSize').value = fontSize;
    document.getElementById('editFontSizeText').value = styles.fontSize;

    document.getElementById('editFontWeight').value = styles.fontWeight || '400';

    if (styles.lineHeight) {
      const lineHeight = parseFloat(styles.lineHeight) / fontSize || 1.5;
      document.getElementById('editLineHeight').value = lineHeight.toFixed(1);
      document.getElementById('editLineHeightText').value = lineHeight.toFixed(1);
    }

    if (styles.letterSpacing) {
      const letterSpacing = parseFloat(styles.letterSpacing) || 0;
      document.getElementById('editLetterSpacing').value = letterSpacing;
      document.getElementById('editLetterSpacingText').value = letterSpacing + 'em';
    }

    // Colors
    const textColor = this.rgbToHex(styles.color);
    document.getElementById('editTextColor').value = textColor;
    document.getElementById('editTextColorText').value = textColor;

    const bgColor = this.rgbToHex(styles.backgroundColor);
    document.getElementById('editBgColor').value = bgColor;
    document.getElementById('editBgColorText').value = bgColor === '#ffffff' ? 'transparent' : bgColor;

    // Layout
    if (styles.width) document.getElementById('editWidth').value = styles.width;
    if (styles.height) document.getElementById('editHeight').value = styles.height;
    if (styles.display) document.getElementById('editDisplay').value = styles.display;
    if (styles.position) document.getElementById('editPosition').value = styles.position;
    if (styles.padding) document.getElementById('editPadding').value = styles.padding;
    if (styles.margin) document.getElementById('editMargin').value = styles.margin;

    // Border
    if (styles.borderWidth) document.getElementById('editBorderWidth').value = styles.borderWidth;
    if (styles.borderStyle) document.getElementById('editBorderStyle').value = styles.borderStyle;

    const borderColor = this.rgbToHex(styles.borderColor);
    document.getElementById('editBorderColor').value = borderColor;
    document.getElementById('editBorderColorText').value = borderColor;

    if (styles.borderRadius) document.getElementById('editBorderRadius').value = styles.borderRadius;

    // Appearance
    if (styles.opacity) {
      const opacity = Math.round(parseFloat(styles.opacity) * 100);
      document.getElementById('editOpacity').value = opacity;
      document.getElementById('editOpacityText').value = opacity + '%';
    }

    if (styles.boxShadow && styles.boxShadow !== 'none') {
      // Try to match preset or set to custom
      const shadowSelect = document.getElementById('editBoxShadow');
      let matched = false;
      for (let option of shadowSelect.options) {
        if (option.value === styles.boxShadow) {
          shadowSelect.value = option.value;
          matched = true;
          break;
        }
      }
      if (!matched) {
        shadowSelect.value = 'custom';
        document.getElementById('customShadowGroup').style.display = 'block';
        document.getElementById('editBoxShadowCustom').value = styles.boxShadow;
      }
    }
  }

  setupLiveEditing() {
    // Text content
    document.getElementById('editTextContent')?.addEventListener('input', (e) => {
      this.applyTextContentToPage(e.target.value);
    });

    // Font size slider + input
    const fontSizeSlider = document.getElementById('editFontSize');
    const fontSizeText = document.getElementById('editFontSizeText');

    fontSizeSlider.addEventListener('input', (e) => {
      const value = e.target.value + 'px';
      fontSizeText.value = value;
      this.applyStyleToPage('font-size', value);
    });

    fontSizeText.addEventListener('input', (e) => {
      const numValue = parseInt(e.target.value);
      if (!isNaN(numValue)) {
        fontSizeSlider.value = numValue;
        this.applyStyleToPage('font-size', e.target.value);
      }
    });

    // Font weight
    document.getElementById('editFontWeight').addEventListener('change', (e) => {
      this.applyStyleToPage('font-weight', e.target.value);
    });

    // Text color
    document.getElementById('editTextColor').addEventListener('input', (e) => {
      document.getElementById('editTextColorText').value = e.target.value;
      this.applyStyleToPage('color', e.target.value);
    });

    // Background color
    document.getElementById('editBgColor').addEventListener('input', (e) => {
      document.getElementById('editBgColorText').value = e.target.value;
      this.applyStyleToPage('background-color', e.target.value);
    });

    // Padding
    document.getElementById('editPadding').addEventListener('input', (e) => {
      this.applyStyleToPage('padding', e.target.value);
    });

    // Margin
    document.getElementById('editMargin').addEventListener('input', (e) => {
      this.applyStyleToPage('margin', e.target.value);
    });

    // Border radius
    document.getElementById('editBorderRadius').addEventListener('input', (e) => {
      this.applyStyleToPage('border-radius', e.target.value);
    });

    // Border color
    document.getElementById('editBorderColor').addEventListener('input', (e) => {
      document.getElementById('editBorderColorText').value = e.target.value;
      this.applyStyleToPage('border-color', e.target.value);
    });

    // Send to VS Code button
    document.getElementById('sendEditsToVSCode').addEventListener('click', () => {
      this.sendEditedElementToVSCode();
    });

    // Font family
    document.getElementById('editFontFamily')?.addEventListener('change', (e) => {
      const value = e.target.value === 'default' ? '' : e.target.value;
      this.applyStyleToPage('font-family', value);
    });

    // Line height
    const lineHeightSlider = document.getElementById('editLineHeight');
    const lineHeightText = document.getElementById('editLineHeightText');
    lineHeightSlider?.addEventListener('input', (e) => {
      lineHeightText.value = e.target.value;
      this.applyStyleToPage('line-height', e.target.value);
    });

    // Letter spacing
    const letterSpacingSlider = document.getElementById('editLetterSpacing');
    const letterSpacingText = document.getElementById('editLetterSpacingText');
    letterSpacingSlider?.addEventListener('input', (e) => {
      const value = e.target.value + 'em';
      letterSpacingText.value = value;
      this.applyStyleToPage('letter-spacing', value);
    });

    // Text alignment and decoration buttons
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const property = btn.dataset.property;
        const value = btn.dataset.value;


        // Toggle for same property buttons
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          this.applyStyleToPage(property, '');
        } else {
          // Remove active from siblings with same property
          document.querySelectorAll(`.style-btn[data-property="${property}"]`).forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.applyStyleToPage(property, value);
        }
      });
    });

    // Width/Height
    document.getElementById('editWidth')?.addEventListener('input', (e) => {
      this.applyStyleToPage('width', e.target.value);
    });
    document.getElementById('editHeight')?.addEventListener('input', (e) => {
      this.applyStyleToPage('height', e.target.value);
    });

    // Display
    document.getElementById('editDisplay')?.addEventListener('change', (e) => {
      const value = e.target.value === 'default' ? '' : e.target.value;
      this.applyStyleToPage('display', value);
    });

    // Position
    document.getElementById('editPosition')?.addEventListener('change', (e) => {
      const value = e.target.value === 'default' ? '' : e.target.value;
      this.applyStyleToPage('position', value);
    });

    // Border width
    document.getElementById('editBorderWidth')?.addEventListener('input', (e) => {
      this.applyStyleToPage('border-width', e.target.value);
    });

    // Border style
    document.getElementById('editBorderStyle')?.addEventListener('change', (e) => {
      const value = e.target.value === 'default' ? '' : e.target.value;
      this.applyStyleToPage('border-style', value);
    });

    // Opacity
    const opacitySlider = document.getElementById('editOpacity');
    const opacityText = document.getElementById('editOpacityText');
    opacitySlider?.addEventListener('input', (e) => {
      const value = e.target.value / 100;
      opacityText.value = e.target.value + '%';
      this.applyStyleToPage('opacity', value);
    });

    // Box shadow
    document.getElementById('editBoxShadow')?.addEventListener('change', (e) => {
      const value = e.target.value;
      const customGroup = document.getElementById('customShadowGroup');

      if (value === 'custom') {
        customGroup.style.display = 'block';
      } else {
        customGroup.style.display = 'none';
        const shadowValue = value === 'default' ? '' : value;
        this.applyStyleToPage('box-shadow', shadowValue);
      }
    });

    // Custom shadow
    document.getElementById('editBoxShadowCustom')?.addEventListener('input', (e) => {
      this.applyStyleToPage('box-shadow', e.target.value);
    });
  }

  async applyStyleToPage(property, value) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'applyStyle',
        property: property,
        value: value
      });
    } catch (error) {
    }
  }

  async applyTextContentToPage(text) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, {
        action: 'applyTextContent',
        text: text
      });
    } catch (error) {
    }
  }

  async sendEditedElementToVSCode() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'submitChanges'
      });

      if (response && response.success) {
        this.showSuccess('Changes sent to VS Code!');
        // Close live editor
        document.getElementById('livePreviewCard').style.display = 'none';
        this.livePreviewActive = false;

        // Show instructions again
        const instructions = document.getElementById('instructions');
        if (instructions) {
          instructions.style.display = 'flex';
        }
      } else if (response && response.error) {
        this.showError(`Failed to send: ${response.error}`);
      } else {
        this.showError('Failed to send changes. Please check VS Code connection.');
      }
    } catch (error) {
      this.showError('Cannot send to VS Code. Please ensure:\n1. VS Code is running\n2. Stylecast extension is enabled\n3. Connection is active (green dot in icon)');
    }
  }

  rgbToHex(rgb) {
    if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') {
      return '#ffffff';
    }

    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) {
      return rgb.startsWith('#') ? rgb : '#000000';
    }

    const [, r, g, b] = match;
    return '#' + ((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1);
  }
  async saveSettings() {
    this.settings.autoReconnect = document.getElementById('autoReconnect').checked;
    this.settings.showNotifications = document.getElementById('showNotifications').checked;
    
    await this.saveSettings();
    this.closeSettings();
    this.showSuccess('Settings saved!');
  }

  async checkInspectorState() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getInspectorState' });
      
      if (response && response.success) {
        this.inspectorActive = response.active;
        this.updateInspectorButton(this.inspectorActive);
      } else {
        this.inspectorActive = false;
        this.updateInspectorButton(false);
      }
    } catch (error) {
      this.inspectorActive = false;
      this.updateInspectorButton(false);
    }
  }

  updateInspectorButton(isActive) {
    const button = document.getElementById('toggleInspector');
    const text = document.getElementById('inspectorText');
    
    if (!button) {
      return;
    }
    
    // Update internal state
    this.inspectorActive = isActive;
    
    if (isActive) {
      button.style.background = '#1a1a1a';
      button.style.color = '#ffffff';
      if (text) {
        text.textContent = 'Stop Inspector';
      }
    } else {
      button.style.background = '#000000';
      button.style.color = '#ffffff';
      if (text) {
        text.textContent = 'Start Inspector';
      }
    }
  }

  updateElementSelection(element) {
    const selectionContent = document.getElementById('selectionContent');
    const extractButton = document.getElementById('extractCode');
    const sendButton = document.getElementById('sendToVSCode');
    
    if (element) {
      if (selectionContent) {
        selectionContent.innerHTML = `
          <div class="element-info">
            <div class="element-details">
              <div class="element-detail">
                <div class="element-detail-label">Tag</div>
                <div class="element-detail-value">${element.tagName || 'N/A'}</div>
              </div>
              <div class="element-detail">
                <div class="element-detail-label">ID</div>
                <div class="element-detail-value">${element.id || 'none'}</div>
              </div>
              <div class="element-detail">
                <div class="element-detail-label">Classes</div>
                <div class="element-detail-value">${element.classes ? element.classes.slice(0, 2).join(', ') : 'none'}</div>
              </div>
              <div class="element-detail">
                <div class="element-detail-label">Size</div>
                <div class="element-detail-value">${element.size || 'N/A'}</div>
              </div>
            </div>
          </div>
        `;
      }
      
      if (extractButton) extractButton.disabled = false;
      if (sendButton) sendButton.disabled = false;
    } else {
      this.clearElementSelection();
    }
  }

  clearElementSelection() {
    const selectionContent = document.getElementById('selectionContent');
    const extractButton = document.getElementById('extractCode');
    const sendButton = document.getElementById('sendToVSCode');
    
    if (selectionContent) {
      selectionContent.innerHTML = `
        <div class="no-selection">
          <div class="no-selection-icon">👆</div>
          <div class="no-selection-text">Click on any element to select it</div>
        </div>
      `;
    }
    
    if (extractButton) extractButton.disabled = true;
    if (sendButton) sendButton.disabled = true;
  }

  updateStatus(status, text) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const reconnectButton = document.getElementById('reconnectButton');

    if (statusDot) {
      statusDot.className = `dot ${status}`;
    }
    if (statusText) {
      statusText.textContent = text;
    }

    // Show reconnect button only when disconnected
    if (reconnectButton) {
      if (status === 'disconnected') {
        reconnectButton.style.display = 'flex';
      } else {
        reconnectButton.style.display = 'none';
      }
    }
  }

  async checkConnectionStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getConnectionStatus' });
      
      if (response && response.connected) {
        this.updateStatus('connected', 'Connected');
      } else {
        this.updateStatus('disconnected', 'Disconnected');
      }
    } catch (error) {
      this.updateStatus('disconnected', 'Connection failed');
    }
  }

  startStatusPolling() {
    setInterval(() => {
      this.checkConnectionStatus();
    }, 5000);
  }

  showSuccess(message) {
    if (this.settings.showNotifications) {
      this.showNotification(message, 'success');
    }
  }

  showError(message) {
    if (this.settings.showNotifications) {
      this.showNotification(message, 'error');
    }
  }

  // ============================================
  // LIVE PREVIEW MODE METHODS
  // ============================================
  
  startLivePreviewMode(element) {
    this.livePreviewActive = true;
    this.editingElement = element;
    
    // Show live preview status
    const livePreviewStatus = document.getElementById('livePreviewStatus');
    if (livePreviewStatus) {
      livePreviewStatus.style.display = 'flex';
    }
    
    // Show live preview card
    const livePreviewCard = document.getElementById('livePreviewCard');
    if (livePreviewCard) {
      livePreviewCard.style.display = 'block';
    }
    
    // Hide selection card
    const currentSelection = document.getElementById('currentSelection');
    if (currentSelection) {
      currentSelection.style.display = 'none';
    }
    
    // Show keyboard shortcuts
    const shortcutsSection = document.getElementById('shortcutsSection');
    if (shortcutsSection) {
      shortcutsSection.style.display = 'block';
    }
    
    // Update footer hint
    const footerHint = document.getElementById('footerHint');
    if (footerHint) {
      footerHint.textContent = 'Live preview mode active - edit panel open';
    }
    
    // Update element info
    this.updateEditingElementInfo(element);
  }
  
  stopLivePreviewMode() {
    this.livePreviewActive = false;
    this.editingElement = null;
    
    // Hide live preview status
    const livePreviewStatus = document.getElementById('livePreviewStatus');
    if (livePreviewStatus) {
      livePreviewStatus.style.display = 'none';
    }
    
    // Hide live preview card
    const livePreviewCard = document.getElementById('livePreviewCard');
    if (livePreviewCard) {
      livePreviewCard.style.display = 'none';
    }
    
    // Show selection card
    const currentSelection = document.getElementById('currentSelection');
    if (currentSelection) {
      currentSelection.style.display = 'block';
    }
    
    // Hide keyboard shortcuts
    const shortcutsSection = document.getElementById('shortcutsSection');
    if (shortcutsSection) {
      shortcutsSection.style.display = 'none';
    }
    
    // Reset footer hint
    const footerHint = document.getElementById('footerHint');
    if (footerHint) {
      footerHint.textContent = 'Right-click to edit visually';
    }
  }
  
  updateEditingElement(element) {
    if (this.livePreviewActive && element) {
      this.editingElement = element;
      this.updateEditingElementInfo(element);
    }
  }
  
  updateEditingElementInfo(element) {
    const elementTag = document.getElementById('editingElementTag');
    const elementId = document.getElementById('editingElementId');
    const elementClasses = document.getElementById('editingElementClasses');
    const elementSize = document.getElementById('editingElementSize');
    
    if (elementTag) {
      elementTag.textContent = element.tagName ? element.tagName.toLowerCase() : 'element';
    }
    
    if (elementId) {
      elementId.textContent = element.id || 'none';
    }
    
    if (elementClasses) {
      elementClasses.textContent = element.className || 'none';
    }
    
    if (elementSize) {
      const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : { width: 0, height: 0 };
      elementSize.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}px`;
    }
  }
  
  async resetElement() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'resetElement' });
      
      if (response && response.success) {
        this.showSuccess('Element reset to original state');
      } else {
        this.showError('Failed to reset element');
      }
    } catch (error) {
      this.showError('Failed to reset element');
    }
  }
  
  async submitChanges() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'submitChanges' });
      
      if (response && response.success) {
        this.showSuccess('Changes submitted to VS Code!');
        this.stopLivePreviewMode();
      } else {
        this.showError('Failed to submit changes');
      }
    } catch (error) {
      this.showError('Failed to submit changes');
    }
  }
  
  async closeEditMode() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'closeEditMode' });
      
      if (response && response.success) {
        this.showSuccess('Edit mode closed');
        this.stopLivePreviewMode();
      } else {
        this.showError('Failed to close edit mode');
      }
    } catch (error) {
      this.showError('Failed to close edit mode');
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#000000' : '#1a1a1a'};
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 0;
      font-size: 11px;
      font-weight: 400;
      font-family: ui-monospace, 'SF Mono', 'Consolas', 'Monaco', monospace;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      z-index: 10000;
      box-shadow: none;
      border: 1px solid #000000;
      max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ElementInspectorPopup();
});