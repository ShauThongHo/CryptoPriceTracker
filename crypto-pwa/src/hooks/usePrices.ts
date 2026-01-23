import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbOperations, type Price } from '../db/db';

/**
 * Hook to get all cached prices with live reactivity
 */
export function usePrices() {
  const prices = useLiveQuery(() => db.prices.toArray(), []);

  return {
    prices: prices ?? [],
    isLoading: prices === undefined,
  };
}

/**
 * Hook to get a single price by symbol with live reactivity
 */
export function usePrice(symbol: string | undefined) {
  const price = useLiveQuery(
    () => (symbol ? db.prices.get(symbol) : undefined),
    [symbol]
  );

  return {
    price,
    isLoading: price === undefined && symbol !== undefined,
    isStale: price ? dbOperations.isPriceStale(price) : false,
  };
}

/**
 * Hook to perform price operations
 */
export function usePriceOperations() {
  const upsertPrice = async (price: Omit<Price, 'lastUpdated'>) => {
    return await dbOperations.upsertPrice(price);
  };

  const getPrice = async (symbol: string) => {
    return await dbOperations.getPrice(symbol);
  };

  return {
    upsertPrice,
    getPrice,
  };
}
