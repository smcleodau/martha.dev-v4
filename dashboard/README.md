# Martha Development Dashboard

Modern React dashboard for monitoring and managing the Martha TypeScript service.

## 🎨 Design System

Built with a modern, clean design using:
- **TailwindCSS** for utility-first styling  
- **Inter** font family for clean typography
- **Card-based layout** with subtle shadows and borders
- **Responsive design** that works on all screen sizes
- **Smooth animations** for page transitions and interactions

### Color Palette

Currently using placeholder colors. Ready to be updated with Martha's brand colors.

## 🚀 Features

### Overview Page (/)
- Service health status monitoring
- Active worktrees list with real-time status
- Quick links to API endpoints
- Auto-refresh every 5 seconds

### Documentation Page (/docs)
- Browse all documentation
- Markdown rendering
- Phase progress tracking

### Settings Page (/settings)
- Configuration display
- Port allocation overview
- System information

## 📦 Stack

- React 18 + TypeScript 5
- Vite
- TailwindCSS 3
- React Router 6
- Axios

## 🛠️ Development

```bash
npm install
npm run dev
```

Dashboard: http://localhost:21004
Service: http://localhost:21000

## 🎨 Updating Colors

Edit `tailwind.config.js` with Martha's brand colors from the image.
