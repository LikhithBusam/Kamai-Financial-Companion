# KAMAI - Financial Intelligence Platform

KAMAI (Lakshmi Raave Maa Intiki) is a comprehensive AI-powered financial management system designed specifically for India's gig economy workforce.

## 🎯 Project Overview

This unified web application combines a professional landing page with a full-featured financial management platform, offering:

- **Professional Landing Experience**: Clean, corporate design showcasing KAMAI's capabilities
- **AI-Powered Financial Intelligence**: 9-agent backend computes real numbers from real transaction data; the LLM only phrases narrative text
- **Real-time Analytics**: Comprehensive financial tracking and forecasting

> Government scheme matching is planned but not yet populated with real scheme data (`government_schemes` table is currently empty). Offline-first/local-first processing is not implemented — this is a standard online web app backed by Supabase.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Modern web browser with ES6+ support

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to `http://localhost:8080`

### Build for Production

```bash
npm run build
npm run preview
```

## 🎨 Design System

KAMAI uses a professional, corporate modern design system with:

- **Color Palette**: Deep slate/gray tones for professionalism
- **Typography**: Inter font family with careful weight selection
- **Spacing**: Generous whitespace for clarity
- **Shadows**: Subtle depth without distraction
- **Animation**: Smooth transitions powered by Framer Motion

## 🛠️ Technology Stack

### Frontend Framework
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation

### UI & Design
- **Tailwind CSS** for styling
- **shadcn/ui** for consistent component library
- **Framer Motion** for animations
- **Lucide React** for icons

### Data Visualization
- **Mermaid.js** for flowchart diagrams
- **Recharts** for financial charts and analytics

### State Management
- **React Context** for app-wide state
- **TanStack Query** for server state management

### Additional Features
- **Supabase** for backend services
- **Next Themes** for dark/light mode
- **React Hook Form** for form handling

## 📄 License

Copyright (c) 2024 KAMAI Team. All rights reserved.

---

**KAMAI** - Empowering India's gig economy with intelligent financial management.
