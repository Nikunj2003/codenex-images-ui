import { useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiService } from '../services/apiService';

export const useApiAuth = () => {
  const { getAccessTokenSilently, isAuthenticated, isLoading } = useAuth0();
  const initialized = useRef(false);

  useEffect(() => {
    // Only initialize once when authenticated and not loading
    if (isAuthenticated && !isLoading && !initialized.current) {
      initialized.current = true;
      
      // Configure apiService with the token getter
      apiService.setTokenGetter(async () => {
        try {
          const token = await getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              scope: 'openid profile email'
            }
          });
          console.log('[useApiAuth] Token obtained successfully');
          return token;
        } catch (error) {
          console.error('[useApiAuth] Error getting access token:', error);
          return undefined;
        }
      });
      
      console.log('[useApiAuth] API authentication configured');
    }
  }, [getAccessTokenSilently, isAuthenticated, isLoading]);
  
  return { isApiAuthReady: initialized.current && isAuthenticated && !isLoading };
};