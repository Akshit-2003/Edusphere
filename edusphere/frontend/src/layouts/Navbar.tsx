import { useState, useEffect, useRef } from "react";
// 1. React Router se useNavigate import kiya
import { useNavigate } from "react-router-dom"; 
import { 
  Search, Bell, Sun, Moon, Plus, 
  CheckSquare, Brain, StickyNote, Settings as SettingsIcon, LogOut,
  X, Command, FileText
} from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

export function Navbar() {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const navigate = useNavigate(); // 2. Navigation hook initialize kiya
  
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navbarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  // 3. Yeh function search items click handle karega
  const handleSearchAction = (path: string) => {
    setIsSearchOpen(false); // Modal band karo
    navigate(path); // Naye page par bhej do
  };

  return (
    <>
      <header ref={navbarRef} className="flex h-20 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-8 transition-colors duration-300 z-40 relative">
        
        {/* Search Trigger */}
        <div className="flex items-center w-full max-w-lg">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 text-base font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus:ring-2 focus:ring-brand-500/20 shadow-sm group"
          >
            <Search className="h-5 w-5 group-hover:text-brand-500 transition-colors" />
            <span className="flex-1 text-left">Search documentation, concepts...</span>
            <kbd className="hidden sm:flex h-6 items-center gap-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 text-xs font-bold text-slate-500 dark:text-slate-300 shadow-sm">
              <span>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4 sm:gap-6 relative">
          
          {/* Create Button Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleMenu('create')}
              className="hidden md:flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-brand-500/20 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              Create
            </button>
            
            {activeMenu === 'create' && (
              <div className="absolute top-full right-0 mt-3 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 p-2 animate-in fade-in slide-in-from-top-4 duration-200 z-50">
                <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Quick Add</p>
                <button 
                  onClick={() => { toggleMenu('create'); navigate('/planner'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
                >
                  <CheckSquare className="h-4 w-4 text-brand-500" /> New Task
                </button>
                <button 
                  onClick={() => { toggleMenu('create'); navigate('/flashcards'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
                >
                  <Brain className="h-4 w-4 text-purple-500" /> New Flashcard
                </button>
                <button 
                  onClick={() => { toggleMenu('create'); navigate('/workspace'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
                >
                  <StickyNote className="h-4 w-4 text-emerald-500" /> Quick Note
                </button>
              </div>
            )}
          </div>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1"></div>

          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="relative flex items-center justify-center h-10 w-10 rounded-full text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 animate-in spin-in-90 duration-300" />
            ) : (
              <Moon className="h-5 w-5 animate-in spin-in-90 duration-300" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button 
              onClick={() => toggleMenu('notifications')}
              className="relative flex items-center justify-center h-10 w-10 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors active:scale-95"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            </button>

            {activeMenu === 'notifications' && (
              <div className="absolute top-full right-0 mt-3 w-80 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white">Notifications</h4>
                  <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 cursor-pointer">Mark all as read</span>
                </div>
                <div className="p-2 space-y-1">
                  <div 
                    onClick={() => { toggleMenu('notifications'); navigate('/planner'); }}
                    className="px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  >
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Assignment due soon</p>
                    <p className="text-xs text-slate-500 mt-0.5">Computer Networks assignment is due in 2 hours.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1"></div>

          {/* User Profile (Hover) */}
          <div 
            className="relative"
            onMouseEnter={() => setActiveMenu('profile')}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <div className="absolute h-6 w-full -bottom-4 z-10" />
            
            <div className="relative cursor-pointer group py-2">
              <div className="h-10 w-10 rounded-full bg-linear-to-tr from-brand-500 to-purple-500 flex items-center justify-center text-base font-bold text-white shadow-md transition-transform group-hover:scale-105">
                AK
              </div>
              <div className="absolute bottom-2 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></div>
            </div>

            {activeMenu === 'profile' && (
              <div className="absolute top-[80%] right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 p-2 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 mb-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Akshit Kansal</p>
                  <p className="text-xs text-slate-500">akshit@edusphere.com</p>
                </div>
                <button 
                  onClick={() => { setActiveMenu(null); navigate('/settings'); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-sm font-semibold transition-colors"
                >
                  <SettingsIcon className="h-4 w-4" /> Settings
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                <button 
                  onClick={() => alert("Logout function will connect to backend soon!")}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 bg-slate-900/40 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)} />
          
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center px-4 py-4 border-b border-slate-100 dark:border-slate-800">
              <Search className="h-6 w-6 text-slate-400 shrink-0" />
              <input 
                autoFocus
                type="text" 
                placeholder="What do you want to learn or find today?"
                className="w-full bg-transparent border-none px-4 text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-2 overflow-y-auto max-h-[60vh]">
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Recent</p>
              
              <div className="space-y-1">
                {/* 4. OnClick handlers for search items added here */}
                <div 
                  onClick={() => handleSearchAction('/workspace')}
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-lg">
                      <FileText className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">DBMS Normalization Notes</span>
                  </div>
                  <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Jump to Workspace</span>
                </div>
                
                <div 
                  onClick={() => handleSearchAction('/planner')}
                  className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
                      <Command className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Go to Planner</span>
                  </div>
                  <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Action</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
