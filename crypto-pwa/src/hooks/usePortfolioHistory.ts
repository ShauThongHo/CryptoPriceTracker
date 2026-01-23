import { useLiveQuery } from 'dexie-react-hooks';
import { dbOperations } from '../db/db';

type TimeRange = '24h' | '7d' | '30d';

export function usePortfolioHistory(range: TimeRange) {
  const history = useLiveQuery(async () => {
    const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720; // 24h, 7d, 30d in hours
    return await dbOperations.getRecentHistory(hours);
  }, [range]);

  const count = useLiveQuery(async () => {
    return await dbOperations.getHistoryCount();
  }, []);

  return {
    history: history || [],
    count: count || 0,
    isLoading: history === undefined,
  };
}
