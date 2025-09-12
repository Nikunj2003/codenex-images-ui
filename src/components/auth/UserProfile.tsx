import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { LogOut, ChevronDown, Settings, Sparkles, User } from 'lucide-react';
import { ApiKeyModal } from '../ApiKeyModal';
import { useUserStore } from '../../store/useUserStore';

export const UserProfile = () => {
  const { user, isAuthenticated, logout } = useAuth0();
  const { userData, realtimeApiKeyStatus, fetchRealtimeStatus } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);

  // Generate avatar URL
  const avatarUrl = useMemo(() => {
    if (!user) return '';
    
    // Use user's existing picture if available
    if (user.picture && !user.picture.includes('cdn.auth0.com/avatars')) {
      return user.picture;
    }
    
    // Generate DiceBear avatar
    const seed = user.email || user.sub || 'default';
    return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=4f46e5&textColor=ffffff&fontSize=40`;
  }, [user]);

  // Use shared state for API key status
  const hasApiKey = realtimeApiKeyStatus.hasApiKey;
  const remainingGenerations = hasApiKey ? -1 : (2 - realtimeApiKeyStatus.dailyGenerations);
  
  // Refresh status when dropdown is opened
  useEffect(() => {
    if (isOpen && user?.sub) {
      // Refresh immediately when dropdown opens for latest data
      fetchRealtimeStatus(user.sub);
    }
  }, [isOpen, user?.sub, fetchRealtimeStatus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [isOpen]);

  // User sync is handled in App.tsx to ensure proper auth initialization
  // No need to sync here

  const handleButtonClick = () => {
    if (!isOpen) {
      updateDropdownPosition();
    }
    setIsOpen(!isOpen);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  };

  const handleSettings = () => {
    setIsOpen(false);
    setShowApiKeyModal(true);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-800 transition-colors"
        aria-label="User menu"
      >
        <img
          src={avatarUrl}
          alt={user.name || 'User'}
          className="w-8 h-8 rounded-lg bg-gray-800"
        />
        <span className="text-sm text-gray-300 hidden sm:block">
          {user.name || user.email?.split('@')[0]}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && dropdownPosition && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-64 bg-gray-900 rounded-lg shadow-xl border border-gray-800 py-1 z-50"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <img
                src={avatarUrl}
                alt={user.name || 'User'}
                className="w-10 h-10 rounded-lg bg-gray-800"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.name || 'User'}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            
            {/* Usage Status */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">Daily Limit</span>
              {hasApiKey ? (
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-green-500" />
                  <span className="text-xs font-medium text-green-500">Unlimited</span>
                </div>
              ) : (
                <span className="text-xs font-medium text-gray-300">
                  {remainingGenerations > 0 ? `${remainingGenerations} left` : 'Limit reached'}
                </span>
              )}
            </div>
            
            {!hasApiKey && remainingGenerations > 0 && (
              <div className="mt-2">
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${(remainingGenerations / 2) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Menu Items */}
          <button
            onClick={handleSettings}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-3 transition-colors"
          >
            <Settings className="w-4 h-4" />
            API Key Settings
            {hasApiKey && (
              <Sparkles className="w-3 h-3 text-green-500 ml-auto" />
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center gap-3 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>,
        document.body
      )}
      
      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)} 
      />
    </>
  );
};