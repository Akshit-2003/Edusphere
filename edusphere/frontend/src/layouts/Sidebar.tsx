import { 
  LayoutDashboard, FolderKanban, Calendar, BrainCircuit, 
  GraduationCap, MessageSquare, Network, Settings, Target 
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../utils/cn";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/" },
  { name: "Workspace", icon: FolderKanban, path: "/workspace" },
  { name: "Planner", icon: Calendar, path: "/planner" },
  { name: "Flashcards", icon: BrainCircuit, path: "/flashcards" },
  { name: "Classrooms", icon: GraduationCap, path: "/classrooms" },
  { name: "Chat", icon: MessageSquare, path: "/chat" },
  { name: "Knowledge Graph", icon: Network, path: "/graph" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-screen w-70 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 backdrop-blur-xl transition-colors duration-300 z-20 overflow-hidden">
      
      {/* Animated Logo Area */}
      <div className="flex h-20 items-center px-6 border-b border-slate-100 dark:border-slate-800 animate-fade-in-right">
        <Link to="/" className="flex items-center gap-3 font-black text-2xl text-slate-900 dark:text-white tracking-tight group">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-purple-600 text-white shadow-lg shadow-brand-500/30 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
            <div className="absolute inset-0 rounded-xl animate-pulse-soft bg-white/20"></div>
            <svg className="w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          Edusphere
        </Link>
      </div>

      {/* Staggered Navigation Links */}
      <nav className="flex-1 space-y-2 p-5 overflow-y-auto overflow-x-hidden">
        <p className="px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 mt-2 animate-fade-in-right" style={{ animationDelay: '50ms' }}>Main Menu</p>
        
        {navItems.map((item, idx) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              // Adding staggered delay dynamically based on index
              style={{ animationDelay: `${(idx + 2) * 50}ms` }}
              className={cn(
                "relative flex items-center gap-4 rounded-xl px-4 py-3 text-base font-semibold transition-all duration-300 group overflow-hidden animate-fade-in-right",
                isActive 
                  ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:translate-x-1.5"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1.5 rounded-r-full bg-brand-600 dark:bg-brand-500 shadow-[0_0_12px_rgba(79,70,229,0.8)] animate-pulse-soft" />
              )}
              
              <item.icon className={cn(
                "h-[22px] w-5.5 transition-transform duration-300 group-hover:scale-110", 
                isActive ? "text-brand-600 dark:text-brand-400" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
              )} />
              <span className="z-10">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Animated Educational Widget */}
      <div className="px-5 pb-2 animate-fade-in-right" style={{ animationDelay: '500ms' }}>
        <div className="rounded-2xl bg-linear-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900/50 p-4 border border-slate-200 dark:border-slate-700/50 shadow-md relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
          
          {/* Shimmer effect overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="h-full w-full animate-shimmer"></div>
          </div>

          <div className="absolute -top-3 -right-3 p-2 opacity-10 group-hover:opacity-20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
            <Target className="h-14 w-14 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 relative z-10">This Week</p>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 relative z-10">Study Goal: 24h</h4>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-2 overflow-hidden relative z-10">
            <div className="bg-linear-to-r from-brand-500 to-purple-500 h-full rounded-full w-[75%] relative overflow-hidden">
               {/* Internal bar animation */}
               <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 relative z-10">18 hours completed</p>
        </div>
      </div>

      {/* Settings & Logout */}
      <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-1 animate-fade-in-right" style={{ animationDelay: '600ms' }}>
        <Link
          to="/settings"
          className="flex items-center gap-4 rounded-xl px-4 py-3 text-base font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:translate-x-1.5 transition-all duration-300 group"
        >
          <Settings className="h-5.5 w-[22px] transition-transform duration-500 group-hover:rotate-90" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
