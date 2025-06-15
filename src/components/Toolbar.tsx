import React, { useState, useRef, useEffect } from 'react';
import { Pen, Eraser, Minus, Square, Circle, Trash2, Users, Eye, EyeOff } from 'lucide-react';
import { DrawingTool } from '../types';

interface ToolbarProps {
  currentTool: DrawingTool;
  currentColor: string;
  currentSize: number;
  currentOpacity: number;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onOpacityChange: (opacity: number) => void;
  onClearCanvas: () => void;
  connectedUsers: number;
}

const colors = [
  '#000000', '#3B82F6', '#14B8A6', '#F97316', '#EF4444', 
  '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6B7280'
];

const sizes = [2, 4, 8, 12, 16, 24];
const opacities = [0.2, 0.4, 0.6, 0.8, 1.0];

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  currentColor,
  currentSize,
  currentOpacity,
  onToolChange,
  onColorChange,
  onSizeChange,
  onOpacityChange,
  onClearCanvas,
  connectedUsers
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

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
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 hover:scale-110"
              title="Custom Color"
            >
              <div className="w-full h-full rounded-lg bg-gradient-to-r from-red-500 via-green-500 to-blue-500" />
            </button>
            {showColorPicker && (
              <div ref={colorPickerRef} className="absolute mt-2 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-32 h-32 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Opacity */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Opacity ({Math.round(currentOpacity * 100)}%)
          </h3>
          <div className="flex flex-wrap gap-2">
            {opacities.map(opacity => (
              <button
                key={opacity}
                onClick={() => onOpacityChange(opacity)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg border-2 transition-all duration-200 ${
                  currentOpacity === opacity
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                title={`${Math.round(opacity * 100)}%`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ 
                    width: '16px', 
                    height: '16px',
                    opacity: opacity 
                  }}
                />
              </button>
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