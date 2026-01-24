import { X, TrendingUp, Info } from 'lucide-react';
import { useState } from 'react';
import type { Wallet } from '../db/db';

interface EarnConfig {
  enabled: boolean;
  apy: number;
  interestType: 'compound' | 'simple';
  payoutIntervalHours: number;
}

interface AddEarnPositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onAdd: (asset: {
    walletId: number;
    symbol: string;
    amount: number;
    tags?: string;
    notes?: string;
    earnConfig?: EarnConfig;
  }) => Promise<void>;
  preselectedWalletId?: number;
}

export default function AddEarnPositionModal({
  isOpen,
  onClose,
  wallets,
  onAdd,
  preselectedWalletId,
}: AddEarnPositionModalProps) {
  const [walletId, setWalletId] = useState<number | ''>(preselectedWalletId || '');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [apy, setApy] = useState('');
  const [interestType, setInterestType] = useState<'compound' | 'simple'>('compound');
  const [payoutInterval, setPayoutInterval] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [platform, setPlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update walletId when preselectedWalletId changes
  if (preselectedWalletId && walletId === '') {
    setWalletId(preselectedWalletId);
  }

  if (!isOpen) return null;

  const getPayoutIntervalHours = (): number => {
    switch (payoutInterval) {
      case 'daily':
        return 24;
      case 'weekly':
        return 168; // 7 days
      case 'monthly':
        return 720; // 30 days
      default:
        return 24;
    }
  };

  const calculateEstimatedDailyEarnings = (): string => {
    if (!amount || !apy) return '0.00';
    const principal = parseFloat(amount);
    const apyDecimal = parseFloat(apy) / 100;
    const dailyEarnings = principal * (apyDecimal / 365);
    return dailyEarnings.toFixed(8);
  };

  const calculateEstimatedYearlyEarnings = (): string => {
    if (!amount || !apy) return '0.00';
    const principal = parseFloat(amount);
    const apyDecimal = parseFloat(apy) / 100;
    
    if (interestType === 'compound') {
      // Compound: A = P * (1 + r)^n - P
      const finalAmount = principal * Math.pow(1 + apyDecimal, 1);
      return (finalAmount - principal).toFixed(2);
    } else {
      // Simple: I = P * r
      return (principal * apyDecimal).toFixed(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !symbol.trim() || !amount || !apy) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        walletId: Number(walletId),
        symbol: symbol.trim().toUpperCase(),
        amount: parseFloat(amount),
        tags: 'earn',
        notes: platform ? `${platform}${notes ? ` - ${notes}` : ''}` : notes,
        earnConfig: {
          enabled: true,
          apy: parseFloat(apy),
          interestType,
          payoutIntervalHours: getPayoutIntervalHours(),
        },
      });
      
      // Reset form
      setWalletId(preselectedWalletId || '');
      setSymbol('');
      setAmount('');
      setApy('');
      setInterestType('compound');
      setPayoutInterval('daily');
      setPlatform('');
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Error adding earn position:', error);
      alert('Failed to add earn position. Please try again.');
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
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Earn Position</h2>
          </div>
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
            {/* Info Banner */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Earn positions automatically calculate interest based on your APY. Interest compounds or accumulates based on your settings.
                </p>
              </div>
            </div>

            {/* Wallet Selection */}
            {!preselectedWalletId && (
              <div>
                <label htmlFor="earn-wallet" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Wallet
                </label>
                <select
                  id="earn-wallet"
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

            {/* Symbol */}
            <div>
              <label htmlFor="earn-symbol" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cryptocurrency Symbol
              </label>
              <input
                id="earn-symbol"
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g., USDT, USDC, BTC"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                required
              />
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="earn-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <input
                id="earn-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* APY */}
            <div>
              <label htmlFor="earn-apy" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                APY (Annual Percentage Yield)
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
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                The annual interest rate offered by the platform
              </p>
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
                  <div className="text-xs opacity-75">Snowball effect</div>
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
                  <div className="text-xs opacity-75">Fixed income</div>
                </button>
              </div>
            </div>

            {/* Payout Interval */}
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

            {/* Platform */}
            <div>
              <label htmlFor="earn-platform" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Platform (Optional)
              </label>
              <select
                id="earn-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select platform...</option>
                <option value="Binance Earn">Binance Earn</option>
                <option value="OKX Earn">OKX Earn</option>
                <option value="Kraken Staking">Kraken Staking</option>
                <option value="Coinbase Earn">Coinbase Earn</option>
                <option value="DeFi Protocol">DeFi Protocol</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Additional Notes */}
            <div>
              <label htmlFor="earn-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="earn-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lock period, special conditions, etc."
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Earnings Preview */}
            {amount && apy && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estimated Earnings Preview
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Daily</div>
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      +{calculateEstimatedDailyEarnings()} {symbol.toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500 dark:text-gray-400">Yearly</div>
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      +{calculateEstimatedYearlyEarnings()} {symbol.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                  {interestType === 'compound' 
                    ? '📈 Compound interest will reinvest earnings automatically' 
                    : '💰 Simple interest provides fixed returns'}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
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
                disabled={
                  isSubmitting ||
                  !walletId ||
                  !symbol.trim() ||
                  !amount ||
                  parseFloat(amount) <= 0 ||
                  !apy ||
                  parseFloat(apy) <= 0
                }
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  'Creating...'
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Create Earn Position
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
