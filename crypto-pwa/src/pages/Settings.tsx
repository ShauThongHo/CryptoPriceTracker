import { Moon, Info, Database, Coins, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '../store/themeStore';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="p-6 pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('settings.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('settings.subtitle')}</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* Portfolio */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.portfolio')}</h3>
          </div>
          <div className="p-4">
            <Link
              to="/manage-coins"
              className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Coins className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <div>
                  <span className="text-gray-900 dark:text-gray-100 block">{t('settings.manageCoins')}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{t('settings.manageCoinsDesc')}</span>
                </div>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">→</span>
            </Link>
          </div>
        </div>

        {/* Developer */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.developer')}</h3>
          </div>
          <div className="p-4">
            <Link
              to="/db-test"
              className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">{t('settings.databaseTest')}</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">→</span>
            </Link>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.appearance')}</h3>
          </div>
          <div className="p-4 space-y-3">
            {/* Language Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">{t('settings.language')}</span>
              </div>
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
              </select>
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="flex items-center justify-between w-full hover:bg-gray-50 dark:hover:bg-gray-700 -m-2 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">{t('settings.darkMode')}</span>
              </div>
              <div
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  isDarkMode ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    isDarkMode ? 'translate-x-6' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('settings.about')}</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-gray-100">{t('settings.version')}</span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">1.0.0</span>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('settings.appDescription')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {t('settings.dataStorageNote')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
