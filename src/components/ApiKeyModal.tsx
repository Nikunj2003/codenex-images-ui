import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Key, Info, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { useUserStore } from '../store/useUserStore';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth0();
  const { userData, updateApiKey, fetchUserData, realtimeApiKeyStatus, fetchRealtimeStatus } = useUserStore();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Use shared state
  const hasApiKey = realtimeApiKeyStatus.hasApiKey;
  const dailyGenerations = realtimeApiKeyStatus.dailyGenerations;

  useEffect(() => {
    if (isOpen && user?.sub) {
      // Refresh status when modal opens
      fetchRealtimeStatus(user.sub);
      
      if (hasApiKey) {
        setApiKey('••••••••••••••••••••••••••••••••••••••••');
      } else {
        setApiKey('');
      }
    }
  }, [isOpen, user?.sub, hasApiKey, fetchRealtimeStatus]);

  const handleSave = async () => {
    if (!user?.sub) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate API key format if provided
      if (apiKey && !apiKey.includes('•')) {
        if (!apiKey.startsWith('AIza') || apiKey.length !== 39) {
          setError('Invalid Gemini API key format');
          setLoading(false);
          return;
        }
      }

      const keyToSave = apiKey.includes('•') ? null : apiKey;
      await updateApiKey(user.sub, keyToSave);
      
      // Status will be refreshed automatically by updateApiKey
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setApiKey('');
      }, 1500);
    } catch (err) {
      setError('Failed to update API key');
      console.error('Error updating API key:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveKey = async () => {
    if (!user?.sub) return;

    setLoading(true);
    setError('');

    try {
      await updateApiKey(user.sub, null);
      setApiKey('');
      
      // Status will be refreshed automatically by updateApiKey
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError('Failed to remove API key');
      console.error('Error removing API key:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 999999 }}
    >
      <div className="bg-gray-900 rounded-xl w-full max-w-2xl border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Key className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">API Key Settings</h2>
              <p className="text-sm text-gray-400">Manage your Gemini API key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm text-blue-200 font-medium">Generation Limits</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• <strong>Free tier:</strong> 2 generations per day using our API key</li>
                  <li>• <strong>With your API key:</strong> Unlimited generations</li>
                  <li>• Your API key is encrypted and stored securely</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-300">Current Status</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                hasApiKey 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-gray-700 text-gray-400 border border-gray-600'
              }`}>
                {hasApiKey ? 'API Key Set' : 'Using Free Tier'}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              {hasApiKey 
                ? 'You have unlimited generations with your own API key'
                : `${2 - dailyGenerations} generations remaining today`
              }
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/50 pr-12"
                disabled={loading}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                type="button"
              >
                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Get your API key from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Google AI Studio
              </a>
            </p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <Check className="w-4 h-4" />
              <span className="text-sm">API key updated successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          {hasApiKey && (
            <button
              onClick={handleRemoveKey}
              disabled={loading}
              className="px-4 py-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              Remove API Key
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || (apiKey.includes('•') && hasApiKey)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};