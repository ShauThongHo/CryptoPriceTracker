import { useState } from 'react';
import { Database, Plus, Trash2, Wallet as WalletIcon } from 'lucide-react';
import { useWallets, useWalletOperations } from '../hooks/useWallets';
import { useAssets, useAssetOperations } from '../hooks/useAssets';

export default function DatabaseTest() {
  const { wallets, isLoading: walletsLoading } = useWallets();
  const { assets, isLoading: assetsLoading } = useAssets();
  const { addWallet, deleteWallet } = useWalletOperations();
  const { addAsset, deleteAsset } = useAssetOperations();

  const [showAddWallet, setShowAddWallet] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [walletType, setWalletType] = useState<'hot' | 'cold' | 'exchange'>('hot');

  const [showAddAsset, setShowAddAsset] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<number | ''>('');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetAmount, setAssetAmount] = useState('');

  const handleAddWallet = async () => {
    if (walletName.trim()) {
      await addWallet({ name: walletName, type: walletType });
      setWalletName('');
      setShowAddWallet(false);
    }
  };

  const handleAddAsset = async () => {
    if (selectedWalletId && assetSymbol.trim() && assetAmount) {
      await addAsset({
        walletId: Number(selectedWalletId),
        symbol: assetSymbol.toUpperCase(),
        amount: parseFloat(assetAmount),
      });
      setAssetSymbol('');
      setAssetAmount('');
      setSelectedWalletId('');
      setShowAddAsset(false);
    }
  };

  return (
    <div className="p-6 pb-20">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-6 h-6 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Database Test</h1>
        </div>
        <p className="text-sm text-gray-600">
          Test IndexedDB functionality - Open DevTools → Application → IndexedDB → CryptoPortfolioDB
        </p>
      </div>

      {/* Wallets Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Wallets ({walletsLoading ? '...' : wallets.length})
          </h3>
          <button
            onClick={() => setShowAddWallet(!showAddWallet)}
            className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {showAddWallet && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
            <input
              type="text"
              placeholder="Wallet name"
              value={walletName}
              onChange={(e) => setWalletName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <select
              value={walletType}
              onChange={(e) => setWalletType(e.target.value as 'hot' | 'cold' | 'exchange')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="hot">Hot Wallet</option>
              <option value="cold">Cold Wallet</option>
              <option value="exchange">Exchange</option>
            </select>
            <button
              onClick={handleAddWallet}
              className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm hover:bg-primary-700"
            >
              Create Wallet
            </button>
          </div>
        )}

        <div className="space-y-2">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <WalletIcon className="w-4 h-4 text-gray-600" />
                <div>
                  <div className="font-medium text-sm">{wallet.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{wallet.type}</div>
                </div>
              </div>
              <button
                onClick={() => wallet.id && deleteWallet(wallet.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {wallets.length === 0 && !walletsLoading && (
            <p className="text-sm text-gray-500 text-center py-4">No wallets yet</p>
          )}
        </div>
      </div>

      {/* Assets Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">
            Assets ({assetsLoading ? '...' : assets.length})
          </h3>
          <button
            onClick={() => setShowAddAsset(!showAddAsset)}
            className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-primary-700"
            disabled={wallets.length === 0}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {showAddAsset && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select wallet</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Symbol (e.g., BTC)"
              value={assetSymbol}
              onChange={(e) => setAssetSymbol(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="number"
              placeholder="Amount"
              value={assetAmount}
              onChange={(e) => setAssetAmount(e.target.value)}
              step="0.00000001"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={handleAddAsset}
              className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm hover:bg-primary-700"
            >
              Add Asset
            </button>
          </div>
        )}

        <div className="space-y-2">
          {assets.map((asset) => {
            const wallet = wallets.find((w) => w.id === asset.walletId);
            return (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-sm">
                    {asset.amount} {asset.symbol}
                  </div>
                  <div className="text-xs text-gray-500">in {wallet?.name || 'Unknown'}</div>
                </div>
                <button
                  onClick={() => asset.id && deleteAsset(asset.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {assets.length === 0 && !assetsLoading && (
            <p className="text-sm text-gray-500 text-center py-4">No assets yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
