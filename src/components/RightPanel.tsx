import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useUserStore } from '../store/useUserStore';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  History, 
  Download, 
  Menu,
  X,
  Clock,
  Trash2,
  Eye,
  Filter,
  Grid,
  List,
  Archive,
  Sparkles
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Logo } from './Logo';
import { ConfirmationModal } from './ConfirmationModal';

export const RightPanel: React.FC = () => {
  const {
    currentProject,
    selectedGenerationId,
    selectedEditId,
    selectGeneration,
    selectEdit,
    canvasImage,
    setCanvasImage,
    showHistory,
    setShowHistory,
    clearBrushStrokes,
  } = useAppStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'generation' | 'edit'>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; item: any | null }>({ isOpen: false, item: null });
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Get backend generations and loading state from useUserStore
  const { generations: backendGenerations, loading: isLoadingGenerations } = useUserStore();
  
  // Debug log to see what we're receiving
  React.useEffect(() => {
    console.log('[RightPanel] Backend generations from store:', backendGenerations);
    if (backendGenerations && backendGenerations.length > 0) {
      console.log('[RightPanel] First generation:', backendGenerations[0]);
    }
  }, [backendGenerations]);

  // Process backend generations to match the expected format and separate edits
  const { generations, edits } = React.useMemo(() => {
    console.log('[RightPanel] Processing generations, backend count:', backendGenerations?.length || 0);
    
    const processedGenerations: any[] = [];
    const processedEdits: any[] = [];
    
    // ONLY use backend data - no fallback to prevent stale data issues
    if (backendGenerations && Array.isArray(backendGenerations)) {
      backendGenerations.forEach((gen: any) => {
        // Determine the image URL
        let imageUrl: string | null = null;
        if (gen.imageUrl) {
          imageUrl = gen.imageUrl;
        } else if (gen.imageData) {
          imageUrl = gen.imageData.startsWith('data:') 
            ? gen.imageData 
            : `data:image/png;base64,${gen.imageData}`;
        }
        
        const item = {
          _id: gen._id,  // Keep original _id
          id: gen._id || gen.id,
          prompt: gen.prompt,
          instruction: gen.editInstruction || gen.prompt,
          timestamp: new Date(gen.createdAt).getTime(),
          imageUrl: imageUrl,  // Keep imageUrl for consistency
          outputAssets: imageUrl ? [{
            url: imageUrl
          }] : [],
          isEdit: gen.isEdit || false,
          maskData: gen.maskData || null
        };
        
        // Separate edits from generations based on isEdit flag
        if (gen.isEdit) {
          console.log('[RightPanel] Found edit:', item.id, item.instruction);
          processedEdits.push(item);
        } else {
          processedGenerations.push(item);
        }
      });
    }
    
    console.log('[RightPanel] Processed:', processedGenerations.length, 'generations,', processedEdits.length, 'edits');
    
    // Always return arrays, even if empty - no fallback to stale data
    return { 
      generations: processedGenerations,
      edits: processedEdits
    };
  }, [backendGenerations]); // Only depend on backendGenerations
  
  // Debug the processed generations and edits
  React.useEffect(() => {
    console.log('[RightPanel] Processed generations:', generations.length, 'edits:', edits.length);
    if (generations.length > 0) {
      console.log('[RightPanel] First generation:', generations[0]);
    }
    if (edits.length > 0) {
      console.log('[RightPanel] First edit:', edits[0]);
    }
  }, [generations, edits]);
  
  // Combine and sort all items by timestamp
  let allItems = [
    ...generations.map(g => ({ ...g, type: 'generation' as const })),
    ...edits.map(e => ({ ...e, type: 'edit' as const }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  // Apply filter
  if (filterType !== 'all') {
    allItems = allItems.filter(item => item.type === filterType);
  }

  const handleDownload = async (url: string, name: string) => {
    try {
      // Check if it's a data URL (base64)
      if (url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `codenex-${name}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For external URLs (like Cloudinary), fetch and convert to blob
        console.log('[RightPanel] Downloading from external URL:', url);
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `codenex-${name}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('[RightPanel] Download failed:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const handleSelectItem = (item: any) => {
    console.log('[Select] Selecting item:', item);
    
    // Get the correct ID for the item
    const itemId = item._id || item.id;
    console.log('[Select] Item ID:', itemId);
    
    // Get the image URL from the item (check multiple possible locations)
    const imageUrl = item.imageUrl || 
                    item.imageData || 
                    item.outputAssets?.[0]?.url;
    
    if (imageUrl) {
      console.log('[Select] Setting canvas image to:', imageUrl?.substring(0, 100));
      setCanvasImage(imageUrl);
    } else {
      console.log('[Select] No image URL found in item');
    }
    
    // Handle selection based on type
    // For now, assume all items from the backend are generations
    // since they don't have a type field
    console.log('[Select] Setting selectedGenerationId to:', itemId);
    selectGeneration(itemId);
    selectEdit(null); // Clear edit selection
  };

  const { user } = useAuth0();
  const { deleteGeneration, fetchGenerationHistory } = useUserStore();

  const handleDelete = (item: any) => {
    setDeleteConfirmation({ isOpen: true, item });
  };

  const confirmDelete = async () => {
    if (!user?.sub || !deleteConfirmation.item || isDeletingItem) return;
    
    const generationId = deleteConfirmation.item._id || deleteConfirmation.item.id;
    if (!generationId) {
      console.error('No generation ID found for item:', deleteConfirmation.item);
      return;
    }
    
    setIsDeletingItem(true);
    // Close modal immediately for instant feedback
    setDeleteConfirmation({ isOpen: false, item: null });
    
    try {
      // Get current canvas image value from store to avoid stale closure
      const currentCanvasImage = useAppStore.getState().canvasImage;
      const currentSelectedId = useAppStore.getState().selectedGenerationId;
      
      // Get the image URL from the item
      const itemImageUrl = deleteConfirmation.item.imageUrl || 
                          deleteConfirmation.item.imageData ||
                          deleteConfirmation.item.outputAssets?.[0]?.url;
      
      console.log('[Delete] === Canvas Clear Check ===');
      console.log('[Delete] Item being deleted:', {
        id: generationId,
        _id: deleteConfirmation.item._id,
        imageUrl: itemImageUrl?.substring(0, 100)
      });
      console.log('[Delete] Current canvas state:', {
        canvasImage: currentCanvasImage?.substring(0, 100),
        selectedGenerationId: currentSelectedId
      });
      console.log('[Delete] Full item:', deleteConfirmation.item);
      
      // Check if the deleted item's image is currently on the canvas
      let shouldClearCanvas = false;
      
      // Check URL matching - if the image on canvas matches the deleted item's image
      if (currentCanvasImage && itemImageUrl) {
        console.log('[Delete] Comparing URLs for canvas clearing...');
        
        // Direct comparison
        if (currentCanvasImage === itemImageUrl) {
          shouldClearCanvas = true;
          console.log('[Delete] Direct URL match found - will clear canvas');
        } 
        // Check if both are data URLs and compare the data part
        else if (currentCanvasImage.startsWith('data:') && itemImageUrl.startsWith('data:')) {
          // For data URLs, compare the actual data content
          const canvasData = currentCanvasImage.split(',')[1];
          const itemData = itemImageUrl.split(',')[1];
          if (canvasData && itemData && canvasData === itemData) {
            shouldClearCanvas = true;
            console.log('[Delete] Data URL content match found - will clear canvas');
          }
        }
        // Check for Cloudinary URL ID match
        else if (currentCanvasImage.includes('cloudinary') || itemImageUrl.includes('cloudinary')) {
          // Extract the public ID from Cloudinary URLs
          const extractCloudinaryId = (url: string) => {
            // Match pattern: /upload/vXXXX/generations/userId/publicId
            const match = url.match(/\/upload\/v\d+\/generations\/[^\/]+\/([^\/\.]+)/) ||
                         url.match(/\/upload\/v\d+\/([^\/\.]+)/) || 
                         url.match(/\/([^\/]+)\.(jpg|png|jpeg|webp)$/);
            return match?.[1];
          };
          
          const canvasId = extractCloudinaryId(currentCanvasImage);
          const itemId = extractCloudinaryId(itemImageUrl);
          
          console.log('[Delete] Extracted Cloudinary IDs - Canvas:', canvasId, 'Item:', itemId);
          
          if (canvasId && itemId && canvasId === itemId) {
            shouldClearCanvas = true;
            console.log('[Delete] Cloudinary ID match found - will clear canvas');
          }
        }
      }
      
      // Also check if this is the selected item (as backup check)
      if (!shouldClearCanvas) {
        if (currentSelectedId === generationId || 
            currentSelectedId === deleteConfirmation.item._id) {
          shouldClearCanvas = true;
          console.log('[Delete] Item is currently selected - will clear canvas');
        }
      }
      
      // Clear canvas BEFORE deleting from database
      if (shouldClearCanvas) {
        console.log('[Delete] Clearing canvas now...');
        setCanvasImage(null);
        selectGeneration(null);
        selectEdit(null);
        clearBrushStrokes();
      } else {
        console.log('[Delete] Canvas will not be cleared - different image');
      }
      
      // Clear selection if the deleted item is selected
      if (selectedGenerationId === generationId || 
          selectedGenerationId === deleteConfirmation.item._id ||
          selectedEditId === generationId || 
          selectedEditId === deleteConfirmation.item._id) {
        selectGeneration(null);
        selectEdit(null);
      }
      
      // Now delete from database (with optimistic updates)
      await deleteGeneration(generationId, user.sub);
      console.log('[Delete] Generation deleted successfully');
      
      // Modal already closed at the beginning for instant feedback
    } catch (error) {
      console.error('[Delete] Failed to delete generation:', error);
      // Modal already closed
    } finally {
      setIsDeletingItem(false);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-14 h-full bg-gray-900/95 backdrop-blur-xl border-l border-white/5 flex flex-col relative z-20">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-4 hover:bg-white/5 transition-colors"
          title="Expand History"
        >
          <Clock className="h-5 w-5 text-gray-400" />
        </button>
        
        {allItems.length > 0 && (
          <div className="flex flex-col items-center mt-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-500/20 to-green-500/20 flex items-center justify-center">
              <span className="text-xs text-gray-300 font-medium">{allItems.length}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-gray-900/95 backdrop-blur-xl border-l border-white/5 flex flex-col relative z-20">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-accent-500/5 pointer-events-none" />
      
      {/* Header */}
      <div className="relative p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-accent-400 to-green-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-100">History</h2>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            title="Collapse Panel"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-2">
          {/* Filter Buttons */}
          <div className="flex-1 flex rounded-xl bg-black/20 p-0.5">
            {[
              { id: 'all', label: 'All', count: allItems.length },
              { id: 'generation', label: 'Generated', count: generations.length },
              { id: 'edit', label: 'Edited', count: edits.length }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterType(filter.id as any)}
                className={cn(
                  "flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all relative",
                  filterType === filter.id
                    ? "bg-gradient-to-r from-accent-500/20 to-green-500/20 text-white"
                    : "text-gray-400 hover:text-gray-300"
                )}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className="ml-1 text-[10px] opacity-60">({filter.count})</span>
                )}
              </button>
            ))}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex rounded-xl bg-black/20 p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === 'grid'
                  ? "bg-white/10 text-gray-200"
                  : "text-gray-500 hover:text-gray-400"
              )}
              title="Grid View"
            >
              <Grid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === 'list'
                  ? "bg-white/10 text-gray-200"
                  : "text-gray-500 hover:text-gray-400"
              )}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto relative">
        {allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
              <Sparkles className="h-8 w-8 text-gray-600" />
            </div>
            <p className="text-sm text-gray-400 text-center font-medium">No creations yet</p>
            <p className="text-xs text-gray-500 text-center mt-1">
              {filterType === 'all' 
                ? 'Start generating to see your history'
                : `No ${filterType === 'generation' ? 'generated' : 'edited'} images`}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          // Grid View
          <div className="grid grid-cols-2 gap-3 p-4">
            {allItems.map((item, index) => {
              const itemId = item._id || item.id;
              const isSelected = selectedGenerationId === itemId || selectedEditId === itemId;
              
              return (
                <div
                  key={itemId}
                  className={cn(
                    "group relative rounded-xl overflow-hidden cursor-pointer transition-all border",
                    isSelected
                      ? "border-accent-500/50 shadow-lg shadow-accent-500/20 scale-[0.98]"
                      : "border-white/5 hover:border-white/10 hover:shadow-lg"
                  )}
                  onClick={() => handleSelectItem(item)}
                >
                  {/* Image */}
                  <div className="aspect-square bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                    {(item.imageUrl || item.imageData || item.outputAssets?.[0]?.url) ? (
                      <img
                        src={item.imageUrl || item.imageData || item.outputAssets[0].url}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-accent-400 border-t-transparent" />
                      </div>
                    )}
                  </div>
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          item.type === 'generation' 
                            ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400" 
                            : "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400"
                        )}>
                          {item.type === 'generation' ? 'GEN' : 'EDIT'}
                        </span>
                        <span className="text-[10px] text-gray-400">#{allItems.length - index}</span>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const imageUrl = item.imageUrl || item.imageData || item.outputAssets?.[0]?.url;
                            setPreviewImage(imageUrl || null);
                          }}
                          className="flex-1 p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-gray-300 hover:text-white transition-all"
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5 mx-auto" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const imageUrl = item.imageUrl || item.imageData || item.outputAssets?.[0]?.url;
                            if (imageUrl) {
                              handleDownload(imageUrl, item.type);
                            }
                          }}
                          className="flex-1 p-1.5 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-gray-300 hover:text-white transition-all"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5 mx-auto" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          className="flex-1 p-1.5 bg-white/10 hover:bg-red-500/20 backdrop-blur rounded-lg text-gray-300 hover:text-red-400 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5 mx-auto" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-2 h-2 rounded-full bg-accent-400 animate-ping" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-accent-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // List View
          <div className="p-4 space-y-2">
            {allItems.map((item, index) => {
              const itemId = item._id || item.id;
              const isSelected = selectedGenerationId === itemId || selectedEditId === itemId;
              
              return (
                <div
                  key={itemId}
                  className={cn(
                    "group flex items-center space-x-3 p-2.5 rounded-xl cursor-pointer transition-all border",
                    isSelected
                      ? "bg-gradient-to-r from-accent-500/10 to-green-500/10 border-accent-500/30"
                      : "hover:bg-white/[0.02] border-white/5 hover:border-white/10"
                  )}
                  onClick={() => handleSelectItem(item)}
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-gray-800/50 to-gray-900/50 flex-shrink-0 border border-white/5">
                    {(item.imageUrl || item.imageData || item.outputAssets?.[0]?.url) ? (
                      <img
                        src={item.imageUrl || item.imageData || item.outputAssets[0].url}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-400 border-t-transparent" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                        item.type === 'generation' 
                          ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400" 
                          : "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400"
                      )}>
                        {item.type === 'generation' ? 'Generated' : 'Edited'}
                      </span>
                      <span className="text-[10px] text-gray-500">#{allItems.length - index}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {item.type === 'generation' ? item.prompt : item.instruction}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const imageUrl = item.imageUrl || item.imageData || item.outputAssets?.[0]?.url;
                        setPreviewImage(imageUrl || null);
                      }}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-all"
                      title="Preview"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const imageUrl = item.imageUrl || item.imageData || item.outputAssets?.[0]?.url;
                        if (imageUrl) {
                          handleDownload(imageUrl, item.type);
                        }
                      }}
                      className="p-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-gray-300 transition-all"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item);
                      }}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-5xl max-h-full">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-auto h-auto max-w-full max-h-full rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg flex items-center space-x-2 text-gray-300 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
              <span className="text-sm">Close</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, item: null })}
        onConfirm={confirmDelete}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone and will remove the image from your history permanently."
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
    </div>
  );
};