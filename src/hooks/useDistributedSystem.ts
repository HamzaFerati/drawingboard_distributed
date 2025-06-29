import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DrawingEvent, SystemState, User, DrawingOperation, Point } from '../types';

const HEARTBEAT_INTERVAL = 1000;
// const NODE_TIMEOUT = 5000; // Still used for client-side user activity display, but server handles primary timeout
const STORAGE_KEY = 'drawing_board_state'; // Still used for local persistence
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

// Get WebSocket URL from environment variable or use default
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
console.log(`[useDistributedSystem] Attempting to connect to WS_URL: ${WS_URL}`); // Added for debugging

export const useDistributedSystem = (persistentUserId: string | null, persistentUserName: string | null, persistentUserColor: string | null) => {
  const [systemState, setSystemState] = useState<SystemState>(() => {
    // Do not load operations from localStorage, only initialize empty state
    return { users: {}, operations: [], currentVersion: 0, lastUpdate: Date.now() };
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Use passed props if available, otherwise generate new or load from old localStorage (for backward compat)
    if (persistentUserId && persistentUserName && persistentUserColor) {
      return {
        id: persistentUserId,
        name: persistentUserName,
        color: persistentUserColor,
        isActive: false,
        lastSeen: Date.now()
      };
    } else {
      // Fallback to old localStorage or new generation if not authenticated yet
      let userId = localStorage.getItem('persistent_user_id');
      let userName = localStorage.getItem('persistent_user_name');
      let userColor = localStorage.getItem('persistent_user_color');

      if (!userId) {
        userId = uuidv4();
        const userColors = ['#3B82F6', '#14B8A6', '#F97316', '#EF4444', '#8B5CF6', '#10B981'];
        userName = `User ${Math.floor(Math.random() * 1000)}`;
        userColor = userColors[Math.floor(Math.random() * userColors.length)];

        localStorage.setItem('persistent_user_id', userId);
        localStorage.setItem('persistent_user_name', userName);
        localStorage.setItem('persistent_user_color', userColor);
      }
      return {
        id: userId,
        name: userName || `User ${Math.floor(Math.random() * 1000)}`,
        color: userColor || '#000000',
        isActive: false,
        lastSeen: Date.now()
      };
    }
  });

  const [/*isLeader*/, /*setIsLeader*/] = useState(false); // Leader election is now server-side concept
  const [connectedNodes, setConnectedNodes] = useState<string[]>([]); // Will now come from server
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [/*isWsReady*/, setIsWsReady] = useState(false); // State to track if WebSocket is truly ready for messages
  
  const nodeId = useRef<string>(''); // Server-assigned ephemeral connection ID
  const wsRef = useRef<WebSocket | null>(null); // This will hold the active, OPEN WebSocket instance
  const heartbeatIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountingRef = useRef(false);
  const currentConnectionAttemptRef = useRef<number>(0); // Track the current connection attempt

  const persistState = useCallback((state: SystemState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to persist state to localStorage:", error);
    }
  }, []);

  /*
  const loadPersistedState = useCallback(() => {
    try {
      const persistedState = localStorage.getItem(STORAGE_KEY);
      if (persistedState) {
        setSystemState(JSON.parse(persistedState));
      }
    } catch (error) {
      console.error("Failed to load persisted state from localStorage:", error);
    }
  }, []);
  */

  const sendMessage = useCallback((message: any) => {
    console.log('[SendMessage] Attempting to send message. wsRef.current:', wsRef.current, 'readyState:', wsRef.current?.readyState, 'Message Type:', message?.type);
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn(
        `[SendMessage] WebSocket not OPEN. ReadyState: ${wsRef.current?.readyState}. Message Type: ${message?.type}, Full Message:`, message
      );
      return;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
      console.log('[SendMessage] Message sent successfully.');
    } catch (error) {
      console.error('[SendMessage] Error sending message:', error);
    }
  }, []);

  const handleWebSocketMessage = useCallback((data: any) => {
    // Debug log for all messages
    console.log('[WebSocket] Received message:', data.type, data);
    switch (data.type) {
      case 'connection':
        // Server sends ephemeral client ID on initial connect
        nodeId.current = data.clientId;
        console.log('[handleWebSocketMessage] Received connection ID from server:', nodeId.current);
        // At this point, currentUser should be available as it's initialized via useState(() => ...)
        if (currentUser) {
            // Send client_connect_info here now that we have the ephemeral nodeId and currentUser
            sendMessage({
                type: 'client_connect_info',
                persistentUserId: currentUser.id,
                userName: currentUser.name,
                userColor: currentUser.color
            });
        }
        break;
      case 'user_join':
        // Update local users map when a new user joins
        setSystemState(prev => ({
            ...prev,
            users: {
                ...prev.users,
                [data.user.id]: { ...data.user, lastSeen: Date.now() }
            },
            lastUpdate: Date.now()
        }));
        break;
      case 'user_leave':
        // Update local users map when a user leaves (server broadcasts persistent user ID)
        setSystemState(prev => {
            const newUsers = { ...prev.users };
            delete newUsers[data.userId];
            return { ...prev, users: newUsers, lastUpdate: Date.now() };
        });
        break;
      case 'drawing_operation':
        setSystemState(prev => {
          // Deduplicate by timestamp
          if (prev.operations.some(op => op.timestamp === data.operation.timestamp)) {
            return prev; // Already have this operation
          }
          return {
            ...prev,
            operations: [...prev.operations, data.operation],
            currentVersion: prev.currentVersion + 1,
            lastUpdate: Date.now()
          };
        });
        break;
      case 'state_sync':
        // Merge and deduplicate operations on state_sync
        setSystemState(prev => {
            const syncedState = data.state;
            const mergedUsers: Record<string, User> = {};
            if (syncedState.users) {
                syncedState.users.forEach((u: User) => {
                    mergedUsers[u.id] = u;
                });
            }
            // Merge and deduplicate operations by id
            const allOps = [...(prev.operations || []), ...(syncedState.operations || [])];
            const dedupedOps = Array.from(
              new Map(allOps.map(op => [op.id, op])).values()
            );
            console.log(`[Client] Received state_sync with ${dedupedOps.length} operations. Types:`, dedupedOps.map(op => op.type)); // Added for debugging
            return {
                ...prev,
                users: mergedUsers,
                operations: dedupedOps,
                currentVersion: syncedState.currentVersion || 0,
                lastUpdate: Date.now()
            };
        });
        break;
      case 'cursor_move':
        // Update cursor position for other users (server broadcasts persistent user ID and cursor)
        setSystemState(prev => ({
          ...prev,
          users: {
            ...prev.users,
            [data.userId]: {
              ...prev.users[data.userId],
              cursor: data.cursor,
              lastSeen: Date.now()
            }
          }
        }));
        break;
      case 'active_users_update':
        // Server sends an array of active persistent user IDs. Update `connectedNodes` state.
        // Also update local `users` map for `isActive` status based on the server's active list.
        setConnectedNodes(data.users); 
        setSystemState(prev => {
            const updatedUsers = { ...prev.users };
            Object.values(updatedUsers).forEach(user => {
                updatedUsers[user.id] = { ...user, isActive: data.users.includes(user.id) };
            });
            return { ...prev, users: updatedUsers };
        });
        break;
      case 'clear_canvas': 
        console.log('[handleWebSocketMessage] Received clear_canvas message from server. Clearing local operations.');
        setSystemState(prev => {
            const newState = {
                ...prev,
                operations: [],
                currentVersion: prev.currentVersion + 1,
                lastUpdate: Date.now()
            };
            persistState(newState);
            return newState;
        });
        break;
      default:
        console.warn(`Unknown message type: ${data.type}`);
        break;
    }
  }, [persistentUserId, persistentUserName, persistentUserColor, persistState, currentUser, setConnectedNodes, setSystemState, sendMessage]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(() => {
      if (currentUser && wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'heartbeat', userId: currentUser.id });
      } else {
        // console.warn('[Heartbeat] WebSocket not open, stopping heartbeat for now.'); // Too verbose
      }
    }, HEARTBEAT_INTERVAL) as any as number;
  }, [currentUser, sendMessage]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const initiateReconnect = useCallback(() => {
    if (isUnmountingRef.current) {
      console.log('[Reconnect] Component unmounting, not reconnecting.');
      return;
    }

    if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttemptsRef.current += 1;
      console.log(`[Reconnect] Attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS}. Retrying in ${RECONNECT_DELAY / 1000}s...`);
      reconnectTimeoutRef.current = setTimeout(() => {
        // If currentUser is available and we are disconnected, attempt to re-initialize
        // Note: The main useEffect handles creation of new WebSocket instances.
        // This callback just triggers the re-run of the main useEffect by changing a dependency or state if needed.
        // For now, we rely on the main useEffect's dependency array to trigger re-connection.
        // If we needed to force a re-run, we might set a state here, e.g., setConnectionAttempt(prev => prev + 1);
      }, RECONNECT_DELAY) as any as number;
    } else {
      console.warn(`[Reconnect] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Not attempting to reconnect.`);
      setConnectionStatus('disconnected');
      stopHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    }
  }, [isUnmountingRef, stopHeartbeat, sendMessage, setConnectionStatus]);

  useEffect(() => {
    // Only attempt to connect if a user is authenticated (userId is not null)
    if (!persistentUserId || isUnmountingRef.current) {
        console.log('[useEffect] Not initiating WebSocket connection: User not authenticated or component unmounting.');
        return;
    }

    // If a connection is already open, do nothing
    if (wsRef.current?.readyState === WebSocket.OPEN) {
        setConnectionStatus('connected');
        setIsWsReady(true);
        startHeartbeat(); // Ensure heartbeat is running
        return;
    }

    // If already connecting, do nothing
    if (connectionStatus === 'connecting' && wsRef.current) {
        console.log('[useEffect] Already connecting, waiting...');
        return;
    }

    console.log('[useEffect] Initiating WebSocket connection...');
    setConnectionStatus('connecting');
    setIsWsReady(false); // Mark as not ready until OPEN
    
    const ws = new WebSocket(WS_URL);
    const currentWsInstance = ws; // Hold reference for cleanup immediately

    currentWsInstance.onopen = (event) => {
      console.log('[WebSocket] Connection established:', event);
      wsRef.current = currentWsInstance; // Set wsRef.current only when truly open
      setConnectionStatus('connected');
      setIsWsReady(true);
      reconnectAttemptsRef.current = 0; // Reset attempts on successful connection
      startHeartbeat(); // Start sending heartbeats

      // Send initial connection information to the server
      if (currentUser) { // currentUser should be available here
        sendMessage({
          type: 'client_connect_info',
          persistentUserId: currentUser.id,
          userName: currentUser.name,
          userColor: currentUser.color
        });
      }
    };

    currentWsInstance.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    currentWsInstance.onerror = (event) => {
      console.error('[WebSocket] Error:', event);
    };

    currentWsInstance.onclose = (event) => {
      console.log('[WebSocket] Disconnected:', event);
      setConnectionStatus('disconnected');
      setIsWsReady(false);
      stopHeartbeat();

      if (wsRef.current === currentWsInstance) {
        wsRef.current = null; // Clear the ref only if it holds the closed instance
      }
      
      if (!isUnmountingRef.current && !event.wasClean) {
        console.log('[WebSocket] Attempting to initiate reconnect...');
        initiateReconnect();
      } else if (event.wasClean) {
        console.log('[WebSocket] Cleanly disconnected. No reconnect.');
      }
    };

    // Cleanup function: This runs when the component unmounts or before the effect re-runs
    return () => {
      console.log('[useEffect Cleanup] Running cleanup...');
      isUnmountingRef.current = true; // Indicate that the component is unmounting
      stopHeartbeat();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // Close the current WebSocket instance if it exists and is not already closed/closing
      if (currentWsInstance && currentWsInstance.readyState === WebSocket.OPEN) {
        console.log('[useEffect Cleanup] Closing WebSocket (OPEN).');
        currentWsInstance.close(1000, "Component Unmount"); // Code 1000 for normal closure
      } else if (currentWsInstance && currentWsInstance.readyState === WebSocket.CONNECTING) {
        console.log('[useEffect Cleanup] Closing WebSocket (CONNECTING).');
        currentWsInstance.close(1000, "Component Unmount"); // Attempt to close if still connecting
      } else if (currentWsInstance) {
        console.log(`[useEffect Cleanup] WebSocket state: ${currentWsInstance.readyState}. Not explicitly closing.`);
      }
    };
  }, [
    WS_URL,
    persistentUserId, // Added as a key dependency to ensure connection only when user is logged in
    handleWebSocketMessage, 
    initiateReconnect, 
    sendMessage, 
    setConnectionStatus, 
    startHeartbeat, 
    stopHeartbeat,
    currentUser // Keep currentUser because sendMessage and handleWebSocketMessage depend on it
  ]);

  // Update lastSeen for currentUser and send heartbeat on tab focus/visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User returned to tab, update lastSeen and send heartbeat if connected
        if (currentUser && wsRef.current?.readyState === WebSocket.OPEN) {
          sendMessage({ type: 'heartbeat', userId: currentUser.id });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, sendMessage]);


  const addDrawingOperation = useCallback((operation: DrawingOperation) => {
    // Send drawing operation to server in the correct format
    if (currentUser) {
      sendMessage({ type: 'drawing_operation', data: { operation }, userId: currentUser.id });
    }
  }, [sendMessage, currentUser]);

  const updateCursor = useCallback((cursor: Point) => {
    // Send cursor update to server in the correct format
    if (currentUser) {
      sendMessage({ type: 'cursor_move', data: { cursor }, userId: currentUser.id });
    }
  }, [sendMessage, currentUser]);

  const clearCanvas = useCallback(() => {
    // Send clear canvas message to server
    console.log('[clearCanvas] Attempting to send clear_canvas message.');
    sendMessage({ type: 'clear_canvas' });
  }, [sendMessage]);

  return {
    systemState,
    currentUser,
    isLeader: false, // isLeader is now a server-side concept, client always reports false
    connectedNodes,
    connectionStatus,
    addDrawingOperation,
    updateCursor,
    clearCanvas,
  };
};