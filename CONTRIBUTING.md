# Contributing to Stylecast

Thank you for your interest in contributing to Stylecast! This document provides guidelines and instructions for contributing.

## 🤝 How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check the existing issues to avoid duplicates
2. Make sure you're using the latest version

When creating a bug report, include:
- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Browser and VS Code versions
- Extension versions

### Suggesting Features

Feature requests are welcome! Please:
1. Check existing feature requests first
2. Clearly describe the feature and its use case
3. Explain why it would be useful to most users

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** following the code style guidelines below
3. **Test your changes** thoroughly in both extensions
4. **Commit with clear messages** following the format below
5. **Push to your fork** and submit a pull request

## 🛠️ Development Setup

### Prerequisites
- Node.js 16+ and npm
- VS Code 1.95.0+
- Chrome/Edge/Firefox for testing browser extension

### Setting Up

**Clone and install:**
```bash
git clone https://github.com/yourusername/stylecast.git
cd stylecast

# Install VS Code extension dependencies
cd ext/vscode-extension
npm install

# Browser extension has no dependencies (plain JavaScript)
```

**Running in development:**

**VS Code Extension:**
```bash
cd ext/vscode-extension
npm run compile  # or npm run watch for auto-compile
# Press F5 in VS Code to launch Extension Development Host
```

**Browser Extension:**
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `ext/browser-extension` folder

### Testing Your Changes

1. **Browser Extension:**
   - Test element inspection (left-click)
   - Test visual editor (right-click)
   - Test all style controls (typography, colors, layout, border, shadow)
   - Test WebSocket connection/reconnection
   - Test error states

2. **VS Code Extension:**
   - Check WebSocket server starts correctly
   - Verify message formatting is correct
   - Test Copilot Chat integration
   - Check all commands work

3. **Integration:**
   - Test full workflow: browser → VS Code → Copilot
   - Test reconnection after VS Code restart
   - Test with multiple browser tabs
   - Test error handling

## 📝 Code Style Guidelines

### TypeScript (VS Code Extension)
- Use TypeScript strict mode
- Add types for all function parameters and return values
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Follow existing code structure

### JavaScript (Browser Extension)
- Use ES6+ features
- Use `const` and `let`, not `var`
- Add comments for complex logic
- Keep functions focused and small
- Handle errors gracefully

### General
- Use 2 spaces for indentation
- Keep lines under 100 characters when possible
- Remove console.log statements before committing
- Use clear, descriptive commit messages

## 📋 Commit Message Format

```
<type>: <short summary>

<optional detailed description>

<optional footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: add color picker to visual editor

fix: reconnect button not showing when disconnected

docs: update installation instructions for Firefox
```

## 🏗️ Project Architecture

### VS Code Extension
- `extension.ts` - Extension lifecycle, command registration
- `websocket-server.ts` - WebSocket server on localhost:47823
- `message-manager.ts` - Message formatting, Copilot integration
- `types.ts` - TypeScript interfaces

### Browser Extension
- `background.js` - Service worker, WebSocket client management
- `websocket-client.js` - WebSocket connection handling
- `popup/` - Extension popup UI
- `content/element-inspector.js` - Element selection and visual editor

### Message Flow
```
Browser Element Selection
  → WebSocket Message (element-edit type)
  → VS Code Message Manager
  → Format for Copilot
  → Clipboard + Auto-open Copilot Chat
```

## ✅ Checklist Before Submitting PR

- [ ] Code follows the style guidelines
- [ ] All tests pass (manual testing required)
- [ ] No console.log statements left in code
- [ ] Comments added for complex logic
- [ ] README updated if adding new features
- [ ] No breaking changes (or documented if necessary)
- [ ] Tested in both Chrome and VS Code
- [ ] Commit messages are clear and descriptive

## 🚫 What Not to Do

- Don't add external dependencies without discussion
- Don't make breaking changes without approval
- Don't include unrelated changes in a single PR
- Don't commit secrets, tokens, or personal info
- Don't disable security features

## 📜 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the Golden Rule

## ❓ Questions?

- Open a GitHub Discussion for questions
- Check existing issues and discussions first
- Be patient - maintainers are volunteers

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Stylecast! 🎨✨
