import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      isDarkMode: false,
      toggleDarkMode: () =>
        set((state) => {
          const newValue = !state.isDarkMode;
          document.documentElement.classList.toggle('dark', newValue);
          return { isDarkMode: newValue };
        }),
      setDarkMode: (value) => {
        set({ isDarkMode: value });
        document.documentElement.classList.toggle('dark', value);
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);

// Initialize dark mode on load
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('theme-storage');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      document.documentElement.classList.toggle('dark', state.isDarkMode);
    } catch (e) {
      // Ignore parse errors
    }
  }
}
