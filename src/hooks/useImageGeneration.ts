import { useMutation } from '@tanstack/react-query';
import { geminiService, GenerationRequest, EditRequest } from '../services/geminiService';
import { useAppStore } from '../store/useAppStore';
import { generateId } from '../utils/imageUtils';
import { Generation, Edit, Asset } from '../types';

// Helper function to calculate dimensions based on aspect ratio and size
const calculateDimensions = (aspectRatio: string, size: 'small' | 'medium' | 'large' | 'xlarge' | string): { width: number; height: number } => {
  // Base sizes for different presets
  const baseSizes = {
    small: 512,
    medium: 768,
    large: 1024,
    xlarge: 1536,
  };
  
  const baseSize = baseSizes[size as keyof typeof baseSizes] || baseSizes.large;
  
  // Parse aspect ratio
  const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
  
  if (!widthRatio || !heightRatio) {
    return { width: baseSize, height: baseSize };
  }
  
  // Calculate dimensions maintaining aspect ratio
  if (widthRatio === heightRatio) {
    return { width: baseSize, height: baseSize };
  } else if (widthRatio > heightRatio) {
    // Landscape
    const width = baseSize;
    const height = Math.round((baseSize * heightRatio) / widthRatio);
    return { width, height };
  } else {
    // Portrait
    const height = baseSize;
    const width = Math.round((baseSize * widthRatio) / heightRatio);
    return { width, height };
  }
};

// Helper function to resize/crop image to target dimensions
const resizeImage = async (base64Image: string, targetWidth: number, targetHeight: number): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // If the image is already the correct size, return it as-is
      if (img.width === targetWidth && img.height === targetHeight) {
        resolve(base64Image);
        return;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      
      // Fill with a dark background first to avoid white/transparent areas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
      
      // Calculate scaling to cover the entire canvas (no borders)
      const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      // Center the scaled image (this will crop edges if needed)
      const x = (targetWidth - scaledWidth) / 2;
      const y = (targetHeight - scaledHeight) / 2;
      
      // Enable high quality image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw the image scaled and centered (this will crop edges if needed)
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      
      // Convert to JPEG to avoid transparency issues (PNG transparent areas can appear white)
      const resizedBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
      resolve(resizedBase64);
    };
    
    img.src = `data:image/png;base64,${base64Image}`;
  });
};

export const useImageGeneration = () => {
  const { addGeneration, setIsGenerating, setCanvasImage, setCurrentProject, currentProject, setShowLimitExceededModal } = useAppStore();

  const generateMutation = useMutation({
    mutationFn: async (request: GenerationRequest & { aspectRatio?: string; size?: string }) => {
      // Calculate dimensions based on aspect ratio and size
      const dimensions = calculateDimensions(request.aspectRatio || '1:1', request.size || 'large');
      
      console.log('[useImageGeneration] Generating with settings:', {
        aspectRatio: request.aspectRatio,
        size: request.size,
        calculatedDimensions: dimensions,
        temperature: request.temperature,
        seed: request.seed
      });
      
      // Generate the image with dimension hints in the prompt
      const images = await geminiService.generateImage({
        ...request,
        width: dimensions.width,
        height: dimensions.height,
      });
      
      // Don't resize images - let Gemini generate them at the correct size
      // Resizing can introduce borders or artifacts
      let processedImages = images;
      
      return { images: processedImages, dimensions, aspectRatio: request.aspectRatio, size: request.size };
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: ({ images, dimensions, aspectRatio, size }, request) => {
      if (images.length > 0) {
        const outputAssets: Asset[] = images.map((base64) => ({
          id: generateId(),
          type: 'output',
          url: `data:image/png;base64,${base64}`,
          mime: 'image/png',
          width: dimensions.width,
          height: dimensions.height,
          checksum: base64.slice(0, 32) // Simple checksum
        }));

        const generation: Generation = {
          id: generateId(),
          prompt: request.prompt,
          parameters: {
            seed: request.seed,
            temperature: request.temperature,
            aspectRatio: aspectRatio || '1:1',
            width: dimensions.width,
            height: dimensions.height
          },
          sourceAssets: request.referenceImages ? request.referenceImages.map((img) => ({
            id: generateId(),
            type: 'original' as const,
            url: img.includes('base64,') ? img : `data:image/png;base64,${img}`,
            mime: 'image/png',
            width: 1024,
            height: 1024,
            checksum: img.slice(0, 32)
          })) : [],
          outputAssets,
          modelVersion: 'gemini-2.5-flash-image-preview',
          timestamp: Date.now()
        };

        // Create project if none exists
        if (!currentProject) {
          const newProject = {
            id: generateId(),
            title: 'Untitled Project',
            generations: [generation],
            edits: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          setCurrentProject(newProject);
        } else {
          // Add generation to existing project
          addGeneration(generation);
        }
        
        setCanvasImage(outputAssets[0].url);
      }
      setIsGenerating(false);
    },
    onError: (error: any) => {
      console.error('Generation failed:', error);
      setIsGenerating(false);
      
      // Check if error is due to limit exceeded
      if (error?.message?.toLowerCase().includes('limit') || 
          error?.message?.toLowerCase().includes('exceeded')) {
        setShowLimitExceededModal(true);
      }
    }
  });

  return {
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    error: generateMutation.error
  };
};

export const useImageEditing = () => {
  const { 
    addEdit, 
    setIsGenerating, 
    setCanvasImage, 
    canvasImage, 
    editReferenceImages,
    uploadedImages,
    brushStrokes,
    selectedGenerationId,
    currentProject,
    setCurrentProject,
    seed,
    temperature,
    setShowLimitExceededModal 
  } = useAppStore();

  const editMutation = useMutation({
    mutationFn: async (instruction: string) => {
      // Always use canvas image as primary target if available, otherwise use first uploaded image
      const sourceImage = canvasImage || uploadedImages[0];
      if (!sourceImage) throw new Error('No image to edit');
      
      // Convert image to base64 - handle both data URLs and external URLs
      let base64Image: string;
      
      if (sourceImage.includes('base64,')) {
        // It's already a base64 data URL
        base64Image = sourceImage.split('base64,')[1];
      } else if (sourceImage.startsWith('http')) {
        // It's an external URL (like Cloudinary), need to fetch and convert
        console.log('[useImageEditing] Fetching external image for editing:', sourceImage);
        try {
          const response = await fetch(sourceImage);
          const blob = await response.blob();
          
          // Convert blob to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              const base64 = dataUrl.split('base64,')[1];
              resolve(base64);
            };
            reader.onerror = reject;
          });
          reader.readAsDataURL(blob);
          base64Image = await base64Promise;
        } catch (error) {
          console.error('[useImageEditing] Failed to fetch external image:', error);
          throw new Error('Failed to load image for editing');
        }
      } else {
        // Assume it's already base64 without the data URL prefix
        base64Image = sourceImage;
      }
      
      // Get reference images for style guidance
      let referenceImages: string[] = [];
      
      // Process reference images - convert external URLs to base64
      for (const img of editReferenceImages) {
        if (img.includes('base64,')) {
          referenceImages.push(img.split('base64,')[1]);
        } else if (img.startsWith('http')) {
          // Fetch and convert external URL to base64
          try {
            const response = await fetch(img);
            const blob = await response.blob();
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
              reader.onloadend = () => {
                const dataUrl = reader.result as string;
                const base64 = dataUrl.split('base64,')[1];
                resolve(base64);
              };
              reader.onerror = reject;
            });
            reader.readAsDataURL(blob);
            const base64 = await base64Promise;
            referenceImages.push(base64);
          } catch (error) {
            console.error('[useImageEditing] Failed to fetch reference image:', img, error);
            // Skip this reference image if it fails to load
          }
        }
      }
      
      let maskImage: string | undefined;
      let maskedReferenceImage: string | undefined;
      
      // Create mask from brush strokes if any exist
      if (brushStrokes.length > 0) {
        try {
          // Use the base64 image we already have to avoid CORS issues
          const tempImg = new Image();
          
          // Create a data URL from the base64 we already fetched
          const imageDataUrl = `data:image/png;base64,${base64Image}`;
          tempImg.src = imageDataUrl;
          
          await new Promise<void>((resolve, reject) => {
            tempImg.onload = () => resolve();
            tempImg.onerror = () => reject(new Error('Failed to load image for masking'));
          });
          
          // Create mask canvas with exact image dimensions
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          canvas.width = tempImg.width;
          canvas.height = tempImg.height;
          
          // Fill with black (unmasked areas)
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw white strokes (masked areas)
          ctx.strokeStyle = 'white';
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          brushStrokes.forEach(stroke => {
            if (stroke.points.length >= 4) {
              ctx.lineWidth = stroke.brushSize;
              ctx.beginPath();
              ctx.moveTo(stroke.points[0], stroke.points[1]);
              
              for (let i = 2; i < stroke.points.length; i += 2) {
                ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
              }
              ctx.stroke();
            }
          });
          
          // Convert mask to base64
          const maskDataUrl = canvas.toDataURL('image/png');
          maskImage = maskDataUrl.split('base64,')[1];
          
          // Create masked reference image (original image with mask overlay)
          const maskedCanvas = document.createElement('canvas');
          const maskedCtx = maskedCanvas.getContext('2d')!;
          maskedCanvas.width = tempImg.width;
          maskedCanvas.height = tempImg.height;
          
          // Draw original image (now safe from CORS as it's a data URL)
          maskedCtx.drawImage(tempImg, 0, 0);
          
          // Draw mask overlay with transparency
          maskedCtx.globalCompositeOperation = 'source-over';
          maskedCtx.globalAlpha = 0.4;
          maskedCtx.fillStyle = '#A855F7';
          
          brushStrokes.forEach(stroke => {
            if (stroke.points.length >= 4) {
              maskedCtx.lineWidth = stroke.brushSize;
              maskedCtx.strokeStyle = '#A855F7';
              maskedCtx.lineCap = 'round';
              maskedCtx.lineJoin = 'round';
              maskedCtx.beginPath();
              maskedCtx.moveTo(stroke.points[0], stroke.points[1]);
              
              for (let i = 2; i < stroke.points.length; i += 2) {
                maskedCtx.lineTo(stroke.points[i], stroke.points[i + 1]);
              }
              maskedCtx.stroke();
            }
          });
          
          maskedCtx.globalAlpha = 1;
          maskedCtx.globalCompositeOperation = 'source-over';
          
          const maskedDataUrl = maskedCanvas.toDataURL('image/png');
          maskedReferenceImage = maskedDataUrl.split('base64,')[1];
        } catch (error) {
          console.error('[useImageEditing] Failed to create mask:', error);
          // Continue without mask if it fails
          maskImage = undefined;
          maskedReferenceImage = undefined;
        }
        
        // Add the masked image as a reference for the model if it was created successfully
        if (maskedReferenceImage) {
          referenceImages = [maskedReferenceImage, ...referenceImages];
        }
      }
      
      const request: EditRequest = {
        instruction,
        originalImage: base64Image,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        maskImage,
        temperature,
        seed: seed || undefined
      };
      
      console.log('[useImageEditing] Sending edit request with:', {
        instruction,
        hasOriginalImage: !!base64Image,
        originalImageLength: base64Image?.length,
        referenceImagesCount: referenceImages.length,
        hasMask: !!maskImage,
        temperature,
        seed
      });
      
      const images = await geminiService.editImage(request);
      return { images, maskedReferenceImage };
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: ({ images, maskedReferenceImage, usedSegmentation, boundingBox }: any, instruction) => {
      if (images.length > 0) {
        const outputAssets: Asset[] = images.map((base64) => ({
          id: generateId(),
          type: 'output',
          url: `data:image/png;base64,${base64}`,
          mime: 'image/png',
          width: 1024,
          height: 1024,
          checksum: base64.slice(0, 32)
        }));

        // Create mask reference asset if we have one
        const maskReferenceAsset: Asset | undefined = maskedReferenceImage ? {
          id: generateId(),
          type: 'mask',
          url: `data:image/png;base64,${maskedReferenceImage}`,
          mime: 'image/png',
          width: 1024,
          height: 1024,
          checksum: maskedReferenceImage.slice(0, 32)
        } : undefined;

        const edit: Edit = {
          id: generateId(),
          parentGenerationId: selectedGenerationId || (currentProject?.generations[currentProject.generations.length - 1]?.id || ''),
          maskAssetId: brushStrokes.length > 0 ? generateId() : undefined,
          maskReferenceAsset,
          instruction,
          outputAssets,
          timestamp: Date.now()
        };

        // Create project if none exists
        if (!currentProject) {
          const newProject = {
            id: generateId(),
            title: 'Untitled Project',
            generations: [],
            edits: [edit],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          setCurrentProject(newProject);
        } else {
          // Add edit to existing project
          addEdit(edit);
        }
        
        // Automatically load the edited image in the canvas
        const { selectEdit, selectGeneration } = useAppStore.getState();
        setCanvasImage(outputAssets[0].url);
        selectEdit(edit.id);
        selectGeneration(null);
      }
      setIsGenerating(false);
    },
    onError: (error: any) => {
      console.error('Edit failed:', error);
      setIsGenerating(false);
      
      // Check if error is due to limit exceeded
      if (error?.message?.toLowerCase().includes('limit') || 
          error?.message?.toLowerCase().includes('exceeded')) {
        setShowLimitExceededModal(true);
      }
    }
  });

  return {
    edit: editMutation.mutate,
    isEditing: editMutation.isPending,
    error: editMutation.error
  };
};