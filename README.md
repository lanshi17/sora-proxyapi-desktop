# Sora Desktop - Linxi Video Studio

A modern desktop application for AI video generation using the Linxi API. Built with Tauri 2, React, TypeScript, and Ant Design.

## Features

- **Generate Mode**: Create videos from text prompts and reference images
- **Iterate Mode**: Remix existing videos with new prompts
- **Storyboard Mode**: Create multi-shot video sequences
- **Image Preprocessing**: Automatic resize to video dimensions
- **Real-time Polling**: Monitor generation progress with live status updates
- **Video Preview & Download**: Built-in player with download functionality

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI Framework**: Ant Design 5
- **Desktop**: Tauri 2 (Rust)
- **Testing**: Vitest + React Testing Library
- **API**: Linxi Chat API (OpenAI-compatible)

## Prerequisites

### All Platforms
- Node.js 18+
- npm or yarn

### Platform-Specific

#### macOS
No additional dependencies required.

#### Windows
No additional dependencies required.

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev \
  librsvg2-dev patchelf pkg-config libssl-dev
```

## Installation

```bash
# Clone the repository
git clone git@github.com:lanshi17/sora-proxyapi-desktop.git
cd sora-proxyapi-desktop

# Install dependencies
npm install

# Run development server
npm run dev

# Or run Tauri desktop app
npm run tauri dev
```

## Usage

1. **Configure API Key**: Enter your Linxi API key in Settings
2. **Select Model**: Choose from available Sora models
3. **Upload Images**: Add reference images (optional)
4. **Set Parameters**: Configure size, duration, and optional style
5. **Generate**: Click "Start Generation" and wait for completion
6. **Download**: Preview and download your generated video

## Supported Models

- sora-2
- sora-2-pro
- sora-2-all (with watermark, private, style options)
- And more...

## Available Sizes

- 720x1280 (Portrait)
- 1280x720 (Landscape)
- 1024x1792 (Portrait Pro)
- 1792x1024 (Landscape Pro)

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build for production
npm run build

# Build Tauri app
npm run tauri build

# Build macOS app
npm run build:macos
```

## Project Structure

```
sora-proxyapi-desktop/
├── src/                    # Frontend React code
│   ├── app/               # App shell and routing
│   ├── components/        # Shared UI components
│   ├── features/          # Feature modules
│   │   ├── config/        # Settings management
│   │   ├── models/        # Model fetching
│   │   ├── uploads/       # Image upload & preprocessing
│   │   ├── video-generation/  # API clients & hooks
│   │   ├── video/         # Video preview & download
│   │   └── workspace/     # Workspace layouts
│   └── lib/               # Utilities
├── src-tauri/             # Tauri Rust backend
│   ├── src/              # Rust source
│   └── Cargo.toml        # Rust dependencies
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
└── docs/                  # Documentation
```

## API Reference

This app uses the Linxi Chat API for video generation:

- **Base URL**: https://linxi.chat/v1
- **Models Endpoint**: GET /models
- **Create Video**: POST /videos
- **Query Status**: GET /videos/{task_id}

For full API documentation, visit: https://linxi.chat

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI powered by [Ant Design](https://ant.design/)
- Video generation by [Linxi](https://linxi.chat/)

## Support

For issues and feature requests, please use the GitHub issue tracker.
