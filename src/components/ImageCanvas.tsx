import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Line, Group } from 'react-konva';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Download, 
  Eye, 
  EyeOff, 
  Maximize2,
  Move,
  Grid,
  Info,
  Percent,
  X
} from 'lucide-react';

export const ImageCanvas: React.FC = () => {
  const {
    canvasImage,
    setCanvasImage,
    canvasZoom,
    setCanvasZoom,
    canvasPan,
    setCanvasPan,
    brushStrokes,
    addBrushStroke,
    clearBrushStrokes,
    brushSize,
    setBrushSize,
    showMasks,
    setShowMasks,
    selectedTool,
  } = useAppStore();

  const stageRef = useRef<any>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointerPos, setLastPointerPos] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  // Mask drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  
  // Load image
  useEffect(() => {
    if (canvasImage) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        handleFitToView(img);
      };
      img.src = canvasImage;
    } else {
      // Clear the image when canvasImage is null
      setImage(null);
    }
  }, [canvasImage]);

  // Update canvas size
  useEffect(() => {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const updateSize = () => {
      const newWidth = container.offsetWidth;
      const newHeight = container.offsetHeight;
      
      // Only update dimensions, don't change pan position
      setDimensions({
        width: newWidth,
        height: newHeight,
      });
    };

    // Use ResizeObserver to watch container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    
    resizeObserver.observe(container);
    updateSize(); // Initial size
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Fit image to view - auto-calculates best zoom to fit the image
  const handleFitToView = (img?: HTMLImageElement) => {
    const targetImage = img || image;
    if (!targetImage) return;
    
    const container = document.getElementById('canvas-container');
    if (container) {
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const padding = 40;
      const scaleX = (containerWidth - padding) / targetImage.width;
      const scaleY = (containerHeight - padding) / targetImage.height;
      // Remove the max limit of 1 to allow zooming in for small images
      const scale = Math.min(scaleX, scaleY);
      // But still limit to max 5x zoom
      const finalScale = Math.min(scale, 5);
      setCanvasZoom(finalScale);
      const x = (containerWidth - targetImage.width * finalScale) / 2 / finalScale;
      const y = (containerHeight - targetImage.height * finalScale) / 2 / finalScale;
      setCanvasPan({ x, y });
    }
  };

  // Actual size (100%)
  const handleActualSize = () => {
    setCanvasZoom(1);
    if (image) {
      const container = document.getElementById('canvas-container');
      if (container) {
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;
        const x = (containerWidth - image.width) / 2;
        const y = (containerHeight - image.height) / 2;
        setCanvasPan({ x, y });
      }
    }
  };

  // Handle mask drawing
  const handleMaskMouseDown = (e: any) => {
    if (selectedTool !== 'mask') return;
    
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    
    const x = (pos.x / canvasZoom) - canvasPan.x;
    const y = (pos.y / canvasZoom) - canvasPan.y;
    
    setIsDrawing(true);
    setCurrentPath([x, y]);
  };

  const handleMaskMouseMove = (e: any) => {
    if (!isDrawing || selectedTool !== 'mask') return;
    
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    
    const x = (pos.x / canvasZoom) - canvasPan.x;
    const y = (pos.y / canvasZoom) - canvasPan.y;
    
    setCurrentPath([...currentPath, x, y]);
  };

  const handleMaskMouseUp = () => {
    if (!isDrawing || selectedTool !== 'mask') return;
    setIsDrawing(false);
    
    if (currentPath.length > 2) {
      addBrushStroke({
        id: Date.now().toString(),
        points: currentPath,
        brushSize,
        color: '#A855F7',
      });
    }
    setCurrentPath([]);
  };

  // Handle panning
  const handlePanStart = (e: any) => {
    if (selectedTool === 'mask') return;
    
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    
    setIsPanning(true);
    setLastPointerPos(pos);
  };

  const handlePanMove = (e: any) => {
    if (!isPanning) return;
    
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    
    const dx = (pos.x - lastPointerPos.x) / canvasZoom;
    const dy = (pos.y - lastPointerPos.y) / canvasZoom;
    
    setCanvasPan({
      x: canvasPan.x + dx,
      y: canvasPan.y + dy,
    });
    setLastPointerPos(pos);
  };

  const handlePanEnd = () => {
    setIsPanning(false);
  };

  // Combined mouse handlers
  const handleMouseDown = (e: any) => {
    if (selectedTool === 'mask') {
      handleMaskMouseDown(e);
    } else {
      handlePanStart(e);
    }
  };

  const handleMouseMove = (e: any) => {
    if (selectedTool === 'mask') {
      handleMaskMouseMove(e);
    } else {
      handlePanMove(e);
    }
  };

  const handleMouseUp = () => {
    if (selectedTool === 'mask') {
      handleMaskMouseUp();
    } else {
      handlePanEnd();
    }
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(5, canvasZoom * (1 + delta)));
    setCanvasZoom(newZoom);
  };

  const handleDownload = async () => {
    if (canvasImage) {
      try {
        // Check if it's a data URL (base64)
        if (canvasImage.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = canvasImage;
          link.download = `codenex-${Date.now()}.png`;
          link.click();
        } else {
          // For external URLs (like Cloudinary), fetch and convert to blob
          console.log('[ImageCanvas] Downloading from external URL:', canvasImage);
          const response = await fetch(canvasImage);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `codenex-${Date.now()}.png`;
          link.click();
          
          // Clean up the blob URL
          URL.revokeObjectURL(blobUrl);
        }
      } catch (error) {
        console.error('[ImageCanvas] Download failed:', error);
        // Fallback: open in new tab
        window.open(canvasImage, '_blank');
      }
    }
  };

  const handleClearCanvas = () => {
    setCanvasImage(null);
    setImage(null);
    clearBrushStrokes();
    // Reset zoom and pan to defaults
    setCanvasZoom(1);
    setCanvasPan({ x: 0, y: 0 });
  };

  // Zoom presets
  const zoomPresets = [
    { value: 0.25, label: '25%' },
    { value: 0.5, label: '50%' },
    { value: 0.75, label: '75%' },
    { value: 1, label: '100%' },
    { value: 1.5, label: '150%' },
    { value: 2, label: '200%' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-800/30 bg-gray-900/50 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Zoom controls */}
            <div className="flex items-center space-x-1 bg-gray-800/40 rounded-xl p-1">
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleZoom(-0.2)}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <select
                value={canvasZoom}
                onChange={(e) => setCanvasZoom(parseFloat(e.target.value))}
                className="bg-transparent text-sm font-medium px-2 py-1 focus:outline-none cursor-pointer"
              >
                {zoomPresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
                {!zoomPresets.find(p => Math.abs(p.value - canvasZoom) < 0.01) && (
                  <option value={canvasZoom}>{Math.round(canvasZoom * 100)}%</option>
                )}
              </select>
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleZoom(0.2)}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-5 bg-gray-700" />
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleFitToView()}
                title="Fit to View"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => handleFitToView()}
                title="Reset View (Fit to Screen)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleActualSize}
                title="Actual Size (100%)"
              >
                <Percent className="h-4 w-4" />
              </Button>
            </div>

            {/* View options */}
            <div className="flex items-center space-x-1 bg-gray-800/40 rounded-xl p-1">
              <Button
                size="sm"
                variant={showGrid ? "default" : "ghost"}
                onClick={() => setShowGrid(!showGrid)}
                title="Toggle Grid"
              >
                <Grid className="h-4 w-4" />
              </Button>
              
              {selectedTool !== 'mask' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="cursor-move"
                  title="Pan Mode"
                >
                  <Move className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Mask mode controls */}
            {selectedTool === 'mask' && (
              <>
                <div className="flex items-center space-x-2 bg-gray-800/40 rounded-xl px-3 py-1.5">
                  <span className="text-xs text-gray-400">Brush Size</span>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <span className="text-xs font-semibold min-w-[30px] text-right">{brushSize}px</span>
                </div>
                
                <Button 
                  size="sm" 
                  variant={showMasks ? "default" : "ghost"}
                  onClick={() => setShowMasks(!showMasks)}
                  title={showMasks ? "Hide Masks" : "Show Masks"}
                >
                  {showMasks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                
                {brushStrokes.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={clearBrushStrokes}
                    className="text-red-400 hover:text-red-300"
                  >
                    Clear Masks
                  </Button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* Image info */}
            {image && (
              <Button
                size="sm"
                variant={showInfo ? "default" : "ghost"}
                onClick={() => setShowInfo(!showInfo)}
                title="Image Info"
              >
                <Info className="h-4 w-4" />
              </Button>
            )}
            
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDownload}
              title="Download Image"
              disabled={!canvasImage}
            >
              <Download className="h-4 w-4" />
            </Button>
            
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleClearCanvas}
              title="Clear Canvas"
              disabled={!canvasImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Image info panel */}
        {showInfo && image && (
          <div className="mt-3 p-2 bg-gray-800/40 rounded-lg text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span>Dimensions: {image.width} × {image.height}px</span>
              <span>Zoom: {Math.round(canvasZoom * 100)}%</span>
              <span>Position: ({Math.round(canvasPan.x)}, {Math.round(canvasPan.y)})</span>
            </div>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div 
        id="canvas-container" 
        className="flex-1 bg-gray-950 relative overflow-hidden z-10"
        style={{ 
          cursor: selectedTool === 'mask' ? 'crosshair' : isPanning ? 'grabbing' : 'grab'
        }}
      >
        {!canvasImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-4 bg-gray-800/50 rounded-2xl flex items-center justify-center">
                <Grid className="h-12 w-12 text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">No image loaded</p>
              <p className="text-gray-600 text-xs mt-1">Generate or upload an image to get started</p>
            </div>
          </div>
        )}
        
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            backgroundColor: '#030712'
          }}
          onWheel={(e) => {
            e.evt.preventDefault();
            const scaleBy = 1.1;
            const stage = e.target.getStage();
            const oldScale = canvasZoom;
            const pointer = stage?.getPointerPosition();
            if (!pointer || !stage) return;
            
            const mousePointTo = {
              x: (pointer.x - canvasPan.x * oldScale) / oldScale,
              y: (pointer.y - canvasPan.y * oldScale) / oldScale,
            };
            
            const direction = e.evt.deltaY < 0 ? 1 : -1;
            const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
            const clampedScale = Math.max(0.1, Math.min(5, newScale));
            
            setCanvasZoom(clampedScale);
            
            const newPos = {
              x: (pointer.x - mousePointTo.x * clampedScale) / clampedScale,
              y: (pointer.y - mousePointTo.y * clampedScale) / clampedScale,
            };
            setCanvasPan(newPos);
          }}
        >
          <Layer>
            <Group
              scaleX={canvasZoom}
              scaleY={canvasZoom}
              x={canvasPan.x * canvasZoom}
              y={canvasPan.y * canvasZoom}
            >
            {/* Grid overlay */}
            {showGrid && image && (
              <>
                {/* Vertical lines */}
                {Array.from({ length: Math.floor(image.width / 50) + 1 }, (_, i) => (
                  <Line
                    key={`v-${i}`}
                    points={[i * 50, 0, i * 50, image.height]}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={1}
                  />
                ))}
                {/* Horizontal lines */}
                {Array.from({ length: Math.floor(image.height / 50) + 1 }, (_, i) => (
                  <Line
                    key={`h-${i}`}
                    points={[0, i * 50, image.width, i * 50]}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={1}
                  />
                ))}
              </>
            )}
            
            {/* Main Image */}
            {image && (
              <KonvaImage
                image={image}
                x={0}
                y={0}
                width={image.width}
                height={image.height}
              />
            )}

            {/* Mask strokes */}
            {showMasks && brushStrokes.map((stroke) => (
              <Line
                key={stroke.id}
                points={stroke.points}
                stroke={stroke.color}
                strokeWidth={stroke.brushSize}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                opacity={0.5}
              />
            ))}

            {/* Current mask stroke preview */}
            {isDrawing && currentPath.length > 1 && selectedTool === 'mask' && (
              <Line
                points={currentPath}
                stroke="#A855F7"
                strokeWidth={brushSize}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                opacity={0.6}
              />
            )}
            </Group>
          </Layer>
        </Stage>
      </div>
    </div>
  );
};