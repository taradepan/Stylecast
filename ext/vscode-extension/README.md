# Stylecast

**Visual element editor that supercharges your vibecoding efficiency.**

Style any website element visually in your browser and send changes directly to AI Chat - no copy/paste, no context switching.

## 🎯 How It Works

1. **Browser** → Right-click any element on any website to open the visual editor
2. **Style** → Edit typography, colors, layout, borders, and shadows in real-time
3. **Send** → Click "Send to VS Code/Cursor"
4. **AI Chat** → Opens automatically with formatted prompt ready to apply changes to your source code

## ✨ Features

- **Visual Element Editor** with comprehensive styling controls
- **Live Preview** - see changes in real-time
- **Auto AI Chat Integration** - works with GitHub Copilot (VS Code) and Cursor Chat (Cursor)
- **WebSocket Bridge** - instant communication between browser and editor
- **Smart Detection** - automatically detects VS Code or Cursor and routes to the right AI chat

## 📦 Installation

1. Install this extension from the marketplace
2. Install the browser extension:
   - **Chrome/Edge**: [Load from chrome://extensions](chrome://extensions)
   - **Firefox**: [Load from about:debugging](about:debugging)
   - Download: [Browser Extension](https://github.com/taradepan/stylecast)

## 🚀 Usage

1. Click the Stylecast icon in your browser toolbar
2. Click "Start Inspector"
3. **Right-click** any element to open the visual editor
4. Make your style changes
5. Click "Send to VS Code/Cursor"
6. AI Chat opens automatically with your changes ready to apply!

## ⚙️ Settings

- **Auto-start server** - Launch WebSocket server on startup (default: on)
- **Auto-send to AI Chat** - Automatically paste to chat (default: on)
- **Enable AI Chat Integration** - Auto-open chat panel (default: on)
- **Port** - WebSocket server port (default: 47823)

## 🎯 Vibecoding Efficiency

Stylecast eliminates the friction between visual design and code:
- No more copy/pasting between DevTools and your editor
- No more typing out CSS properties manually
- No more context switching between browser and IDE
- Just vibe, style, and let AI handle the code updates

## 🛡️ Privacy

- **100% local** - all communication stays on localhost
- **No external servers** - direct connection between browser and editor
- **No data collection** - your code never leaves your machine

## 🔧 Troubleshooting

**Browser can't connect?**
- Check status bar shows "🟢 Stylecast: 0"
- Restart the extension if needed

**AI Chat not opening?**
- VS Code: Make sure GitHub Copilot is installed
- Cursor: Built-in chat, no extra setup needed
- Content is always copied to clipboard as fallback

**Want to see what's happening?**
- View → Output → "Stylecast" for detailed logs

## 📄 License

MIT License - see [LICENSE](https://github.com/taradepan/stylecast/blob/main/LICENSE)
