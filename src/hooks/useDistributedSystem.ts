import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DrawingEvent, SystemState, User, DrawingOperation, DistributedNode } from '../types';

const HEARTBEAT_INTERVAL = 1000;
const NODE_TIMEOUT = 5000;
const STORAGE_KEY = 'drawing_board_state';
const NODES_KEY = 'drawing_board_nodes';

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
  
  const nodeId = useRef<string>(uuidv4());
  const broadcastChannel = useRef<BroadcastChannel | null>(null);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize user and distributed system
  useEffect(() => {
    const userId = uuidv4();
    const userColors = ['#3B82F6', '#14B8A6', '#F97316', '#EF4444', '#8B5CF6', '#10B981'];
    const userName = `User ${Math.floor(Math.random() * 1000)}`;
    
    const user: User = {
      id: userId,
      name: userName,
      color: userColors[Math.floor(Math.random() * userColors.length)],
      isActive: true,
      lastSeen: Date.now()
    };

    setCurrentUser(user);
    initializeDistributedSystem(user);

    return () => {
      cleanup();
    };
  }, []);

  const initializeDistributedSystem = useCallback((user: User) => {
    // Initialize broadcast channel for inter-tab communication
    broadcastChannel.current = new BroadcastChannel('drawing_board');
    
    // Load persisted state
    loadPersistedState();
    
    // Register this node
    registerNode(user);
    
    // Set up heartbeat
    startHeartbeat();
    
    // Listen for messages from other nodes
    broadcastChannel.current.onmessage = handleBroadcastMessage;
    
    // Elect leader
    electLeader();
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
    const node: DistributedNode = {
      id: nodeId.current,
      isLeader: false,
      lastHeartbeat: Date.now(),
      state: systemState
    };

    try {
      const nodes = JSON.parse(localStorage.getItem(NODES_KEY) || '{}');
      nodes[nodeId.current] = node;
      localStorage.setItem(NODES_KEY, JSON.stringify(nodes));
    } catch (error) {
      console.error('Failed to register node:', error);
    }

    // Broadcast presence
    broadcastEvent({
      id: uuidv4(),
      type: 'draw',
      userId: user.id,
      timestamp: Date.now(),
      data: { type: 'user_join', user },
      version: systemState.currentVersion
    });
  }, [systemState]);

  const startHeartbeat = useCallback(() => {
    heartbeatInterval.current = setInterval(() => {
      // Update node heartbeat
      try {
        const nodes = JSON.parse(localStorage.getItem(NODES_KEY) || '{}');
        if (nodes[nodeId.current]) {
          nodes[nodeId.current].lastHeartbeat = Date.now();
          localStorage.setItem(NODES_KEY, JSON.stringify(nodes));
        }
      } catch (error) {
        console.error('Heartbeat update failed:', error);
      }

      // Clean up dead nodes
      cleanupDeadNodes();
      
      // Re-elect leader if needed
      electLeader();
    }, HEARTBEAT_INTERVAL);
  }, []);

  const cleanupDeadNodes = useCallback(() => {
    try {
      const nodes = JSON.parse(localStorage.getItem(NODES_KEY) || '{}');
      const now = Date.now();
      const activeNodes: string[] = [];

      Object.entries(nodes).forEach(([id, node]: [string, any]) => {
        if (now - node.lastHeartbeat < NODE_TIMEOUT) {
          activeNodes.push(id);
        } else {
          delete nodes[id];
        }
      });

      localStorage.setItem(NODES_KEY, JSON.stringify(nodes));
      setConnectedNodes(activeNodes);
    } catch (error) {
      console.error('Failed to cleanup dead nodes:', error);
    }
  }, []);

  const electLeader = useCallback(() => {
    try {
      const nodes = JSON.parse(localStorage.getItem(NODES_KEY) || '{}');
      const activeNodes = Object.entries(nodes)
        .filter(([_, node]: [string, any]) => Date.now() - node.lastHeartbeat < NODE_TIMEOUT)
        .sort(([a], [b]) => a.localeCompare(b));

      if (activeNodes.length > 0) {
        const leaderId = activeNodes[0][0];
        const wasLeader = isLeader;
        const nowLeader = leaderId === nodeId.current;
        
        setIsLeader(nowLeader);
        
        if (nowLeader && !wasLeader) {
          console.log('Elected as leader');
          // Leader takes responsibility for state synchronization
          broadcastStateSync();
        }
      }
    } catch (error) {
      console.error('Leader election failed:', error);
    }
  }, [isLeader]);

  const broadcastEvent = useCallback((event: DrawingEvent) => {
    if (broadcastChannel.current) {
      broadcastChannel.current.postMessage(event);
    }
  }, []);

  const broadcastStateSync = useCallback(() => {
    const syncEvent: DrawingEvent = {
      id: uuidv4(),
      type: 'draw',
      userId: currentUser?.id || '',
      timestamp: Date.now(),
      data: { type: 'state_sync', state: systemState },
      version: systemState.currentVersion
    };
    broadcastEvent(syncEvent);
  }, [currentUser, systemState, broadcastEvent]);

  const handleBroadcastMessage = useCallback((event: MessageEvent<DrawingEvent>) => {
    const drawingEvent = event.data;
    
    // Process the event based on type
    switch (drawingEvent.data?.type) {
      case 'user_join':
        handleUserJoin(drawingEvent.data.user);
        break;
      case 'user_leave':
        handleUserLeave(drawingEvent.data.userId);
        break;
      case 'drawing_operation':
        handleDrawingOperation(drawingEvent.data.operation);
        break;
      case 'state_sync':
        handleStateSync(drawingEvent.data.state);
        break;
      case 'cursor_move':
        handleCursorMove(drawingEvent.data.userId, drawingEvent.data.cursor);
        break;
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
    // Only accept state sync if it's from a higher version
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
    
    if (broadcastChannel.current) {
      broadcastChannel.current.close();
    }

    if (currentUser) {
      const event: DrawingEvent = {
        id: uuidv4(),
        type: 'draw',
        userId: currentUser.id,
        timestamp: Date.now(),
        data: { type: 'user_leave', userId: currentUser.id },
        version: systemState.currentVersion
      };
      broadcastEvent(event);
    }

    // Remove this node from registry
    try {
      const nodes = JSON.parse(localStorage.getItem(NODES_KEY) || '{}');
      delete nodes[nodeId.current];
      localStorage.setItem(NODES_KEY, JSON.stringify(nodes));
    } catch (error) {
      console.error('Failed to cleanup node:', error);
    }
  }, [currentUser, systemState.currentVersion, broadcastEvent]);

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