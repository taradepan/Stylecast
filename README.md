# 🎨 Stylecast

**Visual element editor that connects your browser to VS Code and Cursor!**

Style any website element visually and send the changes directly to GitHub Copilot Chat - no copy/paste required.

## ✨ What it does

1. **Browser** → Select any element on a webpage and edit it visually
2. **Style** → Use comprehensive controls for typography, colors, layout, borders, and shadows
3. **Send** → Click "Send to VS Code" to send your changes
4. **VS Code** → Copilot Chat opens with formatted code modification request
5. **AI Help** → Copilot applies your visual changes to the source code!

## 📦 Installation

### Step 1: Install VS Code/Cursor Extension

**Option A: From Marketplace (Recommended)**
1. Open VS Code or Cursor
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Stylecast"
4. Click Install

**Option B: Manual Install**
1. Download `stylecast-1.0.0.vsix` from this repository
2. In VS Code/Cursor: Extensions → "..." menu → "Install from VSIX"
3. Select the downloaded file

### Step 2: Install Browser Extension

**Chrome/Edge:**
1. Download and extract `stylecast-browser.zip`
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the extracted folder

**Firefox:**
1. Download and extract `stylecast-browser.zip`
2. Go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `manifest.json` from extracted folder

## 🎯 How to Use

### Visual Element Editing:
1. Click the Stylecast icon in your browser toolbar
2. Click "Start Inspector" to activate element selection
3. **Left-click** any element on the page to extract its code
4. **Right-click** any element to open the visual editor
5. Edit typography, colors, layout, borders, and shadows in real-time
6. Click "Send to VS Code" to send changes to Copilot Chat

### Live Editing Panel Features:
- **Typography**: Font family, size, weight, line height, letter spacing, alignment, decorations
- **Colors**: Text, background, border colors with picker and presets
- **Layout**: Individual margin/padding controls for all sides
- **Border**: Width, style (solid/dashed/dotted), radius, color
- **Appearance**: Box shadow with presets (small, medium, large, glows)

### From VS Code/Cursor:
1. Press `Ctrl+Shift+W` (or `Cmd+Shift+W` on Mac)
2. Type your message
3. It appears in any connected browser extensions

## ⚙️ Configuration

In VS Code/Cursor Settings (`Ctrl+,`), search for "Stylecast":

- **Auto-start server**: Automatically start on VS Code/Cursor launch (default: enabled)
- **Port**: WebSocket server port (default: 47823)
- **Auto-send to Copilot**: Automatically paste styled components to AI Chat (default: enabled)
- **Message prefix**: Text added before AI Chat messages (default: empty)
- **Enable Copilot Integration**: Auto-open AI Chat when receiving changes - GitHub Copilot in VS Code, Cursor Chat in Cursor (default: enabled)

## 🔧 Troubleshooting

**VS Code/Cursor extension not working?**
- Check status bar for "🟢 Stylecast: 0" indicator
- Make sure GitHub Copilot extension is installed
- Restart VS Code/Cursor if needed

**Browser extension can't connect?**
- Ensure VS Code/Cursor is running with Stylecast extension
- Check if port 47823 is blocked by firewall
- Try refreshing the browser extension

**Element editor not opening?**
- Make sure inspector is activated (click "Start Inspector")
- Try right-clicking the element again
- Check browser console for errors

**Changes not going to AI Chat?**
- **In VS Code**: Make sure GitHub Copilot extension is installed and active
- **In Cursor**: Ensure Cursor Chat is available (built-in feature)
- Check VS Code/Cursor Output panel (View → Output → "Stylecast") to see which editor was detected
- Verify the detected editor is correct: Look for "Detected editor: Cursor" or "Detected editor: VS Code"
- Try disabling/enabling "Enable Copilot Integration" in settings
- Content is always copied to clipboard as a fallback - you can manually paste into the chat

## 🛡️ Privacy & Security

- **Local only**: All communication stays on your machine (localhost)
- **No external servers**: Direct connection between browser and VS Code/Cursor
- **No data collection**: Your messages are never sent to external services
- **Open source**: Full source code available for review

## 📋 Requirements

- **VS Code/Cursor**: Version 1.75.0 or higher
- **GitHub Copilot**: Extension installed and active
- **Browser**: Chrome 88+, Edge 88+, or Firefox 78+
- **Operating System**: Windows, macOS, or Linux

## 🎯 Cursor Compatibility

Stylecast is fully compatible with **Cursor** (AI-powered code editor)! The extension **automatically detects** which editor you're using and routes messages to the appropriate AI chat.

### Smart AI Chat Integration:
- 🤖 **In VS Code**: Automatically opens GitHub Copilot Chat
- 🎯 **In Cursor**: Automatically opens Cursor Chat (native AI)
- 🔍 **Auto-detection**: No configuration needed - works out of the box!

### How It Works:
1. The extension detects your editor on startup (using `vscode.env.appName`)
2. When you send styled components from the browser, they're automatically routed to:
   - **GitHub Copilot Chat** if you're in VS Code
   - **Cursor Chat** if you're in Cursor
3. Content is copied to clipboard and pasted directly into the chat

### All Features Supported:
- ✅ WebSocket server runs on same port (47823)
- ✅ Status bar and notifications work identically
- ✅ Configuration settings are preserved
- ✅ Browser extension connects seamlessly
- ✅ Visual element editing works the same

### Checking Your Editor:
Look at the Output panel (View → Output → "Stylecast") to see which editor was detected:
```
Stylecast extension activating in Cursor...
Detected editor: Cursor
```

## 🏗️ Project Structure

```
stylecast/
├── LICENSE                      # MIT License
├── README.md                    # This file
├── ext/
│   ├── INSTALL.md              # Installation guide
│   ├── vscode-extension/       # VS Code extension
│   │   ├── src/
│   │   │   ├── extension.ts    # Extension entry point
│   │   │   ├── websocket-server.ts
│   │   │   ├── message-manager.ts
│   │   │   └── types.ts
│   │   └── package.json
│   └── browser-extension/      # Browser extension
│       ├── src/
│       │   ├── background.js   # Service worker
│       │   ├── websocket-client.js
│       │   ├── popup/          # Extension UI
│       │   └── content/        # Element inspector
│       └── manifest.json
└── .github/                    # GitHub config & workflows
```

## 🛠️ Development

**Browser Extension:**
```bash
cd ext/browser-extension
# Load as unpacked extension in Chrome/Edge/Firefox
```

**VS Code/Cursor Extension:**
```bash
cd ext/vscode-extension
npm install
npm run compile
# Press F5 in VS Code/Cursor to debug
```

**Build for Distribution:**
```bash
cd ext/vscode-extension
npm run package  # Creates .vsix file
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

**Attribution required:** If you use or modify this code, you must include the copyright notice and license.

## 🙏 Acknowledgments

- Built with [VS Code Extension API](https://code.visualstudio.com/api)
- Uses [WebSocket (ws)](https://github.com/websockets/ws) for real-time communication
- Inspired by browser DevTools and visual design tools

---

**Ready to supercharge your development workflow?** Install both extensions and start styling with AI assistance! 🚀