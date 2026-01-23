export function WalletSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded" />
          <div className="flex-1">
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
        <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 pb-20">
      <div className="mb-6">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
      </div>

      {/* Balance Card Skeleton */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 shadow-lg mb-6 animate-pulse">
        <div className="h-4 bg-primary-400 rounded w-24 mb-2" />
        <div className="h-10 bg-primary-400 rounded w-32 mb-1" />
        <div className="h-4 bg-primary-400 rounded w-20" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-3">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export function PortfolioSkeleton() {
  return (
    <div className="p-6 pb-20">
      <div className="mb-6">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-2 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
      </div>

      {/* Add Button Skeleton */}
      <div className="h-14 bg-gray-300 dark:bg-gray-600 rounded-xl mb-6 animate-pulse" />

      {/* Wallets Skeleton */}
      <div className="space-y-4">
        <WalletSkeleton />
        <WalletSkeleton />
      </div>
    </div>
  );
}
