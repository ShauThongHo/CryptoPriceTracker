import { useState, useEffect } from 'react';

type TimeRange = '24h' | '7d' | '30d';

const BACKEND_API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true';

export function usePortfolioHistory(range: TimeRange) {
  const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720; // 24h, 7d, 30d in hours
  const [history, setHistory] = useState<any[]>([]);
  const [count, setCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load from backend server (centralized calculation)
  useEffect(() => {
    if (!USE_BACKEND) {
      console.log('[usePortfolioHistory] Backend disabled, no portfolio history available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Fetch history data (now includes totalCount in single request)
    fetch(`${BACKEND_API_BASE}/portfolio/history?hours=${hours}`)
      .then(async (response) => {
        console.log('[usePortfolioHistory] Response status:', response.status);
        const result = await response.json();
        console.log('[usePortfolioHistory] Raw result:', result);
        
        if (result.success && result.data) {
          // Convert backend format to frontend format
          const converted = result.data.map((item: any) => ({
            id: item.id,
            timestamp: new Date(item.timestamp),
            totalValue: item.total_value,
            snapshotData: item.snapshot_data
          }));
          setHistory(converted);
          setCount(result.count);  // Data points in current range
          setTotalCount(result.totalCount || result.count);  // Total snapshots in DB
          console.log(`[usePortfolioHistory] ✅ Loaded ${converted.length} snapshots in ${range}`);
          console.log(`[usePortfolioHistory] 📊 Count in range: ${result.count}, Total in DB: ${result.totalCount || result.count}`);
        } else {
          console.warn('[usePortfolioHistory] ⚠️ Invalid result:', result);
        }
      })
      .catch((error) => {
        console.error('[usePortfolioHistory] Failed to load from backend:', error);
        setHistory([]);
        setCount(0);
        setTotalCount(0);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [range, hours]);

  return {
    history,
    count,
    totalCount,
    isLoading,
  };
}
