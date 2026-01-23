import { X, Key, PenTool, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { exchangeService } from '../services/exchangeService';
import { encryptionService } from '../services/encryptionService';

interface AddWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (wallet: { name: string; type: 'hot' | 'cold' | 'exchange'; exchangeName?: string }) => Promise<void>;
}

type TabType = 'api' | 'manual';

export default function AddWalletModal({ isOpen, onClose, onAdd }: AddWalletModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [name, setName] = useState('');
  const [type, setType] = useState<'hot' | 'cold' | 'exchange'>('exchange');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // API Connection state
  const [selectedExchange, setSelectedExchange] = useState('binance');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [shouldEncrypt, setShouldEncrypt] = useState(true);
  const [masterPassword, setMasterPassword] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setType('exchange');
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
    setMasterPassword('');
    setShouldEncrypt(true);
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!apiKey || !apiSecret) {
      setTestResult({ success: false, message: 'Please enter API key and secret' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      if (shouldEncrypt && masterPassword) {
        encryptionService.setMasterPassword(masterPassword);
      }

      const result = await exchangeService.testConnection({
        exchange: selectedExchange,
        apiKey,
        apiSecret,
        password: passphrase || undefined,
        isEncrypted: false,
      });

      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleApiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !apiKey || !apiSecret) return;

    if (shouldEncrypt && !masterPassword) {
      alert('Please enter a master password to encrypt your API keys');
      return;
    }

    setIsSubmitting(true);
    try {
      if (shouldEncrypt) {
        encryptionService.setMasterPassword(masterPassword);
      }

      await exchangeService.saveApiKey(
        selectedExchange,
        apiKey,
        apiSecret,
        shouldEncrypt,
        passphrase || undefined
      );
      await onAdd({
        name: name.trim(),
        type: 'exchange',
        exchangeName: selectedExchange,
      });

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding wallet with API:', error);
      alert('Failed to add wallet. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd({ name: name.trim(), type });
      resetForm();
      onClose();
    } catch (error) {
      console.error('Error adding wallet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-mobile sm:max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-6 pb-4 border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Wallet</h2>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('api')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'api'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>API</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-colors ${
                activeTab === 'manual'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>Manual</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* API Connection Tab */}
          {activeTab === 'api' && (
            <form onSubmit={handleApiSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wallet Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Binance Account"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exchange *
                </label>
                <select
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  {exchangeService.getSupportedExchanges().map((ex) => (
                    <option key={ex} value={ex}>
                      {ex.charAt(0).toUpperCase() + ex.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key *
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Your API key"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Secret *
                </label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Your API secret"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
                />
              </div>

              {/* Passphrase for exchanges that require it */}
              {(selectedExchange === 'okx' || selectedExchange === 'kucoin') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Passphrase *
                  </label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Your API passphrase"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {selectedExchange === 'okx' ? 'OKX' : 'KuCoin'} requires a passphrase for API authentication
                  </p>
                </div>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="encrypt"
                    checked={shouldEncrypt}
                    onChange={(e) => setShouldEncrypt(e.target.checked)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="encrypt" className="font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                      Encrypt API Keys (Recommended)
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Keys will be encrypted with your master password
                    </p>
                  </div>
                </div>
              </div>

              {shouldEncrypt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Master Password *
                  </label>
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required={shouldEncrypt}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Remember this - you'll need it to access your API keys
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !apiKey || !apiSecret}
                className="w-full py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              {testResult && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg ${
                    testResult.success
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                  }`}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Adding...' : 'Add Wallet & Save API Key'}
              </button>
            </form>
          )}

          {/* Manual Entry Tab */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wallet Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Hardware Wallet"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wallet Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['hot', 'cold', 'exchange'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 px-4 rounded-lg border-2 transition-all font-medium capitalize ${
                        type === t
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Manual Entry:</strong> You'll manually add and update assets for this wallet.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? 'Adding...' : 'Add Wallet'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
