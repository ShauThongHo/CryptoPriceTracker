import { useState, useEffect } from 'react';

type TimeRange = '24h' | '7d' | '30d';

const BACKEND_API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

export function usePortfolioHistory(range: TimeRange) {
  const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720; // 24h, 7d, 30d in hours
  const [history, setHistory] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load from backend server (centralized calculation)
  useEffect(() => {
    if (!USE_BACKEND || !BACKEND_API_BASE) {
      console.log('[usePortfolioHistory] Backend disabled, no portfolio history available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Fetch history data
    Promise.all([
      fetch(`${BACKEND_API_BASE}/portfolio/history?hours=${hours}`),
      fetch(`${BACKEND_API_BASE}/portfolio/history/count`)
    ])
      .then(async ([historyResponse, countResponse]) => {
        const historyResult = await historyResponse.json();
        const countResult = await countResponse.json();
        
        if (historyResult.success && historyResult.data) {
          // Convert backend format to frontend format
          const converted = historyResult.data.map((item: any) => ({
            id: item.id,
            timestamp: new Date(item.timestamp),
            totalValue: item.total_value,
            snapshotData: item.snapshot_data
          }));
          setHistory(converted);
          console.log(`[usePortfolioHistory] Loaded ${converted.length} snapshots from backend`);
        }
        
        if (countResult.success) {
          setCount(countResult.count);
        }
      })
      .catch((error) => {
        console.error('[usePortfolioHistory] Failed to load from backend:', error);
        setHistory([]);
        setCount(0);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [range, hours]);

  return {
    history,
    count,
    isLoading,
  };
}
