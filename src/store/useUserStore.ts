import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiService } from '../services/apiService';

interface UserData {
  id: string;
  auth0Id: string;
  email: string;
  name: string;
  picture?: string;
  hasApiKey: boolean;
  dailyGenerations: number;
  totalGenerations: number;
  canGenerate: boolean;
  limitReason?: string;
  limitMessage?: string;
}

interface GenerationData {
  _id?: string;
  id?: string;
  prompt: string;
  imageUrl?: string;
  imageData?: string;
  createdAt: string;
  status: string;
  settings?: any;
  metadata?: any;
}

interface UserStore {
  userData: UserData | null;
  generations: GenerationData[];
  loading: boolean;
  error: string | null;
  // Real-time API key status (not cached)
  realtimeApiKeyStatus: {
    hasApiKey: boolean;
    dailyGenerations: number;
    canGenerate: boolean;
    lastFetched: number | null;
  };
  
  // Actions
  syncUser: (auth0User: any) => Promise<void>;
  fetchUserData: (auth0Id: string) => Promise<void>;
  updateApiKey: (auth0Id: string, apiKey: string | null) => Promise<void>;
  checkCanGenerate: (auth0Id: string) => Promise<boolean>;
  fetchGenerationHistory: (auth0Id: string) => Promise<void>;
  deleteGeneration: (generationId: string, auth0Id: string) => Promise<void>;
  getApiKey: () => string | null;
  clearStore: () => void;
  fetchRealtimeStatus: (auth0Id: string) => Promise<void>;
}

import { retryWithJWT } from '../utils/apiRetry';

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
  userData: null,
  generations: [],
  loading: false,
  error: null,
  realtimeApiKeyStatus: {
    hasApiKey: false,
    dailyGenerations: 0,
    canGenerate: true,
    lastFetched: null,
  },

  syncUser: async (auth0User) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.syncUser(auth0User);
      // CRITICAL: Clear any cached data from other users
      // This ensures each user gets their own fresh data
      set({ userData: response.user, loading: false, generations: [] });
      // Note: Real-time status is now fetched in App.tsx for better control
    } catch (error) {
      console.error('Error syncing user:', error);
      set({ error: 'Failed to sync user data', loading: false });
    }
  },

  fetchUserData: async (auth0Id) => {
    set({ loading: true, error: null });
    try {
      const response = await apiService.getUserData(auth0Id);
      set({ userData: response.user, loading: false });
    } catch (error) {
      console.error('Error fetching user data:', error);
      set({ error: 'Failed to fetch user data', loading: false });
    }
  },

  updateApiKey: async (auth0Id, apiKey) => {
    try {
      const response = await apiService.updateApiKey(auth0Id, apiKey);
      
      // Refresh user data after updating API key
      await get().fetchUserData(auth0Id);
      
      // Refresh real-time status after updating API key
      await get().fetchRealtimeStatus(auth0Id);
      
      return response;
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  },

  checkCanGenerate: async (auth0Id) => {
    try {
      const response = await apiService.checkCanGenerate(auth0Id);
      
      // Update user data with latest generation count
      if (get().userData) {
        set({
          userData: {
            ...get().userData!,
            dailyGenerations: response.dailyGenerations,
            canGenerate: response.allowed
          }
        });
      }
      
      return response.allowed;
    } catch (error) {
      console.error('Error checking generation limit:', error);
      return false;
    }
  },


  fetchGenerationHistory: async (auth0Id) => {
    set({ loading: true, error: null });
    try {
      console.log('[useUserStore] Fetching generation history for:', auth0Id);
      const response = await apiService.getGenerationHistory(auth0Id);
      console.log('[useUserStore] Received generations:', response.generations?.length);
      console.log('[useUserStore] First generation:', response.generations?.[0]);
      console.log('[useUserStore] Full response:', response);
      
      // Make sure we're storing the data correctly
      const generationsData = response.generations || [];
      set({ generations: generationsData, loading: false });
      
      // Verify the data was stored
      console.log('[useUserStore] Store updated with generations:', generationsData.length);
    } catch (error) {
      console.error('Error fetching generation history:', error);
      set({ error: 'Failed to fetch generation history', loading: false, generations: [] });
    }
  },

  deleteGeneration: async (generationId, auth0Id) => {
    try {
      console.log('[useUserStore] Deleting generation:', generationId);
      
      // Optimistic update: Remove from local state immediately
      const currentGenerations = get().generations;
      const updatedGenerations = currentGenerations.filter(
        (gen) => gen._id !== generationId && gen.id !== generationId
      );
      set({ generations: updatedGenerations });
      console.log('[useUserStore] Optimistically removed generation from UI');
      
      // Delete from backend
      await apiService.deleteGeneration(generationId, auth0Id);
      console.log('[useUserStore] Generation deleted successfully from backend');
      
      // Optionally sync with backend (but don't block UI)
      // This can be done in the background to ensure consistency
      setTimeout(() => {
        get().fetchGenerationHistory(auth0Id).catch(error => {
          console.error('[useUserStore] Background sync failed:', error);
          // If sync fails, the optimistic update remains
        });
      }, 1000);
      
    } catch (error) {
      console.error('Error deleting generation:', error);
      // On error, revert the optimistic update by re-fetching
      await get().fetchGenerationHistory(auth0Id);
      throw error;
    }
  },

  getApiKey: () => {
    const userData = get().userData;
    
    // CRITICAL: Never return any API key from frontend
    // All API keys are managed server-side for security
    if (userData?.hasApiKey) {
      return 'USER_HAS_KEY'; // Flag indicating user has their own key on server
    }
    
    // No API key - free tier with rate limiting
    return null;
  },
  
  clearStore: () => {
    // Clear all user-specific data
    set({ 
      userData: null, 
      generations: [], 
      loading: false, 
      error: null,
      realtimeApiKeyStatus: {
        hasApiKey: false,
        dailyGenerations: 0,
        canGenerate: true,
        lastFetched: null,
      }
    });
  },
  
  fetchRealtimeStatus: async (auth0Id: string) => {
    try {
      // Use retry logic to handle JWT not being ready
      const response = await retryWithJWT(
        () => apiService.checkCanGenerate(auth0Id),
        5000 // Wait up to 5 seconds for JWT
      );
      
      if (response) {
        set({
          realtimeApiKeyStatus: {
            hasApiKey: response.hasApiKey || false,
            dailyGenerations: response.dailyGenerations || 0,
            canGenerate: response.allowed || false,
            lastFetched: Date.now(),
          }
        });
      }
    } catch (error) {
      console.error('Error fetching real-time status:', error);
    }
  }
    }),
    {
      name: 'user-store', // unique name for localStorage key
      partialize: (state) => ({ 
        userData: state.userData,
        generations: state.generations 
      }), // Only persist userData and generations, not loading/error states
    }
  )
);