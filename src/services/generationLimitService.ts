// Temporary in-memory generation limit service
// This tracks generation limits locally until MongoDB is properly configured

interface UserGenerations {
  count: number;
  lastReset: Date;
  hasOwnKey: boolean;
}

class GenerationLimitService {
  private userGenerations: Map<string, UserGenerations> = new Map();
  private readonly DAILY_LIMIT = 2;

  private resetIfNeeded(userId: string): UserGenerations {
    const userData = this.userGenerations.get(userId) || {
      count: 0,
      lastReset: new Date(),
      hasOwnKey: false
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastReset = new Date(userData.lastReset);
    lastReset.setHours(0, 0, 0, 0);
    
    if (today > lastReset) {
      userData.count = 0;
      userData.lastReset = today;
    }

    this.userGenerations.set(userId, userData);
    return userData;
  }

  canGenerate(userId: string | null, hasOwnKey: boolean = false): { allowed: boolean; message?: string; remaining: number } {
    console.log('[GenerationLimitService] canGenerate called:', { userId, hasOwnKey });
    
    // If no user ID, deny generation (must be authenticated)
    if (!userId) {
      console.log('[GenerationLimitService] No userId - denying generation');
      return { 
        allowed: false, 
        message: 'Please log in to generate images',
        remaining: 0 
      };
    }

    // If user has their own API key, always allow
    if (hasOwnKey) {
      return { allowed: true, remaining: -1 }; // -1 means unlimited
    }

    const userData = this.resetIfNeeded(userId);
    console.log('[GenerationLimitService] User data:', userData);
    
    if (userData.count >= this.DAILY_LIMIT) {
      console.log('[GenerationLimitService] Limit exceeded:', userData.count, '>=', this.DAILY_LIMIT);
      return {
        allowed: false,
        message: `Daily generation limit (${this.DAILY_LIMIT}) exceeded. Please add your own Gemini API key to continue with unlimited generations.`,
        remaining: 0
      };
    }

    return {
      allowed: true,
      remaining: this.DAILY_LIMIT - userData.count
    };
  }

  recordGeneration(userId: string | null, hasOwnKey: boolean = false): void {
    console.log('[GenerationLimitService] Recording generation:', { userId, hasOwnKey });
    
    if (!userId) {
      console.log('[GenerationLimitService] No userId - not recording');
      return;
    }
    
    if (hasOwnKey) {
      console.log('[GenerationLimitService] User has own key - not counting against limit');
      return;
    }

    const userData = this.resetIfNeeded(userId);
    userData.count += 1;
    this.userGenerations.set(userId, userData);
    console.log('[GenerationLimitService] Generation recorded. New count:', userData.count);
  }

  getRemainingGenerations(userId: string | null, hasOwnKey: boolean = false): number {
    if (!userId) return this.DAILY_LIMIT;
    if (hasOwnKey) return -1; // Unlimited

    const userData = this.resetIfNeeded(userId);
    return Math.max(0, this.DAILY_LIMIT - userData.count);
  }

  setUserHasOwnKey(userId: string, hasKey: boolean): void {
    const userData = this.resetIfNeeded(userId);
    userData.hasOwnKey = hasKey;
    this.userGenerations.set(userId, userData);
  }

  // Debug method to view current state
  getDebugInfo(): any {
    const info: any = {
      totalUsers: this.userGenerations.size,
      users: {}
    };
    
    this.userGenerations.forEach((data, userId) => {
      info.users[userId] = {
        count: data.count,
        lastReset: data.lastReset,
        hasOwnKey: data.hasOwnKey
      };
    });
    
    return info;
  }
}

export const generationLimitService = new GenerationLimitService();

// Expose service to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__generationLimitService = generationLimitService;
}