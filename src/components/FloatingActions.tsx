import React, { useState } from 'react';
import { 
  Plus,
  Wand2,
  Download,
  Share2,
  Settings,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAppStore } from '../store/useAppStore';

export const FloatingActions: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { 
    setSelectedTool, 
    canvasImage,
    setShowPromptPanel
  } = useAppStore();

  const handleNewGeneration = () => {
    setSelectedTool('generate');
    setShowPromptPanel(true);
    setIsExpanded(false);
  };

  const handleDownload = async () => {
    if (canvasImage) {
      try {
        // Check if it's a data URL (base64)
        if (canvasImage.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = canvasImage;
          link.download = `codenex-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // For external URLs (like Cloudinary), fetch and convert to blob
          console.log('[FloatingActions] Downloading from external URL:', canvasImage);
          const response = await fetch(canvasImage);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `codenex-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the blob URL
          URL.revokeObjectURL(blobUrl);
        }
      } catch (error) {
        console.error('[FloatingActions] Download failed:', error);
        // Fallback: open in new tab
        window.open(canvasImage, '_blank');
      }
    }
    setIsExpanded(false);
  };

  const handleShare = () => {
    // Share functionality
    console.log('Share');
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Quick Actions */}
      <div className={cn(
        "absolute bottom-16 right-0 flex flex-col items-end space-y-3 transition-all duration-300",
        isExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        <button
          onClick={handleNewGeneration}
          className="flex items-center space-x-3 group"
        >
          <span className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
            New Generation
          </span>
          <div className="w-12 h-12 bg-accent-500 hover:bg-accent-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110">
            <Sparkles className="h-5 w-5" />
          </div>
        </button>

        <button
          onClick={handleDownload}
          disabled={!canvasImage}
          className="flex items-center space-x-3 group"
        >
          <span className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
            Download
          </span>
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all",
            canvasImage 
              ? "bg-blue-500 hover:bg-blue-600 text-white hover:scale-110" 
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          )}>
            <Download className="h-5 w-5" />
          </div>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center space-x-3 group"
        >
          <span className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
            Share
          </span>
          <div className="w-12 h-12 bg-teal-500 hover:bg-teal-600 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-110">
            <Share2 className="h-5 w-5" />
          </div>
        </button>
      </div>
      
      {/* Main FAB */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center",
          isExpanded
            ? "bg-gray-800 hover:bg-gray-700"
            : "bg-gradient-to-br from-accent-500 to-accent-600 hover:from-accent-600 hover:to-accent-700 hover:scale-110"
        )}
      >
        <Plus className={cn(
          "h-6 w-6 text-white transition-transform duration-300",
          isExpanded ? "rotate-45" : ""
        )} />
      </button>
      
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};