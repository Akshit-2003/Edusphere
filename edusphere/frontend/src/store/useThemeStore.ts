import { create } from "zustand";

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: false,
  
  toggleTheme: () => set((state) => {
    const newTheme = !state.isDarkMode;
    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
    return { isDarkMode: newTheme };
  }),

  initTheme: () => {
    const savedTheme = localStorage.getItem("theme");
    // Check if user previously selected dark mode, OR if their OS is in dark mode
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
      set({ isDarkMode: true });
    } else {
      document.documentElement.classList.remove("dark");
      set({ isDarkMode: false });
    }
  }
}));