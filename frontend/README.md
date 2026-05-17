# Vity Insurance — Frontend

Next.js 15 frontend for the Vity Insurance AI Sales Autopilot platform.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Client landing page — company info, quote form modal, AI chat assistant |
| `/sales` | Sales rep portal — auth gate, lead dashboard, transcript upload |

## Getting Started (standalone)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires the backend running on port 8000 (or set `NEXT_PUBLIC_API_URL`).

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8001   # Backend URL (from host machine)
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Turbopack on port 3000 |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Client landing (form + AI chatbot)
│   ├── sales/page.tsx    # Sales portal (auth + lead dashboard)
│   └── ...               # Other internal pages (workbench, AI, etc.)
├── components/
│   ├── layout/           # Header, Sidebar
│   └── ui/               # Button, Card, Icons, etc.
├── lib/
│   ├── api-client.ts     # Typed fetch wrapper
│   └── utils.ts          # cn() and helpers
└── middleware.ts          # Auth middleware
```

## Running via Docker (recommended)

See the root [`README.md`](../README.md) for the full Docker setup.  
The frontend is available at **[http://localhost:3001](http://localhost:3001)** when running via Docker Compose.
