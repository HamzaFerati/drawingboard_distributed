import React from 'react';
import { Pen, Eraser, Minus, Square, Circle, Trash2, Users } from 'lucide-react';
import { DrawingTool } from '../types';

interface ToolbarProps {
  currentTool: DrawingTool;
  currentColor: string;
  currentSize: number;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onClearCanvas: () => void;
  connectedUsers: number;
}

const colors = [
  '#000000', '#3B82F6', '#14B8A6', '#F97316', '#EF4444', 
  '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6B7280'
];

const sizes = [2, 4, 8, 12, 16, 24];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  currentColor,
  currentSize,
  onToolChange,
  onColorChange,
  onSizeChange,
  onClearCanvas,
  connectedUsers
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex flex-col space-y-6">
        {/* Drawing Tools */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Tools</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { tool: 'pen' as DrawingTool, icon: Pen, label: 'Pen' },
              { tool: 'eraser' as DrawingTool, icon: Eraser, label: 'Eraser' },
              { tool: 'line' as DrawingTool, icon: Minus, label: 'Line' },
              { tool: 'rectangle' as DrawingTool, icon: Square, label: 'Rectangle' },
              { tool: 'circle' as DrawingTool, icon: Circle, label: 'Circle' }
            ].map(({ tool, icon: Icon, label }) => (
              <button
                key={tool}
                onClick={() => onToolChange(tool)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-200 ${
                  currentTool === tool
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                title={label}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Colors</h3>
          <div className="flex flex-wrap gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => onColorChange(color)}
                className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                  currentColor === color
                    ? 'border-gray-400 ring-2 ring-blue-500 ring-offset-2'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Size ({currentSize}px)
          </h3>
          <div className="flex flex-wrap gap-2">
            {sizes.map(size => (
              <button
                key={size}
                onClick={() => onSizeChange(size)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-200 ${
                  currentSize === size
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                title={`${size}px`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: size / 2, height: size / 2 }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onClearCanvas}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
            >
              <Trash2 size={16} />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Connected Users */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Status</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users size={16} />
            <span>{connectedUsers} user{connectedUsers !== 1 ? 's' : ''} connected</span>
          </div>
        </div>
      </div>
    </div>
  );
};