import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  Wand2, 
  Edit3, 
  MousePointer, 
  Upload, 
  HelpCircle, 
  Menu,
  X,
  Settings,
  Sliders,
  Image,
  FileImage,
  Sparkles,
  Palette,
  Layers,
  ChevronDown,
  Zap,
  Brain,
  Brush,
} from 'lucide-react';
import { Button } from './ui/Button';
import { Textarea } from './ui/Textarea';
import { cn } from '../utils/cn';
import { PromptHints } from './PromptHints';
import { useImageGeneration, useImageEditing } from '../hooks/useImageGeneration';

export const Sidebar: React.FC = () => {
  const {
    currentPrompt,
    setCurrentPrompt,
    temperature,
    setTemperature,
    seed,
    setSeed,
    selectedTool,
    setSelectedTool,
    uploadedImages,
    addUploadedImage,
    removeUploadedImage,
    clearUploadedImages,
    editReferenceImages,
    addEditReferenceImage,
    removeEditReferenceImage,
    clearEditReferenceImages,
    brushSize,
    setBrushSize,
    clearBrushStrokes,
    canvasImage,
    setCanvasImage,
    showPromptPanel,
    setShowPromptPanel,
    aspectRatio,
    setAspectRatio,
    imageSize,
    setImageSize,
  } = useAppStore();

  const { generate, isGenerating } = useImageGeneration();
  const { edit, isEditing } = useImageEditing();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showHintsModal, setShowHintsModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['prompt', 'upload'])
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    if (selectedTool === 'generate') {
      generate({
        prompt: currentPrompt,
        referenceImages: uploadedImages,
        temperature,
        seed,
        aspectRatio,
        size: imageSize,
      });
    } else if (selectedTool === 'edit' || selectedTool === 'mask') {
      edit(currentPrompt);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (selectedTool === 'generate') {
          addUploadedImage(base64);
        } else if (selectedTool === 'edit') {
          if (!canvasImage) {
            setCanvasImage(base64);
          } else {
            addEditReferenceImage(base64);
          }
        } else if (selectedTool === 'mask') {
          setCanvasImage(base64);
        }
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const tools = [
    { id: 'generate', icon: Sparkles, label: 'Generate', color: 'from-green-500 to-emerald-500' },
    { id: 'edit', icon: Edit3, label: 'Edit', color: 'from-blue-500 to-cyan-500' },
    { id: 'mask', icon: Layers, label: 'Mask', color: 'from-teal-500 to-cyan-500' },
  ] as const;
  

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  if (isCollapsed) {
    return (
      <>
        {/* Collapsed Sidebar */}
        <div className="w-14 h-full bg-gray-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col relative z-20">
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-4 hover:bg-white/5 transition-colors"
            title="Expand Sidebar"
          >
            <Menu className="h-5 w-5 text-gray-400" />
          </button>
          
          <div className="flex-1 flex flex-col items-center py-4 space-y-2">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className={cn(
                  "p-2.5 rounded-xl transition-all relative group",
                  selectedTool === tool.id
                    ? "bg-gradient-to-br " + tool.color + " text-white shadow-lg"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                )}
                title={tool.label}
              >
                <tool.icon className="h-4 w-4" />
                {selectedTool === tool.id && (
                  <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="w-80 h-full bg-gray-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col relative z-20">
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 via-transparent to-green-500/5 pointer-events-none" />
      
      {/* Header */}
      <div className="relative p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-accent-400 to-green-400 animate-pulse" />
            <h2 className="text-sm font-semibold text-gray-100">Creation Tools</h2>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
            title="Collapse Sidebar"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        
        {/* Tool Selection */}
        <div className="grid grid-cols-3 gap-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={cn(
                "relative p-3 rounded-xl border transition-all duration-300 group overflow-hidden",
                selectedTool === tool.id
                  ? "border-white/20 shadow-lg"
                  : "border-white/5 hover:border-white/10"
              )}
            >
              {selectedTool === tool.id && (
                <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-10`} />
              )}
              <div className="relative flex flex-col items-center space-y-1">
                <tool.icon className={cn(
                  "h-4 w-4 transition-all",
                  selectedTool === tool.id 
                    ? "text-white scale-110" 
                    : "text-gray-400 group-hover:text-gray-300"
                )} />
                <span className={cn(
                  "text-[10px] font-medium",
                  selectedTool === tool.id ? "text-white" : "text-gray-500"
                )}>
                  {tool.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Content Sections */}
      <div className="flex-1 overflow-y-auto relative">
        {/* Prompt Section */}
        {
        <div className="border-b border-white/5">
          <button
            onClick={() => toggleSection('prompt')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-200">
                {selectedTool === 'generate' ? 'Prompt' : 'Instructions'}
              </span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-gray-500 transition-transform",
              expandedSections.has('prompt') ? "rotate-180" : ""
            )} />
          </button>
          
          {expandedSections.has('prompt') && (
            <div className="px-4 pb-4">
              <div className="relative">
                <Textarea
                  value={currentPrompt}
                  onChange={(e) => setCurrentPrompt(e.target.value)}
                  placeholder={
                    selectedTool === 'generate'
                      ? "Describe what you want to create..."
                      : "Describe your changes..."
                  }
                  className="min-h-[120px] resize-none bg-black/20 border-white/10 focus:border-accent-500/50 text-sm text-gray-200 placeholder-gray-500"
                />
                <div className="absolute bottom-2 right-2">
                  <button
                    onClick={() => setShowHintsModal(true)}
                    className="text-gray-500 hover:text-accent-400 transition-colors"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              
              <div className="mt-2 flex items-center space-x-2">
                <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-300",
                      currentPrompt.length > 50 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                      currentPrompt.length > 20 ? "bg-gradient-to-r from-amber-500 to-orange-500" : 
                      "bg-gray-700"
                    )}
                    style={{ width: `${Math.min(100, (currentPrompt.length / 200) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500">
                  {currentPrompt.length} chars
                </span>
              </div>
            </div>
          )}
        </div>
        }

        {/* Upload Section - Show for all modes */}
        <div className="border-b border-white/5">
          <button
            onClick={() => toggleSection('upload')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Image className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-200">
                {selectedTool === 'generate' ? 'References' : 'Source Image'}
              </span>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-gray-500 transition-transform",
              expandedSections.has('upload') ? "rotate-180" : ""
            )} />
          </button>
          
          {expandedSections.has('upload') && (
            <div className="px-4 pb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-white/5 text-gray-300 hover:border-white/10 transition-all flex items-center justify-center space-x-2 group"
                disabled={
                  (selectedTool === 'generate' && uploadedImages.length >= 2) ||
                  (selectedTool === 'edit' && editReferenceImages.length >= 2)
                }
              >
                <Upload className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Choose Image</span>
              </button>
              
              {/* Image Previews */}
              {((selectedTool === 'generate' && uploadedImages.length > 0) || 
                (selectedTool === 'edit' && editReferenceImages.length > 0)) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(selectedTool === 'generate' ? uploadedImages : editReferenceImages).map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Reference ${index + 1}`}
                        className="w-full h-20 object-cover rounded-lg border border-white/5"
                      />
                      <button
                        onClick={() => selectedTool === 'generate' ? removeUploadedImage(index) : removeEditReferenceImage(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Section */}
        {selectedTool === 'mask' ? (
          <div className="border-b border-white/5">
            <button
              onClick={() => toggleSection('brush')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Brush className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-200">Brush Settings</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                expandedSections.has('brush') ? "rotate-180" : ""
              )} />
            </button>
            
            {expandedSections.has('brush') && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Size</span>
                    <span className="text-xs font-medium text-accent-400">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-accent-500"
                  />
                </div>
                
                <button
                  onClick={clearBrushStrokes}
                  className="w-full py-2 rounded-lg bg-black/20 border border-white/5 text-gray-400 hover:text-gray-300 hover:border-white/10 transition-all text-sm"
                >
                  Clear Mask
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="border-b border-white/5">
            <button
              onClick={() => toggleSection('settings')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Sliders className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-200">Advanced</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-gray-500 transition-transform",
                expandedSections.has('settings') ? "rotate-180" : ""
              )} />
            </button>
            
            {expandedSections.has('settings') && (
              <div className="px-4 pb-4 space-y-3">
                {selectedTool === 'generate' && (
                  <>
                    {/* Aspect Ratio */}
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Aspect Ratio</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: '1:1', label: '1:1' },
                          { value: '16:9', label: '16:9' },
                          { value: '9:16', label: '9:16' },
                          { value: '4:3', label: '4:3' },
                          { value: '3:4', label: '3:4' },
                          { value: '21:9', label: '21:9' },
                        ].map((ratio) => (
                          <button
                            key={ratio.value}
                            onClick={() => setAspectRatio(ratio.value)}
                            className={cn(
                              "px-2 py-1.5 rounded-lg text-xs font-medium transition-all border",
                              aspectRatio === ratio.value
                                ? "bg-gradient-to-r from-accent-500/20 to-green-500/20 border-accent-500/30 text-white"
                                : "bg-black/20 border-white/5 text-gray-400 hover:text-gray-300 hover:border-white/10"
                            )}
                          >
                            {ratio.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Image Size */}
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">Image Size</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'small', label: 'Small', desc: '512px' },
                          { value: 'medium', label: 'Medium', desc: '768px' },
                          { value: 'large', label: 'Large', desc: '1024px' },
                          { value: 'xlarge', label: 'XL', desc: '1536px' },
                        ].map((size) => (
                          <button
                            key={size.value}
                            onClick={() => setImageSize(size.value)}
                            className={cn(
                              "px-3 py-2 rounded-lg text-xs transition-all border flex flex-col",
                              imageSize === size.value
                                ? "bg-gradient-to-r from-accent-500/20 to-green-500/20 border-accent-500/30 text-white"
                                : "bg-black/20 border-white/5 text-gray-400 hover:text-gray-300 hover:border-white/10"
                            )}
                          >
                            <span className="font-medium">{size.label}</span>
                            <span className="text-[10px] opacity-60 mt-0.5">{size.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Creativity</span>
                    <span className="text-xs font-medium text-accent-400">{temperature.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-accent-500"
                  />
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Seed</label>
                  <input
                    type="number"
                    value={seed || ''}
                    onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Random"
                    className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-sm text-gray-200 focus:border-accent-500/50 focus:outline-none placeholder-gray-600"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Generate Button */}
      <div className="relative p-4 border-t border-white/5">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || isEditing || !currentPrompt.trim()}
          className={cn(
            "w-full h-12 text-sm font-medium relative overflow-hidden group",
            "bg-gradient-to-r from-accent-500 to-green-500 hover:from-accent-600 hover:to-green-600",
            "disabled:from-gray-700 disabled:to-gray-600 disabled:opacity-50"
          )}
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <div className="relative flex items-center justify-center">
            {isGenerating || isEditing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {selectedTool === 'generate' ? 'Generate' : 'Apply Edit'}
              </>
            )}
          </div>
        </Button>
      </div>
      
      <PromptHints open={showHintsModal} onOpenChange={setShowHintsModal} />
    </div>
  );
};