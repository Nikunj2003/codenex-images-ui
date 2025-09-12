import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cn } from './utils/cn';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Sidebar } from './components/Sidebar';
import { ImageCanvas } from './components/ImageCanvas';
import { RightPanel } from './components/RightPanel';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useApiAuth } from './hooks/useApiAuth';
import { useAppStore } from './store/useAppStore';
import { Auth0ProviderWithHistory } from './components/auth/Auth0ProviderWithHistory';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuth0 } from '@auth0/auth0-react';
import { setAuth0User } from './utils/auth0Utils';
import { useUserStore } from './store/useUserStore';
import { LimitExceededModal } from './components/LimitExceededModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function AppContent() {
  // All hooks must be called before any conditional returns
  useKeyboardShortcuts();
  const { isApiAuthReady } = useApiAuth(); // Initialize API authentication
  
  const { user, isLoading: auth0Loading, isAuthenticated } = useAuth0();
  const { syncUser, fetchGenerationHistory, fetchRealtimeStatus, userData, clearStore } = useUserStore();
  const { showPromptPanel, setShowPromptPanel, showHistory, setShowHistory, showLimitExceededModal, setShowLimitExceededModal } = useAppStore();
  
  // Track if we've synced for current session
  const [sessionSynced, setSessionSynced] = React.useState(false);
  
  // Check if we have cached data (userData exists means we have persisted data)
  const hasCachedData = !!userData;
  
  // Only show loading if we don't have cached data or Auth0 is still loading
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(hasCachedData);
  
  // Set mobile defaults on mount - moved BEFORE conditional returns
  React.useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        setShowPromptPanel(false);
        setShowHistory(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setShowPromptPanel, setShowHistory]);
  
  React.useEffect(() => {
    // Wait for Auth0 to finish loading
    if (auth0Loading || !user) {
      return;
    }
    
    // Wait a moment for API auth to initialize
    if (!isApiAuthReady) {
      const timeout = setTimeout(() => {
        console.log('[App] Proceeding despite API auth not ready');
      }, 500);
      return () => clearTimeout(timeout);
    }

    // Set Auth0 user globally
    setAuth0User(user);
    
    // CRITICAL: Clear store if a different user logs in
    // This prevents sharing hasApiKey status between users
    if (userData && userData.auth0Id !== user.sub) {
      console.log('[App] Different user detected, clearing previous user data');
      clearStore();
    }
    
    // Sync in the background if needed
    const needsSync = !sessionSynced || !userData || (userData && userData.auth0Id !== user.sub);
    
    if (needsSync) {
      console.log('[App] Background sync starting...');
      
      const loadUserData = async () => {
        try {
          // If we have cached data, sync in background without blocking UI
          if (!hasCachedData) {
            // No cached data, need to wait for sync
            await syncUser(user);
            if (user.sub) {
              await fetchGenerationHistory(user.sub);
            }
            // Fetch realtime status immediately after sync
            if (user.sub) {
              await fetchRealtimeStatus(user.sub);
            }
            setInitialLoadComplete(true);
          } else {
            // Have cached data, sync in background
            syncUser(user).then(() => {
              console.log('[App] Background user sync complete');
              // Fetch realtime status after sync completes
              if (user.sub) {
                fetchRealtimeStatus(user.sub);
              }
            });
            if (user.sub) {
              fetchGenerationHistory(user.sub).then(() => {
                console.log('[App] Background history sync complete');
              });
            }
          }
          
          setSessionSynced(true);
        } catch (error: any) {
          console.error('[App] Error loading user data:', error);
          setSessionSynced(true);
          setInitialLoadComplete(true);
        }
      };
      
      loadUserData();
    }
  }, [user, auth0Loading, isApiAuthReady, sessionSynced, userData, syncUser, fetchGenerationHistory, fetchRealtimeStatus]);
  
  // Update initialLoadComplete when we get userData
  React.useEffect(() => {
    if (userData && !initialLoadComplete) {
      setInitialLoadComplete(true);
    }
  }, [userData, initialLoadComplete]);
  
  // Fetch realtime status immediately when authenticated
  React.useEffect(() => {
    if (!isAuthenticated || !user?.sub || !isApiAuthReady) {
      return;
    }
    
    // Fetch immediately when authenticated
    console.log('[App] Fetching realtime status for authenticated user');
    fetchRealtimeStatus(user.sub);
  }, [isAuthenticated, user?.sub, isApiAuthReady, fetchRealtimeStatus]);


  return (
    <div className="h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-codenex-950/50 text-gray-100 flex flex-col font-sans">
      <Header />
      
      <div className="flex-1 flex overflow-hidden relative pb-8">
        <Sidebar />
        <div className="flex-1 min-w-0 relative overflow-hidden">
          <ImageCanvas />
        </div>
        <RightPanel />
      </div>
      
      {initialLoadComplete && <Footer />}
      
      <LimitExceededModal 
        open={showLimitExceededModal}
        onOpenChange={setShowLimitExceededModal}
      />
    </div>
  );
}

function AppWithAuth() {
  return <ProtectedRoute component={AppContent} />;
}

function App() {
  return (
    <BrowserRouter>
      <Auth0ProviderWithHistory>
        <QueryClientProvider client={queryClient}>
          <AppWithAuth />
        </QueryClientProvider>
      </Auth0ProviderWithHistory>
    </BrowserRouter>
  );
}

export default App;