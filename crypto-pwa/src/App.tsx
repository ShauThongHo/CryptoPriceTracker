import { Routes, Route } from 'react-router-dom';
import MobileContainer from './components/MobileContainer';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Settings from './pages/Settings';
import DatabaseTest from './pages/DatabaseTest';
import ManageCoins from './pages/ManageCoins';
import { useSyncHydration } from './hooks/useSyncHydration';

function App() {
  const { syncStatus } = useSyncHydration();

  // Show loading spinner during initial sync
  if (syncStatus.isInitialSync || syncStatus.isSyncing) {
    return (
      <MobileContainer>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              {syncStatus.isOnline ? 'Syncing with server...' : 'Loading...'}
            </p>
          </div>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      {syncStatus.error && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 mb-4 text-sm">
          <p className="text-yellow-800 dark:text-yellow-200">
            {syncStatus.isOnline ? '🔴 Sync error:' : '⚠️ Offline mode:'} {syncStatus.error}
          </p>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/db-test" element={<DatabaseTest />} />
        <Route path="/manage-coins" element={<ManageCoins />} />
      </Routes>
      <BottomNav />
    </MobileContainer>
  );
}

export default App;
