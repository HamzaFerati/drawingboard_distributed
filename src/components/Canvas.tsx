import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawingOperation, Point, DrawingTool } from '../types';

interface CanvasProps {
  operations: DrawingOperation[];
  onDrawingOperation: (operation: DrawingOperation) => void;
  onCursorMove: (cursor: Point) => void;
  currentTool: DrawingTool;
  currentColor: string;
  currentSize: number;
  otherCursors: Record<string, { cursor: Point; color: string; name: string }>;
}

export const Canvas: React.FC<CanvasProps> = ({
  operations,
  onDrawingOperation,
  onCursorMove,
  currentTool,
  currentColor,
  currentSize,
  otherCursors
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const drawLine = useCallback((ctx: CanvasRenderingContext2D, from: Point, to: Point, color: string, size: number) => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, []);

  const drawStroke = useCallback((ctx: CanvasRenderingContext2D, points: Point[], color: string, size: number) => {
    if (points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }, []);

  const drawRectangle = useCallback((ctx: CanvasRenderingContext2D, start: Point, end: Point, color: string, size: number) => {
    ctx.beginPath();
    ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.stroke();
  }, []);

  const drawCircle = useCallback((ctx: CanvasRenderingContext2D, start: Point, end: Point, color: string, size: number) => {
    const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    ctx.beginPath();
    ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.stroke();
  }, []);

  const erase = useCallback((ctx: CanvasRenderingContext2D, points: Point[], size: number) => {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply all operations
    operations.forEach(operation => {
      if (operation.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      } else if (operation.type === 'stroke') {
        if (operation.tool === 'pen') {
          drawStroke(ctx, operation.points, operation.color, operation.size);
        } else if (operation.tool === 'line' && operation.points.length >= 2) {
          drawLine(ctx, operation.points[0], operation.points[operation.points.length - 1], operation.color, operation.size);
        } else if (operation.tool === 'rectangle' && operation.points.length >= 2) {
          drawRectangle(ctx, operation.points[0], operation.points[operation.points.length - 1], operation.color, operation.size);
        } else if (operation.tool === 'circle' && operation.points.length >= 2) {
          drawCircle(ctx, operation.points[0], operation.points[operation.points.length - 1], operation.color, operation.size);
        }
      } else if (operation.type === 'erase') {
        erase(ctx, operation.points, operation.size);
      }
    });
  }, [operations, drawStroke, drawLine, drawRectangle, drawCircle, erase]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setStartPoint(point);
    setCurrentStroke([point]);
  }, [getCanvasPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);
    onCursorMove(point);

    if (!isDrawing) return;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setCurrentStroke(prev => [...prev, point]);
      
      // Draw preview for immediate feedback
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx && currentStroke.length > 0) {
          if (currentTool === 'eraser') {
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            drawLine(ctx, currentStroke[currentStroke.length - 1] || point, point, currentColor, currentSize);
            ctx.restore();
          } else {
            drawLine(ctx, currentStroke[currentStroke.length - 1] || point, point, currentColor, currentSize);
          }
        }
      }
    } else {
      // For shapes, just update the current stroke with start and end points
      if (startPoint) {
        setCurrentStroke([startPoint, point]);
      }
    }
  }, [getCanvasPoint, onCursorMove, isDrawing, currentTool, currentStroke, currentColor, currentSize, startPoint, drawLine]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentStroke.length === 0) return;

    const operation: DrawingOperation = {
      type: currentTool === 'eraser' ? 'erase' : 'stroke',
      points: currentStroke,
      color: currentColor,
      size: currentSize,
      tool: currentTool,
      timestamp: Date.now()
    };

    onDrawingOperation(operation);
    
    setIsDrawing(false);
    setCurrentStroke([]);
    setStartPoint(null);
  }, [isDrawing, currentStroke, currentTool, currentColor, currentSize, onDrawingOperation]);

  // Set up canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        redrawCanvas();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redrawCanvas]);

  return (
    <div className="relative flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
      />
      
      {/* Other users' cursors */}
      {Object.entries(otherCursors).map(([userId, { cursor, color, name }]) => (
        <div
          key={userId}
          className="absolute pointer-events-none z-10 transition-all duration-75"
          style={{
            left: `${(cursor.x / (canvasRef.current?.width || 800)) * 100}%`,
            top: `${(cursor.y / (canvasRef.current?.height || 600)) * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="flex items-center space-x-1">
            <div
              className="w-3 h-3 rounded-full border-2 border-white shadow-lg"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs bg-black bg-opacity-75 text-white px-2 py-1 rounded whitespace-nowrap">
              {name}
            </span>
          </div>
        </div>
      ))}
      
      {/* Grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#000" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  );
};