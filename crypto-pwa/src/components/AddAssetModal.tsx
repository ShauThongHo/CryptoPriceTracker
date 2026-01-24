import { X, TrendingUp, Info } from 'lucide-react';
import { useState } from 'react';
import type { Wallet } from '../db/db';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onAdd: (asset: {
    walletId: number;
    symbol: string;
    amount: number;
    tags?: string;
    notes?: string;
    earnConfig?: {
      enabled: boolean;
      apy: number;
      interestType: 'compound' | 'simple';
      payoutIntervalHours: number;
    };
  }) => Promise<void>;
  preselectedWalletId?: number; // Optional: auto-select wallet
}

export default function AddAssetModal({ isOpen, onClose, wallets, onAdd, preselectedWalletId }: AddAssetModalProps) {
  const [walletId, setWalletId] = useState<number | ''>(preselectedWalletId || '');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Earn-specific fields
  const [apy, setApy] = useState('');
  const [interestType, setInterestType] = useState<'compound' | 'simple'>('compound');
  const [payoutInterval, setPayoutInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Update walletId when preselectedWalletId changes
  if (preselectedWalletId && walletId === '') {
    setWalletId(preselectedWalletId);
  }

  if (!isOpen) return null;

  const isEarnPosition = tags === 'earn';

  const getPayoutIntervalHours = (): number => {
    switch (payoutInterval) {
      case 'daily': return 24;
      case 'weekly': return 168;
      case 'monthly': return 720;
      default: return 24;
    }
  };

  const calculateEstimatedDailyEarnings = (): string => {
    if (!amount || !apy || !isEarnPosition) return '0.00';
    const principal = parseFloat(amount);
    const apyDecimal = parseFloat(apy) / 100;
    const dailyEarnings = principal * (apyDecimal / 365);
    return dailyEarnings.toFixed(8);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !symbol.trim() || !amount) return;
    if (isEarnPosition && (!apy || parseFloat(apy) <= 0)) return;

    setIsSubmitting(true);
    try {
      const assetData: any = {
        walletId: Number(walletId),
        symbol: symbol.trim().toUpperCase(),
        amount: parseFloat(amount),
        tags: tags || undefined,
        notes: notes || undefined,
      };

      // Add earnConfig if it's an Earn position
      if (isEarnPosition && apy) {
        assetData.earnConfig = {
          enabled: true,
          apy: parseFloat(apy),
          interestType,
          payoutIntervalHours: getPayoutIntervalHours(),
        };
      }

      await onAdd(assetData);
      
      // Reset form
      setWalletId(preselectedWalletId || '');
      setSymbol('');
      setAmount('');
      setTags('');
      setNotes('');
      setApy('');
      setInterestType('compound');
      setPayoutInterval('daily');
      onClose();
    } catch (error) {
      console.error('Error adding asset:', error);
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
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-mobile sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Asset</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!preselectedWalletId && (
            <div>
              <label htmlFor="asset-wallet" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Wallet
              </label>
              <select
                id="asset-wallet"
                value={walletId}
                onChange={(e) => setWalletId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Choose a wallet...</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({wallet.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="asset-symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cryptocurrency Symbol
            </label>
            <input
              id="asset-symbol"
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g., BTC, ETH, SOL"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent uppercase"
              required
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Enter the ticker symbol (will be converted to uppercase)
            </p>
          </div>

          <div>
            <label htmlFor="asset-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount
            </label>
            <input
              id="asset-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.00000001"
              min="0"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              How much of this cryptocurrency do you own?
            </p>
          </div>

          <div>
            <label htmlFor="asset-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (Optional)
            </label>
            <select
              id="asset-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">No tag</option>
              <option value="earn">📈 Earn (Auto-interest)</option>
              <option value="Staked">Staked</option>
              <option value="Liquid">Liquid</option>
              <option value="DeFi">DeFi</option>
              <option value="Trading">Trading</option>
              <option value="HODL">HODL</option>
            </select>
          </div>

          {/* Earn Position Fields - Show only when "earn" tag is selected */}
          {isEarnPosition && (
            <>
              {/* Info Banner */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
                <div className="flex gap-2">
                  <Info className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Earn positions automatically calculate interest. Set your APY and payout frequency below.
                  </p>
                </div>
              </div>

              {/* APY */}
              <div>
                <label htmlFor="earn-apy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  APY (Annual Percentage Yield) *
                </label>
                <div className="relative">
                  <input
                    id="earn-apy"
                    type="number"
                    value={apy}
                    onChange={(e) => setApy(e.target.value)}
                    placeholder="e.g., 12.5"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                </div>
              </div>

              {/* Interest Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interest Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInterestType('compound')}
                    className={`px-4 py-3 rounded-xl border-2 transition-all ${
                      interestType === 'compound'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-300'
                    }`}
                  >
                    <div className="text-sm font-semibold">Compound</div>
                    <div className="text-xs opacity-75">Snowball</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterestType('simple')}
                    className={`px-4 py-3 rounded-xl border-2 transition-all ${
                      interestType === 'simple'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-300'
                    }`}
                  >
                    <div className="text-sm font-semibold">Simple</div>
                    <div className="text-xs opacity-75">Fixed</div>
                  </button>
                </div>
              </div>

              {/* Payout Frequency */}
              <div>
                <label htmlFor="earn-payout" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Payout Frequency
                </label>
                <select
                  id="earn-payout"
                  value={payoutInterval}
                  onChange={(e) => setPayoutInterval(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="daily">Daily (24 hours)</option>
                  <option value="weekly">Weekly (7 days)</option>
                  <option value="monthly">Monthly (30 days)</option>
                </select>
              </div>

              {/* Earnings Preview */}
              {amount && apy && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Estimated Daily Earnings
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    +{calculateEstimatedDailyEarnings()} {symbol.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {interestType === 'compound' 
                      ? '📈 Earnings reinvest automatically' 
                      : '💰 Fixed daily returns'}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label htmlFor="asset-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="asset-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this asset..."
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
          </div>

          {/* Footer - Fixed */}
          <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !walletId || !symbol.trim() || !amount || parseFloat(amount) <= 0 || (isEarnPosition && (!apy || parseFloat(apy) <= 0))}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : isEarnPosition ? '📈 Add Earn Position' : 'Add Asset'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
