import { useLiveQuery } from 'dexie-react-hooks';
import { db, dbOperations } from '../db/db';

export function useApiKeys() {
  const apiKeys = useLiveQuery(() => db.apiKeys.toArray(), []);

  return {
    apiKeys: apiKeys || [],
    addApiKey: dbOperations.addApiKey,
    updateApiKey: dbOperations.updateApiKey,
    deleteApiKey: dbOperations.deleteApiKey,
    getApiKeyByExchange: dbOperations.getApiKeyByExchange,
  };
}
