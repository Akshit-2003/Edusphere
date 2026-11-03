import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Flame, Clock, BrainCircuit, CheckCircle2, MoreVertical, PlayCircle, 
  FileText, Sparkles, ArrowRight, Lightbulb, BarChart3, Activity, Calendar as CalendarIcon,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { Button } from "../components/Button";

// Initial Notes Data
const recentNotes = [
  { id: 1, title: "TCP 3-Way Handshake", date: "2 hours ago", topic: "Networking", iconColor: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
  { id: 2, title: "React Hooks Deep Dive", date: "Yesterday", topic: "Frontend", iconColor: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/30" },
];

const weeklyData = [
  { day: "Mon", hours: 3, height: "h-[40%]" },
  { day: "Tue", hours: 5, height: "h-[70%]" },
  { day: "Wed", hours: 2, height: "h-[30%]" },
  { day: "Thu", hours: 6, height: "h-[85%]" },
  { day: "Fri", hours: 4, height: "h-[50%]" },
  { day: "Sat", hours: 7, height: "h-[100%]" },
  { day: "Sun", hours: 0, height: "h-[10%]" },
];

const heatmapData = Array.from({ length: 28 }, () => Math.floor(Math.random() * 5));

export function Dashboard() {
  const navigate = useNavigate();
  const [aiQuery, setAiQuery] = useState("");
  const [userName, setUserName] = useState("Akshit");
  
  // Backend se user data fetch karne ke liye useEffect
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Aap yahan apna logged-in user ka email pass kar sakte hain ya token se fetch kar sakte hain
        const userEmail = localStorage.getItem("userEmail") || "vanshika@gmail.com"; 
        const response = await fetch(`http://127.0.0.1:8000/api/auth/me?email=${userEmail}`);
        if (response.ok) {
          const data = await response.json();
          if (data.full_name) {
            setUserName(data.full_name);
          }
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserData();
  }, []);
  
  const [tasks, setTasks] = useState([
    { id: 1, title: "Review DBMS Normalization", time: "10:00 AM", category: "Database", completed: false, colorClass: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30" },
    { id: 2, title: "Complete API Auth Integration", time: "2:00 PM", category: "Backend", completed: false, colorClass: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30" },
    { id: 3, title: "Computer Networks Assignment", time: "5:00 PM", category: "College", completed: false, colorClass: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30" },
  ]);

  const pendingTasksCount = tasks.filter(task => !task.completed).length;

  const metrics = [
    { label: "Study Streak", value: "12 Days", icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10", border: "hover:border-orange-500/50" },
    { label: "Focus Time", value: "4h 30m", icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", border: "hover:border-blue-500/50" },
    { label: "Flashcards Due", value: "24", icon: BrainCircuit, color: "text-purple-500", bg: "bg-purple-500/10", border: "hover:border-purple-500/50" },
    { label: "Tasks Pending", value: pendingTasksCount.toString(), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "hover:border-emerald-500/50" },
  ];

  const handleAiSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && aiQuery.trim()) {
      const newTask = {
        id: Date.now(),
        title: aiQuery,
        time: "Just Now",
        category: "AI Created",
        completed: false,
        colorClass: "bg-brand-100 text-brand-700 border-brand-200 dark:bg-brand-500/20 dark:text-brand-400 dark:border-brand-500/30"
      };
      setTasks([newTask, ...tasks]);
      setAiQuery(""); 
    }
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  return (
    <div className="space-y-10 pb-12 max-w-7xl mx-auto"> 
      
      {/* HERO SECTION - ANIMATED */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in-up">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 text-brand-600 dark:text-brand-400 text-sm font-bold tracking-wide uppercase mb-2 shadow-sm hover:scale-105 transition-transform duration-300 cursor-default">
            <Sparkles className="h-4 w-4 animate-pulse-soft" /> AI Workspace Active
          </div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome back, <span className="bg-linear-to-r from-brand-600 via-indigo-500 to-purple-600 dark:from-brand-400 dark:via-indigo-400 dark:to-purple-500 bg-clip-text text-transparent drop-shadow-sm">{userName}!</span>
            <span className="animate-wave ml-3 inline-block origin-[70%_70%]">👋</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">
            Your learning ecosystem is ready. Let's crush today's goals and expand your knowledge graph.
          </p>
        </div>
        <Button onClick={() => navigate('/workspace')} size="lg" className="shadow-xl shadow-brand-500/25 dark:shadow-brand-500/10 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-brand-500/40 rounded-xl h-14 px-8 text-base font-bold shrink-0 group">
          <PlayCircle className="mr-2.5 h-6 w-6 transition-transform duration-300 group-hover:scale-110" /> Start Deep Work
        </Button>
      </div>

      {/* AI COMMAND BAR */}
      <div className="relative animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <div className="absolute inset-0 bg-linear-to-r from-brand-500 to-purple-500 rounded-2xl blur-lg opacity-20 dark:opacity-10 transition-opacity duration-500 hover:opacity-30"></div>
        <div className="relative glass-panel rounded-2xl p-2.5 flex items-center shadow-sm transition-all duration-300 focus-within:border-brand-400 dark:focus-within:border-brand-500/50 focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:-translate-y-1 focus-within:shadow-lg">
          <Sparkles className="h-6 w-6 text-brand-500 dark:text-brand-400 ml-4 shrink-0 transition-transform duration-300 hover:rotate-12 hover:scale-110" />
          <input 
            type="text" 
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={handleAiSearch}
            placeholder="Type a new task here and press Enter to add it instantly..." 
            className="w-full bg-transparent border-none px-5 py-3.5 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none text-base font-medium"
          />
          <div className="hidden sm:flex items-center pr-3">
            <kbd className="h-8 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 text-xs font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all hover:scale-105 active:scale-95"
                 onClick={() => handleAiSearch({ key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>)}>
              <span className="text-[10px] font-black">↵</span> Enter
            </kbd>
          </div>
        </div>
      </div>

      {/* SMART INSIGHTS BANNER - WITH SHIMMER */}
      <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
        <div className="relative overflow-hidden rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-linear-to-r from-brand-50 to-indigo-50 dark:from-brand-900/20 dark:to-indigo-900/20 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 group hover:-translate-y-1 transition-transform duration-500">
          
          {/* Shimmer Overlay */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="h-full w-full animate-shimmer"></div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm shrink-0 border border-slate-100 dark:border-slate-700 relative z-10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
            <Lightbulb className="h-6 w-6 text-yellow-500 animate-pulse-soft" />
          </div>
          <div className="flex-1 relative z-10">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">AI Learning Suggestion</h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
              You haven't reviewed <strong>"React Hooks"</strong> flashcards in 3 days. Probability of forgetting is high.
            </p>
          </div>
          <Button onClick={() => navigate('/flashcards')} variant="outline" className="relative z-10 shrink-0 border-brand-300 dark:border-brand-500/50 text-brand-700 dark:text-brand-400 bg-white/50 dark:bg-slate-800/50 hover:bg-brand-100 dark:hover:bg-brand-500/20 font-bold transition-all hover:scale-105">
            Review Now
          </Button>
        </div>
      </div>

      {/* METRICS GRID - FLOATING & SHIMMER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, idx) => (
          <Card 
            key={idx} 
            className={`glass-panel transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-brand-500/10 dark:hover:shadow-black/50 border-transparent ${metric.border} animate-fade-in-up cursor-pointer relative overflow-hidden group`}
            style={{ animationDelay: `${(idx + 2) * 100}ms` }}
          >
            {/* Shimmer Overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="h-full w-full animate-shimmer"></div>
            </div>

            <CardContent className="p-7 flex flex-col gap-5 relative z-10">
              <div className="flex items-center justify-between">
                <div className={`p-3.5 rounded-2xl ${metric.bg} ${metric.color} ring-1 ring-inset ring-current/10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                  <metric.icon className="h-7 w-7" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 dark:text-slate-600 -rotate-45 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-brand-500" />
              </div>
              <div>
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight transition-transform duration-300 group-hover:scale-[1.02] origin-left">{metric.value}</h3>
                <p className="text-base font-semibold text-slate-500 dark:text-slate-400 mt-1.5">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-8 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Progress Chart */}
            <Card className="glass-panel shadow-sm border-slate-200/60 dark:border-slate-700/50 hover:shadow-lg transition-shadow duration-500">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-500 transition-transform hover:scale-110 duration-300" /> Study Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 h-52 flex items-end justify-between gap-2 px-6 relative">
                <div className="absolute inset-0 flex flex-col justify-between px-6 py-4 pointer-events-none opacity-20 dark:opacity-10">
                  <div className="w-full border-b border-slate-400 border-dashed"></div>
                  <div className="w-full border-b border-slate-400 border-dashed"></div>
                  <div className="w-full border-b border-slate-400 border-dashed"></div>
                </div>
                {weeklyData.map((data, i) => (
                  <div key={i} className="flex flex-col items-center gap-3 flex-1 h-full justify-end group z-10 cursor-pointer">
                    <div className={`w-full max-w-10 bg-linear-to-t from-brand-600 to-purple-400 rounded-t-lg transition-all duration-500 relative flex justify-center group-hover:opacity-100 opacity-80 group-hover:-translate-y-1 shadow-md ${data.height}`}>
                      <span className="absolute -top-8 bg-slate-800 dark:bg-white text-white dark:text-slate-900 text-xs font-bold px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-y-1 shadow-lg pointer-events-none">
                        {data.hours}h
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{data.day}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Consistency Heatmap */}
            <Card className="glass-panel shadow-sm border-slate-200/60 dark:border-slate-700/50 hover:shadow-lg transition-shadow duration-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-500 transition-transform hover:scale-110 duration-300" /> Consistency
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-7 gap-2">
                  {heatmapData.map((level, i) => {
                    const colors = [
                      "bg-slate-100 dark:bg-slate-800/80", 
                      "bg-emerald-200 dark:bg-emerald-900/50", 
                      "bg-emerald-300 dark:bg-emerald-700/60", 
                      "bg-emerald-400 dark:bg-emerald-500/80", 
                      "bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]", 
                    ];
                    return <div key={i} className={`aspect-square rounded-md ${colors[level]} hover:scale-125 hover:z-10 hover:ring-2 hover:ring-offset-1 hover:ring-slate-300 dark:hover:ring-slate-500 dark:hover:ring-offset-slate-900 transition-all duration-300 cursor-pointer`} />
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* INTERACTIVE ACTION PLAN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Today's Action Plan</h2>
              <Button variant="ghost" className="text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 font-bold text-sm transition-transform hover:scale-105" onClick={() => navigate('/planner')}>
                View Planner
              </Button>
            </div>
            <Card className="glass-panel shadow-sm overflow-hidden border-slate-200/60 dark:border-slate-700/50">
              <div className="divide-y divide-slate-100/80 dark:divide-slate-800/50">
                {tasks.length === 0 && (
                  <div className="p-6 text-center text-slate-500 font-medium animate-fade-in-up">All caught up! Add a task using the AI Search bar above.</div>
                )}
                {tasks.map((task, idx) => (
                  <div 
                    key={task.id} 
                    onClick={() => toggleTask(task.id)}
                    style={{ animationDelay: `${idx * 100}ms` }}
                    className={`animate-fade-in-up flex items-center justify-between p-6 transition-all duration-500 group cursor-pointer ${task.completed ? 'bg-slate-50/50 dark:bg-slate-900/20 opacity-60' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 hover:pl-8'}`}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`h-6 w-6 rounded-md border-2 flex items-center justify-center transition-all duration-300 shrink-0
                        ${task.completed ? 'bg-brand-500 border-brand-500 text-white scale-90' : 'border-slate-300 dark:border-slate-600 group-hover:border-brand-500 dark:group-hover:border-brand-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 group-hover:scale-110'}
                      `}>
                        {task.completed && <Check className="h-4 w-4 stroke-3 animate-in zoom-in duration-200" />}
                      </div>
                      
                      <div>
                        <p className={`text-base font-bold transition-all duration-300 ${task.completed ? 'text-slate-400 dark:text-slate-600 line-through' : 'text-slate-800 dark:text-slate-200 group-hover:text-brand-700 dark:group-hover:text-brand-400'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-md border transition-colors ${task.colorClass}`}>
                            {task.category}
                          </span>
                          <span className="text-sm text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1.5"><Clock className="h-4 w-4" /> {task.time}</span>
                        </div>
                      </div>
                    </div>
                    <button className="text-slate-300 dark:text-slate-600 hover:text-brand-600 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2.5 hover:bg-brand-50 dark:hover:bg-slate-800 rounded-xl group-hover:rotate-90" onClick={(e) => { e.stopPropagation(); }}>
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          
          <Card className="glass-panel shadow-sm border-slate-200/60 dark:border-slate-700/50 hover:shadow-lg transition-shadow duration-500">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-purple-500 transition-transform hover:scale-110 duration-300" /> August 2026
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
                <div /><div /><div /><div /><div /><div />
                {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                  <div key={date} className={`h-9 w-9 mx-auto flex items-center justify-center rounded-full text-sm font-bold cursor-pointer transition-all duration-300 ${date === 12 ? 'bg-linear-to-tr from-brand-600 to-purple-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.6)] scale-110 animate-pulse-soft' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-125'}`}>
                    {date}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white px-2">Recent Knowledge</h2>
            <Card className="glass-panel shadow-sm border-slate-200/60 dark:border-slate-700/50">
              <CardContent className="p-6 space-y-5">
                {recentNotes.map((note, idx) => (
                  <div 
                    key={note.id} 
                    style={{ animationDelay: `${(idx + 8) * 100}ms` }}
                    className="animate-fade-in-up flex items-start gap-4 group cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 hover:translate-x-2 -mx-2"
                  >
                    <div className={`p-3.5 rounded-xl shadow-sm border transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${note.bg} ${note.iconColor}`}><FileText className="h-5 w-5" /></div>
                    <div className="pt-0.5">
                      <p className="text-base font-bold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{note.title}</p>
                      <p className="text-xs font-bold text-slate-500 mt-1">{note.topic}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}