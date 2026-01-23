import { useEffect, useState } from 'react';
import { useAssets } from './useAssets';
import { usePrices } from './usePrices';
import { priceService } from '../services/priceService';

/**
 * Hook to automatically sync prices for all assets in portfolio
 */
export function usePriceSync() {
  const { assets } = useAssets();
  const { prices } = usePrices();
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get unique symbols from assets
  const symbols = [...new Set(assets.map((asset) => asset.symbol))];

  const refreshPrices = async () => {
    if (symbols.length === 0) return;
    
    // Check if refresh is available
    if (!priceService.canRefresh()) {
      const remaining = Math.ceil(priceService.getRemainingCooldown() / 1000);
      setError(`Please wait ${remaining}s before refreshing again`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await priceService.refreshAllPrices(symbols);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      console.error('Error refreshing prices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh on mount and when symbols change
  useEffect(() => {
    if (symbols.length > 0) {
      refreshPrices();
    }
    // Only trigger when number of symbols changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.length]);

  return {
    isLoading,
    lastUpdate,
    error,
    refreshPrices,
    priceCount: prices.length,
    canRefresh: priceService.canRefresh(),
    remainingCooldown: priceService.getRemainingCooldown(),
  };
}

/**
 * Hook to get the current USD value of an asset
 */
export function useAssetValue(symbol: string, amount: number) {
  const [value, setValue] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchValue() {
      setIsLoading(true);
      const result = await priceService.getPrice(symbol);
      
      if (mounted) {
        if (result !== null) {
          setValue(result.price * amount);
          setIsFallback(result.isFallback);
        } else {
          setValue(null);
          setIsFallback(false);
        }
        setIsLoading(false);
      }
    }

    fetchValue();

    return () => {
      mounted = false;
    };
  }, [symbol, amount]);

  return { value, isLoading, isFallback };
}

/**
 * Hook to calculate total portfolio value
 */
export function usePortfolioValue() {
  const { assets } = useAssets();
  const { prices } = usePrices(); // Add this to trigger recalculation when prices update
  const [totalValue, setTotalValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [valueBySymbol, setValueBySymbol] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let mounted = true;

    async function calculateTotal() {
      if (assets.length === 0) {
        if (mounted) {
          setTotalValue(0);
          setValueBySymbol(new Map());
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      let total = 0;
      const symbolValues = new Map<string, number>();

      // Group assets by symbol
      const assetsBySymbol = assets.reduce((acc, asset) => {
        if (!acc[asset.symbol]) {
          acc[asset.symbol] = 0;
        }
        acc[asset.symbol] += asset.amount;
        return acc;
      }, {} as Record<string, number>);

      // Fetch prices and calculate values
      for (const [symbol, amount] of Object.entries(assetsBySymbol)) {
        const result = await priceService.getPrice(symbol);
        if (result !== null) {
          const value = result.price * amount;
          total += value;
          symbolValues.set(symbol, value);
        }
      }

      if (mounted) {
        setTotalValue(total);
        setValueBySymbol(symbolValues);
        setIsLoading(false);
      }
    }

    calculateTotal();

    return () => {
      mounted = false;
    };
  }, [assets, prices]); // Add prices as dependency

  return {
    totalValue,
    valueBySymbol,
    isLoading,
    hasAssets: assets.length > 0,
  };
}
