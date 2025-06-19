# Distributed Drawing Board - Project Overview

## Executive Summary

This project implements a real-time collaborative drawing application that demonstrates advanced distributed systems concepts through a **client-server architecture**. The system enables multiple users to draw simultaneously on a shared canvas while maintaining consistency, fault tolerance, and automatic recovery.

## Project Overview

The Distributed Drawing Board is a web-based collaborative drawing application where multiple users can draw together in real-time. Unlike a purely peer-to-peer approach, this system uses a **central WebSocket server** that manages the authoritative state and facilitates communication between browser clients. The application demonstrates core distributed systems principles including centralized state management, client-side fault tolerance, and state synchronization.

## Technologies Used

### Frontend Technologies

- **React 18.3.1** - Modern UI framework with hooks for state management
- **TypeScript** - Type-safe development with enhanced code reliability
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **Lucide React** - Modern icon library for intuitive interface
- **HTML5 Canvas** - High-performance drawing surface
- **BroadcastChannel API** - Used for client-side user activity detection across tabs
- **LocalStorage** - Used for persistent user ID/name/color

### Backend Technologies (WebSocket Server)

- **Node.js** - JavaScript runtime environment
- **Express** - Minimalist web framework for HTTP endpoints (health checks)
- **WebSocket (ws)** - Real-time, centralized state synchronization and broadcasting
- **UUID** - Unique identifier generation for users and drawing operations
- **Event Sourcing** - All changes tracked as immutable events (drawing operations)

## ✅ Why It's a Good Fit for Distributed Systems

### 1. **Multiple Autonomous Clients**

- Each browser tab operates as an independent client connecting to a central WebSocket server
- Users can join/leave dynamically without system disruption
- Automated agents could easily be added to the system

### 2. **Shared Resource Contention**

- Multiple users compete for canvas drawing space
- Real-time cursor tracking shows active user positions
- Conflict resolution handled by the server (e.g., ensuring order of operations)

### 3. **Centralized State Management with Client Synchronization**

- **Central WebSocket server** maintains the authoritative state (drawing operations, active users)
- Clients receive full state updates on connect/reconnect and incremental updates in real-time.
- Server ensures consistency and persistence of drawing operations.

### 4. **Client-side Fault Tolerance**

- System continues operation when client nodes disconnect (server maintains state)
- Automatic reconnection of clients to the server
- State recovery when clients rejoin the network (via server state sync)

### 5. **Real-time Coordination**

- Sub-second latency for drawing operations via WebSocket
- Live cursor tracking across all connected clients
- Immediate visual feedback for all user actions

### 6. **Client-Server Architecture for Robustness**

- Focus shifted from peer-to-peer concepts to a robust client-server model for simplified consistency and persistence.
- Server manages primary state, clients consume and update.

## Design Highlights

### Modern, Production-Ready Interface

- **Clean, Professional Design** - Apple-level aesthetics with careful attention to detail
- **Responsive Layout** - Optimized for desktop, tablet, and mobile devices
- **Intuitive Tool Selection** - Visual feedback for active tools and settings
- **Real-time Status Indicators** - Live system health and connection status

### Advanced User Experience

- **Live Cursor Tracking** - See other users' cursors with names and colors
- **Visual Tool Feedback** - Immediate preview of brush size and color
- **Smooth Animations** - Micro-interactions enhance user engagement
- **Grid Overlay** - Subtle visual aid for precise drawing

### Accessibility & Usability

- **Color-coded Users** - Each user assigned unique color for identification
- **Clear Visual Hierarchy** - Organized toolbars and status panels
- **Hover States** - Interactive feedback for all clickable elements
- **Responsive Grid System** - Adaptive layout for different screen sizes

## Key Features

### Drawing Tools

- **Multiple Drawing Tools** - Pen, eraser, line, rectangle, circle
- **Customizable Brush Sizes** - 6 different size options (2px to 24px)
- **Color Palette** - 10 carefully selected colors for drawing
- **Shape Tools** - Geometric shapes with real-time preview

### Collaboration Features

- **Real-time Synchronization** - Instant updates across all connected clients via WebSocket
- **User Presence Indicators** - Live list of connected users with status
- **Cursor Tracking** - See where other users are drawing in real-time
- **User Identification** - Unique colors and names for each participant

### System Management

- **State Persistence** - Drawing state is maintained on the server and survives client refreshes/reconnections.
- **Network Health Monitoring** - Real-time system status indicators
- **Canvas Clearing** - Coordinated reset across all clients via server command.
- **Client Fault Tolerance** - Clients automatically reconnect and recover state upon disconnection.
- **Centralized Coordination** - The WebSocket server acts as the primary coordinator for managing the shared drawing state and client interactions.

### Advanced Capabilities

- **Event Sourcing** - Complete operation history for replay
- **Version Control** - State versioning for consistency guarantees
- **Heartbeat Monitoring** - Server-side detection of inactive clients

## System Architecture

### Client-Server Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Browser Tab 1 │    │   Browser Tab 2 │    │   Browser Tab 3 │
│                 │    │                 │    │                 │
│ • UI Rendering  │    │ • UI Rendering  │    │ • UI Rendering  │
│ • User Input    │    │ • User Input    │    │ • User Input    │
│ • Local State   │    │ • Local State   │    │ • Local State   │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         │ (WebSocket)          │ (WebSocket)          │ (WebSocket)
         ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     WebSocket Server                        │
│                                                             │
│ • Central State Management                                  │
│ • Operation History Persistence                             │
│ • Message Broadcasting                                      │
│ • Client Connection Management                              │
└─────────────────────────────────────────────────────────────┘
```

### Communication Layer

- **WebSocket Protocol** - Enables full-duplex communication between clients and server
- **Event-Driven Architecture** - All system changes propagated as events (drawing operations, user updates, state sync)
- **Message Types** - Drawing operations, user management, state sync, cursor updates, heartbeats, clear canvas.

### Data Flow

1. **User Action (Client)** → Drawing operation message → Server
2. **Server** → Records operation, updates central state, broadcasts updated state/operation → All Clients
3. **Client** → Receives updated state/operation → Merges into local state → UI update

### Client-Server Interaction Logic

This project employs a robust client-server model to manage the collaborative drawing experience. The server acts as the authoritative source for the shared canvas state, while clients interact with this state in real-time.

**Client (Browser Tab) Responsibilities:**

- **User Interface (UI) Rendering:** Displays the current state of the drawing canvas and user cursors.
- **User Input Handling:** Captures drawing actions (e.g., mouse movements, clicks) and tool selections.
- **Local State Management:** Manages transient UI state and user-specific information.
- **Sending Operations to Server:** Converts user drawing actions into `DrawingOperation` messages and sends them to the WebSocket server.
- **Receiving State Updates:** Listens for WebSocket messages from the server, including `drawing_operation` (for real-time updates) and `state_sync` (for full state updates on connection/reconnection).
- **Applying Operations:** Renders received drawing operations onto its local HTML5 Canvas.
- **Reconnection Logic:** Automatically attempts to reconnect to the server if the connection is lost, and requests the full state upon successful reconnection.

**Server (Node.js WebSocket Server) Responsibilities:**

- **Central State Management:** Maintains the authoritative `currentOperations` array, which holds the complete history of all drawing actions.
- **Operation History Persistence (In-Memory):** Stores drawing operations in memory. When a client connects or needs to synchronize, the server sends this full history.
- **Message Broadcasting:** Relays `drawing_operation`, `cursor_move`, `user_join`, `user_leave`, `active_users_update`, and `clear_canvas` messages to all connected clients to ensure real-time synchronization.
- **Client Connection Management:** Tracks active clients, assigns ephemeral connection IDs, and associates them with persistent user IDs.
- **State Synchronization (state_sync):** Sends the complete `currentOperations` history and active user list to newly connected or reconnected clients.
- **Heartbeat Monitoring:** Periodically pings clients to detect inactive connections and manage user presence.
- **Conflict Resolution:** Processes incoming drawing operations sequentially, effectively resolving potential conflicts by ordering. This ensures consistency across clients.

**Interaction Flow:**

1.  A client performs a drawing action on its local canvas.
2.  The client sends a `drawing_operation` message to the WebSocket server.
3.  The server receives the operation, adds it to its `currentOperations` history, and then broadcasts this new `drawing_operation` to all _other_ connected clients (and potentially back to the sender for confirmation).
4.  All clients receive the `drawing_operation` message and update their local canvas by applying the new operation.
5.  If a client disconnects and then reconnects (e.g., browser refresh, tab close/reopen), it sends `client_connect_info` to the server.
6.  The server responds with a `state_sync` message containing the full `currentOperations` history and active users list.
7.  The reconnecting client receives the `state_sync` and re-renders its canvas with the complete drawing history.

## Concepts Demonstrated

### 1. **Centralized State & Consistency**

- **Authoritative Server State** - Server maintains the single source of truth for drawing history.
- **Client Synchronization** - Clients pull full state on connect and receive incremental updates to maintain consistency.
- **Conflict Resolution** - Server implicitly handles concurrent operations by processing them in order of receipt.

### 2. **Fault Tolerance (Client Perspective)**

- **Client Reconnection** - Clients automatically attempt to reconnect to the server.
- **State Recovery** - Upon reconnection, clients receive the full current state from the server, recovering any missed operations.

### 3. **Event Sourcing**

- **Immutable Event Log** - Server stores all drawing actions as an immutable sequence of operations.
- **State Reconstruction** - Current drawing state is derived by replaying the operation history.

### 4. **Real-time Systems**

- **Low Latency** - Near real-time propagation of drawing actions.
- **Live Updates** - Immediate visual feedback across connected clients.
- **Concurrent Operations** - Multiple users can draw simultaneously with synchronized views.

### 5. **Client-Server Communication**

- **WebSocket Protocol** - Efficient, persistent bidirectional communication.
- **Heartbeat Mechanism** - Used by the server to detect inactive or disconnected clients.

## Technical Implementation Details

### State Management

- **Server-side Centralized Store** - `currentOperations` array on the Node.js WebSocket server.
- **Client-side State Hooks** - React `useState` and `useCallback` for local state and event handling.
- **Persistence** - Drawing operations are stored in memory on the server. (Note: For long-term persistence across server restarts, a database would be required).

### Drawing Engine

- **HTML5 Canvas** - High-performance rendering surface.
- **Event Replay** - Canvas is redrawn by applying all `DrawingOperation` objects.
- **Real-time Preview** - Immediate visual feedback during drawing.

### Network Simulation (Local Development)

- **Browser Tabs as Clients** - Each tab connects to the local WebSocket server.
- **Docker Compose** - Orchestrates both frontend and backend services for easy local setup.

## Testing & Validation

### Application Functionality Testing

1. **Multi-Client Operation** - Open multiple browser tabs/windows.
2. **Concurrent Drawing** - Multiple users drawing simultaneously.
3. **Drawing Persistence** - Refresh tabs/reopen browser to confirm all drawings are retained.
4. **Real-time Sync** - Verify instant updates across all connected clients.

### System Performance & Resilience

- **Client Disconnection/Reconnection** - Observe automatic reconnection and state recovery.
- **Server State Consistency** - Server ensures all clients receive the same drawing history.

## Future Enhancements

### Advanced Features

- **Undo/Redo System** - Operation rollback capabilities (requires server-side undo stack).
- **Layer Management** - Multiple drawing layers.
- **Export Functionality** - Save drawings as images (e.g., PNG).
- **Advanced Shapes** - Bezier curves, text annotations.
- **User Authentication/Rooms** - Private drawing sessions.

### Distributed Systems Improvements

- **Database Persistence** - For long-term storage of drawing operations beyond server memory.
- **Load Balancing (for server)** - Distribute client connections across multiple server instances.
- **Cross-Device Sync** - Ensure robustness across diverse network conditions.
- **Offline Capabilities** - Allow drawing when temporarily disconnected, then sync.

## Conclusion

This Distributed Drawing Board successfully demonstrates core distributed systems concepts through an engaging, real-world application. The system showcases robust client-server real-time communication, centralized state management, fault tolerance (from the client's perspective), and drawing history persistence, all while providing an intuitive user experience. The implementation proves that complex distributed systems principles can be made accessible through modern web technologies, creating a foundation for understanding larger-scale distributed applications.

The project serves as both a functional collaborative tool and an educational demonstration of how distributed systems handle the fundamental challenges of coordination, consistency, and fault tolerance in real-world scenarios.
