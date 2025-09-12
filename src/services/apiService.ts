import axios, { AxiosRequestConfig } from 'axios';

// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ApiKeyResponse {
  success: boolean;
  hasApiKey: boolean;
  message?: string;
}

export interface GenerationLimitResponse {
  allowed: boolean;
  reason: string;
  message?: string;
  dailyGenerations: number;
  hasApiKey: boolean;
}

// Token getter function type
type TokenGetter = () => Promise<string | undefined>;

class ApiService {
  private apiUrl: string;
  private tokenGetter: TokenGetter | null = null;

  constructor() {
    this.apiUrl = API_URL;
  }

  // Set the token getter function (should be called when Auth0 is initialized)
  setTokenGetter(getter: TokenGetter) {
    this.tokenGetter = getter;
    console.log('[ApiService] Token getter configured');
  }

  // Check if the API service is ready (token getter is configured)
  isReady(): boolean {
    return this.tokenGetter !== null;
  }

  // Get axios config with auth header
  private async getAuthConfig(): Promise<AxiosRequestConfig> {
    const config: AxiosRequestConfig = {};
    
    if (this.tokenGetter) {
      try {
        const token = await this.tokenGetter();
        if (token) {
          config.headers = {
            Authorization: `Bearer ${token}`
          };
        } else {
          console.warn('[ApiService] Token getter returned undefined');
        }
      } catch (error) {
        console.error('[ApiService] Error getting token:', error);
      }
    } else {
      console.warn('[ApiService] Token getter not configured yet');
    }
    
    return config;
  }

  // User management
  async syncUser(auth0User: any) {
    const config = await this.getAuthConfig();
    const response = await axios.post(`${this.apiUrl}/api/users`, {
      auth0Id: auth0User.sub,
      email: auth0User.email,
      name: auth0User.name,
      picture: auth0User.picture
    }, config);
    return response.data;
  }

  async getUserData(auth0Id: string) {
    const config = await this.getAuthConfig();
    const response = await axios.get(`${this.apiUrl}/api/users/${auth0Id}`, config);
    return response.data;
  }

  async updateApiKey(auth0Id: string, apiKey: string | null): Promise<ApiKeyResponse> {
    const config = await this.getAuthConfig();
    const response = await axios.put(`${this.apiUrl}/api/users/${auth0Id}/api-key`, {
      geminiApiKey: apiKey
    }, config);
    return response.data;
  }

  async checkCanGenerate(auth0Id: string): Promise<GenerationLimitResponse> {
    const config = await this.getAuthConfig();
    const response = await axios.get(`${this.apiUrl}/api/users/${auth0Id}/can-generate`, config);
    return response.data;
  }

  // Generation management
  // Note: Generation recording is handled automatically by the backend
  // when calling generateImage() or editImage()

  async getGenerationHistory(auth0Id: string, limit = 10, skip = 0) {
    console.log('[apiService] Fetching generation history:', auth0Id, limit, skip);
    const config = await this.getAuthConfig();
    const response = await axios.get(`${this.apiUrl}/api/generations/history/${auth0Id}`, {
      ...config,
      params: { limit, skip }
    });
    console.log('[apiService] Generation history response:', response.data);
    return response.data;
  }

  async getTodayGenerations(auth0Id: string) {
    const config = await this.getAuthConfig();
    const response = await axios.get(`${this.apiUrl}/api/generations/today/${auth0Id}`, config);
    return response.data;
  }

  // Get the appropriate API key for generation
  // DEPRECATED: API keys should never be handled on frontend
  async getGeminiApiKey(auth0Id: string): Promise<string | null> {
    try {
      // Check if user has their own API key
      const userData = await this.getUserData(auth0Id);
      
      if (userData.user.hasApiKey) {
        // Server will use the user's stored key
        return 'USER_HAS_KEY'; // This is a flag, actual key is on server
      }
      
      // No API key - server will use default for free tier (with rate limiting)
      return null;
    } catch (error) {
      console.error('Error getting API key status:', error);
      // No API key available
      return null;
    }
  }

  // Call Gemini API through backend for image generation
  async generateImage(auth0Id: string, prompt: string, settings: any) {
    const config = await this.getAuthConfig();
    const response = await axios.post(`${this.apiUrl}/api/generations/generate`, {
      auth0Id,
      prompt,
      settings
    }, config);
    return response.data;
  }

  // Call Gemini API through backend for image editing
  async editImage(auth0Id: string, instruction: string, settings: any) {
    const config = await this.getAuthConfig();
    const response = await axios.post(`${this.apiUrl}/api/generations/edit`, {
      auth0Id,
      instruction,
      originalImage: settings.originalImage,
      maskImage: settings.maskImage,
      referenceImages: settings.referenceImages,
      temperature: settings.temperature,
      seed: settings.seed
    }, config);
    return response.data;
  }


  async segmentImage(auth0Id: string, image: string, query: string) {
    const config = await this.getAuthConfig();
    const response = await axios.post(`${this.apiUrl}/api/generations/segment`, {
      auth0Id,
      image,
      query
    }, config);
    return response.data;
  }

  async deleteGeneration(generationId: string, auth0Id: string) {
    console.log('[apiService] Deleting generation:', generationId);
    const config = await this.getAuthConfig();
    const response = await axios.delete(`${this.apiUrl}/api/generations/${generationId}/${auth0Id}`, config);
    console.log('[apiService] Delete response:', response.data);
    return response.data;
  }
}

export const apiService = new ApiService();