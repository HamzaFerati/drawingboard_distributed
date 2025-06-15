import React from 'react';
import { CheckCircle, AlertCircle, Wifi, Server } from 'lucide-react';

interface SystemStatusProps {
  isLeader: boolean;
  connectedNodes: string[];
  systemVersion: number;
  lastUpdate: number;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  isLeader,
  connectedNodes,
  systemVersion,
  lastUpdate
}) => {
  const timeSinceUpdate = Math.floor((Date.now() - lastUpdate) / 1000);
  const isHealthy = timeSinceUpdate < 10;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center space-x-2">
        <Server size={16} />
        <span>System Status</span>
      </h3>
      
      <div className="space-y-3">
        {/* Node Role */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Node Role</span>
          <div className="flex items-center space-x-1">
            {isLeader ? (
              <>
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-sm font-medium text-green-600">Leader</span>
              </>
            ) : (
              <>
                <Wifi size={14} className="text-blue-500" />
                <span className="text-sm font-medium text-blue-600">Follower</span>
              </>
            )}
          </div>
        </div>

        {/* Network Health */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Network</span>
          <div className="flex items-center space-x-1">
            {isHealthy ? (
              <>
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-sm font-medium text-green-600">Healthy</span>
              </>
            ) : (
              <>
                <AlertCircle size={14} className="text-orange-500" />
                <span className="text-sm font-medium text-orange-600">Delayed</span>
              </>
            )}
          </div>
        </div>

        {/* Connected Nodes */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Active Nodes</span>
          <span className="text-sm font-medium text-gray-900">
            {connectedNodes.length}
          </span>
        </div>

        {/* System Version */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">State Version</span>
          <span className="text-sm font-medium text-gray-900">
            v{systemVersion}
          </span>
        </div>

        {/* Last Update */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Last Sync</span>
          <span className="text-sm font-medium text-gray-900">
            {timeSinceUpdate}s ago
          </span>
        </div>
      </div>

      {/* Fault Tolerance Info */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Fault Tolerant:</strong> System continues operation even if nodes disconnect. 
          State is automatically synchronized when nodes rejoin.
        </p>
      </div>
    </div>
  );
};