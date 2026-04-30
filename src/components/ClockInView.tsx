import React, { useState, useEffect, useMemo } from 'react';
import { format, differenceInSeconds, startOfWeek, endOfWeek } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Clock, 
  Play, 
  Square, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ArrowRight, 
  History,
  User,
  Search,
  ChevronRight,
  LayoutGrid,
  Timer,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ClockInSession, UnassignedTime, Task, WorkLog } from '../types';
import { MOCK_TASKS } from '../mockData';
import { motion, AnimatePresence } from 'motion/react';

export const ClockInView: React.FC = () => {
  const [activeSession, setActiveSession] = useState<ClockInSession | null>(null);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [unassignedTimes, setUnassignedTimes] = useState<UnassignedTime[]>([
    { id: 'u1', userId: 'U1', userName: '建模师-老王', date: '2026-03-20', totalDuration: 8, allocatedDuration: 5.5, duration: 2.5, status: 'pending' },
    { id: 'u2', userId: 'U1', userName: '建模师-老王', date: '2026-03-19', totalDuration: 8, allocatedDuration: 6.8, duration: 1.2, status: 'pending' },
  ]);
  const [selectedTaskForSession, setSelectedTaskForSession] = useState<Task | null>(null);
  const [isAllocating, setIsAllocating] = useState<UnassignedTime | null>(null);
  const [allocationTask, setAllocationTask] = useState<Task | null>(null);
  const [allocationHours, setAllocationHours] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [allocationMode, setAllocationMode] = useState<'record' | 'task'>('record');

  const attendanceHours = 40.0; // 本周考勤时长
  const actualClockInHours = 36.2; // 实际打卡
  const maxForgotHours = attendanceHours - actualClockInHours;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (activeSession) {
      interval = setInterval(() => {
        const seconds = differenceInSeconds(new Date(), new Date(activeSession.startTime));
        setElapsedTime(seconds);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClockIn = () => {
    const newSession: ClockInSession = {
      id: `s_${Date.now()}`,
      userId: 'U1',
      userName: '建模师-老王',
      startTime: new Date().toISOString(),
      taskId: selectedTaskForSession?.id,
      taskName: selectedTaskForSession?.name,
      status: 'active'
    };
    setActiveSession(newSession);
  };

  const handleClockOut = () => {
    if (!activeSession) return;
    
    const endTime = new Date().toISOString();
    const duration = elapsedTime / 3600; // in hours
    
    const completedSession: ClockInSession = {
      ...activeSession,
      endTime,
      duration,
      status: 'completed'
    };

    if (activeSession.taskId) {
      // Automatically create a work log if task was selected
      console.log('Automatically recorded to task:', activeSession.taskName);
      // In a real app, this would hit an API
    } else {
      // Add to unassigned pool
      const newUnassigned: UnassignedTime = {
        id: `u_${Date.now()}`,
        userId: activeSession.userId,
        userName: activeSession.userName,
        date: format(new Date(), 'yyyy-MM-dd'),
        totalDuration: parseFloat(duration.toFixed(2)),
        allocatedDuration: 0,
        duration: parseFloat(duration.toFixed(2)),
        sourceSessionId: activeSession.id,
        status: 'pending'
      };
      setUnassignedTimes(prev => [newUnassigned, ...prev]);
    }

    setActiveSession(null);
    setSelectedTaskForSession(null);
  };

  const handleAllocate = () => {
    if (!isAllocating || !allocationTask || !allocationHours) return;
    
    const hours = parseFloat(allocationHours);
    if (isNaN(hours) || hours <= 0 || hours > isAllocating.duration) return;

    // Create work log (mock)
    console.log(`Allocated ${hours}h to task ${allocationTask.name}`);

    // Update tasks allocatedHours
    setTasks(prev => prev.map(t => 
      t.id === allocationTask.id 
        ? { ...t, allocatedHours: (t.allocatedHours || t.actualHours) + hours } 
        : t
    ));

    // Update unassigned times
    setUnassignedTimes(prev => {
      if (isAllocating.id === 'temp') {
        // For total pool allocation, we subtract from the records sequentially
        let remainingToSubtract = hours;
        return prev.map(u => {
          if (remainingToSubtract <= 0) return u;
          const subtract = Math.min(u.duration, remainingToSubtract);
          remainingToSubtract -= subtract;
          const newDuration = u.duration - subtract;
          const newAllocated = u.allocatedDuration + subtract;
          return { 
            ...u, 
            duration: newDuration, 
            allocatedDuration: newAllocated,
            status: newDuration <= 0.01 ? 'allocated' : 'pending'
          };
        });
      }

      const remaining = isAllocating.duration - hours;
      const allocated = isAllocating.allocatedDuration + hours;
      
      if (remaining <= 0.01) {
        return prev.map(u => u.id === isAllocating.id ? { ...u, duration: 0, allocatedDuration: u.totalDuration, status: 'allocated' } : u);
      }
      return prev.map(u => u.id === isAllocating.id ? { ...u, duration: remaining, allocatedDuration: allocated } : u);
    });

    setIsAllocating(null);
    setAllocationTask(null);
    setAllocationHours('');
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, tasks]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">创作打卡</h1>
          <p className="text-sm text-slate-500">记录您的创作时长，并分配到对应的任务中</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-700">{format(new Date(), 'yyyy年MM月dd日 EEE', { locale: zhCN })}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              {format(weekStart, 'MM月dd日')} - {format(weekEnd, 'MM月dd日')} (本周)
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Column: Active Session & Clock Controls */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-8 flex flex-col items-center text-center gap-6">
              <div className="relative">
                <div className={cn(
                  "w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center transition-all duration-500",
                  activeSession ? "border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]" : "border-slate-100"
                )}>
                  <Clock className={cn("w-8 h-8 mb-2", activeSession ? "text-indigo-500" : "text-slate-300")} />
                  <span className={cn("text-4xl font-black font-mono tracking-tighter", activeSession ? "text-slate-900" : "text-slate-300")}>
                    {formatTime(elapsedTime)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {activeSession ? '正在计时' : '准备就绪'}
                  </span>
                </div>
                {activeSession && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-indigo-500 text-white p-2 rounded-full shadow-lg"
                  >
                    <Timer className="w-4 h-4" />
                  </motion.div>
                )}
              </div>

              <div className="w-full space-y-4">
                {!activeSession ? (
                  <>
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">选择当前任务 (可选)</label>
                      <div className="relative group">
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                          value={selectedTaskForSession?.id || ''}
                          onChange={(e) => setSelectedTaskForSession(tasks.find(t => t.id === e.target.value) || null)}
                        >
                          <option value="">先打卡，稍后分配</option>
                          {tasks.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.allocatedHours || t.actualHours}h)</option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rotate-90 pointer-events-none" />
                      </div>
                    </div>
                    <button 
                      onClick={handleClockIn}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      <Play className="w-6 h-6 fill-current" />
                      开始创作
                    </button>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                      <div className="flex items-center gap-3 mb-1">
                        <LayoutGrid className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">当前任务</span>
                      </div>
                      <p className="text-sm font-bold text-slate-900">
                        {activeSession.taskName || '未指定任务 (稍后分配)'}
                      </p>
                    </div>
                    <button 
                      onClick={handleClockOut}
                      className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-rose-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      <Square className="w-6 h-6 fill-current" />
                      结束创作
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-auto p-6 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">本周统计</h3>
                <History className="w-4 h-4 text-slate-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">本周考勤时长</span>
                  <span className="text-lg font-black text-slate-900">40.0h</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">实际考勤</span>
                  <span className="text-lg font-black text-indigo-600">38.5h</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">实际打卡</span>
                  <span className="text-lg font-black text-slate-900">36.2h</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase mb-1">已分配时长</span>
                  <span className="text-lg font-black text-emerald-600">32.5h</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Unassigned Time & Allocation */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-6 min-h-0">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">时长分配</h3>
                    <p className="text-[10px] text-slate-400 font-medium">精确统计: {unassignedTimes.reduce((acc, curr) => acc + curr.duration, 0).toFixed(2)}h</p>
                  </div>
                </div>
                
                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                  <button 
                    onClick={() => setAllocationMode('record')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                      allocationMode === 'record' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    按记录分配
                  </button>
                  <button 
                    onClick={() => setAllocationMode('task')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                      allocationMode === 'task' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                    )}
                  >
                    按任务分配
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {allocationMode === 'record' ? `共 ${unassignedTimes.length} 条记录` : `共 ${tasks.length} 个任务`}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {allocationMode === 'record' ? (
                unassignedTimes.map(time => (
                  <div 
                    key={time.id}
                    className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(time.date), 'MMM')}</span>
                        <span className="text-lg font-black text-slate-900 leading-none">{format(new Date(time.date), 'dd')}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-4 mb-2">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">打卡时长</span>
                            <span className="text-sm font-black text-slate-900">{time.totalDuration}h</span>
                          </div>
                          <div className="w-px h-6 bg-slate-100" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">已分配</span>
                            <span className="text-sm font-black text-emerald-600">{time.allocatedDuration}h</span>
                          </div>
                          <div className="w-px h-6 bg-slate-100" />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">待分配</span>
                            <span className={cn("text-sm font-black", time.duration <= 0.01 ? "text-slate-300" : "text-amber-600")}>{time.duration}h</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <History className="w-3 h-3" />
                            来源: {time.sourceSessionId ? '自动计时' : '手动录入'}
                          </p>
                          {time.status === 'allocated' && (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">已全部分配</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {time.status !== 'allocated' && (
                      <button 
                        onClick={() => {
                          setIsAllocating(time);
                          setAllocationHours(time.duration.toString());
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all group-hover:scale-105"
                      >
                        分配到任务
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {tasks.map(task => (
                    <div key={task.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                          <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{task.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono uppercase">{task.id} | {task.projectName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-2">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase">任务已分配</span>
                          <span className="text-sm font-black text-slate-900">{task.allocatedHours || task.actualHours}h</span>
                        </div>
                        <button 
                          onClick={() => {
                            // Mock allocation for task mode
                            setIsAllocating({
                              id: 'temp',
                              userId: 'U1',
                              userName: '老王',
                              date: format(new Date(), 'yyyy-MM-dd'),
                              totalDuration: unassignedTimes.reduce((acc, curr) => acc + curr.duration, 0),
                              allocatedDuration: 0,
                              duration: unassignedTimes.reduce((acc, curr) => acc + curr.duration, 0),
                              status: 'pending'
                            });
                            setAllocationTask(task);
                            setAllocationHours('1.0');
                          }}
                          className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {allocationMode === 'record' && unassignedTimes.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">太棒了！</h4>
                  <p className="text-xs text-slate-400">所有创作时长都已分配完毕</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      <AnimatePresence>
        {isAllocating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">分配工时</h3>
                <button 
                  onClick={() => setIsAllocating(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <Plus className="w-5 h-5 rotate-45 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">待分配时长</span>
                    <span className="text-2xl font-black text-indigo-600">{isAllocating.duration}h</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">日期</span>
                    <span className="text-sm font-bold text-slate-900">{isAllocating.date}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">分配时长 (小时)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      max={isAllocating.duration}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={allocationHours}
                      onChange={(e) => setAllocationHours(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">选择目标任务</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="搜索任务名称或ID..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
                      {filteredTasks.map(task => (
                        <button 
                          key={task.id}
                          onClick={() => setAllocationTask(task)}
                          className={cn(
                            "w-full text-left p-3 flex items-center justify-between transition-colors",
                            allocationTask?.id === task.id ? "bg-indigo-50" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex flex-col">
                            <p className="text-sm font-bold text-slate-900">{task.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-slate-400 font-mono uppercase">{task.id}</p>
                              <span className="text-[10px] text-slate-300">|</span>
                              <p className="text-[10px] text-indigo-500 font-bold uppercase">本周已分配: {task.allocatedHours || task.actualHours}h</p>
                            </div>
                          </div>
                          {allocationTask?.id === task.id && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsAllocating(null)}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    disabled={!allocationTask || !allocationHours}
                    onClick={handleAllocate}
                    className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 transition-all"
                  >
                    确认分配
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
