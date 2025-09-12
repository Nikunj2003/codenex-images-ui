import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { useUserStore } from '../store/useUserStore';
import { Button } from './ui/Button';
import { History, Download, Image as ImageIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { ImagePreviewModal } from './ImagePreviewModal';
import { Logo } from './Logo';

export const HistoryPanel: React.FC = () => {
  const {
    currentProject,
    canvasImage,
    selectedGenerationId,
    selectedEditId,
    selectGeneration,
    selectEdit,
    showHistory,
    setShowHistory,
    setCanvasImage,
    selectedTool
  } = useAppStore();
  
  const { generations: backendGenerations } = useUserStore();
  
  // Debug log to see what data we're getting
  React.useEffect(() => {
    console.log('[HistoryPanel] Received backendGenerations from store:', backendGenerations);
    if (backendGenerations.length > 0) {
      console.log('[HistoryPanel] First generation raw data:', backendGenerations[0]);
    }
  }, [backendGenerations]);

  const [previewModal, setPreviewModal] = React.useState<{
    open: boolean;
    imageUrl: string;
    title: string;
    description?: string;
  }>({
    open: false,
    imageUrl: '',
    title: '',
    description: ''
  });

  // Combine local and backend generations
  const localGenerations = currentProject?.generations || [];
  const edits = currentProject?.edits || [];
  
  // Use backend generations if available, otherwise use local
  const generations = React.useMemo(() => {
    console.log('[HistoryPanel] Backend generations count:', backendGenerations.length);
    console.log('[HistoryPanel] Local generations count:', localGenerations.length);
    
    if (backendGenerations.length > 0) {
      console.log('[HistoryPanel] Using backend generations');
      console.log('[HistoryPanel] First backend generation:', backendGenerations[0]);
      
      return backendGenerations.map((gen: any) => {
        // Determine the image URL - prefer imageUrl over imageData
        let imageUrl: string | null = null;
        if (gen.imageUrl) {
          imageUrl = gen.imageUrl;
        } else if (gen.imageData) {
          // Handle base64 data
          if (gen.imageData.startsWith('data:')) {
            imageUrl = gen.imageData;
          } else {
            imageUrl = `data:image/png;base64,${gen.imageData}`;
          }
        }
        
        console.log('[HistoryPanel] Processing generation:', {
          id: gen._id,
          hasImageUrl: !!gen.imageUrl,
          hasImageData: !!gen.imageData,
          finalImageUrl: imageUrl
        });
        
        return {
          id: gen._id || gen.id,
          prompt: gen.prompt,
          imageUrl,
          timestamp: new Date(gen.createdAt).getTime(),
          settings: gen.settings || {},
          modelVersion: gen.metadata?.model || 'gemini-2.5-flash-image-preview',
          parameters: {
            seed: gen.settings?.seed
          },
          sourceAssets: gen.settings?.referenceImages ? 
            gen.settings.referenceImages.map((img: string, idx: number) => ({
              id: `ref-${idx}`,
              url: img.startsWith('data:') ? img : `data:image/png;base64,${img}`
            })) : [],
          outputAssets: imageUrl ? [{
            url: imageUrl
          }] : []
        };
      });
    }
    console.log('[HistoryPanel] Using local generations');
    return localGenerations;
  }, [backendGenerations, localGenerations]);
  
  console.log('[HistoryPanel] Final generations count:', generations.length);
  console.log('[HistoryPanel] showHistory:', showHistory);
  if (generations.length > 0) {
    console.log('[HistoryPanel] First generation structure:', {
      id: generations[0].id,
      hasOutputAssets: !!generations[0].outputAssets,
      outputAssetsLength: generations[0].outputAssets?.length,
      firstAssetUrl: generations[0].outputAssets?.[0]?.url
    });
  }

  // Get current image dimensions
  const [imageDimensions, setImageDimensions] = React.useState<{ width: number; height: number } | null>(null);
  
  React.useEffect(() => {
    if (canvasImage) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = canvasImage;
    } else {
      setImageDimensions(null);
    }
  }, [canvasImage]);

  if (!showHistory) {
    return (
      <div className="w-8 bg-gray-950 border-l border-gray-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowHistory(true)}
          className="w-6 h-16 bg-gray-800 hover:bg-gray-700 rounded-l-lg border border-r-0 border-gray-700 flex items-center justify-center transition-colors group"
          title="Show History Panel"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900/50 backdrop-blur-xl border-l border-gray-800/30 p-6 flex flex-col h-full relative">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-codenex-600/5 via-transparent to-accent-600/5 pointer-events-none" />
      
      {/* Modern Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-br from-accent-500/20 to-codenex-500/20 rounded-lg">
            <History className="h-4 w-4 text-accent-400" />
          </div>
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">History</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowHistory(!showHistory)}
          className="h-6 w-6"
          title="Hide History Panel"
        >
          ×
        </Button>
      </div>

      {/* Modern Variants Section */}
      <div className="mb-6 flex-shrink-0 relative z-10">
        <h4 className="text-xs font-bold text-gray-300 mb-3 uppercase tracking-wider">Variants</h4>
        {generations.length === 0 && edits.length === 0 ? (
          <div className="text-center py-8 bg-gray-800/30 backdrop-blur-sm rounded-xl border border-gray-700/30">
            <Logo size="sm" className="mx-auto mb-3 opacity-50" />
            <p className="text-sm text-gray-500">No generations yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Show generations */}
            {generations.slice(-2).map((generation, index) => (
              <div
                key={generation.id}
                className={cn(
                  'relative aspect-square rounded-xl border-2 cursor-pointer transition-all duration-300 overflow-hidden group',
                  selectedGenerationId === generation.id
                    ? 'border-accent-400 shadow-xl shadow-accent-400/30 scale-[1.02]'
                    : 'border-gray-700/50 hover:border-gray-600 hover:shadow-lg'
                )}
                onClick={() => {
                  selectGeneration(generation.id);
                  if (generation.outputAssets && generation.outputAssets[0]?.url) {
                    setCanvasImage(generation.outputAssets[0].url);
                  }
                }}
              >
                {generation.outputAssets && generation.outputAssets.length > 0 && generation.outputAssets[0]?.url ? (
                  <>
                    <img
                      src={generation.outputAssets[0].url}
                      alt="Generated variant"
                      className="w-full h-full object-cover"
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-400" />
                  </div>
                )}
                
                {/* Variant Number */}
                <div className="absolute top-2 left-2 bg-gray-900/80 text-xs px-2 py-1 rounded">
                  #{index + 1}
                </div>
              </div>
            ))}
            
            {/* Show edits */}
            {edits.slice(-2).map((edit, index) => (
              <div
                key={edit.id}
                className={cn(
                  'relative aspect-square rounded-lg border-2 cursor-pointer transition-all duration-200 overflow-hidden',
                  selectedEditId === edit.id
                    ? 'border-accent-400 shadow-lg shadow-accent-400/20'
                    : 'border-gray-700 hover:border-gray-600'
                )}
                onClick={() => {
                  if (edit.outputAssets[0]) {
                    setCanvasImage(edit.outputAssets[0].url);
                    selectEdit(edit.id);
                    selectGeneration(null);
                  }
                }}
              >
                {edit.outputAssets[0] ? (
                  <img
                    src={edit.outputAssets[0].url}
                    alt="Edited variant"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-400" />
                  </div>
                )}
                
                {/* Edit Label */}
                <div className="absolute top-2 left-2 bg-purple-900/80 text-xs px-2 py-1 rounded">
                  Edit #{index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Image Info */}
      {(canvasImage || imageDimensions) && (
        <div className="mb-4 p-3 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-xs font-medium text-gray-400 mb-2">Current Image</h4>
          <div className="space-y-1 text-xs text-gray-500">
            {imageDimensions && (
              <div className="flex justify-between">
                <span>Dimensions:</span>
                <span className="text-gray-300">{imageDimensions.width} × {imageDimensions.height}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Mode:</span>
              <span className="text-gray-300 capitalize">{selectedTool}</span>
            </div>
          </div>
        </div>
      )}

      {/* Generation Details */}
      <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700 flex-1 overflow-y-auto min-h-0">
        <h4 className="text-xs font-medium text-gray-400 mb-2">Generation Details</h4>
        {(() => {
          const gen = generations.find(g => g.id === selectedGenerationId);
          const selectedEdit = edits.find(e => e.id === selectedEditId);
          
          if (gen) {
            return (
              <div className="space-y-3">
                <div className="space-y-2 text-xs text-gray-500">
                  <div>
                    <span className="text-gray-400">Prompt:</span>
                    <p className="text-gray-300 mt-1">{gen.prompt}</p>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span>{gen.modelVersion}</span>
                  </div>
                  {gen.parameters.seed && (
                    <div className="flex justify-between">
                      <span>Seed:</span>
                      <span>{gen.parameters.seed}</span>
                    </div>
                  )}
                </div>
                
                {/* Reference Images */}
                {gen.sourceAssets.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Reference Images</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {gen.sourceAssets.map((asset, index) => (
                        <button
                          key={asset.id}
                          onClick={() => setPreviewModal({
                            open: true,
                            imageUrl: asset.url,
                            title: `Reference Image ${index + 1}`,
                            description: 'This reference image was used to guide the generation'
                          })}
                          className="relative aspect-square rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                        >
                          <img
                            src={asset.url}
                            alt={`Reference ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-1 py-0.5 rounded text-gray-300">
                            Ref {index + 1}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          } else if (selectedEdit) {
            const parentGen = generations.find(g => g.id === selectedEdit.parentGenerationId);
            return (
              <div className="space-y-3">
                <div className="space-y-2 text-xs text-gray-500">
                  <div>
                    <span className="text-gray-400">Edit Instruction:</span>
                    <p className="text-gray-300 mt-1">{selectedEdit.instruction}</p>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span>Image Edit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(selectedEdit.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {selectedEdit.maskAssetId && (
                    <div className="flex justify-between">
                      <span>Mask:</span>
                      <span className="text-purple-400">Applied</span>
                    </div>
                  )}
                </div>
                
                {/* Parent Generation Reference */}
                {parentGen && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Original Image</h5>
                    <button
                      onClick={() => setPreviewModal({
                        open: true,
                        imageUrl: parentGen.outputAssets[0]?.url || '',
                        title: 'Original Image',
                        description: 'The base image that was edited'
                      })}
                      className="relative aspect-square w-16 rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={parentGen.outputAssets[0]?.url}
                        alt="Original"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  </div>
                )}
                
                {/* Mask Visualization */}
                {selectedEdit.maskReferenceAsset && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Masked Reference</h5>
                    <button
                      onClick={() => setPreviewModal({
                        open: true,
                        imageUrl: selectedEdit.maskReferenceAsset!.url,
                        title: 'Masked Reference Image',
                        description: 'This image with mask overlay was sent to the AI model to guide the edit'
                      })}
                      className="relative aspect-square w-16 rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={selectedEdit.maskReferenceAsset.url}
                        alt="Masked reference"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 left-1 bg-purple-900/80 text-xs px-1 py-0.5 rounded text-purple-300">
                        Mask
                      </div>
                    </button>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div className="space-y-2 text-xs text-gray-500">
                <p className="text-gray-400">Select a generation or edit to view details</p>
              </div>
            );
          }
        })()}
      </div>

      {/* Actions */}
      <div className="space-y-3 flex-shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={async () => {
            // Find the currently displayed image (either generation or edit)
            let imageUrl: string | null = null;
            
            if (selectedGenerationId) {
              const gen = generations.find(g => g.id === selectedGenerationId);
              imageUrl = gen?.outputAssets[0]?.url || null;
            } else {
              // If no generation selected, try to get the current canvas image
              const { canvasImage } = useAppStore.getState();
              imageUrl = canvasImage;
            }
            
            if (imageUrl) {
              try {
                // Handle both data URLs and regular URLs
                if (imageUrl.startsWith('data:')) {
                  const link = document.createElement('a');
                  link.href = imageUrl;
                  link.download = `codenex-${Date.now()}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  // For external URLs, fetch and convert to blob
                  console.log('[HistoryPanel] Downloading from external URL:', imageUrl);
                  const response = await fetch(imageUrl);
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
                console.error('[HistoryPanel] Download failed:', error);
                // Fallback: open in new tab
                window.open(imageUrl, '_blank');
              }
            }
          }}
          disabled={!selectedGenerationId && !useAppStore.getState().canvasImage}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
      
      {/* Image Preview Modal */}
      <ImagePreviewModal
        open={previewModal.open}
        onOpenChange={(open) => setPreviewModal(prev => ({ ...prev, open }))}
        imageUrl={previewModal.imageUrl}
        title={previewModal.title}
        description={previewModal.description}
      />
    </div>
  );
};