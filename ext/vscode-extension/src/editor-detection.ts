import * as vscode from 'vscode';

/**
 * Editor type enum
 */
export enum EditorType {
  VSCode = 'vscode',
  Cursor = 'cursor',
  Unknown = 'unknown'
}

/**
 * Detects the current editor environment
 */
export class EditorDetector {
  private static cachedEditor: EditorType | null = null;

  /**
   * Detects whether the extension is running in VS Code or Cursor
   * Uses multiple detection methods for reliability
   */
  static detectEditor(): EditorType {
    // Return cached result if already detected
    if (this.cachedEditor !== null) {
      return this.cachedEditor;
    }

    // Method 1: Check vscode.env.appName (most reliable)
    const appName = vscode.env.appName;
    if (appName) {
      if (appName.toLowerCase().includes('cursor')) {
        this.cachedEditor = EditorType.Cursor;
        return EditorType.Cursor;
      }
      if (appName.toLowerCase().includes('visual studio code') || appName.toLowerCase().includes('vscode')) {
        this.cachedEditor = EditorType.VSCode;
        return EditorType.VSCode;
      }
    }

    // Method 2: Check environment variables as fallback
    if (process.env.CURSOR) {
      this.cachedEditor = EditorType.Cursor;
      return EditorType.Cursor;
    }

    // Method 3: Default to VS Code if uncertain
    this.cachedEditor = EditorType.VSCode;
    return EditorType.VSCode;
  }

  /**
   * Returns true if running in Cursor
   */
  static isCursor(): boolean {
    return this.detectEditor() === EditorType.Cursor;
  }

  /**
   * Returns true if running in VS Code
   */
  static isVSCode(): boolean {
    return this.detectEditor() === EditorType.VSCode;
  }

  /**
   * Gets a human-readable name of the current editor
   */
  static getEditorName(): string {
    const editor = this.detectEditor();
    switch (editor) {
      case EditorType.Cursor:
        return 'Cursor';
      case EditorType.VSCode:
        return 'VS Code';
      default:
        return 'Unknown Editor';
    }
  }

  /**
   * Reset cached detection (useful for testing)
   */
  static resetCache(): void {
    this.cachedEditor = null;
  }
}

