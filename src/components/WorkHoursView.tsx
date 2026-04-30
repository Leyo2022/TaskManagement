import React, { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, startOfDay, endOfDay, isWithinInterval, parseISO, isSameWeek, isBefore, startOfToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  LabelList
} from 'recharts';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  TrendingUp,
  Filter,
  Edit2,
  Check,
  Timer,
  LayoutGrid,
  Plus,
  PieChart as PieChartIcon,
  User as UserIcon,
  ArrowRight,
  ClipboardList,
  Package,
  Box,
  History,
  X,
  Info,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { WorkLog, Task } from '../types';
import { MOCK_WORK_LOGS, MOCK_TASKS } from '../mockData';

interface WorkHoursViewProps {
  viewId: string;
  currentView: 'list' | 'kanban' | 'dashboard';
  initialDate?: string;
}

type TimeRange = 'day' | 'week' | 'month';

export const WorkHoursView: React.FC<WorkHoursViewProps> = ({ viewId, currentView, initialDate }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [currentDate, setCurrentDate] = useState(() => {
    if (initialDate && !isNaN(new Date(initialDate).getTime())) {
      return new Date(initialDate);
    }
    if (viewId === 'wh1' || viewId === 'wh2') {
      return subWeeks(new Date(), 1);
    }
    return new Date();
  });
  const [selectedUserId, setSelectedUserId] = useState<string | 'all'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | 'all'>('all');
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string | 'all'>('all');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week'>('week');
  const [submittedWeeks, setSubmittedWeeks] = useState<string[]>(['2026-13']); // Mock some submitted weeks
  const [dashboardMode, setDashboardMode] = useState<'person' | 'asset'>('person');
  const [contributorModal, setContributorModal] = useState<{
    isOpen: boolean;
    userName: string;
    assetName: string;
    phaseName: string;
    tasks: { name: string; hours: number }[];
  }>({
    isOpen: false,
    userName: '',
    assetName: '',
    phaseName: '',
    tasks: []
  });

  // Navigation handlers
  const handlePrev = () => {
    if (timeRange === 'day') setCurrentDate(subDays(currentDate, 1));
    else if (timeRange === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (timeRange === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (timeRange === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  // Get date range for filtering
  const dateInterval = useMemo(() => {
    if (timeRange === 'day') return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
    if (timeRange === 'week') return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
    return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
  }, [timeRange, currentDate]);

  const [localWorkLogs, setLocalWorkLogs] = useState<WorkLog[]>(MOCK_WORK_LOGS);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotHours, setForgotHours] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleStatusUpdate = (logId: string, newStatus: 'approved' | 'rejected') => {
    setLocalWorkLogs(localWorkLogs.map(log => 
      log.id === logId ? { ...log, status: newStatus, approvedHours: newStatus === 'approved' ? log.actualHours : 0 } : log
    ));
  };

  const handleBulkApprove = () => {
    setLocalWorkLogs(localWorkLogs.map(log => {
      const logDate = parseISO(log.date);
      const isInRange = isWithinInterval(logDate, { start: dateInterval.start, end: dateInterval.end });
      const matchesUser = selectedUserId === 'all' || log.userId === selectedUserId;
      
      if (isInRange && matchesUser && log.status === 'pending') {
        return { ...log, status: 'approved', approvedHours: log.actualHours };
      }
      return log;
    }));
  };

  const handleSubmitWeek = () => {
    const weekId = format(dateInterval.start, 'yyyy-II'); // Use ISO week
    if (!submittedWeeks.includes(weekId)) {
      setSubmittedWeeks([...submittedWeeks, weekId]);
      // Also update log statuses to 'pending' if they were 'draft' (if we had draft status)
      // For now, just mark the week as submitted
    }
  };

  // Status for the viewed week
  const isCurrentWeek = isSameWeek(currentDate, new Date(), { weekStartsOn: 1 });
  const isPastWeek = isBefore(dateInterval.end, startOfToday());
  const currentWeekId = format(dateInterval.start, 'yyyy-II');
  const isWeekSubmitted = submittedWeeks.includes(currentWeekId);

  // Filter logs based on view, user, and date
  const filteredLogs = useMemo(() => {
    return localWorkLogs.filter(log => {
      const logDate = parseISO(log.date);
      const isInRange = isWithinInterval(logDate, { start: dateInterval.start, end: dateInterval.end });
      const matchesUser = selectedUserId === 'all' || log.userId === selectedUserId;
      
      // Get task info for project/department filtering
      const task = MOCK_TASKS.find(t => t.id === log.taskId);
      const matchesProject = selectedProjectId === 'all' || (task && task.projectId === selectedProjectId);
      
      // Mock department mapping
      const userDepartments: Record<string, string> = {
        'USER-01': '建模部',
        'USER-02': '概念部',
        'USER-03': '合成部',
        'USER-04': '动捕部',
      };
      const userDept = userDepartments[log.userId] || '其他';
      const matchesDepartment = selectedDepartmentName === 'all' || userDept === selectedDepartmentName;

      // If "My Work Hours", filter by current user (mocked as 'USER-01')
      if (viewId === 'wh1' || viewId === 'wh2') {
        return isInRange && log.userId === 'USER-01';
      }
      
      return isInRange && matchesUser && matchesProject && matchesDepartment;
    });
  }, [viewId, selectedUserId, selectedProjectId, selectedDepartmentName, dateInterval, localWorkLogs]);

  // Calculate combined status for the viewed week
  const weekStatus = useMemo(() => {
    if (!isWeekSubmitted) {
      if (isCurrentWeek) {
        return { label: '记录中', color: 'text-indigo-600', dot: 'bg-indigo-500' };
      } else {
        // Past week, not submitted
        if (filteredLogs.length === 0) {
          return { label: '无需提交', color: 'text-slate-400', dot: 'bg-slate-300' };
        }
        return { label: '待提交', color: 'text-amber-600', dot: 'bg-amber-500' };
      }
    }
    
    const hasRejected = filteredLogs.some(log => log.status === 'rejected');
    const allApproved = filteredLogs.length > 0 && filteredLogs.every(log => log.status === 'approved');
    
    if (hasRejected) return { label: '审批拒绝待修改', color: 'text-rose-600', dot: 'bg-rose-500' };
    if (allApproved) return { label: '审批通过', color: 'text-emerald-600', dot: 'bg-emerald-500' };
    return { label: '已提交待审批', color: 'text-blue-600', dot: 'bg-blue-500' };
  }, [isWeekSubmitted, isCurrentWeek, filteredLogs]);

  // Relative time label
  const relativeTimeLabel = useMemo(() => {
    if (isCurrentWeek) return '本周';
    const lastWeekDate = subWeeks(new Date(), 1);
    if (isSameWeek(currentDate, lastWeekDate, { weekStartsOn: 1 })) return '上一周';
    return '以前';
  }, [currentDate, isCurrentWeek]);

  const handleManualCorrect = (logId: string, newValue?: string) => {
    const val = parseFloat(newValue !== undefined ? newValue : editValue);
    if (isNaN(val)) return;

    setLocalWorkLogs(localWorkLogs.map(log => 
      log.id === logId ? { 
        ...log, 
        actualHours: val, 
        approvedHours: log.status === 'approved' ? val : log.approvedHours,
      } : log
    ));
    setEditingLogId(null);
    setValidationError(null);
  };

  const handleForgotSubmit = () => {
    const hours = parseFloat(forgotHours);
    const maxForgotHours = Math.max(0, stats.totalAttendance - stats.totalClockIn);
    if (isNaN(hours) || hours <= 0 || hours > maxForgotHours) return;

    // Create a new work log entry for "Forgot Clock-in"
    const newLog: WorkLog = {
      id: `u_manual_${Date.now()}`,
      taskId: 'TASK-001', // Default to some task or let user choose? 
      // The original logic added it to unassigned pool. 
      // In WorkHoursView, we probably want to add it as a log entry or just update the stats.
      // But WorkHoursView shows logs. Let's add a special log entry.
      taskName: '补录工时 (未分配)',
      userId: 'USER-01',
      userName: '老王 (我)',
      date: format(currentDate, 'yyyy-MM-dd'),
      clockInHours: 0,
      actualHours: 0, // It's a "pool" of hours in ClockInView, but here it's a log.
      // Wait, the user said "总的实际工时必须小于等于 实际打卡+补录工时".
      // This means "补录工时" is a separate pool.
      // Let's just track it in state for now or add it to localWorkLogs with a special flag.
      approvedHours: 0,
      attendanceHours: 0,
      status: 'pending',
      description: '补录打卡时长',
    };
    
    // Actually, let's just update a "manualHoursPool" state or similar.
    // But the stats already calculate totalManual based on description.
    // Let's add it to localWorkLogs.
    setLocalWorkLogs(prev => [...prev, newLog]);
    
    // Wait, the user wants it to be "补录工时". 
    // In stats calculation: totalManual = filteredLogs.reduce((sum, log) => sum + (log.description?.includes('补录') ? log.actualHours : 0), 0);
    // So if I add a log with 0 actualHours but it's meant to be "available" hours...
    // The requirement says: "总的实际工时必须小于等于 实际打卡+补录工时".
    // This implies "补录工时" is the amount of hours I've "claimed" I worked but didn't clock in.
    
    // Let's re-read: "总的实际工时必须小于等于 实际打卡+补录工时".
    // This means I have a "budget" of hours = ClockIn + ManualCorrection.
    // And I can't assign more "Actual Hours" to tasks than this budget.
    
    // So "忘打卡" should increase the "Manual Hours" budget.
    // Let's add a state for `extraManualHours`.
    setExtraManualHours(prev => prev + hours);
    setIsForgotModalOpen(false);
    setForgotHours('');
  };

  const [extraManualHours, setExtraManualHours] = useState(0);

  const handleToggleEditing = () => {
    if (isEditingMode) {
      // Validate before saving
      const totalActual = filteredLogs.reduce((sum, log) => sum + log.actualHours, 0);
      const totalAvailable = stats.totalClockIn + stats.totalManual + extraManualHours;
      
      if (totalActual > totalAvailable + 0.01) {
        setValidationError(`总实际工时 (${totalActual}h) 不能超过打卡+补录总时长 (${totalAvailable.toFixed(1)}h)`);
        return;
      }
    }
    setIsEditingMode(!isEditingMode);
    setValidationError(null);
  };

  // Calculate statistics
  const kanbanGroups = useMemo(() => {
    const groups: Record<string, WorkLog[]> = {
      pending: [],
      approved: [],
      rejected: []
    };
    filteredLogs.forEach(log => {
      groups[log.status].push(log);
    });
    return groups;
  }, [filteredLogs]);

  const stats = useMemo(() => {
    const totalActual = filteredLogs.reduce((sum, log) => sum + log.actualHours, 0);
    const totalApproved = filteredLogs.reduce((sum, log) => sum + log.approvedHours, 0);
    const totalAttendance = filteredLogs.reduce((sum, log) => sum + log.attendanceHours, 0);
    const totalClockIn = filteredLogs.reduce((sum, log) => sum + log.clockInHours, 0);
    const totalManual = filteredLogs.reduce((sum, log) => {
      // Assuming manual entries have a specific ID pattern or we track them
      // For mock purposes, let's say logs with description containing '补录' are manual
      return sum + (log.description?.includes('补录') ? log.actualHours : 0);
    }, 0);
    const pendingApproval = filteredLogs.filter(log => log.status === 'pending').length;
    
    // Anomalies for Team View
    const anomalies = [];
    if (viewId === 'wh5') {
      const userStats: Record<string, { name: string; manual: number }> = {};
      filteredLogs.forEach(log => {
        if (!userStats[log.userId]) userStats[log.userId] = { name: log.userName, manual: 0 };
        if (log.description?.includes('补录')) {
          userStats[log.userId].manual += log.actualHours;
        }
      });
      
      for (const userId in userStats) {
        if (userStats[userId].manual > 4) { // Threshold: more than 4h manual entry per week
          anomalies.push({
            userId,
            userName: userStats[userId].name,
            manualHours: userStats[userId].manual,
            reason: '本周申请补录时长存在异常'
          });
        }
      }
    }
    
    // Data for Pie Chart (Hours by Task)
    const taskDataMap: Record<string, { name: string; value: number }> = {};
    filteredLogs.forEach(log => {
      if (!taskDataMap[log.taskId]) {
        taskDataMap[log.taskId] = { name: log.taskName, value: 0 };
      }
      taskDataMap[log.taskId].value += log.actualHours;
    });
    const pieData = Object.values(taskDataMap).sort((a, b) => b.value - a.value);

    // Data for Comparison Chart (Actual vs Management Estimated)
    const comparisonData = Object.values(taskDataMap).map(item => {
      const task = MOCK_TASKS.find(t => t.id === Object.keys(taskDataMap).find(id => taskDataMap[id].name === item.name));
      return {
        name: item.name.length > 8 ? item.name.substring(0, 8) + '...' : item.name,
        fullName: item.name,
        actual: item.value,
        estimated: task?.plannedHours || 0
      };
    }).sort((a, b) => b.actual - a.actual).slice(0, 6);

    // Asset Progress Data (Historical Accumulation)
    const assetProgressMap: Record<string, { 
      assetName: string; 
      phaseName: string; 
      historicalActual: number; 
      currentWeekActual: number;
      estimated: number;
      contributors: Record<string, { name: string; currentWeekTasks: { name: string; hours: number }[] }>;
    }> = {};

    localWorkLogs.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate > dateInterval.end) return;

      const isCurrentWeek = logDate >= dateInterval.start && logDate <= dateInterval.end;

      const task = MOCK_TASKS.find(t => t.id === log.taskId);
      if (task && task.assetIds && task.assetIds.length > 0) {
        const assetId = task.assetIds[0];
        const stepId = task.pipelineStepId || 'Unknown Step';
        const key = `${assetId}-${stepId}`;
        if (!assetProgressMap[key]) {
          assetProgressMap[key] = {
            assetName: assetId,
            phaseName: stepId,
            historicalActual: 0,
            currentWeekActual: 0,
            estimated: task.plannedHours || 0,
            contributors: {}
          };
        }

        if (isCurrentWeek) {
          assetProgressMap[key].currentWeekActual += log.actualHours;
          if (!assetProgressMap[key].contributors[log.userName]) {
            assetProgressMap[key].contributors[log.userName] = { name: log.userName, currentWeekTasks: [] };
          }
          assetProgressMap[key].contributors[log.userName].currentWeekTasks.push({
            name: log.taskName,
            hours: log.actualHours
          });
        } else {
          assetProgressMap[key].historicalActual += log.actualHours;
          // Even if they only worked historically, we might want to show them? 
          // User said "click personnel info... view their input in THIS WEEK"
          // So we only care about current week contributors for the popup?
          // Let's keep all contributors but only store current week tasks.
          if (!assetProgressMap[key].contributors[log.userName]) {
            assetProgressMap[key].contributors[log.userName] = { name: log.userName, currentWeekTasks: [] };
          }
        }
      }
    });

    const assetProgressData = Object.values(assetProgressMap).map(item => ({
      ...item,
      contributors: Object.values(item.contributors)
    }));

    return { totalActual, totalApproved, totalAttendance, totalClockIn, totalManual, pendingApproval, pieData, comparisonData, assetProgressData, anomalies };
  }, [viewId, filteredLogs, localWorkLogs, dateInterval.start, dateInterval.end]);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

  // Group logs by date for display
  const days = useMemo(() => {
    try {
      return eachDayOfInterval(dateInterval);
    } catch (e) {
      console.error("Invalid date interval:", dateInterval);
      return [];
    }
  }, [dateInterval]);

  const CalendarModal = () => {
    const [viewDate, setViewDate] = useState(new Date(currentDate));
    
    // Month View Logic
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const monthStartDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const monthEndDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const monthDays = eachDayOfInterval({ start: monthStartDate, end: monthEndDate });

    // Week View Logic
    const weekStart = startOfWeek(viewDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(viewDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const calendarDays = calendarViewMode === 'month' ? monthDays : weekDays;

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setViewDate(calendarViewMode === 'month' ? subMonths(viewDate, 1) : subWeeks(viewDate, 1))} 
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="text-sm font-bold text-slate-900">
                {calendarViewMode === 'month' 
                  ? format(viewDate, 'yyyy年MM月', { locale: zhCN })
                  : `${format(weekStart, 'MM月dd日')} - ${format(weekEnd, 'MM月dd日')}`
                }
              </span>
              <button 
                onClick={() => setViewDate(calendarViewMode === 'month' ? addMonths(viewDate, 1) : addWeeks(viewDate, 1))} 
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-md mr-2">
                <button 
                  onClick={() => setCalendarViewMode('week')}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded",
                    calendarViewMode === 'week' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                  )}
                >
                  周
                </button>
                <button 
                  onClick={() => setCalendarViewMode('month')}
                  className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded",
                    calendarViewMode === 'month' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
                  )}
                >
                  月
                </button>
              </div>
              <button onClick={() => setIsCalendarOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['一', '二', '三', '四', '五', '六', '日'].map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                const isCurrentMonth = day.getMonth() === viewDate.getMonth();
                const isSelected = isSameDay(day, currentDate);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentDate(day);
                      setIsCalendarOpen(false);
                    }}
                    className={cn(
                      "aspect-square flex items-center justify-center text-xs rounded-lg transition-all",
                      calendarViewMode === 'month' && !isCurrentMonth && "text-slate-300",
                      (calendarViewMode === 'week' || isCurrentMonth) && !isSelected && "text-slate-600 hover:bg-slate-50",
                      isSelected && "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-200",
                      isToday && !isSelected && "text-indigo-600 font-bold bg-indigo-50"
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button 
              onClick={() => {
                setCurrentDate(new Date());
                setIsCalendarOpen(false);
              }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              回今天
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['day', 'week'] as TimeRange[]).map(range => {
              // Hide 'day' for Team Work Hours (wh_stats)
              if (viewId === 'wh_stats' && range === 'day') return null;
              
              return (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                    timeRange === range ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {range === 'day' ? '日' : '周'}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <button onClick={handlePrev} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <div className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group relative" onClick={() => setIsCalendarOpen(true)}>
              <span className="text-sm font-bold text-slate-700 min-w-[120px] text-center">
                {timeRange === 'day' ? format(currentDate, 'yyyy年MM月dd日', { locale: zhCN }) :
                 timeRange === 'week' ? `${format(dateInterval.start, 'MM月dd日')} - ${format(dateInterval.end, 'MM月dd日')}` :
                 format(currentDate, 'yyyy年MM月', { locale: zhCN })}
              </span>
              <CalendarIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
              
              {/* Warning Tooltip for Approval View in Day Mode */}
              {viewId === 'wh5' && timeRange === 'day' && (
                <div className="relative group/tooltip ml-1">
                  <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-[11px] rounded-lg shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all whitespace-nowrap z-[120]">
                    工时是按周提报的，查看具体日期的数据可能会不准
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800" />
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleNext} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-xs font-bold text-slate-400 px-2 border-l border-slate-200 ml-2">
              {relativeTimeLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Submission Status for "My Work Hours" */}
          {(viewId === 'wh1' || viewId === 'wh2') && (
            <div className="flex items-center gap-6 mr-2 border-r border-slate-200 pr-6">
              {weekStatus.label === '待提交' && (
                <button 
                  onClick={() => setIsForgotModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-bold hover:bg-amber-100 transition-all border border-amber-200"
                >
                  <Sparkles className="w-3 h-3" />
                  忘打卡不要紧，点这里！
                </button>
              )}
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">工时状态</span>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", weekStatus.dot)} />
                  <span className={cn("text-xs font-bold", weekStatus.color)}>
                    {weekStatus.label}
                  </span>
                </div>
              </div>

              <button 
                onClick={handleSubmitWeek}
                disabled={!isPastWeek || isWeekSubmitted || filteredLogs.length === 0}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm",
                  !isPastWeek || isWeekSubmitted || filteredLogs.length === 0
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                提交工时
              </button>
            </div>
          )}

          {viewId === 'wh5' && (
            <button 
              onClick={handleBulkApprove}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              一键核准
            </button>
          )}
          {viewId !== 'wh1' && viewId !== 'wh2' && (
            <>
              <select 
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">全项目</option>
                <option value="PROJ-001">流浪地球 3</option>
                <option value="PROJ-002">三体：黑暗森林</option>
                <option value="PROJ-003">黑神话：悟空</option>
              </select>

              <select 
                value={selectedUserId === 'all' && selectedDepartmentName !== 'all' ? `dept:${selectedDepartmentName}` : selectedUserId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') {
                    setSelectedDepartmentName('all');
                    setSelectedUserId('all');
                  } else if (val.startsWith('dept:')) {
                    setSelectedDepartmentName(val.replace('dept:', ''));
                    setSelectedUserId('all');
                  } else {
                    setSelectedUserId(val);
                    const userDepts: Record<string, string> = {
                      'USER-01': '建模部',
                      'USER-02': '概念部',
                      'USER-03': '合成部',
                      'USER-04': '动捕部',
                    };
                    setSelectedDepartmentName(userDepts[val] || 'all');
                  }
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="all">全员 / 全部门</option>
                <optgroup label="建模部">
                  <option value="dept:建模部">全部门 (建模部)</option>
                  <option value="USER-01">老王 (我)</option>
                </optgroup>
                <optgroup label="概念部">
                  <option value="dept:概念部">全部门 (概念部)</option>
                  <option value="USER-02">小李</option>
                </optgroup>
                <optgroup label="合成部">
                  <option value="dept:合成部">全部门 (合成部)</option>
                  <option value="USER-03">阿强</option>
                </optgroup>
                <optgroup label="动捕部">
                  <option value="dept:动捕部">全部门 (动捕部)</option>
                  <option value="USER-04">阿伟</option>
                </optgroup>
              </select>
            </>
          )}
          {(viewId === 'wh1' || viewId === 'wh2' || viewId === 'wh5') && (
            <button 
              onClick={handleToggleEditing}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm",
                isEditingMode 
                  ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              )}
            >
              {isEditingMode ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  保存工时
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  填写工时
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {validationError && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-3 text-rose-600 text-xs font-bold"
        >
          <AlertCircle className="w-4 h-4" />
          {validationError}
        </motion.div>
      )}

      {/* Calendar Modal */}
      {isCalendarOpen && <CalendarModal />}

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">考勤时长</span>
          </div>
          <div className="flex items-baseline gap-2">
            {stats.totalAttendance > 0 ? (
              <>
                <span className="text-2xl font-black text-slate-900">{stats.totalAttendance}</span>
                <span className="text-xs text-slate-400 font-medium">小时</span>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-400">无出勤计划</span>
            )}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">出勤工时</span>
          </div>
          <div className="flex items-baseline gap-2">
            {stats.totalActual > 0 ? (
              <>
                <span className="text-2xl font-black text-slate-900">{stats.totalActual}</span>
                <span className="text-xs text-slate-400 font-medium">小时</span>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-400">无出勤</span>
            )}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Timer className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">实际打卡</span>
          </div>
          <div className="flex items-baseline gap-2">
            {stats.totalClockIn > 0 ? (
              <>
                <span className="text-2xl font-black text-slate-900">{stats.totalClockIn}</span>
                <span className="text-xs text-slate-400 font-medium">小时</span>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-400">无</span>
            )}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">补录工时</span>
          </div>
          <div className="flex items-baseline gap-2">
            {(stats.totalManual + extraManualHours) > 0 ? (
              <>
                <span className="text-2xl font-black text-slate-900">{(stats.totalManual + extraManualHours).toFixed(1)}</span>
                <span className="text-xs text-slate-400 font-medium">小时</span>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-400">无补录</span>
            )}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">核准工时</span>
          </div>
          <div className="flex items-baseline gap-2">
            {stats.totalApproved > 0 ? (
              <>
                <span className="text-2xl font-black text-slate-900">{stats.totalApproved}</span>
                <span className="text-xs text-slate-400 font-medium">小时</span>
              </>
            ) : (
              <span className="text-lg font-bold text-slate-400">未核准</span>
            )}
          </div>
        </div>
      </div>

      {/* Anomaly Data Analysis Section for Team View */}
      {viewId === 'wh5' && stats.anomalies.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-900">异常数据分析</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.anomalies.map((anomaly, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600">
                    {anomaly.userName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{anomaly.userName}</p>
                    <p className="text-[10px] text-rose-600 font-medium">{anomaly.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-rose-600">{anomaly.manualHours}h</span>
                  <button className="block text-[9px] font-bold text-indigo-600 hover:underline mt-0.5">去确认</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentView === 'list' ? (
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                工时明细
              </h3>
              <div className="flex items-center gap-2">
                <button className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">任务开始</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">计划 / 实际完成</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">任务</th>
                    {viewId !== 'wh1' && <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">人员</th>}
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">标准</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">管理</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">打卡</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">实际</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">核准</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">说明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                        {(() => {
                          const task = MOCK_TASKS.find(t => t.id === log.taskId);
                          return (
                            <>
                              <td className="px-6 py-4 text-xs font-medium text-slate-600">
                                {task ? format(new Date(task.plannedStartDate), 'MM-dd') : '-'}
                                {task && <span className="ml-1 text-slate-400">({format(new Date(task.plannedStartDate), 'EEE', { locale: zhCN })})</span>}
                              </td>
                              <td className="px-6 py-4 text-xs font-medium">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase w-8">计划:</span>
                                    <span className="text-slate-600">{task ? format(new Date(task.plannedEndDate), 'MM-dd') : '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase w-8">实际:</span>
                                    <span className={cn(task?.actualEndDate || task?.status === 'done' ? "text-emerald-600" : "text-slate-400")}>
                                      {task?.actualEndDate ? format(new Date(task.actualEndDate), 'MM-dd') : (task?.status === 'done' ? '已完成' : '-')}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </>
                          );
                        })()}
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{log.taskName}</span>
                              {(() => {
                                const task = MOCK_TASKS.find(t => t.id === log.taskId);
                                if (task && task.actualHours > task.plannedHours * 1.2) {
                                  return (
                                    <div className="group/alert relative">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover/alert:block z-50 w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-xl">
                                        工时严重超支：实际 {task.actualHours}h / 计划 {task.plannedHours}h
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono uppercase">{log.taskId}</span>
                          </div>
                        </td>
                        {viewId !== 'wh1' && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                {log.userName.charAt(0)}
                              </div>
                              <span className="text-xs text-slate-600">{log.userName}</span>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-center font-mono text-[10px] text-slate-400">
                          {MOCK_TASKS.find(t => t.id === log.taskId)?.plannedHours || 0}h
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-[10px] text-slate-400">
                          {MOCK_TASKS.find(t => t.id === log.taskId)?.plannedHours || 0}h
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-500">{log.clockInHours}h</td>
                        <td className="px-6 py-4 text-center font-mono text-xs font-bold text-slate-900">
                          {(() => {
                            const isMyWorkHours = viewId === 'wh1' || viewId === 'wh2';
                            const isTeamWorkHours = viewId === 'wh5';
                            
                            const canEdit = isEditingMode && (
                              (isMyWorkHours && (weekStatus.label === '记录中' || weekStatus.label === '待提交' || weekStatus.label === '审批拒绝待修改')) ||
                              isTeamWorkHours
                            );
                            
                            if (canEdit) {
                              return (
                                <div className="flex items-center justify-center">
                                  <input 
                                    type="number" 
                                    step="0.5"
                                    className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
                                    defaultValue={log.actualHours}
                                    onBlur={(e) => handleManualCorrect(log.id, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleManualCorrect(log.id, (e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }}
                                  />
                                </div>
                              );
                            }

                            return (
                              <div className="flex items-center justify-center gap-1 group/edit">
                                <span>{log.actualHours}h</span>
                                {viewId === 'wh5' && log.status === 'pending' && (
                                  <button 
                                    onClick={() => {
                                      setEditingLogId(log.id);
                                      setEditValue(log.actualHours.toString());
                                    }}
                                    className="opacity-0 group-hover/edit:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 transition-opacity"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs text-emerald-600 font-bold">{log.approvedHours}h</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              log.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                              log.status === 'pending' ? "bg-amber-50 text-amber-600" :
                              "bg-rose-50 text-rose-600"
                            )}>
                              {log.status === 'approved' ? '已核准' : log.status === 'pending' ? '待审核' : '已驳回'}
                            </span>
                            {viewId === 'wh5' && log.status === 'pending' && (
                              <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleStatusUpdate(log.id, 'approved')}
                                  className="p-1 hover:bg-emerald-100 rounded text-emerald-600 transition-colors" 
                                  title="核准"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleStatusUpdate(log.id, 'rejected')}
                                  className="p-1 hover:bg-rose-100 rounded text-rose-600 transition-colors" 
                                  title="驳回"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-500 line-clamp-1 max-w-[200px]">{log.description}</p>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={12} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                            <Clock className="w-6 h-6" />
                          </div>
                          <p className="text-sm text-slate-400 font-medium">暂无工时记录</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : currentView === 'dashboard' ? (
          <div className="flex-1 overflow-auto space-y-6 pb-6">
            {/* Dashboard Mode Toggle */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setDashboardMode('person')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      dashboardMode === 'person' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <UserIcon className="w-4 h-4" />
                    人员视角 (本周)
                  </button>
                  <button 
                    onClick={() => setDashboardMode('asset')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all",
                      dashboardMode === 'asset' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Package className="w-4 h-4" />
                    资产视角 (历史累加)
                  </button>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <p className="text-xs text-slate-500">
                  {dashboardMode === 'person' 
                    ? "查看团队成员在本周内的工时分配与预估对比" 
                    : "查看资产各管线步骤的累计投入工时与整体预估进度"}
                </p>
              </div>
            </div>

            {dashboardMode === 'person' ? (
              <>
                <div className="grid grid-cols-12 gap-6">
                  {/* Pie Chart: Hours by Task */}
                  <div className="col-span-12 lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-indigo-500" />
                        工时分配比例 (按任务)
                      </h3>
                    </div>
                    <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
                      <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              {stats.pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => [`${value} 小时`, '工时']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Detailed Legend */}
                      <div className="flex flex-col justify-center gap-3 min-w-[180px]">
                        {stats.pieData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full shrink-0" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-bold text-slate-700 truncate" title={entry.name}>
                                {entry.name}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {entry.value}h ({( (entry.value / stats.totalActual) * 100 ).toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Comparison Chart: Actual vs Estimated */}
                  <div className="col-span-12 lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-500" />
                        实际工时 vs 管理预估 (Top 6 任务)
                      </h3>
                    </div>
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.comparisonData} layout="vertical" margin={{ left: 40, right: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }}
                            width={100}
                          />
                          <RechartsTooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number, name: string) => [
                              `${value}h`, 
                              name === 'actual' ? '本周投入' : '管理预估'
                            ]}
                          />
                          <Legend verticalAlign="top" align="right" iconType="circle" />
                          <Bar dataKey="actual" name="actual" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                          <Bar dataKey="estimated" name="estimated" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Weekly Summary Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-indigo-500" />
                      本周工作摘要
                    </h3>
                    {viewId === 'wh5' && selectedUserId !== 'all' && (
                      <button 
                        onClick={handleBulkApprove}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        一键核准本周全部工时
                      </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">任务名称</th>
                          <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">总计工时</th>
                          <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">状态分布</th>
                          <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {stats.pieData.map((task, idx) => {
                          const taskLogs = filteredLogs.filter(l => l.taskName === task.name);
                          const pendingCount = taskLogs.filter(l => l.status === 'pending').length;
                          const approvedCount = taskLogs.filter(l => l.status === 'approved').length;
                          
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-slate-900">{task.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono uppercase">
                                    {taskLogs[0]?.taskId}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-black text-slate-900">{task.value}h</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  {pendingCount > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-bold">
                                      {pendingCount} 待核
                                    </span>
                                  )}
                                  {approvedCount > 0 && (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold">
                                      {approvedCount} 已核
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <button className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1">
                                  查看详情
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* Asset Progress View */
              <div className="grid grid-cols-12 gap-6">
                {stats.assetProgressData.map((item, idx) => {
                  const totalActual = item.historicalActual + item.currentWeekActual;
                  const histWidth = (item.historicalActual / item.estimated) * 100;
                  const currentWidth = (item.currentWeekActual / item.estimated) * 100;
                  const isOver = totalActual > item.estimated;
                  
                  return (
                    <div key={idx} className="col-span-12 md:col-span-6 lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <Box className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col">
                            <h4 className="text-sm font-bold text-slate-900">{item.assetName}</h4>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{item.phaseName}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-xs font-black",
                            isOver ? "text-rose-600" : "text-slate-900"
                          )}>
                            整体预估: {item.estimated}h
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">累计投入: {totalActual}h</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-slate-300" />
                              <span className="text-slate-400">历史 {item.historicalActual}h</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-emerald-600">本周 {item.currentWeekActual}h</span>
                            </div>
                          </div>
                          {isOver && <span className="text-rose-600 font-black">超支 {(totalActual - item.estimated).toFixed(1)}h</span>}
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-slate-300 transition-all duration-500"
                            style={{ width: `${Math.min(histWidth, 100)}%` }}
                          />
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${Math.min(currentWidth, 100 - Math.min(histWidth, 100))}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">参与人员 (点击查看本周投入)</span>
                          <div className="flex -space-x-2">
                            {item.contributors.map((contributor, cIdx) => (
                              <button 
                                key={cIdx}
                                onClick={() => setContributorModal({
                                  isOpen: true,
                                  userName: contributor.name,
                                  assetName: item.assetName,
                                  phaseName: item.phaseName,
                                  tasks: contributor.currentWeekTasks
                                })}
                                className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 hover:scale-110 hover:z-10 transition-all shadow-sm"
                                title={`${contributor.name} (本周投入: ${contributor.currentWeekTasks.reduce((s, t) => s + t.hours, 0)}h)`}
                              >
                                {contributor.name.charAt(0)}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 italic">
                          <History className="w-3 h-3" />
                          <span>灰色为历史累计，绿色为本周新增</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-6 h-full overflow-x-auto pb-4 min-h-[500px]">
            {(Object.entries(kanbanGroups) as [string, WorkLog[]][]).map(([status, logs]) => (
              <div key={status} className="w-80 shrink-0 flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200/50 overflow-hidden">
                <div className="p-4 border-b border-slate-200/50 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      status === 'approved' ? "bg-emerald-500" :
                      status === 'rejected' ? "bg-rose-500" :
                      "bg-amber-500"
                    )} />
                    <h3 className="text-sm font-bold text-slate-900">
                      {status === 'approved' ? '已核准' : status === 'rejected' ? '已驳回' : '待审核'}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {logs.length}
                    </span>
                  </div>
                  <button className="p-1 hover:bg-slate-100 rounded transition-colors">
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {logs.map(log => (
                    <div 
                      key={log.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{log.taskId}</span>
                        <span className="text-[10px] text-slate-400">{format(new Date(log.date), 'MM-dd')}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mb-2 line-clamp-1">{log.taskName}</h4>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                            {log.userName.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-600">{log.userName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-900">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {log.actualHours}h
                        </div>
                      </div>
                      {log.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded-lg mb-3 italic">
                          "{log.description}"
                        </p>
                      )}
                      
                      {viewId === 'wh5' && log.status === 'pending' && (
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(log.id, 'approved'); }}
                            className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            核准
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(log.id, 'rejected'); }}
                            className="flex-1 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-lg hover:bg-rose-100 transition-colors flex items-center justify-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            驳回
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-300 text-xs">
                      空空如也
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Forgot Clock-in Modal */}
      <AnimatePresence>
        {isForgotModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">补录打卡时长</h3>
                <button 
                  onClick={() => setIsForgotModalOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">最大可申请时长</span>
                    <span className="text-2xl font-black text-amber-700">{Math.max(0, stats.totalAttendance - stats.totalClockIn).toFixed(1)}h</span>
                    <p className="text-[9px] text-amber-600/60 mt-1">计算方式: 出勤时长 - 实际打卡</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-amber-400 opacity-50" />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 ml-1">申请时长 (小时)</label>
                    <input 
                      type="number" 
                      step="0.5"
                      max={Math.max(0, stats.totalAttendance - stats.totalClockIn)}
                      placeholder="请输入补录时长"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={forgotHours}
                      onChange={(e) => setForgotHours(e.target.value)}
                    />
                    <p className="text-[10px] text-amber-600 font-bold ml-1">提示：打卡时长低于出勤时长的要求后，补录时长将计入统计。</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    disabled={!forgotHours || parseFloat(forgotHours) > (stats.totalAttendance - stats.totalClockIn) || parseFloat(forgotHours) <= 0}
                    onClick={handleForgotSubmit}
                    className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-200 transition-all"
                  >
                    确认补录
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Contributor Details Modal */}
      {contributorModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {contributorModal.userName.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-slate-900">{contributorModal.userName}</h3>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">{contributorModal.assetName} · {contributorModal.phaseName}</span>
                </div>
              </div>
              <button 
                onClick={() => setContributorModal({ ...contributorModal, isOpen: false })}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="p-5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider">本周投入明细</h4>
              <div className="space-y-3">
                {contributorModal.tasks.length > 0 ? contributorModal.tasks.map((task, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-xs font-bold text-slate-700">{task.name}</span>
                    <span className="text-xs font-black text-indigo-600">{task.hours}h</span>
                  </div>
                )) : (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    本周暂无投入记录
                  </div>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">本周总计</span>
                <span className="text-sm font-black text-slate-900">
                  {contributorModal.tasks.reduce((sum, t) => sum + t.hours, 0)} 小时
                </span>
              </div>
            </div>
            <div className="p-4 bg-slate-50">
              <button 
                onClick={() => setContributorModal({ ...contributorModal, isOpen: false })}
                className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
