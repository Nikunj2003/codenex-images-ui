import { User } from '@auth0/auth0-react';

// Store reference to Auth0 user that can be accessed outside React components
let currentAuth0User: User | undefined = undefined;

export const setAuth0User = (user: User | undefined) => {
  currentAuth0User = user;
  console.log('[Auth0Utils] User set:', user?.sub);
};

export const getAuth0User = (): User | undefined => {
  return currentAuth0User;
};

export const getAuth0UserId = (): string | null => {
  return currentAuth0User?.sub || null;
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).__auth0Utils = {
    getUser: getAuth0User,
    getUserId: getAuth0UserId,
    currentUser: () => currentAuth0User
  };
}