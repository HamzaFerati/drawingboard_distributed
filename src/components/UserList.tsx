import React from 'react';
import { User } from '../types';
import { Circle } from 'lucide-react';

interface UserListProps {
  users: Record<string, User>;
  currentUserId?: string;
}

export const UserList: React.FC<UserListProps> = ({ users, currentUserId }) => {
  const userList = Object.values(users).filter(user => user.isActive);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Connected Users ({userList.length})
      </h3>
      
      <div className="space-y-2">
        {userList.map(user => (
          <div
            key={user.id}
            className={`flex items-center space-x-3 p-2 rounded-lg transition-colors duration-200 ${
              user.id === currentUserId 
                ? 'bg-blue-50 border border-blue-200' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="relative">
              <Circle
                size={12}
                fill={user.color}
                color={user.color}
                className="animate-pulse"
              />
              {user.id === currentUserId && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-white" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-900 truncate">
                {user.name}
                {user.id === currentUserId && (
                  <span className="ml-1 text-xs text-blue-600">(You)</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {user.cursor ? 'Drawing' : 'Online'}
              </p>
            </div>
            
            <div className="text-xs text-gray-400">
              {Math.floor((Date.now() - user.lastSeen) / 1000)}s
            </div>
          </div>
        ))}
        
        {userList.length === 0 && (
          <div className="text-center py-4 text-gray-500 text-sm">
            No users connected
          </div>
        )}
      </div>
    </div>
  );
};