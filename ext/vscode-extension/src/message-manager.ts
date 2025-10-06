import * as vscode from 'vscode';
import { BridgeMessage } from './types';

export class MessageManager {
  private readonly outputChannel: vscode.OutputChannel;

  constructor(private context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel('Stylecast');
  }

  handleBrowserMessage(message: BridgeMessage): void {
    // Enhanced processing with proper timing for Copilot integration
    try {
      this.outputChannel.appendLine(`Received message type: ${message.type}`);

      // Quick validation only
      if (!message || !message.content || message.content.length > 100000) {
        this.outputChannel.appendLine('Message validation failed');
        return;
      }

      // Handle different message types
      if (message.type === 'element-edit') {
        this.outputChannel.appendLine('Processing element-edit message');
        this.handleElementEdit(message).catch((error) => {
          this.outputChannel.appendLine(`Error in handleElementEdit: ${error}`);
        });
      } else {
        this.outputChannel.appendLine('Processing as copilot message');
        // Process clipboard and Copilot with proper timing
        this.processForCopilot(message).catch((error) => {
          this.outputChannel.appendLine(`Error in processForCopilot: ${error}`);
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`Error handling message: ${error}`);
    }
  }

  private async processForCopilot(message: BridgeMessage): Promise<void> {
    // Get settings
    const config = vscode.workspace.getConfiguration('stylecast');
    const enableCopilotIntegration = config.get<boolean>('enableCopilotIntegration', false);
    const autoSendToCopilot = config.get<boolean>('autoSendToCopilot', true);
    const copilotPrefix = config.get<string>('copilotPrefix', '');
    
    // Format and copy content first
    await this.formatMessageForCopilot(message);
    
    if (enableCopilotIntegration && autoSendToCopilot) {
      // Try to automatically open Copilot Chat and paste content
      await this.autoOpenCopilotChat();
    }
  }

  private async handleElementEdit(message: BridgeMessage): Promise<void> {
    try {
      const editData = JSON.parse(message.content);

      // Validate edit data structure
      if (!editData || typeof editData !== 'object') {
        throw new Error('Invalid edit data: not an object');
      }

      if (!editData.original || !editData.modified || !editData.context) {
        this.outputChannel.appendLine('Edit data missing required fields');

        // Fallback: try to format with available data
        const fallbackContent = this.formatFallbackEditData(editData);
        await vscode.env.clipboard.writeText(fallbackContent);
        return;
      }

      // Get settings
      const config = vscode.workspace.getConfiguration('stylecast');
      const enableCopilotIntegration = config.get<boolean>('enableCopilotIntegration', false);
      const autoSendToCopilot = config.get<boolean>('autoSendToCopilot', true);
      const copilotPrefix = config.get<string>('copilotPrefix', '');

      // Format the edit data for Copilot
      let formatted = this.formatElementEditForCopilot(editData);

      // Add prefix if configured
      if (copilotPrefix) {
        formatted = `${copilotPrefix}\n\n${formatted}`;
      }

      // Copy to clipboard
      await vscode.env.clipboard.writeText(formatted);

      // Show notification with element info
      const elementTag = editData.original?.element?.tagName?.toLowerCase() || 'element';
      const elementId = editData.original?.element?.id ? `#${editData.original.element.id}` : '';
      const changes = editData.modified?.changes || [];
      const changesText = Array.isArray(changes) && changes.length > 0
        ? changes.slice(0, 2).join(', ') + (changes.length > 2 ? '...' : '')
        : 'Style changes';

      vscode.window.showInformationMessage(
        `Style changes received for <${elementTag}${elementId}>: ${changesText}`
      );

      if (enableCopilotIntegration && autoSendToCopilot) {
        // Try to automatically open Copilot Chat and paste content
        await this.autoOpenCopilotChat();
      }

    } catch (error) {
      this.outputChannel.appendLine(`Error handling element edit: ${error}`);

      // Try to provide a fallback message
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const fallbackMessage = `# Element Edit Data\n\nReceived element edit data but failed to process it properly.\n\n**Raw Data:**\n\`\`\`json\n${message.content}\n\`\`\`\n\n**Error:** ${errorMessage}\n\nPlease check the browser extension console for more details.`;
        await vscode.env.clipboard.writeText(fallbackMessage);
      } catch (fallbackError) {
        this.outputChannel.appendLine(`Failed to create fallback message: ${fallbackError}`);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to process element edit data: ${errorMessage}`);
    }
  }

  private formatFallbackEditData(editData: any): string {
    let formatted = `# Element Edit Data (Fallback Format)\n\n`;
    formatted += `Received element edit data but some required fields are missing.\n\n`;
    formatted += `## Available Data:\n`;
    formatted += `\`\`\`json\n${JSON.stringify(editData, null, 2)}\n\`\`\`\n\n`;
    formatted += `Please check the browser extension to ensure it's sending complete edit data.\n`;
    return formatted;
  }

  private formatElementEditForCopilot(editData: any): string {
    const { original, modified, context } = editData;

    // Extract element info
    const elementTag = original?.element?.tagName?.toLowerCase() || 'element';
    const elementText = original?.element?.textContent?.trim()?.substring(0, 50) || '';
    const elementId = original?.element?.id || '';
    const elementClasses = original?.element?.className || '';

    // Get style changes
    const changes = modified?.changes || [];
    const hasChanges = Array.isArray(changes) && changes.length > 0;

    let formatted = `Apply these style changes:\n\n`;

    // Page context
    formatted += `**File:** Find the component for page: ${context?.url || 'unknown'}\n`;

    // Element identifier - make it very clear what to search for
    formatted += `**Target Element:** \`<${elementTag}>\``;
    if (elementText) {
      formatted += ` containing text "${elementText}"`;
    }
    if (elementId) {
      formatted += ` with ID="${elementId}"`;
    }
    formatted += `\n\n`;

    // Show ONLY the style changes, not full HTML
    if (hasChanges) {
      formatted += `## Style Changes to Apply:\n`;
      changes.forEach(change => {
        formatted += `- ${change}\n`;
      });
      formatted += `\n`;
    }

    // Show simplified BEFORE/AFTER code focusing on searchable attributes
    formatted += `## How to Find the Element:\n\n`;
    formatted += `Search the codebase for:\n`;
    if (elementText) {
      formatted += `1. Text content: "${elementText}"\n`;
    }
    if (elementId && !elementId.includes(':R')) {
      // Only show ID if it's not a generated Radix ID
      formatted += `2. ID attribute: \`id="${elementId}"\`\n`;
    }
    if (elementClasses) {
      // Show first few meaningful classes
      const meaningfulClasses = elementClasses.split(' ')
        .filter((cls: string) => cls && !cls.startsWith('data-'))
        .slice(0, 3)
        .join(' ');
      if (meaningfulClasses) {
        formatted += `3. Classes: \`${meaningfulClasses}\`\n`;
      }
    }
    formatted += `4. Tag: \`<${elementTag}>\`\n\n`;

    // Detailed BEFORE/AFTER if needed for reference
    formatted += `## Reference (Full HTML):\n\n`;
    formatted += `**BEFORE:**\n\`\`\`html\n${this.simplifyHtml(original?.html || '')}\n\`\`\`\n\n`;
    formatted += `**AFTER:**\n\`\`\`html\n${this.simplifyHtml(modified?.html || '')}\n\`\`\`\n`;

    return formatted;
  }

  private simplifyHtml(html: string): string {
    if (!html) return '';

    // Remove generated IDs like radix-:R2jtfaifjbqj6:
    let simplified = html.replace(/radix-:[A-Za-z0-9]+:/g, 'radix-:ID:');

    // Remove data- attributes for cleaner search
    simplified = simplified.replace(/\s+data-[a-z-]+="[^"]*"/g, '');

    // Remove aria-controls with generated IDs
    simplified = simplified.replace(/\s+aria-controls="radix-:[^"]+"/g, '');

    // Truncate if too long
    if (simplified.length > 500) {
      simplified = simplified.substring(0, 500) + '...';
    }

    return simplified;
  }

  private extractStyleDiff(original: any, modified: any): Array<{property: string, value: string}> {
    const changes: Array<{property: string, value: string}> = [];

    if (!modified?.changes || !Array.isArray(modified.changes)) {
      return changes;
    }

    // Parse the changes array to extract actual style properties
    modified.changes.forEach((change: string) => {
      // Extract property and value from change description
      // This assumes changes are formatted like "font-size changed to 20px"
      const match = change.match(/(\S+)\s+(?:changed to|set to)\s+(.+)/i);
      if (match) {
        changes.push({
          property: match[1],
          value: match[2]
        });
      }
    });

    return changes;
  }

  private async formatMessageForCopilot(message: BridgeMessage): Promise<void> {
    try {
      // Get settings
      const config = vscode.workspace.getConfiguration('stylecast');
      const copilotPrefix = config.get<string>('copilotPrefix', '');
      
      if (message.type === 'copilot' && message.content) {
        // Parse minimal data and format for Copilot
        let data;
        try {
          data = JSON.parse(message.content);
        } catch {
          // If parsing fails, use raw content
          let content = message.content;
          if (copilotPrefix) {
            content = `${copilotPrefix}\n\n${content}`;
          }
          await vscode.env.clipboard.writeText(content);
          return;
        }

        // Clean, concise formatting for Copilot
        let formatted = `# ${data.element || 'Element'} Component\n\n`;
        
        // Essential info only
        if (data.text) formatted += `**Text:** "${data.text}"\n`;
        if (data.id) formatted += `**ID:** ${data.id}\n`;
        if (data.classes?.length) {
          // Only show first 3 classes, skip common utility classes
          const importantClasses = data.classes
            .filter((cls: string) => !['text-black', 'dark:text-gray-400', 'text-xs'].includes(cls))
            .slice(0, 3);
          if (importantClasses.length > 0) {
            formatted += `**Classes:** ${importantClasses.join(' ')}\n`;
          }
        }
        
        // Simplified selector (remove excessive nesting)
        if (data.selector) {
          const simpleSelector = this.simplifySelector(data.selector);
          formatted += `**Selector:** \`${simpleSelector}\`\n\n`;
        }
        
        // Clean HTML (remove redundant attributes)
        if (data.html) {
          const cleanHtml = this.cleanHtml(data.html);
          formatted += `## HTML:\n\`\`\`html\n${cleanHtml}\n\`\`\`\n\n`;
        }
        
        // Essential CSS only (remove verbose computed styles)
        if (data.css) {
          const essentialCss = this.extractEssentialCss(data.css);
          if (essentialCss) {
            formatted += `## CSS:\n\`\`\`css\n${essentialCss}\n\`\`\`\n\n`;
          }
        }
        
        // Simple prompt
        formatted += `**What would you like me to help you with?**\n`;
        
        // Add prefix if configured
        if (copilotPrefix) {
          formatted = `${copilotPrefix}\n\n${formatted}`;
        }
        
         await vscode.env.clipboard.writeText(formatted);
      } else {
        // For non-copilot messages, use raw content
        let content = message.content.length > 5000 ? 
          message.content.substring(0, 5000) + '\n...' : 
          message.content;
          
        // Add prefix if configured
        if (copilotPrefix) {
          content = `${copilotPrefix}\n\n${content}`;
        }
        
        await vscode.env.clipboard.writeText(content);
      }
    } catch (error) {
      // Silent fail for performance
    }
  }

  private simplifySelector(selector: string): string {
    // Remove excessive nesting and nth-child selectors
    return selector
      .replace(/div\.flex\.h-screen:nth-child\(\d+\)/g, 'div.flex.h-screen')
      .replace(/div\.flex\.flex-1:nth-child\(\d+\)/g, 'div.flex.flex-1')
      .replace(/main\.flex-1\.overflow-y-auto/g, 'main')
      .replace(/div\.h-full\.flex/g, 'div.h-full')
      .replace(/div\.h-full\.sm:px-8/g, 'div.h-full')
      .replace(/div\.w-full\.mx-auto/g, 'div.w-full')
      .replace(/div\.overflow-auto\.max-h-screen/g, 'div.overflow-auto')
      .replace(/div\.mobile-header:nth-child\(\d+\)/g, 'div.mobile-header')
      .replace(/div\.max-w-7xl\.mx-auto/g, 'div.max-w-7xl')
      .replace(/div\.w-full\.dark:bg-\[#1d1d1d\]:nth-child\(\d+\)/g, 'div.w-full')
      .replace(/div\.flex\.flex-col:nth-child\(\d+\)/g, 'div.flex.flex-col')
      .replace(/div\.text-black\.dark:text-gray-400:nth-child\(\d+\)/g, 'div.text-black.dark:text-gray-400');
  }

  private cleanHtml(html: string): string {
    // Remove redundant attributes and clean up
    return html
      .replace(/class="([^"]*?)"/g, (match, classes) => {
        // Keep only important classes
        const importantClasses = classes.split(' ')
          .filter((cls: string) => !['text-black', 'dark:text-gray-400', 'text-xs'].includes(cls))
          .join(' ');
        return importantClasses ? `class="${importantClasses}"` : '';
      })
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractEssentialCss(css: string): string {
    // Extract only the essential CSS rules, skip verbose computed styles
    const lines = css.split('\n');
    const essentialLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && 
             !trimmed.includes('border-color:') &&
             !trimmed.includes('font-size: 14px') &&
             !trimmed.includes('padding: 0px') &&
             !trimmed.includes('margin: 4px') &&
             !trimmed.includes('width: 552px') &&
             !trimmed.includes('height: 20px') &&
             !trimmed.includes('border-radius: 0px') &&
             !trimmed.includes('font-weight: 400') &&
             !trimmed.includes('text-align: start') &&
             !trimmed.includes('display: block') &&
             !trimmed.includes('position: static');
    });
    
    return essentialLines.length > 0 ? essentialLines.join('\n') : '';
  }


  private async autoOpenCopilotChat(): Promise<boolean> {
    try {
      // Try multiple commands to open Copilot Chat
      const copilotCommands = [
        'github.copilot.chat.focus',
        'workbench.panel.chat.view.copilot.focus',
        'workbench.view.extension.github-copilot-chat',
        'workbench.action.chat.open',
        'workbench.action.quickchat.toggle',
        'workbench.view.chat'
      ];

      for (const command of copilotCommands) {
        try {
          await vscode.commands.executeCommand(command);
          // Wait a bit for the chat to open
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Try to paste the content
          await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
          
          // If we get here without error, it worked
          return true;
        } catch (error) {
          // Try next command
          continue;
        }
      }


      return false;
    } catch (error) {
      this.outputChannel.appendLine(`Failed to auto-open Copilot Chat: ${error}`);
      return false;
    }
  }

  private async openCopilotChat(): Promise<void> {
    // Don't try to focus - just show instructions
    vscode.window.showInformationMessage(
      'Content copied to clipboard. Please open Copilot Chat manually (Ctrl+Shift+P → "GitHub Copilot: Open Chat") and paste (Ctrl+V).',
      'OK'
    );
  }

  registerInternalCommands(): void {
    // No internal commands - too risky
  }

  createVSCodeMessage(content: string, type: 'text' | 'notification' | 'command' | 'copilot' = 'text'): BridgeMessage {
    return {
      id: `${Date.now().toString(36)}`,
      type,
      source: 'vscode',
      content,
      timestamp: Date.now()
    };
  }

  getMessageHistory(): BridgeMessage[] {
    return [];
  }

  clearHistory(): void {
    // No-op
  }

  showMessageHistory(): void {
    // No-op
  }

  async sendMessageToCopilot(content: string): Promise<boolean> {
    try {
      await vscode.env.clipboard.writeText(content);
      return true;
    } catch {
      return false;
    }
  }



  dispose(): void {
    this.outputChannel.dispose();
  }
}