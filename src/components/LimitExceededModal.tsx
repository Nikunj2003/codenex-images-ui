import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, Key, Clock, Sparkles, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useUserStore } from '../store/useUserStore';
import { apiService } from '../services/apiService';

interface LimitExceededModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingHours?: number;
}

export const LimitExceededModal: React.FC<LimitExceededModalProps> = ({ 
  open, 
  onOpenChange,
  remainingHours = 24 
}) => {
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, userData, fetchUserData } = useUserStore();

  const handleSaveApiKey = async () => {
    if (!apiKey || apiKey.length < 20) {
      setError('Please enter a valid API key');
      return;
    }

    if (!user?.sub) {
      setError('Please log in to save your API key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.updateApiKey(user.sub, apiKey);
      
      if (response.success) {
        // Refresh user data
        await fetchUserData();
        // Close the modal
        onOpenChange(false);
        // Reset state
        setApiKey('');
        setShowApiKeyInput(false);
      } else {
        setError('Failed to save API key. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save API key');
    } finally {
      setIsLoading(false);
    }
  };

  const formatRemainingTime = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const roundedHours = Math.round(hours);
    return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''}`;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg z-50 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <Dialog.Title className="text-lg font-semibold text-gray-100">
                Daily Generation Limit Reached
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          
          <div className="space-y-4">
            {!showApiKeyInput ? (
              <>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-200">
                    You've used your 2 free daily generations. Choose an option to continue:
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setShowApiKeyInput(true)}
                    className="w-full p-4 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 hover:from-purple-600/30 hover:to-indigo-600/30 border border-purple-500/30 rounded-lg transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-purple-400" />
                        <div className="text-left">
                          <p className="font-semibold text-gray-100">Add Your Gemini API Key</p>
                          <p className="text-xs text-gray-400">Unlimited generations with your own key</p>
                        </div>
                      </div>
                      <Sparkles className="h-4 w-4 text-purple-400 group-hover:text-purple-300" />
                    </div>
                  </button>

                  <button
                    onClick={() => onOpenChange(false)}
                    className="w-full p-4 bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700 rounded-lg transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-gray-400" />
                        <div className="text-left">
                          <p className="font-semibold text-gray-100">Wait Until Tomorrow</p>
                          <p className="text-xs text-gray-400">
                            Resets in {formatRemainingTime(remainingHours)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-200">
                    <span className="font-semibold">Tip:</span> Get your free API key from{' '}
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-100"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Gemini API Key
                    </label>
                    <Input
                      type="password"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setError('');
                      }}
                      placeholder="AIza..."
                      className="w-full"
                      disabled={isLoading}
                    />
                    {error && (
                      <p className="mt-2 text-xs text-red-400">{error}</p>
                    )}
                  </div>

                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xs text-gray-400">
                      Your API key will be securely stored and used only for your generations.
                      Get your key from{' '}
                      <a 
                        href="https://aistudio.google.com/app/apikey" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 underline hover:text-blue-300"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setShowApiKeyInput(false);
                        setApiKey('');
                        setError('');
                      }}
                      disabled={isLoading}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleSaveApiKey}
                      disabled={isLoading || !apiKey}
                      className="flex-1"
                    >
                      {isLoading ? 'Saving...' : 'Save API Key'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};