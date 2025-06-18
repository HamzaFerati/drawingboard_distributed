import { useState } from 'react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { UserList } from './components/UserList';
import { SystemStatus } from './components/SystemStatus';
import { useDistributedSystem } from './hooks/useDistributedSystem';
import { DrawingTool, Point } from './types';
import { Palette } from 'lucide-react';

function App() {
  const {
    systemState,
    currentUser,
    isLeader,
    connectedNodes,
    addDrawingOperation,
    updateCursor,
    clearCanvas
  } = useDistributedSystem();

  const [currentTool, setCurrentTool] = useState<DrawingTool>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(4);
  const [currentOpacity, setCurrentOpacity] = useState(1.0);

  const handleDrawingOperation = (operation: any) => {
    addDrawingOperation(operation);
  };

  const handleCursorMove = (cursor: Point) => {
    updateCursor(cursor);
  };

  const otherCursors = Object.entries(systemState?.users || {})
    .filter(([userId]) => userId !== currentUser?.id)
    .reduce((acc, [userId, user]) => {
      if (user?.cursor && user?.isActive) {
        acc[userId] = {
          cursor: user.cursor,
          color: user.color || '#000000',
          name: user.name || 'Anonymous'
        };
      }
      return acc;
    }, {} as Record<string, { cursor: Point; color: string; name: string }>);

  if (!systemState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading...</h2>
          <p className="text-gray-600">Connecting to the drawing board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-teal-500 rounded-lg">
                <Palette className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Distributed Drawing Board
                </h1>
                <p className="text-sm text-gray-600">
                  Real-time collaborative drawing with fault tolerance
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-full">
                  <div
                    className="w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: currentUser.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {currentUser.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
          {/* Left Sidebar - Tools */}
          <div className="lg:col-span-1 space-y-4">
            <Toolbar
              currentTool={currentTool}
              currentColor={currentColor}
              currentSize={currentSize}
              currentOpacity={currentOpacity}
              onToolChange={setCurrentTool}
              onColorChange={setCurrentColor}
              onSizeChange={setCurrentSize}
              onOpacityChange={setCurrentOpacity}
              onClearCanvas={clearCanvas}
              connectedUsers={Object.keys(systemState?.users || {}).length}
            />
          </div>

          {/* Center - Canvas */}
          <div className="lg:col-span-2 flex flex-col">
            <Canvas
              operations={systemState.operations}
              onDrawingOperation={handleDrawingOperation}
              onCursorMove={handleCursorMove}
              currentTool={currentTool}
              currentColor={currentColor}
              currentSize={currentSize}
              currentOpacity={currentOpacity}
              otherCursors={otherCursors}
            />
          </div>

          {/* Right Sidebar - Users & Status */}
          <div className="lg:col-span-1 space-y-4">
            <UserList 
              users={systemState?.users || {}}
              currentUserId={currentUser?.id}
            />
            
            <SystemStatus
              isLeader={isLeader}
              connectedNodes={connectedNodes}
              systemVersion={systemState.currentVersion}
              lastUpdate={systemState.lastUpdate}
            />
          </div>
        </div>
      </main>

      {/* Instructions */}
      <div className="fixed bottom-4 left-4 max-w-sm bg-white border border-gray-200 rounded-lg p-4 shadow-lg">
        <h4 className="font-medium text-gray-900 mb-2">Try This!</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Open this app in multiple browser tabs</li>
          <li>• Watch real-time synchronization</li>
          <li>• Close tabs to test fault tolerance</li>
          <li>• See distributed state management in action</li>
          <li>• Try different opacity levels for artistic effects</li>
        </ul>
      </div>
    </div>
  );
}

export default App;