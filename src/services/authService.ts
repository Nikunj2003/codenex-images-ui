import { Auth0Client } from '@auth0/auth0-spa-js';

// Create a reference to the Auth0 client that will be initialized from the Auth0Provider
let auth0Client: Auth0Client | null = null;

// Function to set the Auth0 client (called from Auth0Provider)
export const setAuth0Client = (client: Auth0Client) => {
  auth0Client = client;
  console.log('[AuthService] Auth0 client initialized');
};

// Function to get an access token
export const getAccessToken = async (): Promise<string | null> => {
  if (!auth0Client) {
    console.warn('[AuthService] Auth0 client not initialized');
    return null;
  }

  try {
    const token = await auth0Client.getTokenSilently({
      authorizationParams: {
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        scope: 'openid profile email'
      }
    });
    return token;
  } catch (error) {
    console.error('[AuthService] Error getting access token:', error);
    return null;
  }
};

// Helper function to get authorization header
export const getAuthHeader = async (): Promise<{ Authorization?: string }> => {
  const token = await getAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};