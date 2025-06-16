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
- Docker
- Nginx

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm or yarn
- Docker (for containerized deployment)

### Local Development

1. Clone the repository:

```bash
git clone https://github.com/HamzaFerati/drawingboard_distributed.git
cd drawingboard_distributed
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open multiple browser tabs at `http://localhost:5173` to simulate distributed nodes.

### Docker Deployment

1. Build the Docker image:

```bash
docker build -t drawing-board-app .
```

2. Run the container:

```bash
docker run -p 3000:80 drawing-board-app
```

3. Access the application:

- Open your browser and navigate to `http://localhost:3000`
- Open multiple browser tabs to simulate distributed nodes
- The application will automatically handle node synchronization

### Docker Compose (Alternative)

1. Create a `docker-compose.yml` file:

```yaml
version: "3"
services:
  drawing-board:
    build: .
    ports:
      - "3000:80"
    restart: unless-stopped
```

2. Run with Docker Compose:

```bash
docker-compose up -d
```

## Deployment Options

### 1. Vercel Deployment

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Deploy

### 2. Docker Deployment

- Build and run locally using Docker
- Deploy to any container platform (AWS, GCP, Azure)
- Use Docker Compose for orchestration

## Repository

[GitHub - drawingboard_distributed](https://github.com/HamzaFerati/drawingboard_distributed)

## Live Demo

- Vercel Deployment: https://drawingboard-distributed.vercel.app
- Docker Deployment: http://localhost:3000 (when running locally)

## Project Overview

See `PROJECT_OVERVIEW.md` for a detailed technical and conceptual breakdown.

## Troubleshooting

### Docker Issues

1. If the container fails to start:

   ```bash
   docker logs drawing-board-app
   ```

2. If port 3000 is already in use:

   ```bash
   docker run -p 3001:80 drawing-board-app
   ```

   Then access http://localhost:3001

3. To stop the container:
   ```bash
   docker stop drawing-board-app
   ```

### Development Issues

1. Clear browser cache if state synchronization issues occur
2. Ensure all browser tabs are on the same origin
3. Check browser console for any error messages

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.

---

© Hamza Ferati, Muas Abdulla
