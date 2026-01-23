import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbOperations } from '../db/db';

export function useCustomCoins() {
  const customCoins = useLiveQuery(() => db.customCoins.toArray(), []);

  return {
    customCoins: customCoins || [],
    addCustomCoin: dbOperations.addCustomCoin,
    updateCustomCoin: dbOperations.updateCustomCoin,
    deleteCustomCoin: dbOperations.deleteCustomCoin,
    getCoinBySymbol: dbOperations.getCoinBySymbol,
  };
}
