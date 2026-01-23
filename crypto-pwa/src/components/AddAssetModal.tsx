import { X } from 'lucide-react';
import { useState } from 'react';
import type { Wallet } from '../db/db';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: Wallet[];
  onAdd: (asset: { walletId: number; symbol: string; amount: number; tags?: string; notes?: string }) => Promise<void>;
  preselectedWalletId?: number; // Optional: auto-select wallet
}

export default function AddAssetModal({ isOpen, onClose, wallets, onAdd, preselectedWalletId }: AddAssetModalProps) {
  const [walletId, setWalletId] = useState<number | ''>(preselectedWalletId || '');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update walletId when preselectedWalletId changes
  if (preselectedWalletId && walletId === '') {
    setWalletId(preselectedWalletId);
  }

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !symbol.trim() || !amount) return;

    setIsSubmitting(true);
    try {
      await onAdd({
        walletId: Number(walletId),
        symbol: symbol.trim().toUpperCase(),
        amount: parseFloat(amount),
        tags: tags || undefined,
        notes: notes || undefined,
      });
      setWalletId(preselectedWalletId || '');
      setSymbol('');
      setAmount('');
      setTags('');
      setNotes('');
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
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-mobile sm:max-w-md p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add Asset</h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
              <option value="Staked">Staked</option>
              <option value="Liquid">Liquid</option>
              <option value="DeFi">DeFi</option>
              <option value="Trading">Trading</option>
              <option value="HODL">HODL</option>
            </select>
          </div>

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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !walletId || !symbol.trim() || !amount || parseFloat(amount) <= 0}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
