# Distributed Drawing Board

A real-time collaborative drawing application demonstrating advanced distributed systems concepts through a peer-to-peer architecture. Multiple users can draw together on a shared canvas, with consistency, fault tolerance, and automatic recovery across distributed browser nodes.

## Features

- Real-time collaborative drawing
- Peer-to-peer architecture (no central server)
- Leader election and consensus
- Fault tolerance and automatic recovery
- Live cursor tracking and user presence
- Event sourcing and state versioning
- Responsive, modern UI (React + Tailwind CSS)

## Technologies Used

- React 18
- TypeScript
- Vite
- Tailwind CSS
- BroadcastChannel API
- LocalStorage
- HTML5 Canvas

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm or yarn

### Installation

```bash
npm install
# or
yarn install
```

### Running Locally

```bash
npm run dev
# or
yarn dev
```

Open multiple browser tabs at `http://localhost:5173` to simulate distributed nodes.

## Deployment

This project can be easily deployed using Vercel, Netlify, or any static hosting provider. For Vercel:

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com), import your repo, and deploy

## Repository

[GitHub - drawingboard_distributed](https://github.com/HamzaFerati/drawingboard_distributed)

## Project Overview

See `PROJECT_OVERVIEW.md` for a detailed technical and conceptual breakdown.

---

© Hamza Ferati, Muas Abdulla
