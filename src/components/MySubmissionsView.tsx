import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { subDays, startOfDay, isAfter } from 'date-fns';
import { 
  CheckCircle2, 
  Clock, 
  Layers, 
  ArrowUpRight, 
  FileText, 
  History,
  AlertCircle,
  List,
  LayoutGrid,
  Search,
  Filter,
  ChevronRight,
  MoreHorizontal,
  MessageSquare,
  Paperclip,
  Calendar,
  X,
  Package,
  Link2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Task, Version, WorkLog, WeeklyWorkLogSubmission } from '../types';
import { MOCK_TASKS, MOCK_VERSIONS, MOCK_WORK_LOGS, MOCK_WEEKLY_SUBMISSIONS } from '../mockData';

type SubmissionTab = 'tasks' | 'versions' | 'worklogs';
type ViewMode = 'list' | 'kanban';
type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'quarter';

interface MySubmissionsViewProps {
  onNavigate?: (viewId: string, params?: any) => void;
}

export const MySubmissionsView = ({ onNavigate }: MySubmissionsViewProps) => {
  const userId = 'USER-ADMIN'; // Current user ID
  const [activeTab, setActiveTab] = useState<SubmissionTab>('tasks');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const filterByTime = (dateStr: string) => {
    if (timeFilter === 'all') return true;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const now = new Date();
    
    switch (timeFilter) {
      case 'today':
        return isAfter(date, startOfDay(now));
      case 'week':
        return isAfter(date, subDays(now, 7));
      case 'month':
        return isAfter(date, subDays(now, 30));
      case 'quarter':
        return isAfter(date, subDays(now, 90));
      default:
        return true;
    }
  };

  // 1. 我提交的任务 (Tasks I created or moved to review)
  const myTasks = useMemo(() => 
    MOCK_TASKS.filter(t => t.creatorId === userId && 
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase())) &&
      filterByTime(t.createdAt)
    ), [searchQuery, timeFilter]);

  // 2. 我发布的版本
  const myVersions = useMemo(() => 
    MOCK_VERSIONS.filter(v => v.publisherId === userId && 
      (v.taskName.toLowerCase().includes(searchQuery.toLowerCase()) || v.versionNumber.toLowerCase().includes(searchQuery.toLowerCase())) &&
      filterByTime(v.publishedAt)
    ), [searchQuery, timeFilter]);

  // 3. 我提交的工时审批 (Weekly Submissions)
  const myWeeklySubmissions = useMemo(() => 
    MOCK_WEEKLY_SUBMISSIONS.filter(s => s.userId === userId && 
      (s.weekRange.includes(searchQuery) || s.status.includes(searchQuery)) &&
      filterByTime(s.submittedAt)
    ), [searchQuery, timeFilter]);

  const tabs = [
    { id: 'tasks', name: '我提交的任务', icon: Layers, count: myTasks.length, color: 'indigo' },
    { id: 'versions', name: '我发布的版本', icon: ArrowUpRight, count: myVersions.length, color: 'sky' },
    { id: 'worklogs', name: '我提交的工时', icon: Clock, count: myWeeklySubmissions.length, color: 'emerald' },
  ];

  const viewModes = [
    { id: 'list', icon: List, label: '列表' },
    { id: 'kanban', icon: LayoutGrid, label: '泳道视图' },
  ];

  const renderTasksView = () => {
    if (viewMode === 'list') {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">任务名称</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">负责人</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">提交时间</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myTasks.map(task => (
                <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{task.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono uppercase">{task.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      task.status === 'done' ? "bg-emerald-50 text-emerald-600" :
                      task.status === 'review' ? "bg-amber-50 text-amber-600" :
                      "bg-blue-50 text-blue-600"
                    )}>
                      {task.status === 'todo' ? '待处理' : 
                       task.status === 'in_progress' ? '进行中' :
                       task.status === 'review' ? '待审核' :
                       task.status === 'done' ? '已完成' : '已阻塞'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <img src={task.assigneeAvatar} className="w-6 h-6 rounded-full" alt="" />
                      <span className="text-xs text-slate-600 font-medium">{task.assigneeName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        setSelectedSubmission(task);
                        setIsApprovalModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      <History className="w-3 h-3" />
                      审批记录
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (viewMode === 'kanban') {
      const statuses = ['todo', 'in_progress', 'review', 'done', 'blocked'];
      const statusLabels: Record<string, string> = {
        todo: '待处理',
        in_progress: '进行中',
        review: '待审核',
        done: '已完成',
        blocked: '已阻塞'
      };

      return (
        <div className="flex gap-6 overflow-x-auto pb-4 min-h-[500px]">
          {statuses.map(status => {
            const tasks = myTasks.filter(t => t.status === status);
            return (
              <div key={status} className="w-80 shrink-0 flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200/50">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      status === 'done' ? "bg-emerald-500" :
                      status === 'review' ? "bg-amber-500" :
                      status === 'blocked' ? "bg-rose-500" : "bg-indigo-500"
                    )} />
                    <h3 className="text-sm font-bold text-slate-900">{statusLabels[status]}</h3>
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                      {tasks.length}
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {tasks.map(task => (
                    <motion.div 
                      key={task.id}
                      layoutId={task.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    >
                      <h4 className="text-sm font-bold text-slate-900 mb-2 leading-snug">{task.name}</h4>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {task.labels.map(label => (
                          <span key={label} className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded font-medium">
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-slate-400">
                            <MessageSquare className="w-3 h-3" />
                            <span className="text-[10px] font-medium">{task.commentsCount}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400">
                            <Paperclip className="w-3 h-3" />
                            <span className="text-[10px] font-medium">{task.attachmentsCount}</span>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubmission(task);
                              setIsApprovalModalOpen(true);
                            }}
                            className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="审批记录"
                          >
                            <History className="w-3 h-3" />
                          </button>
                        </div>
                        <img src={task.assigneeAvatar} className="w-6 h-6 rounded-full border-2 border-white shadow-sm" alt="" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
  };

  const renderVersionsView = () => {
    if (viewMode === 'list') {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">版本号</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">发布资产</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">依赖资产</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">状态</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myVersions.map(version => (
                <tr key={version.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{version.versionNumber}</span>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5">{new Date(version.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-500">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{version.assetName || '未关联资产'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{version.assetType || '未知类型'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {version.dependencies && version.dependencies.length > 0 ? (
                        version.dependencies.map((dep: any) => (
                          <span key={dep.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                            <Link2 className="w-2.5 h-2.5" />
                            {dep.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">无依赖</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      version.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
                      version.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {version.status === 'approved' ? '已通过' : version.status === 'rejected' ? '已驳回' : '审核中'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => {
                        setSelectedSubmission(version);
                        setIsApprovalModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      <History className="w-3 h-3" />
                      审批记录
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Default to grid/kanban-like view for versions
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {myVersions.map(version => (
          <div key={version.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            <div className="aspect-video bg-slate-100 relative overflow-hidden">
              <img src={version.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" referrerPolicy="no-referrer" />
              <div className="absolute top-3 right-3">
                <span className={cn(
                  "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md",
                  version.status === 'approved' ? "bg-emerald-500/90 text-white" :
                  version.status === 'rejected' ? "bg-rose-500/90 text-white" :
                  "bg-amber-500/90 text-white"
                )}>
                  {version.status === 'approved' ? '已通过' : version.status === 'rejected' ? '已驳回' : '审核中'}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">{version.versionNumber}</span>
                <span className="text-[10px] text-slate-400 font-medium">{new Date(version.publishedAt).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{version.assetName || '未命名资产'}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">{version.assetType || '未知类型'}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  依赖资产
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {version.dependencies && version.dependencies.length > 0 ? (
                    version.dependencies.map((dep: any) => (
                      <span key={dep.id} className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md border border-slate-100 font-medium">
                        {dep.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">无依赖资产</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4 bg-slate-50/50 p-2 rounded-lg border border-slate-100/50 italic">
                "{version.description}"
              </p>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                    {version.publisherName.charAt(0)}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">{version.publisherName}</span>
                </div>
                <button 
                  onClick={() => {
                    setSelectedSubmission(version);
                    setIsApprovalModalOpen(true);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                  title="审批记录"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderWorkLogsView = () => {
    if (viewMode === 'list') {
      return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">提交的周</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">提交时间</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">当前审批状态</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myWeeklySubmissions.map(submission => (
                <tr key={submission.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-bold text-slate-900">{submission.weekRange}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      {submission.status === 'approved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : submission.status === 'rejected' ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <History className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        submission.status === 'approved' ? "text-emerald-600" :
                        submission.status === 'rejected' ? "text-rose-600" :
                        "text-amber-600"
                      )}>
                        {submission.status === 'approved' ? '已通过' : submission.status === 'rejected' ? '已驳回' : '待审核'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setIsApprovalModalOpen(true);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        审批记录
                      </button>
                      <button 
                        onClick={() => onNavigate?.('wh2', { startDate: submission.startDate })}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        查看详情
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // Kanban for weekly submissions
    const statuses = ['pending', 'approved', 'rejected'];
    const statusLabels: Record<string, string> = {
      pending: '待审核',
      approved: '已通过',
      rejected: '已驳回'
    };

    return (
      <div className="flex gap-6 overflow-x-auto pb-4 min-h-[500px]">
        {statuses.map(status => {
          const submissions = myWeeklySubmissions.filter(s => s.status === status);
          return (
            <div key={status} className="w-80 shrink-0 flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200/50">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'approved' ? "bg-emerald-500" :
                    status === 'rejected' ? "bg-rose-500" : "bg-amber-500"
                  )} />
                  <h3 className="text-sm font-bold text-slate-900">{statusLabels[status]}</h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">
                    {submissions.length}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {submissions.map(submission => (
                  <div key={submission.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-bold text-slate-900">{submission.weekRange}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                      <button 
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setIsApprovalModalOpen(true);
                        }}
                        className="text-[10px] font-bold text-indigo-600"
                      >
                        审批记录
                      </button>
                      <button 
                        onClick={() => onNavigate?.('wh2', { startDate: submission.startDate })}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                      >
                        查看详情
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SubmissionTab)}
              className={cn(
                "flex items-center gap-3 px-5 py-3 rounded-2xl transition-all relative overflow-hidden group",
                activeTab === tab.id 
                  ? `bg-${tab.color}-600 text-white shadow-lg shadow-${tab.color}-200` 
                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-white" : `text-${tab.color}-600`)} />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-none mb-1">{tab.name}</p>
                <p className="text-lg font-black leading-none">{tab.count}</p>
              </div>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10 pointer-events-none"
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {/* Time Filter */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 gap-2 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select 
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="text-xs font-bold text-slate-600 outline-none bg-transparent cursor-pointer"
            >
              <option value="all">全部时间</option>
              <option value="today">今天</option>
              <option value="week">最近 7 天</option>
              <option value="month">最近 30 天</option>
              <option value="quarter">最近 90 天</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="搜索提交内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-64 transition-all"
            />
          </div>

          {/* View Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {viewModes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as ViewMode)}
                className={cn(
                  "p-2 rounded-lg transition-all flex items-center gap-2",
                  viewMode === mode.id 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
                title={mode.label}
              >
                <mode.icon className="w-4 h-4" />
                <span className="text-xs font-bold hidden sm:inline">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${viewMode}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'tasks' && renderTasksView()}
          {activeTab === 'versions' && renderVersionsView()}
          {activeTab === 'worklogs' && renderWorkLogsView()}
        </motion.div>
      </AnimatePresence>

      {/* Approval Records Modal */}
      <AnimatePresence>
        {isApprovalModalOpen && selectedSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsApprovalModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">审批记录</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {selectedSubmission.weekRange || selectedSubmission.name || `${selectedSubmission.taskName} (${selectedSubmission.versionNumber})`}
                  </p>
                </div>
                <button 
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="p-6 max-h-[400px] overflow-y-auto">
                {selectedSubmission.approvalRecords && selectedSubmission.approvalRecords.length > 0 ? (
                  <div className="space-y-6">
                    {selectedSubmission.approvalRecords.map((record: any) => (
                      <div key={record.id} className="relative pl-6 border-l-2 border-slate-100 last:border-0 pb-6 last:pb-0">
                        <div className={cn(
                          "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm",
                          record.status === 'approved' ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-900">{record.approverName}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(record.time).toLocaleString()}</span>
                        </div>
                        <div className={cn(
                          "inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest mb-2",
                          record.status === 'approved' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                          {record.status === 'approved' ? '通过' : '驳回'}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                          {record.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <History className="w-12 h-12 opacity-20 mb-4" />
                    <p className="text-sm font-medium">暂无审批记录</p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setIsApprovalModalOpen(false)}
                  className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
