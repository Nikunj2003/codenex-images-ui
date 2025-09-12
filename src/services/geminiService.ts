import { apiService } from './apiService';
import { useUserStore } from '../store/useUserStore';
import { generationLimitService } from './generationLimitService';
import { getAuth0User } from '../utils/auth0Utils';

export interface GenerationRequest {
  prompt: string;
  referenceImages?: string[]; // base64 array
  temperature?: number;
  seed?: number;
  width?: number;
  height?: number;
}

export interface EditRequest {
  instruction: string;
  originalImage: string; // base64
  referenceImages?: string[]; // base64 array
  maskImage?: string; // base64
  temperature?: number;
  seed?: number;
}

export interface SegmentationRequest {
  image: string; // base64
  query: string; // "the object at pixel (x,y)" or "the red car"
}

export class GeminiService {
  private async getApiKeyAndCheckLimit(): Promise<{ auth0Id: string; canGenerate: boolean; hasOwnKey: boolean }> {
    // Get auth0 user directly
    const auth0User = getAuth0User();
    const auth0Id = auth0User?.sub || null;
    
    if (!auth0Id) {
      throw new Error('Please log in to generate images');
    }
    
    console.log('[GeminiService] Checking generation limit for:', auth0Id);
    
    // Check generation limit with backend
    try {
      const limitCheck = await apiService.checkCanGenerate(auth0Id);
      console.log('[GeminiService] Backend limit check result:', limitCheck);
      
      if (!limitCheck.allowed) {
        throw new Error(limitCheck.message || 'Daily generation limit exceeded. Please add your own API key to continue.');
      }
      
      const hasOwnKey = limitCheck.hasApiKey || false;

      // All API calls now go through the backend
      return {
        auth0Id,
        canGenerate: true,
        hasOwnKey
      };
    } catch (error: any) {
      console.error('[GeminiService] Error checking generation limit:', error);
      
      // If it's a network error, provide a helpful message
      if (error?.code === 'ERR_NETWORK' || error?.response?.status >= 500) {
        console.warn('[GeminiService] Backend unavailable, using local fallback');
        
        // Fall back to local check
        const state = useUserStore.getState();
        const userData = state.userData;
        const hasOwnKey = userData?.hasApiKey || false;
        const limitCheck = generationLimitService.canGenerate(auth0Id, hasOwnKey);
        
        if (!limitCheck.allowed) {
          throw new Error(limitCheck.message || 'Daily generation limit exceeded.');
        }
        
        return {
          auth0Id,
          canGenerate: true,
          hasOwnKey
        };
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  private async recordGeneration(auth0Id: string | null, hasOwnKey: boolean, prompt: string, imageData?: string, isEdit: boolean = false, editInstruction?: string) {
    console.log('[GeminiService] Recording generation locally:', { auth0Id, hasOwnKey, isEdit });
    
    // Only use local tracking since backend records generations automatically
    // when processing generate/edit requests
    generationLimitService.recordGeneration(auth0Id, hasOwnKey);
  }

  async generateImage(request: GenerationRequest): Promise<string[]> {
    try {
      console.log('[GeminiService] generateImage called with:', {
        prompt: request.prompt?.substring(0, 50),
        width: request.width,
        height: request.height,
        temperature: request.temperature,
        seed: request.seed,
        hasReferenceImages: request.referenceImages?.length > 0
      });
      
      // Check generation limit
      const { auth0Id, canGenerate, hasOwnKey } = await this.getApiKeyAndCheckLimit();
      
      if (!canGenerate) {
        throw new Error('Generation limit exceeded. Please add your own API key to continue.');
      }

      // All generations now go through backend API
      console.log('[GeminiService] Using backend API for generation');
      
      const response = await apiService.generateImage(auth0Id, request.prompt, {
        temperature: request.temperature,
        seed: request.seed,
        width: request.width,
        height: request.height,
        referenceImages: request.referenceImages
      });
      
      // Record generation locally for UI tracking
      await this.recordGeneration(auth0Id, hasOwnKey, request.prompt, response.result?.images?.[0], false);
      
      // Refresh generation history to show the new generation
      console.log('[GeminiService] Refreshing generation history after successful generation');
      const { fetchGenerationHistory } = useUserStore.getState();
      await fetchGenerationHistory(auth0Id);
      
      return response.result?.images || [];
    } catch (error) {
      console.error('Error generating image:', error);
      // If error contains limit message, throw it directly
      if (error instanceof Error && error.message.includes('limit')) {
        throw error;
      }
      throw new Error('Failed to generate image. Please try again.');
    }
  }

  async editImage(request: EditRequest): Promise<string[]> {
    try {
      // Check generation limit
      const { auth0Id, canGenerate, hasOwnKey } = await this.getApiKeyAndCheckLimit();
      
      if (!canGenerate) {
        throw new Error('Generation limit exceeded. Please add your own API key to continue.');
      }

      // All edit operations now go through backend API
      console.log('[GeminiService] Using backend API for edit');
      
      const response = await apiService.editImage(auth0Id, request.instruction, {
        temperature: request.temperature,
        seed: request.seed,
        originalImage: request.originalImage,
        maskImage: request.maskImage,
        referenceImages: request.referenceImages
      });
      
      // Record generation locally for UI tracking
      await this.recordGeneration(auth0Id, hasOwnKey, request.instruction, response.result?.images?.[0], true, request.instruction);
      
      // Refresh generation history to show the new edit
      console.log('[GeminiService] Refreshing generation history after successful edit');
      const { fetchGenerationHistory } = useUserStore.getState();
      await fetchGenerationHistory(auth0Id);
      
      return response.result?.images || [];
    } catch (error) {
      console.error('Error editing image:', error);
      // If error contains limit message, throw it directly
      if (error instanceof Error && error.message.includes('limit')) {
        throw error;
      }
      throw new Error('Failed to edit image. Please try again.');
    }
  }

  async segmentImage(request: SegmentationRequest): Promise<any> {
    try {
      // Get auth0 user for backend call
      const auth0User = getAuth0User();
      const auth0Id = auth0User?.sub || null;
      
      if (!auth0Id) {
        throw new Error('Please log in to use segmentation feature');
      }
      
      console.log('[GeminiService] Using backend API for segmentation');
      
      // Call backend segmentation endpoint
      const response = await apiService.segmentImage(
        auth0Id,
        request.image,
        request.query
      );
      
      // Return the segmentation result
      return response.result || null;
    } catch (error) {
      console.error('Error segmenting image:', error);
      throw new Error('Failed to segment image. Please try again.');
    }
  }

}

export const geminiService = new GeminiService();