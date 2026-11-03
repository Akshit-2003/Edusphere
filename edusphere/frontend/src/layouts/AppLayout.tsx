import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { useThemeStore } from "../store/useThemeStore";

export function AppLayout() {
  const initTheme = useThemeStore((state) => state.initTheme);

  // Initialize theme on first load
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-300">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Subtle grid background that adapts to dark mode */}
        <div className="absolute inset-0 bg-grid-pattern opacity-60 dark:opacity-10 pointer-events-none transition-opacity duration-300" />
        
        <Navbar />
        <main className="flex-1 overflow-y-auto p-8 relative z-10">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}