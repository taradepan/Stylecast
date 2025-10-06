/**
 * Production-Ready Element Inspector
 * CTO & Product Engineer Approach: Robust, Reliable, User-Friendly
 */

class ProductionElementInspector {
  constructor() {
    this.isActive = false;
    this.selectedElement = null;
    this.originalElement = null;
    this.editPanel = null;
    this.overlay = null;
    this.tooltip = null;
    this.isEditing = false;
    
    // Track UI elements to avoid selecting them
    this.uiElements = new Set();
    
    this.init();
  }

  init() {
    this.createOverlay();
    this.createTooltip();
    this.createEditPanel();
    this.setupEventListeners();
    this.setupMessageListener();
    this.loadSettings();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'production-inspector-overlay';
    this.overlay.setAttribute('data-stylecast-overlay', 'true');
    this.overlay.style.cssText = `
      position: absolute;
      background: rgba(0, 123, 255, 0.3);
      border: 4px solid #007bff;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
      box-shadow: 0 0 10px rgba(0, 123, 255, 0.5);
    `;
    document.body.appendChild(this.overlay);
    this.uiElements.add(this.overlay);
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'production-inspector-tooltip';
    this.tooltip.style.cssText = `
      position: fixed;
      background: #000000;
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 0;
      font-size: 11px;
      font-family: ui-monospace, 'SF Mono', 'Consolas', 'Monaco', monospace;
      z-index: 1000000;
      display: none;
      pointer-events: none;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: none;
      border: 1px solid #000000;
      font-weight: 400;
      letter-spacing: 0;
      text-transform: uppercase;
    `;
    document.body.appendChild(this.tooltip);
    this.uiElements.add(this.tooltip);
  }

  createEditPanel() {
    // Load external CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = chrome.runtime.getURL('src/content/element-inspector.css');
    document.head.appendChild(linkElement);

    this.editPanel = document.createElement('div');
    this.editPanel.className = 'production-edit-panel';
    
    this.editPanel.innerHTML = `

<!-- Panel Header -->
<div class="panel-header" style="display: flex; justify-content: space-between; align-items: center;">
  <div>
    <div class="panel-title">STYLECAST</div>
    <div class="panel-subtitle">Element Editor</div>
  </div>
  <button id="closePanel">×</button>
</div>

<!-- Element Info -->
<div class="element-info-card">
  <div id="elementInfo">
    <div class="element-info-row">
      <span class="element-info-label">Tag</span>
      <span class="element-info-value" id="infoTag">-</span>
    </div>
    <div class="element-info-row">
      <span class="element-info-label">ID</span>
      <span class="element-info-value" id="infoId">-</span>
    </div>
    <div class="element-info-row">
      <span class="element-info-label">Class</span>
      <span class="element-info-value" id="infoClass">-</span>
    </div>
  </div>
</div>

<!-- Text Content -->
<div class="section-header">TEXT CONTENT</div>
<div class="form-section">
  <div class="form-group">
    <textarea id="textContent" class="panel-textarea" rows="3" placeholder="Element text..."></textarea>
  </div>
</div>

<!-- Typography -->
<div class="section-header">TYPOGRAPHY</div>
<div class="form-section">
  <div class="form-group">
    <label class="form-label">Font Family</label>
    <select id="fontFamily" class="panel-select">
      <option value="Default">Default</option>
      <option value="-apple-system, BlinkMacSystemFont, sans-serif">System</option>
      <option value="Arial, sans-serif">Arial</option>
      <option value="'Times New Roman', Times, serif">Times</option>
      <option value="Georgia, serif">Georgia</option>
      <option value="'Courier New', monospace">Courier</option>
      <option value="Verdana, sans-serif">Verdana</option>
    </select>
  </div>

  <div class="form-group">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <label class="form-label" style="margin: 0;">Font Size</label>
      <span class="value-display" id="fontSizeDisplay">16px</span>
    </div>
    <input type="range" id="fontSize" min="8" max="72" value="16">
    <input type="text" id="fontSizeText" class="panel-input" value="16px" style="margin-top: 8px;">
  </div>

  <div class="form-group">
    <label class="form-label">Font Weight</label>
    <select id="fontWeight" class="panel-select">
      <option value="normal">Regular</option>
      <option value="300">Light</option>
      <option value="400">Regular</option>
      <option value="500">Medium</option>
      <option value="600">Semibold</option>
      <option value="700">Bold</option>
      <option value="900">Black</option>
    </select>
  </div>

  <div class="form-group">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <label class="form-label" style="margin: 0;">Line Height</label>
      <span class="value-display" id="lineHeightDisplay">1.5</span>
    </div>
    <input type="range" id="lineHeight" min="0.8" max="3" step="0.1" value="1.5">
    <input type="text" id="lineHeightText" class="panel-input" value="1.5" style="margin-top: 8px;">
  </div>

  <div class="form-group">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <label class="form-label" style="margin: 0;">Letter Spacing</label>
      <span class="value-display" id="letterSpacingDisplay">0</span>
    </div>
    <input type="range" id="letterSpacing" min="-0.1" max="0.5" step="0.01" value="0">
    <input type="text" id="letterSpacingText" class="panel-input" value="0em" style="margin-top: 8px;">
  </div>

  <div class="form-group">
    <label class="form-label">Text Align</label>
    <div class="button-group grid-4">
      <button type="button" class="btn-group-item align-btn" data-value="left">L</button>
      <button type="button" class="btn-group-item align-btn" data-value="center">C</button>
      <button type="button" class="btn-group-item align-btn" data-value="right">R</button>
      <button type="button" class="btn-group-item align-btn" data-value="justify">J</button>
    </div>
  </div>

  <div class="form-group">
    <label class="form-label">Text Style</label>
    <div class="button-group grid-4">
      <button type="button" class="btn-group-item decoration-btn" data-value="italic" data-property="font-style" style="font-style: italic;">I</button>
      <button type="button" class="btn-group-item decoration-btn" data-value="underline" data-property="text-decoration" style="text-decoration: underline;">U</button>
      <button type="button" class="btn-group-item decoration-btn" data-value="line-through" data-property="text-decoration" style="text-decoration: line-through;">S</button>
      <button type="button" class="btn-group-item decoration-btn" data-value="none" data-property="reset">∅</button>
    </div>
  </div>
</div>

<!-- Colors -->
<div class="section-header">COLORS</div>
<div class="form-section">
  <div class="form-group">
    <label class="form-label">Text Color</label>
    <div style="display: flex; gap: 12px; align-items: center;">
      <input type="color" id="textColor" value="#000000">
      <input type="text" id="textColorText" class="panel-input" value="#000000" style="flex: 1;">
    </div>
  </div>

  <div class="form-group">
    <label class="form-label">Background</label>
    <div style="display: flex; gap: 12px; align-items: center;">
      <input type="color" id="backgroundColor" value="#ffffff">
      <input type="text" id="backgroundColorText" class="panel-input" value="transparent" style="flex: 1;">
    </div>
  </div>

  <div class="form-group">
    <label class="form-label">Border Color</label>
    <div style="display: flex; gap: 12px; align-items: center;">
      <input type="color" id="borderColor" value="#000000">
      <input type="text" id="borderColorText" class="panel-input" value="#000000" style="flex: 1;">
    </div>
  </div>
</div>

<!-- Layout -->
<div class="section-header">LAYOUT</div>
<div class="form-section">
  <div class="form-group">
    <label class="form-label">Width</label>
    <input type="text" id="width" class="panel-input" placeholder="auto">
  </div>

  <div class="form-group">
    <label class="form-label">Height</label>
    <input type="text" id="height" class="panel-input" placeholder="auto">
  </div>

  <div class="form-group">
    <label class="form-label">Display</label>
    <select id="display" class="panel-select">
      <option value="">Default</option>
      <option value="block">Block</option>
      <option value="inline">Inline</option>
      <option value="inline-block">Inline Block</option>
      <option value="flex">Flex</option>
      <option value="grid">Grid</option>
      <option value="none">None</option>
    </select>
  </div>
</div>

<!-- Spacing -->
<div class="section-header">SPACING</div>
<div class="form-section">
  <div class="form-group">
    <label class="form-label">Margin</label>
    <div class="grid-2">
      <input type="text" id="marginTop" class="panel-input" placeholder="Top">
      <input type="text" id="marginRight" class="panel-input" placeholder="Right">
      <input type="text" id="marginBottom" class="panel-input" placeholder="Bottom">
      <input type="text" id="marginLeft" class="panel-input" placeholder="Left">
    </div>
    <input type="text" id="margin" class="panel-input" placeholder="All sides" style="margin-top: 8px;">
  </div>

  <div class="form-group">
    <label class="form-label">Padding</label>
    <div class="grid-2">
      <input type="text" id="paddingTop" class="panel-input" placeholder="Top">
      <input type="text" id="paddingRight" class="panel-input" placeholder="Right">
      <input type="text" id="paddingBottom" class="panel-input" placeholder="Bottom">
      <input type="text" id="paddingLeft" class="panel-input" placeholder="Left">
    </div>
    <input type="text" id="padding" class="panel-input" placeholder="All sides" style="margin-top: 8px;">
  </div>
</div>

<!-- Border -->
<div class="section-header">BORDER</div>
<div class="form-section">
  <div class="form-group">
    <label class="form-label">Width</label>
    <input type="text" id="borderWidth" class="panel-input" placeholder="1px">
  </div>

  <div class="form-group">
    <label class="form-label">Style</label>
    <select id="borderStyle" class="panel-select">
      <option value="">Default</option>
      <option value="solid">Solid</option>
      <option value="dashed">Dashed</option>
      <option value="dotted">Dotted</option>
      <option value="none">None</option>
    </select>
  </div>

  <div class="form-group">
    <label class="form-label">Radius</label>
    <input type="text" id="borderRadius" class="panel-input" placeholder="0px">
  </div>
</div>

<!-- Effects -->
<div class="section-header">EFFECTS</div>
<div class="form-section">
  <div class="form-group">
    <label class="form-label">Box Shadow</label>
    <select id="shadowPreset" class="panel-select" style="margin-bottom: 8px;">
      <option value="Default">Default</option>
      <option value="none">None</option>
      <option value="0 1px 2px rgba(0,0,0,0.1)">Small</option>
      <option value="0 2px 4px rgba(0,0,0,0.1)">Medium</option>
      <option value="0 4px 8px rgba(0,0,0,0.15)">Large</option>
    </select>
    <input type="text" id="boxShadow" class="panel-input" placeholder="Custom shadow">
  </div>

  <div class="form-group">
    <label class="form-label">Opacity</label>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
      <span class="value-display" id="opacityDisplay">1</span>
    </div>
    <input type="range" id="opacity" min="0" max="1" step="0.1" value="1">
  </div>
</div>

<!-- Actions -->
<div class="form-section" style="padding: 24px 16px;">
  <button id="resetBtn">RESET CHANGES</button>
  <button id="submitBtn">SEND TO VS CODE</button>
</div>
    `;
    
    document.body.appendChild(this.editPanel);
    this.uiElements.add(this.editPanel);
    
    // Add all edit panel elements to UI elements set
    const allElements = this.editPanel.querySelectorAll('*');
    allElements.forEach(el => this.uiElements.add(el));
    
    this.setupEditPanelEvents();
  }

  setupEventListeners() {
    // Mouse events with proper element filtering
    this.mouseOverHandler = (e) => {
      if (this.isActive && !this.isEditing && !this.isUIElement(e.target)) {
        this.highlightElement(e.target);
      }
    };

    this.mouseOutHandler = (e) => {
      if (this.isActive && !this.isEditing && !this.isUIElement(e.target)) {
        this.hideOverlay();
        this.hideTooltip();
      }
    };

    this.clickHandler = (e) => {
      if (this.isActive && !this.isUIElement(e.target)) {
        e.preventDefault();
        e.stopPropagation();

        this.startEditMode(e.target);
        return false;
      }
    };

    this.contextMenuHandler = (e) => {
      if (this.isActive && !this.isUIElement(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        this.startEditMode(e.target);
        return false;
      } else if (!this.isActive) {
      }
    };

    this.keydownHandler = (e) => {
      if (!this.isActive) return;
      if (e.key === 'Escape') {
        this.deactivate();
      }
    };

    // Add listeners with capture to ensure proper handling
    document.addEventListener('mouseover', this.mouseOverHandler, true);
    document.addEventListener('mouseout', this.mouseOutHandler, true);
    document.addEventListener('click', this.clickHandler, true);
    document.addEventListener('contextmenu', this.contextMenuHandler, true);
    document.addEventListener('keydown', this.keydownHandler);
  }

  // Critical method: Check if element is part of our UI
  isUIElement(element) {
    if (!element) return true;
    
    // Check if element is in our UI elements set
    if (this.uiElements.has(element)) return true;
    
    // Check if element is inside our edit panel
    if (this.editPanel && this.editPanel.contains(element)) return true;
    
    // Check if element is inside our overlay or tooltip
    if (this.overlay && this.overlay.contains(element)) return true;
    if (this.tooltip && this.tooltip.contains(element)) return true;
    
    // Check for common UI element classes/IDs
    const uiSelectors = [
      '.production-edit-panel',
      '.production-inspector-overlay',
      '.production-inspector-tooltip',
      '[data-inspector-ui]'
    ];
    
    return uiSelectors.some(selector => element.matches(selector));
  }

  setupEditPanelEvents() {
    // Close button
    this.editPanel.querySelector('#closePanel')?.addEventListener('click', () => {
      this.hideEditPanel();
    });

    // Reset button
    this.editPanel.querySelector('#resetBtn')?.addEventListener('click', () => {
      this.resetElement();
    });

    // Submit button
    this.editPanel.querySelector('#submitBtn')?.addEventListener('click', () => {
      this.submitChanges();
    });

    // Text content
    const textContent = this.editPanel.querySelector('#textContent');
    textContent?.addEventListener('input', () => {
      if (this.selectedElement) {
        this.selectedElement.textContent = textContent.value;
      }
    });

    // Font size
    const fontSize = this.editPanel.querySelector('#fontSize');
    const fontSizeText = this.editPanel.querySelector('#fontSizeText');
    const fontSizeDisplay = this.editPanel.querySelector('#fontSizeDisplay');
    
    fontSize?.addEventListener('input', () => {
      const value = fontSize.value + 'px';
      fontSizeText.value = value;
      fontSizeDisplay.textContent = value;
      this.applyStyle('font-size', value);
    });
    
    fontSizeText?.addEventListener('input', () => {
      const numericValue = parseFloat(fontSizeText.value);
      if (!isNaN(numericValue)) {
        fontSize.value = numericValue;
        fontSizeDisplay.textContent = fontSizeText.value;
        this.applyStyle('font-size', fontSizeText.value);
      }
    });

    // Text color
    const textColor = this.editPanel.querySelector('#textColor');
    const textColorText = this.editPanel.querySelector('#textColorText');
    
    textColor?.addEventListener('input', () => {
      textColorText.value = textColor.value;
      this.applyStyle('color', textColor.value);
    });
    
    textColorText?.addEventListener('input', () => {
      if (textColorText.value.match(/^#[0-9A-Fa-f]{6}$/)) {
        textColor.value = textColorText.value;
      }
      this.applyStyle('color', textColorText.value);
    });

    // Background color
    const backgroundColor = this.editPanel.querySelector('#backgroundColor');
    const backgroundColorText = this.editPanel.querySelector('#backgroundColorText');
    
    backgroundColor?.addEventListener('input', () => {
      backgroundColorText.value = backgroundColor.value;
      this.applyStyle('background-color', backgroundColor.value);
    });
    
    backgroundColorText?.addEventListener('input', () => {
      if (backgroundColorText.value.match(/^#[0-9A-Fa-f]{6}$/)) {
        backgroundColor.value = backgroundColorText.value;
      }
      this.applyStyle('background-color', backgroundColorText.value);
    });

    // Border color
    const borderColor = this.editPanel.querySelector('#borderColor');
    const borderColorText = this.editPanel.querySelector('#borderColorText');
    
    borderColor?.addEventListener('input', () => {
      borderColorText.value = borderColor.value;
      this.applyStyle('border-color', borderColor.value);
    });
    
    borderColorText?.addEventListener('input', () => {
      if (borderColorText.value.match(/^#[0-9A-Fa-f]{6}$/)) {
        borderColor.value = borderColorText.value;
      }
      this.applyStyle('border-color', borderColorText.value);
    });

    // Opacity control
    const opacity = this.editPanel.querySelector('#opacity');
    const opacityDisplay = this.editPanel.querySelector('#opacityDisplay');
    
    opacity?.addEventListener('input', () => {
      const opacityValue = opacity.value / 100;
      opacityDisplay.textContent = `${opacity.value}%`;
      this.applyStyle('opacity', opacityValue.toString());
    });

    // Color presets
    const colorPresets = this.editPanel.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const color = preset.dataset.color;
        textColor.value = color;
        textColorText.value = color;
        this.applyStyle('color', color);
        
        // Add visual feedback
        preset.style.transform = 'scale(0.9)';
        setTimeout(() => {
          preset.style.transform = 'scale(1)';
        }, 150);
      });
    });

    // Font weight
    this.editPanel.querySelector('#fontWeight')?.addEventListener('change', (e) => {
      this.applyStyle('font-weight', e.target.value);
    });

    // Text alignment buttons
    const alignButtons = this.editPanel.querySelectorAll('.align-btn');
    alignButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        alignButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.applyStyle('text-align', btn.dataset.value);
      });
    });

    // Border radius
    const borderRadius = this.editPanel.querySelector('#borderRadius');
    const borderRadiusText = this.editPanel.querySelector('#borderRadiusText');
    const borderRadiusDisplay = this.editPanel.querySelector('#borderRadiusDisplay');
    
    borderRadius?.addEventListener('input', () => {
      const value = borderRadius.value + 'px';
      borderRadiusText.value = value;
      borderRadiusDisplay.textContent = value;
      this.applyStyle('border-radius', value);
    });
    
    borderRadiusText?.addEventListener('input', () => {
      const numericValue = parseFloat(borderRadiusText.value);
      if (!isNaN(numericValue)) {
        borderRadius.value = numericValue;
        borderRadiusDisplay.textContent = borderRadiusText.value;
        this.applyStyle('border-radius', borderRadiusText.value);
      }
    });

    // Width and Height
    this.editPanel.querySelector('#width')?.addEventListener('input', (e) => {
      this.applyStyle('width', e.target.value);
    });
    
    this.editPanel.querySelector('#height')?.addEventListener('input', (e) => {
      this.applyStyle('height', e.target.value);
    });

    // Margin and Padding
    this.editPanel.querySelector('#margin')?.addEventListener('input', (e) => {
      this.applyStyle('margin', e.target.value);
    });

    this.editPanel.querySelector('#padding')?.addEventListener('input', (e) => {
      this.applyStyle('padding', e.target.value);
    });

    // === NEW CONTROLS EVENT HANDLERS ===

    // Font Family
    this.editPanel.querySelector('#fontFamily')?.addEventListener('change', (e) => {
      if (e.target.value !== 'Default') {
        this.applyStyle('font-family', e.target.value);
      }
    });

    // Line Height
    const lineHeight = this.editPanel.querySelector('#lineHeight');
    const lineHeightText = this.editPanel.querySelector('#lineHeightText');
    const lineHeightDisplay = this.editPanel.querySelector('#lineHeightDisplay');

    lineHeight?.addEventListener('input', () => {
      const value = lineHeight.value + 'em';
      lineHeightText.value = value;
      lineHeightDisplay.textContent = lineHeight.value;
      this.applyStyle('line-height', value);
    });

    lineHeightText?.addEventListener('input', () => {
      const numericValue = parseFloat(lineHeightText.value);
      if (!isNaN(numericValue)) {
        lineHeight.value = numericValue;
        lineHeightDisplay.textContent = numericValue;
        this.applyStyle('line-height', lineHeightText.value);
      }
    });

    // Letter Spacing
    const letterSpacing = this.editPanel.querySelector('#letterSpacing');
    const letterSpacingText = this.editPanel.querySelector('#letterSpacingText');
    const letterSpacingDisplay = this.editPanel.querySelector('#letterSpacingDisplay');

    letterSpacing?.addEventListener('input', () => {
      const value = letterSpacing.value + 'em';
      letterSpacingText.value = value;
      letterSpacingDisplay.textContent = letterSpacing.value + 'em';
      this.applyStyle('letter-spacing', value);
    });

    letterSpacingText?.addEventListener('input', () => {
      const numericValue = parseFloat(letterSpacingText.value);
      if (!isNaN(numericValue)) {
        letterSpacing.value = numericValue;
        letterSpacingDisplay.textContent = numericValue + 'em';
        this.applyStyle('letter-spacing', letterSpacingText.value);
      }
    });

    // Text Decoration buttons
    const decorationButtons = this.editPanel.querySelectorAll('.decoration-btn');
    decorationButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const property = btn.dataset.property;
        const value = btn.dataset.value;

        if (property === 'reset') {
          // Reset both font-style and text-decoration
          this.applyStyle('font-style', 'normal');
          this.applyStyle('text-decoration', 'none');
          decorationButtons.forEach(b => b.classList.remove('active'));
        } else if (property === 'font-style') {
          // Toggle italic
          const isActive = btn.classList.contains('active');
          btn.classList.toggle('active');
          this.applyStyle('font-style', isActive ? 'normal' : value);
        } else if (property === 'text-decoration') {
          // Toggle text decoration
          const isActive = btn.classList.contains('active');
          decorationButtons.forEach(b => {
            if (b.dataset.property === 'text-decoration' && b !== btn) {
              b.classList.remove('active');
            }
          });
          btn.classList.toggle('active');
          this.applyStyle('text-decoration', isActive ? 'none' : value);
        }
      });
    });

    // Border Width
    const borderWidth = this.editPanel.querySelector('#borderWidth');
    const borderWidthText = this.editPanel.querySelector('#borderWidthText');
    const borderWidthDisplay = this.editPanel.querySelector('#borderWidthDisplay');

    borderWidth?.addEventListener('input', () => {
      const value = borderWidth.value + 'px';
      borderWidthText.value = value;
      borderWidthDisplay.textContent = value;
      this.applyStyle('border-width', value);
    });

    borderWidthText?.addEventListener('input', () => {
      const numericValue = parseFloat(borderWidthText.value);
      if (!isNaN(numericValue)) {
        borderWidth.value = numericValue;
        borderWidthDisplay.textContent = borderWidthText.value;
        this.applyStyle('border-width', borderWidthText.value);
      }
    });

    // Border Style
    this.editPanel.querySelector('#borderStyle')?.addEventListener('change', (e) => {
      if (e.target.value !== 'Default') {
        this.applyStyle('border-style', e.target.value);
      }
    });

    // Individual Margin Controls
    this.editPanel.querySelector('#marginTop')?.addEventListener('input', (e) => {
      this.applyStyle('margin-top', e.target.value);
    });
    this.editPanel.querySelector('#marginRight')?.addEventListener('input', (e) => {
      this.applyStyle('margin-right', e.target.value);
    });
    this.editPanel.querySelector('#marginBottom')?.addEventListener('input', (e) => {
      this.applyStyle('margin-bottom', e.target.value);
    });
    this.editPanel.querySelector('#marginLeft')?.addEventListener('input', (e) => {
      this.applyStyle('margin-left', e.target.value);
    });

    // Individual Padding Controls
    this.editPanel.querySelector('#paddingTop')?.addEventListener('input', (e) => {
      this.applyStyle('padding-top', e.target.value);
    });
    this.editPanel.querySelector('#paddingRight')?.addEventListener('input', (e) => {
      this.applyStyle('padding-right', e.target.value);
    });
    this.editPanel.querySelector('#paddingBottom')?.addEventListener('input', (e) => {
      this.applyStyle('padding-bottom', e.target.value);
    });
    this.editPanel.querySelector('#paddingLeft')?.addEventListener('input', (e) => {
      this.applyStyle('padding-left', e.target.value);
    });

    // Shadow Preset
    const shadowPreset = this.editPanel.querySelector('#shadowPreset');
    const boxShadow = this.editPanel.querySelector('#boxShadow');

    shadowPreset?.addEventListener('change', () => {
      const value = shadowPreset.value;
      if (value !== 'Default' && value !== 'custom') {
        boxShadow.value = value;
        this.applyStyle('box-shadow', value);
      }
    });

    // Custom Box Shadow
    boxShadow?.addEventListener('input', () => {
      shadowPreset.value = 'custom';
      this.applyStyle('box-shadow', boxShadow.value);
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['inspectorEnabled']);
      if (result.inspectorEnabled) {
        this.activate();
      }
    } catch (error) {
    }
  }

  toggle() {
    if (this.isActive) {
      this.deactivate();
    } else {
      this.activate();
    }
  }

  activate() {
    this.isActive = true;
    // Don't show overlay until hovering
  }

  deactivate() {
    this.isActive = false;
    this.isEditing = false;
    this.selectedElement = null;
    this.originalElement = null;

    // Ensure all UI elements are hidden
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
    if (this.tooltip) {
      this.tooltip.style.display = 'none';
    }
    if (this.editPanel) {
      this.editPanel.style.display = 'none';
    }
  }

  highlightElement(element) {
    if (this.isUIElement(element)) return;

    const rect = element.getBoundingClientRect();
    const left = rect.left + window.scrollX;
    const top = rect.top + window.scrollY;

    this.overlay.style.display = 'block';
    this.overlay.style.left = left + 'px';
    this.overlay.style.top = top + 'px';
    this.overlay.style.width = rect.width + 'px';
    this.overlay.style.height = rect.height + 'px';


    this.showTooltip(element);
  }

  hideOverlay() {
    this.overlay.style.display = 'none';
  }

  showTooltip(element) {
    if (this.isUIElement(element)) return;

    const rect = element.getBoundingClientRect();
    this.tooltip.innerHTML = '<strong>Click to edit in popup</strong>';
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = rect.left + 'px';
    this.tooltip.style.top = (rect.top - 40) + 'px';
  }

  hideTooltip() {
    this.tooltip.style.display = 'none';
  }

  selectElement(element) {
    if (this.isUIElement(element)) return;
    
    this.selectedElement = element;
    // Always capture the original state when selecting
    this.originalElement = element.cloneNode(true);
    this.hideOverlay();
      this.hideTooltip();
    this.showEditOption(element);
  }

  async extractAndSendElement(element) {
    if (this.isUIElement(element)) return;
    
    try {
      
      // Show loading state
      this.showNotification('Extracting element...', 'info');
      
      // Extract element data using simple method
      const html = this.generateHTML(element);
      const css = this.generateCSS(element);
      const selector = this.generateCSSSelector(element);
      
      // Create extraction data in the old simple format
      const extractionData = {
        element: {
          tagName: element.tagName.toLowerCase(),
          textContent: element.textContent?.trim() || '',
          id: element.id || '',
          classes: Array.from(element.classList)
        },
        code: {
          html: html,
          css: css
        },
        context: {
          selector: selector,
          url: window.location.href,
          pageTitle: document.title,
          timestamp: new Date().toISOString()
        }
      };
      
      
      // Send to background script
      const response = await chrome.runtime.sendMessage({
        action: 'sendToVSCode',
        data: extractionData
      });
      
      if (response && response.success) {
        this.showNotification('Element sent to VS Code!', 'success');
      } else {
        this.showNotification('Failed to send to VS Code', 'error');
      }
      
    } catch (error) {
      this.showNotification('Error extracting element', 'error');
    }
  }

  showEditOption(element) {
    if (this.isUIElement(element)) return;
    
    this.tooltip.innerHTML = '<strong>Left-click to extract • Right-click to edit</strong>';
    this.tooltip.style.background = '#000000';
    this.tooltip.style.display = 'block';
    const rect = element.getBoundingClientRect();
    this.tooltip.style.left = rect.left + 'px';
    this.tooltip.style.top = (rect.top - 40) + 'px';
  }

  startEditMode(element) {
    if (this.isUIElement(element)) return;

    this.isEditing = true;
    this.selectedElement = element;

    // Always capture the original state when starting edit mode
    this.originalElement = element.cloneNode(true);

    // Send element data to popup for editing
    this.sendElementToPopupEditor(element);

    this.hideOverlay();
    this.hideTooltip();

  }

  sendElementToPopupEditor(element) {
    const computedStyle = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    const elementData = {
      tag: element.tagName.toLowerCase(),
      id: element.id || 'none',
      classes: element.className || 'none',
      size: `${Math.round(rect.width)}×${Math.round(rect.height)}px`,
      styles: {
        // Text content
        textContent: element.textContent?.trim() || '',

        // Typography
        fontFamily: computedStyle.fontFamily,
        fontSize: computedStyle.fontSize,
        fontWeight: computedStyle.fontWeight,
        lineHeight: computedStyle.lineHeight,
        letterSpacing: computedStyle.letterSpacing,
        textAlign: computedStyle.textAlign,
        fontStyle: computedStyle.fontStyle,
        textDecoration: computedStyle.textDecoration,
        textTransform: computedStyle.textTransform,

        // Colors
        color: computedStyle.color,
        backgroundColor: computedStyle.backgroundColor,

        // Layout
        width: computedStyle.width,
        height: computedStyle.height,
        display: computedStyle.display,
        position: computedStyle.position,
        padding: computedStyle.padding,
        margin: computedStyle.margin,

        // Border
        borderWidth: computedStyle.borderWidth,
        borderStyle: computedStyle.borderStyle,
        borderColor: computedStyle.borderColor,
        borderRadius: computedStyle.borderRadius,

        // Appearance
        opacity: computedStyle.opacity,
        boxShadow: computedStyle.boxShadow
      }
    };


    // Send to background script (which will forward to popup)
    chrome.runtime.sendMessage({
      action: 'openLiveEditor',
      elementData: elementData
    }).then(response => {
    }).catch(err => {
    });

    // Notify popup that live preview mode has started
    this.notifyLivePreviewStarted(element);
  }

  showEditPanel() {
    this.editPanel.style.display = 'block';
    this.hideOverlay();
    this.hideTooltip();
  }

  hideEditPanel() {
    this.editPanel.style.display = 'none';
    this.isEditing = false;
    
    // Notify popup that live preview mode has stopped
    this.notifyLivePreviewStopped();
  }

  populateValues() {
    if (!this.selectedElement) return;
    
    const computedStyle = window.getComputedStyle(this.selectedElement);
    const rect = this.selectedElement.getBoundingClientRect();
    
    // Update element info using new structure
    const infoTag = this.editPanel.querySelector('#infoTag');
    const infoId = this.editPanel.querySelector('#infoId');
    const infoClass = this.editPanel.querySelector('#infoClass');

    if (infoTag) infoTag.textContent = this.selectedElement.tagName.toLowerCase();
    if (infoId) infoId.textContent = this.selectedElement.id || 'none';
    if (infoClass) infoClass.textContent = this.selectedElement.className || 'none';
    
    // Text content
    const textContent = this.editPanel.querySelector('#textContent');
    if (textContent) {
      textContent.value = this.selectedElement.textContent || '';
    }

    // Font size
    const fontSize = computedStyle.fontSize;
    const fontSizeSlider = this.editPanel.querySelector('#fontSize');
    const fontSizeText = this.editPanel.querySelector('#fontSizeText');
    const fontSizeDisplay = this.editPanel.querySelector('#fontSizeDisplay');
    if (fontSizeSlider && fontSizeText) {
      const numericValue = parseFloat(fontSize);
      if (!isNaN(numericValue)) {
        fontSizeSlider.value = numericValue;
        fontSizeText.value = fontSize;
        fontSizeDisplay.textContent = fontSize;
      }
    }

    // Text color
    const textColor = this.convertToHex(computedStyle.color);
    const textColorPicker = this.editPanel.querySelector('#textColor');
    const textColorText = this.editPanel.querySelector('#textColorText');
    if (textColorPicker && textColorText) {
      textColorPicker.value = textColor;
      textColorText.value = textColor;
    }

    // Background color
    const backgroundColor = this.convertToHex(computedStyle.backgroundColor);
    const backgroundColorPicker = this.editPanel.querySelector('#backgroundColor');
    const backgroundColorText = this.editPanel.querySelector('#backgroundColorText');
    if (backgroundColorPicker && backgroundColorText) {
      backgroundColorPicker.value = backgroundColor;
      backgroundColorText.value = backgroundColor;
    }

    // Border color
    const borderColor = this.convertToHex(computedStyle.borderColor);
    const borderColorPicker = this.editPanel.querySelector('#borderColor');
    const borderColorText = this.editPanel.querySelector('#borderColorText');
    if (borderColorPicker && borderColorText) {
      borderColorPicker.value = borderColor;
      borderColorText.value = borderColor;
    }

    // Opacity
    const opacity = computedStyle.opacity;
    const opacitySlider = this.editPanel.querySelector('#opacity');
    const opacityDisplay = this.editPanel.querySelector('#opacityDisplay');
    if (opacitySlider && opacityDisplay) {
      const opacityPercent = Math.round(parseFloat(opacity) * 100);
      opacitySlider.value = opacityPercent;
      opacityDisplay.textContent = `${opacityPercent}%`;
    }

    // Font weight
    const fontWeightSelect = this.editPanel.querySelector('#fontWeight');
    if (fontWeightSelect) {
      fontWeightSelect.value = computedStyle.fontWeight;
    }

    // Text alignment
    const textAlign = computedStyle.textAlign;
    const alignButtons = this.editPanel.querySelectorAll('.align-btn');
    alignButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.value === textAlign) {
        btn.classList.add('active');
      }
    });

    // Border radius
    const borderRadius = computedStyle.borderRadius;
    const borderRadiusSlider = this.editPanel.querySelector('#borderRadius');
    const borderRadiusText = this.editPanel.querySelector('#borderRadiusText');
    const borderRadiusDisplay = this.editPanel.querySelector('#borderRadiusDisplay');
    if (borderRadiusSlider && borderRadiusText) {
      const numericValue = parseFloat(borderRadius);
      if (!isNaN(numericValue)) {
        borderRadiusSlider.value = numericValue;
        borderRadiusText.value = borderRadius;
        borderRadiusDisplay.textContent = borderRadius;
      }
    }

    // Width and Height
    const widthInput = this.editPanel.querySelector('#width');
    const heightInput = this.editPanel.querySelector('#height');
    if (widthInput) widthInput.value = computedStyle.width || 'auto';
    if (heightInput) heightInput.value = computedStyle.height || 'auto';

    // Margin and Padding
    const marginInput = this.editPanel.querySelector('#margin');
    const paddingInput = this.editPanel.querySelector('#padding');
    if (marginInput) marginInput.value = computedStyle.margin || '0';
    if (paddingInput) paddingInput.value = computedStyle.padding || '0';

    // === NEW CONTROLS POPULATION ===

    // Font Family
    const fontFamilySelect = this.editPanel.querySelector('#fontFamily');
    if (fontFamilySelect) {
      const fontFamily = computedStyle.fontFamily;
      // Try to match with one of the options
      const found = Array.from(fontFamilySelect.options).find(opt =>
        opt.value !== 'Default' && fontFamily.includes(opt.value.split(',')[0].replace(/'/g, ''))
      );
      fontFamilySelect.value = found ? found.value : 'Default';
    }

    // Line Height
    const lineHeight = computedStyle.lineHeight;
    const lineHeightSlider = this.editPanel.querySelector('#lineHeight');
    const lineHeightText = this.editPanel.querySelector('#lineHeightText');
    const lineHeightDisplay = this.editPanel.querySelector('#lineHeightDisplay');
    if (lineHeightSlider && lineHeightText) {
      const numericValue = parseFloat(lineHeight) / parseFloat(fontSize);
      if (!isNaN(numericValue)) {
        lineHeightSlider.value = numericValue.toFixed(1);
        lineHeightText.value = numericValue.toFixed(1) + 'em';
        lineHeightDisplay.textContent = numericValue.toFixed(1);
      }
    }

    // Letter Spacing
    const letterSpacing = computedStyle.letterSpacing;
    const letterSpacingSlider = this.editPanel.querySelector('#letterSpacing');
    const letterSpacingText = this.editPanel.querySelector('#letterSpacingText');
    const letterSpacingDisplay = this.editPanel.querySelector('#letterSpacingDisplay');
    if (letterSpacingSlider && letterSpacingText) {
      if (letterSpacing === 'normal') {
        letterSpacingSlider.value = 0;
        letterSpacingText.value = '0em';
        letterSpacingDisplay.textContent = '0em';
      } else {
        const numericValue = parseFloat(letterSpacing) / parseFloat(fontSize);
        if (!isNaN(numericValue)) {
          letterSpacingSlider.value = numericValue.toFixed(2);
          letterSpacingText.value = numericValue.toFixed(2) + 'em';
          letterSpacingDisplay.textContent = numericValue.toFixed(2) + 'em';
        }
      }
    }

    // Text Decoration state
    const textDecoration = computedStyle.textDecoration;
    const fontStyle = computedStyle.fontStyle;
    const decorationButtons = this.editPanel.querySelectorAll('.decoration-btn');
    decorationButtons.forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.property === 'font-style' && fontStyle === 'italic') {
        btn.classList.add('active');
      } else if (btn.dataset.property === 'text-decoration' && textDecoration.includes(btn.dataset.value)) {
        btn.classList.add('active');
      }
    });

    // Border Width
    const borderWidth = computedStyle.borderWidth;
    const borderWidthSlider = this.editPanel.querySelector('#borderWidth');
    const borderWidthText = this.editPanel.querySelector('#borderWidthText');
    const borderWidthDisplay = this.editPanel.querySelector('#borderWidthDisplay');
    if (borderWidthSlider && borderWidthText) {
      const numericValue = parseFloat(borderWidth);
      if (!isNaN(numericValue)) {
        borderWidthSlider.value = numericValue;
        borderWidthText.value = borderWidth;
        borderWidthDisplay.textContent = borderWidth;
      }
    }

    // Border Style
    const borderStyleSelect = this.editPanel.querySelector('#borderStyle');
    if (borderStyleSelect) {
      borderStyleSelect.value = computedStyle.borderStyle || 'Default';
    }

    // Individual Margin values
    const marginTop = this.editPanel.querySelector('#marginTop');
    const marginRight = this.editPanel.querySelector('#marginRight');
    const marginBottom = this.editPanel.querySelector('#marginBottom');
    const marginLeft = this.editPanel.querySelector('#marginLeft');
    if (marginTop) marginTop.value = computedStyle.marginTop || '0px';
    if (marginRight) marginRight.value = computedStyle.marginRight || '0px';
    if (marginBottom) marginBottom.value = computedStyle.marginBottom || '0px';
    if (marginLeft) marginLeft.value = computedStyle.marginLeft || '0px';

    // Individual Padding values
    const paddingTop = this.editPanel.querySelector('#paddingTop');
    const paddingRight = this.editPanel.querySelector('#paddingRight');
    const paddingBottom = this.editPanel.querySelector('#paddingBottom');
    const paddingLeft = this.editPanel.querySelector('#paddingLeft');
    if (paddingTop) paddingTop.value = computedStyle.paddingTop || '0px';
    if (paddingRight) paddingRight.value = computedStyle.paddingRight || '0px';
    if (paddingBottom) paddingBottom.value = computedStyle.paddingBottom || '0px';
    if (paddingLeft) paddingLeft.value = computedStyle.paddingLeft || '0px';

    // Box Shadow
    const boxShadowInput = this.editPanel.querySelector('#boxShadow');
    const shadowPresetSelect = this.editPanel.querySelector('#shadowPreset');
    if (boxShadowInput) {
      const boxShadow = computedStyle.boxShadow;
      boxShadowInput.value = boxShadow !== 'none' ? boxShadow : '';

      // Try to match with a preset
      if (shadowPresetSelect && boxShadow !== 'none') {
        const found = Array.from(shadowPresetSelect.options).find(opt =>
          opt.value !== 'Default' && opt.value !== 'custom' && opt.value === boxShadow
        );
        shadowPresetSelect.value = found ? found.value : 'custom';
      } else if (shadowPresetSelect) {
        shadowPresetSelect.value = 'Default';
      }
    }
  }

  applyStyle(property, value) {
    if (!this.selectedElement || !value) return;
    
    try {
      this.selectedElement.style.setProperty(property, value);
    } catch (error) {
    }
  }

  resetElement() {
    if (this.selectedElement && this.originalElement) {
      this.selectedElement.style.cssText = '';
      this.populateValues();
      this.showNotification('Element reset to original state', 'success');
    }
  }

  async submitChanges() {
    if (!this.selectedElement) return;
    
    try {
      const submitBtn = this.editPanel.querySelector('#submitBtn');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = '⏳ Sending...';
      submitBtn.disabled = true;
      
      const editData = {
        original: {
          html: this.originalElement ? this.originalElement.outerHTML : this.selectedElement.outerHTML,
          css: this.originalElement ? this.getComputedStyles(this.originalElement) : this.getComputedStyles(this.selectedElement),
          element: this.getElementInfo(this.originalElement || this.selectedElement),
          selector: this.generateCSSSelector(this.selectedElement)
        },
        modified: {
          html: this.selectedElement.outerHTML,
          css: this.getComputedStyles(this.selectedElement),
          changes: this.generateChangesSummary()
        },
        context: {
          url: window.location.href,
          pageTitle: document.title,
          timestamp: new Date().toISOString()
        }
      };


      const response = await chrome.runtime.sendMessage({
          action: 'sendToVSCode',
        data: {
          type: 'element-edit',
          content: JSON.stringify(editData),
          metadata: { editData }
        }
      });


      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;

      return response;
    } catch (error) {

      const submitBtn = this.editPanel.querySelector('#submitBtn');
      submitBtn.innerHTML = '🚀 Send to VS Code';
      submitBtn.disabled = false;

      return { success: false, error: error.message };
    }
  }

  getCurrentStyles() {
    if (!this.selectedElement) return '';
    return this.selectedElement.style.cssText;
  }

  getOriginalStyles() {
    if (!this.originalElement) return '';
    return this.originalElement.style.cssText;
  }

  getComputedStyles(element) {
    if (!element) return '';
    
    try {
      const computedStyle = window.getComputedStyle(element);
      const importantStyles = [
        'display', 'position', 'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'border', 'border-width', 'border-style', 'border-color', 'border-radius',
        'box-shadow', 'background', 'background-color', 'background-image',
        'color', 'font-family', 'font-size', 'font-weight', 'font-style',
        'text-align', 'text-decoration', 'line-height', 'letter-spacing',
        'opacity', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
        'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
        'grid', 'grid-template-columns', 'grid-template-rows', 'gap'
      ];
      
      const styles = [];
      importantStyles.forEach(prop => {
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'initial' && value !== 'normal') {
          styles.push(`${prop}: ${value};`);
        }
      });
      
      return styles.join('\n');
    } catch (error) {
      return element.style.cssText || '';
    }
  }


  getElementInfo(element) {
    
    // Get text content more reliably - try multiple methods
    let textContent = '';
    
    try {
      // First try direct textContent
      if (element.textContent && element.textContent.trim()) {
        textContent = element.textContent.trim();
      } 
      // Then try innerText
      else if (element.innerText && element.innerText.trim()) {
        textContent = element.innerText.trim();
      } 
      // Then try extracting from innerHTML
      else if (element.innerHTML) {
        const temp = document.createElement('div');
        temp.innerHTML = element.innerHTML;
        textContent = temp.textContent?.trim() || temp.innerText?.trim() || '';
      }
      // Finally try getting text from child elements
      else {
        const textNodes = [];
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        let node;
        while (node = walker.nextNode()) {
          if (node.textContent.trim()) {
            textNodes.push(node.textContent.trim());
          }
        }
        textContent = textNodes.join(' ').trim();
      }
    } catch (error) {
      textContent = '';
    }
    
    
    // Get element context and relationships
    const parent = element.parentElement;
    const children = Array.from(element.children);
    const siblings = parent ? Array.from(parent.children).filter(child => child !== element) : [];
    
    // Get all attributes for comprehensive context
    const allAttributes = {};
    try {
      if (element.attributes && element.attributes.length > 0) {
        Array.from(element.attributes).forEach(attr => {
          allAttributes[attr.name] = attr.value;
        });
      }
    } catch (error) {
    }
    
    
    // Get data attributes
    const dataAttributes = {};
    try {
      Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
          dataAttributes[attr.name] = attr.value;
        }
      });
    } catch (error) {
    }
    
    // Get accessibility attributes
    const ariaAttributes = {};
    try {
      Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('aria-') || attr.name === 'role' || attr.name === 'tabindex') {
          ariaAttributes[attr.name] = attr.value;
        }
      });
    } catch (error) {
    }
    
    // Get element position and dimensions - ensure element is in viewport
    let rect, computedStyle;
    try {
      rect = element.getBoundingClientRect();
      computedStyle = window.getComputedStyle(element);
    } catch (error) {
      rect = { left: 0, top: 0, width: 0, height: 0 };
      computedStyle = { visibility: 'visible', display: 'block', opacity: '1' };
    }
    
    // Detect framework/library
    const framework = this.detectFramework(element);
    
    // Get element visibility - more accurate check
    const isVisible = rect.width > 0 && rect.height > 0 && 
                     computedStyle.visibility !== 'hidden' && 
                     computedStyle.display !== 'none' &&
                     computedStyle.opacity !== '0';
    
    
    // Get inner HTML more reliably
    const innerHTML = element.innerHTML || '';
    
    // Detect project structure hints
    const projectHints = this.detectProjectStructure(element);
    
    // Get event handlers and listeners
    const eventHandlers = this.detectEventHandlers(element);
    
    // Get component hierarchy
    const componentHierarchy = this.getComponentHierarchy(element);
    
    // Get page information
    const pageInfo = this.getPageInfo(element);
    
    // Get XPath for precise element location
    const xpath = this.getXPath(element);
    
    const result = {
      tagName: element.tagName ? element.tagName.toLowerCase() : 'unknown',
      id: element.id || '',
      classes: element.classList ? Array.from(element.classList) : [],
      textContent: textContent,
      
      // Context and relationships
      parent: parent ? {
        tagName: parent.tagName ? parent.tagName.toLowerCase() : 'unknown',
        id: parent.id || '',
        classes: parent.classList ? Array.from(parent.classList).slice(0, 3) : [],
        textContent: parent.textContent ? parent.textContent.trim().substring(0, 50) : ''
      } : null,
      children: children.slice(0, 3).map(child => ({
        tagName: child.tagName ? child.tagName.toLowerCase() : 'unknown',
        id: child.id || '',
        classes: child.classList ? Array.from(child.classList).slice(0, 2) : [],
        textContent: child.textContent ? child.textContent.trim().substring(0, 30) : ''
      })),
      siblings: siblings.slice(0, 3).map(sibling => ({
        tagName: sibling.tagName ? sibling.tagName.toLowerCase() : 'unknown',
        id: sibling.id || '',
        classes: sibling.classList ? Array.from(sibling.classList).slice(0, 2) : [],
        textContent: sibling.textContent ? sibling.textContent.trim().substring(0, 30) : ''
      })),
      
      // All attributes for comprehensive context
      allAttributes: allAttributes,
      dataAttributes: dataAttributes,
      ariaAttributes: ariaAttributes,
      
      // Position and dimensions
      position: {
        x: Math.round(rect.left || 0),
        y: Math.round(rect.top || 0),
        width: Math.round(rect.width || 0),
        height: Math.round(rect.height || 0)
      },
      
      // Framework detection
      framework: framework,
      
      // Visibility
      isVisible: isVisible,
      
      // Project structure hints
      projectHints: projectHints,
      
      // Event handlers and listeners
      eventHandlers: eventHandlers,
      
      // Component hierarchy
      componentHierarchy: componentHierarchy,
      
      // Page information
      pageInfo: pageInfo,
      
      // XPath for precise location
      xpath: xpath,
      
      // Additional context
      innerHTML: innerHTML.length > 200 ? 
        innerHTML.substring(0, 200) + '...' : 
        innerHTML
    };
    
    return result;
  }

  detectFramework(element) {
    // Check for React
    if (element._reactInternalFiber || element._reactInternalInstance) {
      return 'React';
    }
    
    // Check for Vue
    if (element.__vue__ || element.__vueParentComponent) {
      return 'Vue';
    }
    
    // Check for Angular
    if (element.__ngContext__ || element.ngVersion) {
      return 'Angular';
    }
    
    // Check for Svelte
    if (element.__svelte_meta) {
      return 'Svelte';
    }
    
    // Check for common UI libraries
    const classes = Array.from(element.classList);
    const id = element.id || '';
    
    // Check for Radix UI (common patterns)
    if (id.includes('radix-') || classes.some(cls => cls.includes('radix'))) {
      return 'Radix UI';
    }
    
    if (classes.some(cls => cls.startsWith('Mui'))) return 'Material-UI';
    if (classes.some(cls => cls.startsWith('ant-'))) return 'Ant Design';
    if (classes.some(cls => cls.startsWith('chakra-'))) return 'Chakra UI';
    if (classes.some(cls => cls.startsWith('bp3-'))) return 'Blueprint';
    if (classes.some(cls => cls.startsWith('v-'))) return 'Vuetify';
    if (classes.some(cls => cls.startsWith('el-'))) return 'Element UI';
    
    // Check for Tailwind CSS
    if (classes.some(cls => /^(bg-|text-|p-|m-|w-|h-|flex|grid|inline-flex|items-center|justify-center)/.test(cls))) {
      return 'Tailwind CSS';
    }
    
    return 'Unknown';
  }

  detectProjectStructure(element) {
    const hints = [];
    
    // Check for common project patterns
    const classes = Array.from(element.classList);
    const id = element.id || '';
    const text = element.textContent?.toLowerCase() || '';
    
    // Next.js patterns
    if (classes.some(cls => cls.includes('next') || cls.includes('page'))) {
      hints.push('Next.js project');
    }
    
    // React patterns
    if (classes.some(cls => cls.includes('react') || cls.includes('component'))) {
      hints.push('React component');
    }
    
    // Vue patterns
    if (classes.some(cls => cls.includes('vue') || cls.includes('nuxt'))) {
      hints.push('Vue/Nuxt project');
    }
    
    // Common UI patterns
    if (text.includes('dashboard') || text.includes('admin')) {
      hints.push('Dashboard/Admin interface');
    }
    
    if (text.includes('bug') || text.includes('report') || text.includes('issue')) {
      hints.push('Bug tracking/Issue management system');
    }
    
    if (text.includes('project') || text.includes('team')) {
      hints.push('Project management interface');
    }
    
    // Layout patterns
    if (element.tagName === 'h1' || element.tagName === 'h2') {
      hints.push('Page heading/title');
    }
    
    if (element.tagName === 'nav' || classes.some(cls => cls.includes('nav'))) {
      hints.push('Navigation component');
    }
    
    if (element.tagName === 'button' && classes.some(cls => cls.includes('tab'))) {
      hints.push('Tab navigation component');
    }
    
    return hints.length > 0 ? hints.join(', ') : 'General web application';
  }

  detectEventHandlers(element) {
    try {
      const handlers = [];
      
      // Check for common event handler attributes
      const eventAttributes = ['onclick', 'onchange', 'onsubmit', 'onload', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'];
      eventAttributes.forEach(attr => {
        if (element.hasAttribute && element.hasAttribute(attr)) {
          const value = element.getAttribute(attr);
          if (value) {
            handlers.push(`${attr}: ${value}`);
          }
        }
      });
      
      // Check for data attributes that might indicate event handlers
      if (element.dataset) {
        Object.keys(element.dataset).forEach(key => {
          if (key.includes('click') || key.includes('action') || key.includes('handler')) {
            handlers.push(`data-${key}: ${element.dataset[key]}`);
          }
        });
      }
      
      return handlers.length > 0 ? handlers : ['No event handlers detected'];
    } catch (error) {
      return ['Error detecting event handlers'];
    }
  }

  getComponentHierarchy(element) {
    try {
      const hierarchy = [];
      let current = element;
      let depth = 0;
      
      while (current && depth < 5) {
        const info = {
          tag: current.tagName ? current.tagName.toLowerCase() : 'unknown',
          id: current.id || null,
          classes: current.classList ? Array.from(current.classList).slice(0, 2) : [],
          text: current.textContent ? current.textContent.trim().substring(0, 30) : ''
        };
        
        hierarchy.unshift(info);
        current = current.parentElement;
        depth++;
      }
      
      return hierarchy;
    } catch (error) {
      return [];
    }
  }

  getPageInfo(element) {
    try {
      const title = document.title || 'Untitled Page';
      const url = window.location.href || 'N/A';
      const pathname = window.location.pathname || 'N/A';
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const breadcrumb = this.getBreadcrumbNavigation();
      const viewport = {
        width: window.innerWidth || 0,
        height: window.innerHeight || 0
      };
      const userAgent = navigator.userAgent ? navigator.userAgent.substring(0, 100) + '...' : 'N/A';
      const timestamp = new Date().toISOString();
      
      
      return {
        title,
        url,
        pathname,
        search,
        hash,
        breadcrumb,
        viewport,
        userAgent,
        timestamp
      };
    } catch (error) {
      return {
        title: 'Error getting page info',
        url: 'N/A',
        pathname: 'N/A',
        search: '',
        hash: '',
        breadcrumb: 'Error',
        viewport: { width: 0, height: 0 },
        userAgent: 'N/A',
        timestamp: new Date().toISOString()
      };
    }
  }

  getBreadcrumbNavigation() {
    // Try to detect breadcrumb navigation
    const breadcrumbSelectors = [
      'nav[aria-label*="breadcrumb"]',
      '.breadcrumb',
      '.breadcrumbs',
      '[data-testid*="breadcrumb"]',
      'nav ol',
      'nav ul'
    ];
    
    for (const selector of breadcrumbSelectors) {
      const breadcrumb = document.querySelector(selector);
      if (breadcrumb) {
        const items = Array.from(breadcrumb.querySelectorAll('a, span, li')).map(item => 
          item.textContent?.trim() || item.innerText?.trim() || ''
        ).filter(text => text.length > 0);
        
        if (items.length > 0) {
          return items.join(' > ');
        }
      }
    }
    
    // Fallback: try to construct from URL path
    const pathSegments = window.location.pathname.split('/').filter(segment => segment.length > 0);
    if (pathSegments.length > 0) {
      return 'Home > ' + pathSegments.map(segment => 
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
      ).join(' > ');
    }
    
    return 'No breadcrumb detected';
  }

  getXPath(element) {
    try {
      if (!element || !element.nodeType) {
        return 'N/A';
      }
      
      if (element.id) {
        const xpath = `//*[@id="${element.id}"]`;
        return xpath;
      }
      
      const path = [];
      let current = element;
      
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.nodeName ? current.nodeName.toLowerCase() : 'unknown';
        
        if (current.id) {
          selector += `[@id="${current.id}"]`;
          path.unshift(selector);
          break;
        } else {
          let sibling = current;
          let nth = 1;
          
          while (sibling = sibling.previousElementSibling) {
            if (sibling.nodeName && sibling.nodeName.toLowerCase() === selector) {
              nth++;
            }
          }
          
          if (nth > 1) {
            selector += `[${nth}]`;
          }
        }
        
        path.unshift(selector);
        current = current.parentElement;
      }
      
      const xpath = '/' + path.join('/');
      return xpath;
    } catch (error) {
      return 'N/A';
    }
  }

  generateCSSSelector(element) {
    if (element.id) return `#${element.id}`;
    let selector = element.tagName.toLowerCase();
    if (element.className) {
      selector += '.' + element.className.split(' ').join('.');
    }
    return selector;
  }

  generateHTML(element) {
    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);
    
    // Remove any inspector-related attributes
    const inspectorAttrs = ['data-inspector-selected', 'data-inspector-hover'];
    inspectorAttrs.forEach(attr => {
      if (clone.hasAttribute(attr)) {
        clone.removeAttribute(attr);
      }
    });
    
    return clone.outerHTML;
  }

  generateCSS(element) {
    const computedStyle = window.getComputedStyle(element);
    const cssProperties = [];
    
    // Common CSS properties to extract
    const properties = [
      'display', 'position', 'top', 'right', 'bottom', 'left',
      'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'border', 'border-width', 'border-style', 'border-color',
      'border-radius', 'box-shadow',
      'background', 'background-color', 'background-image', 'background-size',
      'color', 'font-family', 'font-size', 'font-weight', 'font-style',
      'text-align', 'text-decoration', 'line-height', 'letter-spacing',
      'opacity', 'visibility', 'z-index', 'overflow', 'overflow-x', 'overflow-y',
      'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items',
      'grid', 'grid-template-columns', 'grid-template-rows', 'gap'
    ];
    
    properties.forEach(prop => {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'initial' && value !== 'inherit' && value !== 'auto') {
        cssProperties.push(`${prop}: ${value};`);
      }
    });
    
    return cssProperties.join('\n');
  }

  generateChangesSummary() {
    if (!this.selectedElement || !this.originalElement) {
      return ['Element styling modified'];
    }
    
    const changes = [];
    
    // Debug logging
    
    // Check text content changes
    const currentText = this.selectedElement.textContent?.trim();
    const originalText = this.originalElement.textContent?.trim();
    
    if (currentText !== originalText) {
      changes.push(`Text content changed from "${originalText}" to "${currentText}"`);
    }
    
    // Check style changes
    const currentStyles = this.selectedElement.style.cssText;
    const originalStyles = this.originalElement.style.cssText;
    
    if (currentStyles !== originalStyles) {
    if (currentStyles) {
        changes.push(`Inline styles added: ${currentStyles}`);
      } else if (originalStyles) {
        changes.push(`Inline styles removed: ${originalStyles}`);
      }
    }
    
    // Check class changes
    const currentClasses = this.selectedElement.className;
    const originalClasses = this.originalElement.className;
    
    if (currentClasses !== originalClasses) {
      changes.push(`CSS classes changed from "${originalClasses}" to "${currentClasses}"`);
    }
    
    // Check tag name changes
    const currentTag = this.selectedElement.tagName.toLowerCase();
    const originalTag = this.originalElement.tagName.toLowerCase();
    
    if (currentTag !== originalTag) {
      changes.push(`Element type changed from "${originalTag}" to "${currentTag}"`);
    }
    
    // Check attribute changes
    const currentId = this.selectedElement.id;
    const originalId = this.originalElement.id;
    
    if (currentId !== originalId) {
      changes.push(`ID changed from "${originalId}" to "${currentId}"`);
    }
    
    
    return changes.length > 0 ? changes : ['Element styling modified'];
  }

  convertToHex(colorValue) {
    try {
      if (!colorValue || colorValue === 'initial' || colorValue === 'inherit' || colorValue === 'transparent') {
        return '#000000';
      }
      
      if (colorValue.startsWith('#')) return colorValue;
      
      if (colorValue.startsWith('rgb(')) {
        const rgbMatch = colorValue.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
      }
      
      if (colorValue.startsWith('rgba(')) {
        const rgbaMatch = colorValue.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1]);
          const g = parseInt(rgbaMatch[2]);
          const b = parseInt(rgbaMatch[3]);
          return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
        }
      }
      
      return '#000000';
    } catch (error) {
      return '#000000';
    }
  }

  // ============================================
  // LIVE PREVIEW NOTIFICATIONS
  // ============================================
  
  notifyLivePreviewStarted(element) {
    // Send message to background script to forward to popup
    chrome.runtime.sendMessage({
      type: 'livePreviewStarted',
      element: {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        size: `${Math.round(element.getBoundingClientRect().width)}×${Math.round(element.getBoundingClientRect().height)}px`
      }
    }).catch(error => {
    });
  }
  
  notifyLivePreviewStopped() {
    // Send message to background script to forward to popup
    chrome.runtime.sendMessage({
      type: 'livePreviewStopped'
    }).catch(error => {
    });
  }
  
  notifyElementUpdated(element) {
    if (this.isEditing && element) {
      // Send message to background script to forward to popup
      chrome.runtime.sendMessage({
        type: 'elementUpdated',
        element: {
          tagName: element.tagName,
          id: element.id,
          className: element.className,
          size: `${Math.round(element.getBoundingClientRect().width)}×${Math.round(element.getBoundingClientRect().height)}px`
        }
      }).catch(error => {
      });
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 11px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">${type === 'success' ? 'SUCCESS' : type === 'error' ? 'ERROR' : 'INFO'}</div>
        <div style="font-size: 11px; font-weight: 400;">${message}</div>
      </div>
    `;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#000000' : '#1a1a1a'};
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 0;
      font-size: 11px;
      font-family: ui-monospace, 'SF Mono', 'Consolas', 'Monaco', monospace;
      z-index: 1000004;
      box-shadow: none;
      border: 1px solid #000000;
      max-width: 250px;
    `;

    document.body.appendChild(notification);

      setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }

  // Message handling
  setupMessageListener() {
    this.messageListener = (message, sender, sendResponse) => {
      
      try {
        switch (message.action) {
          case 'toggleInspector':
            this.toggle();
            sendResponse({ active: this.isActive });
            break;
            
          case 'getInspectorState':
            sendResponse({ active: this.isActive });
            break;
            
          case 'extractSelected':
            if (this.selectedElement) {
              this.extractElement(this.selectedElement);
            }
            sendResponse({ success: true });
            break;

          case 'applyStyle':
            if (this.selectedElement) {
              this.applyStyle(message.property, message.value);
            }
            sendResponse({ success: true });
            break;

          case 'applyTextContent':
            if (this.selectedElement) {
              this.selectedElement.textContent = message.text;
            }
            sendResponse({ success: true });
            break;
            
          case 'editSelected':
            if (this.selectedElement) {
              this.startEditMode(this.selectedElement);
    } else {
              this.showNotification('Please select an element first by clicking on it', 'info');
            }
            sendResponse({ success: true });
            break;

          case 'resetElement':
            if (this.isEditing && this.selectedElement) {
              this.resetElement();
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'No element being edited' });
            }
            break;

          case 'submitChanges':
            if (this.isEditing && this.selectedElement) {
              this.submitChanges().then((response) => {
                sendResponse(response || { success: true });
              }).catch(error => {
                sendResponse({ success: false, error: error.message });
              });
              return true; // Keep message channel open for async response
            } else {
              sendResponse({ success: false, error: 'No element being edited' });
            }
            break;

          case 'closeEditMode':
            if (this.isEditing) {
              this.hideEditPanel();
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false, error: 'Not in edit mode' });
            }
            break;
            
          case 'getSelectedInfo':
            sendResponse({
              hasSelected: !!this.selectedElement,
              elementInfo: this.selectedElement ? this.getElementInfo(this.selectedElement) : null
            });
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    };

    chrome.runtime.onMessage.addListener(this.messageListener);
  }

  async extractElement(element) {
    try {
      if (!chrome.runtime?.id) {
        throw new Error('Extension context invalidated - please refresh the page');
      }

      const elementData = this.getElementInfo(element);
      const extractedCode = this.generateEssentialCSS(elementData);

      const data = {
        element: elementData,
        code: {
          html: element.outerHTML,
          css: extractedCode
        },
        url: window.location.href,
        context: {
          pageTitle: document.title,
          domain: window.location.hostname,
          timestamp: new Date().toISOString()
        }
      };

      await chrome.runtime.sendMessage({
          action: 'sendToVSCode',
          data: data
      });

      this.showNotification('Code extracted to VS Code!', 'success');
    } catch (error) {
      this.showNotification('Failed to extract code', 'error');
    }
  }

  generateEssentialCSS(elementData) {
    const { tagName, id, classes } = elementData;
    let selector = tagName;
    if (id) selector = `#${id}`;
    else if (classes.length) selector = `.${classes[0]}`;

    return `${selector} {\n  /* Add your styles here */\n}`;
  }

  cleanup() {
    try {
      if (this.messageListener) {
        chrome.runtime.onMessage.removeListener(this.messageListener);
      }
      
      document.removeEventListener('mouseover', this.mouseOverHandler, true);
      document.removeEventListener('mouseout', this.mouseOutHandler, true);
      document.removeEventListener('click', this.clickHandler, true);
      document.removeEventListener('contextmenu', this.contextMenuHandler, true);
      document.removeEventListener('keydown', this.keydownHandler);

      if (this.overlay?.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      
      if (this.tooltip?.parentNode) {
        this.tooltip.parentNode.removeChild(this.tooltip);
      }
      
      if (this.editPanel?.parentNode) {
        this.editPanel.parentNode.removeChild(this.editPanel);
      }

    } catch (error) {
    }
  }
}

// Initialize when DOM is ready
function initializeInspector() {
  try {
    window.elementInspector = new ProductionElementInspector();
    
    // Send ready signal to background script
    chrome.runtime.sendMessage({ action: 'contentScriptReady' }).then(() => {
    }).catch((error) => {
    });
    } catch (error) {
  }
}

// Add error handling for the initialization
try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeInspector);
  } else {
    initializeInspector();
  }
} catch (error) {
}
