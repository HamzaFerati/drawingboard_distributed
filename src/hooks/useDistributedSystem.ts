import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DrawingEvent, SystemState, User, DrawingOperation, DistributedNode } from '../types';

const HEARTBEAT_INTERVAL = 1000;
const NODE_TIMEOUT = 5000;
const STORAGE_KEY = 'drawing_board_state';
const NODES_KEY = 'drawing_board_nodes';
const WS_URL = 'wss://drawingboard-distributed.onrender.com'; // Hardcoded for Vercel deployment

export const useDistributedSystem = () => {
  const [systemState, setSystemState] = useState<SystemState>({
    users: {},
    operations: [],
    currentVersion: 0,
    lastUpdate: Date.now()
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [connectedNodes, setConnectedNodes] = useState<string[]>([]);
  
  const nodeId = useRef<string>(''); // Will be set by server
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatInterval = useRef<number | null>(null);

  // Initialize distributed system (no user ID here yet)
  useEffect(() => {
    initializeDistributedSystem();

    return () => {
      cleanup();
    };
  }, []);

  const initializeDistributedSystem = useCallback(() => {
    // Initialize WebSocket connection
    wsRef.current = new WebSocket(WS_URL);
    
    // Load persisted state
    loadPersistedState();
    
    // Set up WebSocket event handlers
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      // Node registration will happen after receiving client ID from server
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          initializeDistributedSystem();
        }
      }, 3000);
    };
    
    // Set up heartbeat
    startHeartbeat();
  }, []);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'connection':
        // Server assigned this client's ID
        nodeId.current = data.clientId;
        // Create user object with server-assigned ID
        const userColors = ['#3B82F6', '#14B8A6', '#F97316', '#EF4444', '#8B5CF6', '#10B981'];
        const userName = `User ${Math.floor(Math.random() * 1000)}`;
        const newUser: User = {
          id: nodeId.current,
          name: userName,
          color: userColors[Math.floor(Math.random() * userColors.length)],
          isActive: true,
          lastSeen: Date.now()
        };
        setCurrentUser(newUser);
        registerNode(newUser); // Now register with the server-assigned ID
        break;
      case 'user_join':
        handleUserJoin(data.user);
        // If this is a user join notification from another client, update connected nodes
        setConnectedNodes(prev => [...new Set([...prev, data.user.id])]);
        break;
      case 'user_leave':
        handleUserLeave(data.userId);
        setConnectedNodes(prev => prev.filter(id => id !== data.userId));
        break;
      case 'drawing_operation':
        handleDrawingOperation(data.operation);
        break;
      case 'state_sync':
        handleStateSync(data.state);
        break;
      case 'cursor_move':
        handleCursorMove(data.userId, data.cursor);
        break;
      case 'active_users_update': // New message type for active users
        setConnectedNodes(data.users);
        break;
    }
  }, []);

  const loadPersistedState = useCallback(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        setSystemState(state);
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }, []);

  const persistState = useCallback((state: SystemState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }, []);

  const registerNode = useCallback((user: User) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'user_join',
        user
      }));
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    heartbeatInterval.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
      }
    }, HEARTBEAT_INTERVAL) as unknown as number;
  }, []);

  const broadcastEvent = useCallback((event: DrawingEvent) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  const handleUserJoin = useCallback((user: User) => {
    setSystemState(prev => {
      const newState = {
        ...prev,
        users: {
          ...prev.users,
          [user.id]: { ...user, lastSeen: Date.now() }
        },
        currentVersion: prev.currentVersion + 1,
        lastUpdate: Date.now()
      };
      persistState(newState);
      return newState;
    });
  }, [persistState]);

  const handleUserLeave = useCallback((userId: string) => {
    setSystemState(prev => {
      const users = { ...prev.users };
      delete users[userId];
      
      const newState = {
        ...prev,
        users,
        currentVersion: prev.currentVersion + 1,
        lastUpdate: Date.now()
      };
      persistState(newState);
      return newState;
    });
  }, [persistState]);

  const handleDrawingOperation = useCallback((operation: DrawingOperation) => {
    setSystemState(prev => {
      const newState = {
        ...prev,
        operations: [...prev.operations, operation],
        currentVersion: prev.currentVersion + 1,
        lastUpdate: Date.now()
      };
      persistState(newState);
      return newState;
    });
  }, [persistState]);

  const handleStateSync = useCallback((syncedState: SystemState) => {
    if (syncedState.currentVersion > systemState.currentVersion) {
      setSystemState(syncedState);
      persistState(syncedState);
    }
  }, [systemState.currentVersion, persistState]);

  const handleCursorMove = useCallback((userId: string, cursor: { x: number; y: number }) => {
    setSystemState(prev => ({
      ...prev,
      users: {
        ...prev.users,
        [userId]: {
          ...prev.users[userId],
          cursor,
          lastSeen: Date.now()
        }
      }
    }));
  }, []);

  const addDrawingOperation = useCallback((operation: DrawingOperation) => {
    if (!currentUser) return;

    const event: DrawingEvent = {
      id: uuidv4(),
      type: 'draw',
      userId: currentUser.id,
      timestamp: Date.now(),
      data: { type: 'drawing_operation', operation },
      version: systemState.currentVersion
    };

    broadcastEvent(event);
    handleDrawingOperation(operation);
  }, [currentUser, systemState.currentVersion, broadcastEvent, handleDrawingOperation]);

  const updateCursor = useCallback((cursor: { x: number; y: number }) => {
    if (!currentUser) return;

    const event: DrawingEvent = {
      id: uuidv4(),
      type: 'draw',
      userId: currentUser.id,
      timestamp: Date.now(),
      data: { type: 'cursor_move', userId: currentUser.id, cursor },
      version: systemState.currentVersion
    };

    broadcastEvent(event);
  }, [currentUser, systemState.currentVersion, broadcastEvent]);

  const clearCanvas = useCallback(() => {
    if (!currentUser) return;

    const clearOperation: DrawingOperation = {
      type: 'clear',
      points: [],
      color: '',
      size: 0,
      tool: 'pen',
      timestamp: Date.now()
    };

    setSystemState(prev => {
      const newState = {
        ...prev,
        operations: [clearOperation],
        currentVersion: prev.currentVersion + 1,
        lastUpdate: Date.now()
      };
      persistState(newState);
      return newState;
    });

    const event: DrawingEvent = {
      id: uuidv4(),
      type: 'clear',
      userId: currentUser.id,
      timestamp: Date.now(),
      data: { type: 'drawing_operation', operation: clearOperation },
      version: systemState.currentVersion
    };

    broadcastEvent(event);
  }, [currentUser, systemState.currentVersion, broadcastEvent, persistState]);

  const cleanup = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
    }

    if (currentUser) {
      // Only send user_leave if we have a valid server-assigned ID
      wsRef.current?.send(JSON.stringify({
        type: 'user_leave',
        userId: currentUser.id
      }));
    }
  }, [currentUser, heartbeatInterval]);

  return {
    systemState,
    currentUser,
    isLeader,
    connectedNodes,
    addDrawingOperation,
    updateCursor,
    clearCanvas
  };
};