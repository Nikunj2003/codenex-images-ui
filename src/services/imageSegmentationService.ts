/**
 * Service for handling image segmentation, region extraction, and stitching
 * This allows for localized editing where only the masked region is sent to Gemini
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedRegion {
  imageData: string; // base64
  boundingBox: BoundingBox;
  maskData: string; // base64 of the cropped mask
}

export class ImageSegmentationService {
  /**
   * Extract the bounding box from a mask
   * Finds the smallest rectangle that contains all white pixels
   */
  static async getBoundingBoxFromMask(maskCanvas: HTMLCanvasElement): Promise<BoundingBox | null> {
    const ctx = maskCanvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;
    
    let minX = maskCanvas.width;
    let minY = maskCanvas.height;
    let maxX = 0;
    let maxY = 0;
    let hasWhitePixels = false;
    
    // Find bounds of white pixels
    for (let y = 0; y < maskCanvas.height; y++) {
      for (let x = 0; x < maskCanvas.width; x++) {
        const idx = (y * maskCanvas.width + x) * 4;
        // Check if pixel is white (R, G, B all > 128 for some tolerance)
        if (data[idx] > 128 && data[idx + 1] > 128 && data[idx + 2] > 128) {
          hasWhitePixels = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (!hasWhitePixels) {
      return null;
    }
    
    // Add padding around the bounding box (10% of dimensions or 20px, whichever is larger)
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const paddingX = Math.max(20, Math.floor(width * 0.1));
    const paddingY = Math.max(20, Math.floor(height * 0.1));
    
    return {
      x: Math.max(0, minX - paddingX),
      y: Math.max(0, minY - paddingY),
      width: Math.min(maskCanvas.width - Math.max(0, minX - paddingX), width + paddingX * 2),
      height: Math.min(maskCanvas.height - Math.max(0, minY - paddingY), height + paddingY * 2)
    };
  }
  
  /**
   * Extract a region from an image based on a bounding box
   */
  static async extractRegion(
    originalImage: string, // base64
    maskCanvas: HTMLCanvasElement,
    boundingBox: BoundingBox
  ): Promise<ExtractedRegion> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for the extracted region
        const extractCanvas = document.createElement('canvas');
        const extractCtx = extractCanvas.getContext('2d')!;
        extractCanvas.width = boundingBox.width;
        extractCanvas.height = boundingBox.height;
        
        // Draw the cropped region from original image
        extractCtx.drawImage(
          img,
          boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height,
          0, 0, boundingBox.width, boundingBox.height
        );
        
        // Create cropped mask
        const maskExtractCanvas = document.createElement('canvas');
        const maskExtractCtx = maskExtractCanvas.getContext('2d')!;
        maskExtractCanvas.width = boundingBox.width;
        maskExtractCanvas.height = boundingBox.height;
        
        // Draw the cropped region from mask
        maskExtractCtx.drawImage(
          maskCanvas,
          boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height,
          0, 0, boundingBox.width, boundingBox.height
        );
        
        resolve({
          imageData: extractCanvas.toDataURL('image/png').split(',')[1],
          boundingBox,
          maskData: maskExtractCanvas.toDataURL('image/png').split(',')[1]
        });
      };
      
      img.src = originalImage.includes('base64,') 
        ? originalImage 
        : `data:image/png;base64,${originalImage}`;
    });
  }
  
  /**
   * Stitch an edited region back into the original image
   */
  static async stitchRegion(
    originalImage: string, // base64
    editedRegion: string, // base64
    boundingBox: BoundingBox,
    maskCanvas: HTMLCanvasElement
  ): Promise<string> {
    return new Promise((resolve) => {
      const originalImg = new Image();
      const editedImg = new Image();
      let loadedCount = 0;
      
      const tryComposite = () => {
        loadedCount++;
        if (loadedCount < 2) return;
        
        // Create final canvas
        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d')!;
        finalCanvas.width = originalImg.width;
        finalCanvas.height = originalImg.height;
        
        // Draw original image as base
        finalCtx.drawImage(originalImg, 0, 0);
        
        // Create a temporary canvas for the edited region with feathering
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCanvas.width = boundingBox.width;
        tempCanvas.height = boundingBox.height;
        
        // Draw edited region
        tempCtx.drawImage(editedImg, 0, 0, boundingBox.width, boundingBox.height);
        
        // Apply mask for smooth blending
        tempCtx.globalCompositeOperation = 'destination-in';
        
        // Get mask region
        const maskCtx = maskCanvas.getContext('2d')!;
        const maskData = maskCtx.getImageData(
          boundingBox.x, 
          boundingBox.y, 
          boundingBox.width, 
          boundingBox.height
        );
        
        // Apply feathering to mask for smooth edges
        const featheredMask = this.applyFeatheringToImageData(maskData, 5);
        
        // Create mask canvas for compositing
        const maskRegionCanvas = document.createElement('canvas');
        const maskRegionCtx = maskRegionCanvas.getContext('2d')!;
        maskRegionCanvas.width = boundingBox.width;
        maskRegionCanvas.height = boundingBox.height;
        maskRegionCtx.putImageData(featheredMask, 0, 0);
        
        // Apply mask to edited region
        tempCtx.drawImage(maskRegionCanvas, 0, 0);
        
        // Draw the masked edited region onto the final canvas
        finalCtx.drawImage(tempCanvas, boundingBox.x, boundingBox.y);
        
        // Convert to base64
        const result = finalCanvas.toDataURL('image/png').split(',')[1];
        resolve(result);
      };
      
      originalImg.onload = tryComposite;
      editedImg.onload = tryComposite;
      
      originalImg.src = originalImage.includes('base64,') 
        ? originalImage 
        : `data:image/png;base64,${originalImage}`;
      editedImg.src = editedRegion.includes('base64,') 
        ? editedRegion 
        : `data:image/png;base64,${editedRegion}`;
    });
  }
  
  /**
   * Apply feathering to image data for smooth edges
   */
  private static applyFeatheringToImageData(imageData: ImageData, radius: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Simple box blur for feathering (multiple passes for smoother result)
    for (let pass = 0; pass < radius; pass++) {
      const temp = new Uint8ClampedArray(data);
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          
          // Average the alpha channel for transparency feathering
          let sum = 0;
          let count = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              sum += temp[nIdx + 3]; // Alpha channel
              count++;
            }
          }
          
          data[idx + 3] = Math.floor(sum / count);
        }
      }
    }
    
    return new ImageData(data, width, height);
  }
  
  /**
   * Create a mask canvas from brush strokes
   */
  static createMaskFromBrushStrokes(
    brushStrokes: Array<{ points: number[]; brushSize: number }>,
    width: number,
    height: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = width;
    canvas.height = height;
    
    // Fill with black (unmasked areas)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    
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
    
    return canvas;
  }
}

export const imageSegmentationService = new ImageSegmentationService();