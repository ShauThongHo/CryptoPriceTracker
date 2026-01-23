import { Plus, Edit2, Trash2, Coins, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomCoins } from '../hooks/useCustomCoins';
import type { CustomCoin } from '../db/db';

// Pre-defined coins from priceService (synced with SYMBOL_TO_ID_MAP)
const PREDEFINED_COINS = [
  { symbol: 'BTC', name: 'Bitcoin', coinGeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', coinGeckoId: 'ethereum' },
  { symbol: 'USDT', name: 'Tether', coinGeckoId: 'tether' },
  { symbol: 'BNB', name: 'BNB', coinGeckoId: 'binancecoin' },
  { symbol: 'SOL', name: 'Solana', coinGeckoId: 'solana' },
  { symbol: 'USDC', name: 'USD Coin', coinGeckoId: 'usd-coin' },
  { symbol: 'COMP', name: 'Compound', coinGeckoId: 'compound-governance-token' },
  { symbol: 'CRO', name: 'Cronos', coinGeckoId: 'crypto-com-chain' },
  { symbol: 'POL', name: 'Polygon Ecosystem', coinGeckoId: 'polygon-ecosystem-token' },
  { symbol: 'XPIN', name: 'XPIN Network', coinGeckoId: 'xpin-network' },
  { symbol: 'XAUT', name: 'Tether Gold', coinGeckoId: 'tether-gold' },
  { symbol: 'USD1', name: 'USD1', coinGeckoId: 'usd1-wlfi' },
  { symbol: 'XDAI', name: 'xDAI', coinGeckoId: 'xdai' },
];

export default function ManageCoins() {
  const navigate = useNavigate();
  const { customCoins, addCustomCoin, updateCustomCoin, deleteCustomCoin } = useCustomCoins();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoin, setEditingCoin] = useState<CustomCoin | null>(null);
  const [activeTab, setActiveTab] = useState<'predefined' | 'custom'>('predefined');
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    coinGeckoId: '',
  });

  const handleOpenModal = (coin?: CustomCoin) => {
    if (coin) {
      setEditingCoin(coin);
      setFormData({
        symbol: coin.symbol,
        name: coin.name,
        coinGeckoId: coin.coinGeckoId,
      });
    } else {
      setEditingCoin(null);
      setFormData({ symbol: '', name: '', coinGeckoId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCoin) {
      await updateCustomCoin(editingCoin.id!, {
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        coinGeckoId: formData.coinGeckoId.toLowerCase(),
      });
    } else {
      await addCustomCoin({
        symbol: formData.symbol.toUpperCase(),
        name: formData.name,
        coinGeckoId: formData.coinGeckoId.toLowerCase(),
        isCustom: true,
      });
    }
    
    setIsModalOpen(false);
    setFormData({ symbol: '', name: '', coinGeckoId: '' });
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this coin?')) {
      await deleteCustomCoin(id);
    }
  };

  return (
    <div className="p-6 pb-20">
      <div className="mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Settings</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Manage Coins</h1>
            <p className="text-gray-600 dark:text-gray-400">Pre-defined and custom cryptocurrencies</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Coin</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('predefined')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'predefined'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Pre-defined ({PREDEFINED_COINS.length})
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            activeTab === 'custom'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Custom ({customCoins.length})
        </button>
      </div>

      {/* Coins List */}
      <div className="space-y-3">
        {activeTab === 'predefined' ? (
          // Pre-defined Coins
          <div className="space-y-3">
            {PREDEFINED_COINS.map((coin) => (
              <div
                key={coin.symbol}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <span className="text-green-700 dark:text-green-300 font-bold text-sm">
                        {coin.symbol.substring(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{coin.name}</h3>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{coin.symbol}</span>
                        <span className="text-gray-400 dark:text-gray-500">•</span>
                        <span className="text-gray-500 dark:text-gray-400 text-xs">{coin.coinGeckoId}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-xs font-medium">Built-in</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Custom Coins
          customCoins.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Coins className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500 opacity-50" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No custom coins yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                Add custom coins that aren't in the default CoinGecko list
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Your First Coin</span>
              </button>
            </div>
          ) : (
            customCoins.map((coin) => (
              <div
                key={coin.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                        <span className="text-primary-700 dark:text-primary-300 font-bold text-sm">
                          {coin.symbol.substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{coin.name}</h3>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{coin.symbol}</span>
                          <span className="text-gray-400 dark:text-gray-500">•</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">{coin.coinGeckoId}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(coin)}
                      className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      aria-label="Edit coin"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(coin.id!)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      aria-label="Delete coin"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div
            className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {editingCoin ? 'Edit Coin' : 'Add Custom Coin'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                    placeholder="BTC"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Bitcoin"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    CoinGecko ID *
                  </label>
                  <input
                    type="text"
                    value={formData.coinGeckoId}
                    onChange={(e) => setFormData({ ...formData, coinGeckoId: e.target.value.toLowerCase() })}
                    placeholder="bitcoin"
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Find coin IDs at coingecko.com/api/documentation
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    {editingCoin ? 'Update' : 'Add'} Coin
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
