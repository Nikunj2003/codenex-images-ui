import React from 'react';
import { Logo } from './Logo';
import { UserProfile } from './auth/UserProfile';
import { useAuth0 } from '@auth0/auth0-react';

export const Header: React.FC = () => {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuth0();


  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 md:px-6">
      {/* Logo and Brand */}
      <div className="flex items-center gap-3">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-white">
            Codenex Images
          </h1>
        </div>
      </div>

      {/* User Profile or Sign In */}
      <div className="flex items-center">
        {!isLoading && (
          isAuthenticated ? (
            <UserProfile />
          ) : (
            <button
              onClick={() => loginWithRedirect()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sign In
            </button>
          )
        )}
      </div>
    </header>
  );
};