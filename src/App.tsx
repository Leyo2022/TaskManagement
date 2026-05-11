import React, { useState, useMemo, useRef, useEffect } from "react";
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
} from "recharts";
import { KanbanBoard } from './components/KanbanBoard';
import {
  LayoutGrid,
  List as ListIcon,
  GanttChart,
  Calendar as CalendarIcon,
  Search,
  Filter,
  Columns,
  Plus,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Clock,
  MessageSquare,
  Paperclip,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Settings2,
  Star,
  History,
  Inbox,
  CalendarDays,
  Tag,
  Briefcase,
  Layers,
  Trash2,
  GripVertical,
  Sparkles,
  HelpCircle,
  X,
  BarChart3,
  ClipboardList,
  CheckSquare,
  Flag,
  Timer,
  PieChart as PieChartIcon,
  Info,
  Activity,
  Clock3,
  Pencil,
  Pause,
  Play,
  CheckCheck,
  Box,
  Database,
  Terminal,
  LogIn,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, isPast } from "date-fns";
import { GoogleGenAI } from "@google/genai";
import { cn } from "./lib/utils";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskType,
  TaskProcessStatus,
  FilterCondition,
  FilterOperator,
  Shortcut,
} from "./types";
import { MOCK_TASKS } from "./mockData";
import { WorkHoursView } from "./components/WorkHoursView";
import { ClockInView } from "./components/ClockInView";
import { MySubmissionsView } from "./components/MySubmissionsView";
import { CreateTaskModal } from "./components/CreateTaskModal";

// --- Types & Constants ---

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "等于" },
  { value: "not_equals", label: "不等于" },
  { value: "contains", label: "包含" },
  { value: "not_contains", label: "不包含" },
  { value: "is_empty", label: "为空" },
  { value: "is_not_empty", label: "不为空" },
];

const TASK_FIELDS: { value: keyof Task; label: string }[] = [
  { value: "id", label: "任务标识" },
  { value: "name", label: "任务名称" },
  { value: "type", label: "任务类型" },
  { value: "assetType", label: "资产类型" },
  { value: "assetIds", label: "关联实体" },
  { value: "status", label: "任务状态" },
  { value: "processStatus", label: "过程状态" },
  { value: "priority", label: "优先级" },
  { value: "assigneeName", label: "责任人" },
  { value: "participantNames", label: "参与人" },
  { value: "reviewerName", label: "审核人" },
  { value: "actualStartDate", label: "任务开始时间" },
  { value: "plannedEndDate", label: "计划完成时间" },
  { value: "overdueTime", label: "超时时间" },
  { value: "plannedHours", label: "预估工时" },
  { value: "actualHours", label: "实际工时" },
  { value: "description", label: "任务描述" },
  { value: "projectName", label: "项目名称" },
  { value: "projectStatus", label: "项目状态" },
  { value: "projectDirector", label: "项目导演" },
  { value: "projectLead", label: "项目负责人" },
  { value: "creatorName", label: "创建人" },
  { value: "progress", label: "进度%" },
];

type RowHeight = "compact" | "standard" | "comfortable";
type SortConfig = { field: keyof Task; order: "asc" | "desc" } | null;

interface ViewDefinition {
  id: string;
  name: string;
  icon: React.ReactNode;
  filters: FilterCondition[];
  type?:
    | "list"
    | "kanban"
    | "gantt"
    | "calendar"
    | "work_hours"
    | "clock_in"
    | "submissions";
}


const CreateViewModal = ({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (view: ViewDefinition) => void;
}) => {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Star");
  const [conditions, setConditions] = useState<FilterCondition[]>([
    { id: "1", field: "assigneeName", operator: "equals", value: "" },
    { id: "2", field: "plannedEndDate", operator: "equals", value: "" },
    { id: "3", field: "priority", operator: "equals", value: "" },
  ]);

  const icons = [
    { name: "Star", component: <Star className="w-3.5 h-3.5" /> },
    { name: "AlertCircle", component: <AlertCircle className="w-3.5 h-3.5" /> },
    { name: "Clock", component: <Clock className="w-3.5 h-3.5" /> },
    { name: "Flag", component: <Flag className="w-3.5 h-3.5" /> },
    { name: "History", component: <History className="w-3.5 h-3.5" /> },
    { name: "Inbox", component: <Inbox className="w-3.5 h-3.5" /> },
  ];

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        id: Math.random().toString(36).substr(2, 9),
        field: "name",
        operator: "contains",
        value: "",
      },
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(
      conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const iconObj = icons.find((i) => i.name === selectedIcon) || icons[0];
    onCreate({
      id: Math.random().toString(36).substr(2, 9),
      name,
      icon: iconObj.component,
      filters: conditions.filter(
        (c) =>
          c.value !== "" ||
          c.operator === "is_empty" ||
          c.operator === "is_not_empty",
      ),
      type: "list",
    });
  };

  const recommendations = [
    {
      label: "我今天截止的",
      icon: "💡",
      filters: [
        {
          id: "r1",
          field: "plannedEndDate",
          operator: "contains",
          value: format(new Date(), "yyyy-MM-dd"),
        },
      ],
    },
    {
      label: "我本周截止的",
      icon: "🗓️",
      filters: [
        { id: "r2", field: "plannedEndDate", operator: "contains", value: "2026-03" },
      ],
    },
    {
      label: "我创建未分配的",
      icon: "⏳",
      filters: [
        { id: "r3", field: "assigneeName", operator: "is_empty", value: "" },
      ],
    },
    {
      label: "我最高优先级的",
      icon: "🚩",
      filters: [
        { id: "r4", field: "priority", operator: "equals", value: "urgent" },
      ],
    },
    {
      label: "我未放入项目的",
      icon: "✨",
      filters: [
        { id: "r5", field: "projectName", operator: "is_empty", value: "" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#1a1b1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white"
      >
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative group/icon">
              <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                {icons.find((i) => i.name === selectedIcon)?.component}
              </div>
              <div className="absolute top-full left-0 mt-2 bg-[#2a2b2e] border border-white/10 rounded-lg p-2 shadow-xl hidden group-hover/icon:grid grid-cols-3 gap-1 z-50">
                {icons.map((icon) => (
                  <button
                    key={icon.name}
                    onClick={() => setSelectedIcon(icon.name)}
                    className={cn(
                      "p-2 rounded hover:bg-white/5 transition-colors",
                      selectedIcon === icon.name
                        ? "text-sky-400 bg-white/5"
                        : "text-white/40",
                    )}
                  >
                    {icon.component}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              placeholder="新捷径"
              className="bg-transparent text-xl font-bold outline-none placeholder:text-white/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-sky-500/20"
            >
              创建
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/40 w-8">满足</span>
              <div className="flex-1 space-y-3">
                {conditions.map((condition, index) => (
                  <div
                    key={condition.id}
                    className="flex items-center gap-3 group"
                  >
                    {index > 0 && (
                      <div className="w-16 shrink-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 flex items-center justify-between cursor-pointer">
                        <span className="text-xs font-medium text-white/60">
                          且
                        </span>
                        <ChevronDown className="w-3 h-3 text-white/20" />
                      </div>
                    )}
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors relative">
                        <div className="flex items-center gap-2 w-full">
                          {condition.field === "assigneeName" && (
                            <User className="w-4 h-4 text-white/40" />
                          )}
                          {(condition.field as string).toLowerCase().includes("date") && (
                            <CalendarIcon className="w-4 h-4 text-white/40" />
                          )}
                          {condition.field === "priority" && (
                            <Flag className="w-4 h-4 text-white/40" />
                          )}
                          <select
                            className="bg-transparent text-sm text-white/80 outline-none w-full appearance-none cursor-pointer"
                            value={condition.field}
                            onChange={(e) =>
                              updateCondition(condition.id, {
                                field: e.target.value as keyof Task,
                              })
                            }
                          >
                            {TASK_FIELDS.map((f) => (
                              <option
                                key={f.value}
                                value={f.value}
                                className="bg-[#1a1b1e]"
                              >
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <ChevronDown className="w-3 h-3 text-white/20 pointer-events-none" />
                      </div>
                      <div className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors relative">
                        <select
                          className="bg-transparent text-sm text-white/80 outline-none w-full appearance-none cursor-pointer"
                          value={condition.operator}
                          onChange={(e) =>
                            updateCondition(condition.id, {
                              operator: e.target.value as FilterOperator,
                            })
                          }
                        >
                          {FILTER_OPERATORS.map((o) => (
                            <option
                              key={o.value}
                              value={o.value}
                              className="bg-[#1a1b1e]"
                            >
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-white/20 pointer-events-none" />
                      </div>
                      <div className="flex-[1.5] bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors group/input">
                        <input
                          type="text"
                          placeholder={`添加${TASK_FIELDS.find((f) => f.value === condition.field)?.label}`}
                          className="bg-transparent text-sm outline-none w-full placeholder:text-white/20"
                          value={condition.value}
                          onChange={(e) =>
                            updateCondition(condition.id, {
                              value: e.target.value,
                            })
                          }
                        />
                        <ChevronDown className="w-3 h-3 text-white/20" />
                      </div>
                    </div>
                    <button
                      onClick={() => removeCondition(condition.id)}
                      className="p-2 text-white/20 hover:text-white/60 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-6">
                <button
                  onClick={addCondition}
                  className="flex items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加条件
                </button>
                <button className="flex items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors">
                  <Plus className="w-4 h-4" />
                  添加条件组
                </button>
              </div>
              <button
                onClick={() => setConditions([])}
                className="flex items-center gap-2 text-sm font-medium text-white/40 hover:text-white/60 transition-colors"
              >
                <History className="w-4 h-4" />
                全部清空
              </button>
            </div>
          </div>

          <div className="space-y-6 text-center">
            <p className="text-sm text-white/40">可以试试点选下面的推荐</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-6">
              {recommendations.map((rec, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setName(rec.label);
                    setConditions(rec.filters);
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors group"
                >
                  <span className="text-lg group-hover:scale-110 transition-transform">
                    {rec.icon}
                  </span>
                  {rec.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Components ---

const FilterPanel = ({
  conditions,
  onUpdate,
  onClose,
}: {
  conditions: FilterCondition[];
  onUpdate: (conditions: FilterCondition[]) => void;
  onClose: () => void;
}) => {
  const [aiInput, setAiInput] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Math.random().toString(36).substr(2, 9),
      field: "name",
      operator: "contains",
      value: "",
    };
    onUpdate([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    onUpdate(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    onUpdate(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `你是一个影视项目管理系统的 AI 助手。请将用户的自然语言查询转换为任务过滤条件。
        支持的字段: ${TASK_FIELDS.map((f) => f.value).join(", ")}
        支持的操作符: ${FILTER_OPERATORS.map((o) => o.value).join(", ")}
        
        返回 JSON 数组格式: [{"field": "...", "operator": "...", "value": "..."}]
        
        用户输入: "${aiInput}"`,
        config: { responseMimeType: "application/json" },
      });

      const result = JSON.parse(response.text || "[]");
      const newConditions = result.map((r: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        ...r,
      }));
      onUpdate([...conditions, ...newConditions]);
      setAiInput("");
    } catch (error) {
      console.error("AI Filter Error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="absolute top-full left-0 mt-2 w-[560px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">筛选</h3>
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* AI Input */}
        <form onSubmit={handleAiSubmit} className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Sparkles
              className={cn(
                "w-4 h-4",
                isAiLoading
                  ? "text-indigo-500 animate-pulse"
                  : "text-indigo-400",
              )}
            />
          </div>
          <input
            type="text"
            placeholder="告诉 AI 你想看到什么。例如：指派给我的任务"
            className="w-full pl-10 pr-4 py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            disabled={isAiLoading}
          />
        </form>

        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            在当前视图，显示符合以下条件的记录
          </p>

          <div className="space-y-2">
            {conditions.map((condition, index) => (
              <div key={condition.id} className="flex items-center gap-2 group">
                <span className="text-xs font-medium text-slate-400 w-6 shrink-0">
                  {index === 0 ? "当" : "且"}
                </span>

                <div className="flex-1 flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                  <select
                    className="bg-transparent text-xs font-medium outline-none cursor-pointer"
                    value={condition.field}
                    onChange={(e) =>
                      updateCondition(condition.id, {
                        field: e.target.value as keyof Task,
                      })
                    }
                  >
                    {TASK_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  <div className="w-px h-3 bg-slate-200" />

                  <select
                    className="bg-transparent text-xs outline-none cursor-pointer text-slate-600"
                    value={condition.operator}
                    onChange={(e) =>
                      updateCondition(condition.id, {
                        operator: e.target.value as FilterOperator,
                      })
                    }
                  >
                    {FILTER_OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>

                  <div className="w-px h-3 bg-slate-200" />

                  {condition.operator !== "is_empty" &&
                    condition.operator !== "is_not_empty" && (
                      <input
                        type="text"
                        className="flex-1 bg-transparent text-xs outline-none placeholder:text-slate-300"
                        placeholder="输入值..."
                        value={condition.value}
                        onChange={(e) =>
                          updateCondition(condition.id, {
                            value: e.target.value,
                          })
                        }
                      />
                    )}
                </div>

                <button
                  onClick={() => removeCondition(condition.id)}
                  className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="cursor-grab active:cursor-grabbing p-1.5 text-slate-300">
                  <GripVertical className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={addCondition}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加条件
            </button>
            <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-600 transition-colors">
              <Plus className="w-3.5 h-3.5" />
              添加筛选条件组
            </button>
            <div className="flex-1" />
            {conditions.length > 0 && (
              <button
                onClick={() => onUpdate([])}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
              >
                清空全部
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StatusBadge = ({ status }: { status: TaskStatus }) => {
  const config: Record<
    TaskStatus,
    { label: string; color: string; bg: string }
  > = {
    todo: { label: "未开始", color: "text-slate-500", bg: "bg-slate-100" },
    in_progress: { label: "进行中", color: "text-blue-600", bg: "bg-blue-50" },
    review: { label: "审核中", color: "text-amber-600", bg: "bg-amber-50" },
    paused: { label: "已暂停", color: "text-rose-400", bg: "bg-rose-50" },
    done: { label: "已完成", color: "text-emerald-600", bg: "bg-emerald-50" },
    cancelled: { label: "已取消", color: "text-slate-400", bg: "bg-slate-200" },
  };
  const { label, color, bg } = config[status] || { label: status, color: "text-slate-500", bg: "bg-slate-100" };
  return (
    <span
      className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", color, bg)}
    >
      {label}
    </span>
  );
};

const ProcessStatusBadge = ({ status }: { status?: TaskProcessStatus }) => {
  if (!status) return null;
  const config: Record<TaskProcessStatus, { label: string; color: string }> = {
    assign_pending: { label: "指派审批中", color: "text-amber-500" },
    assign_rejected: { label: "指派被驳回", color: "text-rose-500" },
    pending_dispatch: { label: "待下发", color: "text-slate-400" },
    producing: { label: "执行中", color: "text-blue-500" },
    reviewing: { label: "审核中", color: "text-amber-500" },
    accepting: { label: "验收中", color: "text-indigo-500" },
    completed: { label: "已完成", color: "text-emerald-500" },
    not_started: { label: "未开始", color: "text-slate-400" },
    paused: { label: "已暂停", color: "text-rose-500" },
  };
  const { label, color } = config[status] || { label: status, color: "text-slate-400" };
  return (
    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 border rounded border-current opacity-80", color)}>
      {label}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  const config: Record<TaskPriority, { label: string; color: string }> = {
    low: { label: "低", color: "text-slate-400" },
    medium: { label: "中", color: "text-blue-500" },
    high: { label: "高", color: "text-orange-500" },
    urgent: { label: "极高", color: "text-rose-600" },
  };
  const { label, color } = config[priority] || { label: priority, color: "text-slate-400" };
  return (
    <div className="flex items-center gap-1">
      <AlertCircle className={cn("w-3 h-3", color)} />
      <span className={cn("text-xs font-medium", color)}>{label}</span>
    </div>
  );
};

const TaskTypeIcon = ({ type }: { type: TaskType }) => {
  const icons: Record<TaskType, React.ReactNode> = {
    asset_creation: <Layers className="w-3.5 h-3.5" />,
    asset_modification: <Settings2 className="w-3.5 h-3.5" />,
    shoot_prep: <CalendarDays className="w-3.5 h-3.5" />,
    review_task: <CheckCircle2 className="w-3.5 h-3.5" />,
    other: <Briefcase className="w-3.5 h-3.5" />,
  };
  return <div className="text-inherit">{icons[type] || <Tag className="w-3.5 h-3.5" />}</div>;
};

const DashboardView = ({ 
  tasks, 
  shortcuts, 
  onAddShortcut 
}: { 
  tasks: Task[], 
  shortcuts: Shortcut[], 
  onAddShortcut: () => void 
}) => {
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      blocked: 0,
    };
    tasks.forEach((t) => counts[t.status]++);
    return [
      { name: "待处理", value: counts.todo, color: "#64748b" },
      { name: "进行中", value: counts.in_progress, color: "#6366f1" },
      { name: "待审核", value: counts.review, color: "#f59e0b" },
      { name: "已完成", value: counts.done, color: "#10b981" },
      { name: "已阻塞", value: counts.blocked, color: "#f43f5e" },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  const priorityData = useMemo(() => {
    const counts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0,
    };
    tasks.forEach((t) => counts[t.priority]++);
    return [
      { name: "低", value: counts.low, color: "#94a3b8" },
      { name: "中", value: counts.medium, color: "#3b82f6" },
      { name: "高", value: counts.high, color: "#f97316" },
      { name: "紧急", value: counts.urgent, color: "#e11d48" },
    ].filter((d) => d.value > 0);
  }, [tasks]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({
        name: type,
        value: count,
      }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  return (
    <div className="space-y-6 pb-8">
      {/* Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[350px]">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-indigo-500" />
            任务状态分布
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[350px]">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Flag className="w-4 h-4 text-orange-500" />
            优先级分布
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <RechartsTooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={32}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[350px]">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-500" />
            任务类型分布
          </h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f1f5f9"
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  width={80}
                />
                <RechartsTooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#6366f1"
                  radius={[0, 4, 4, 0]}
                  barSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const handleTaskUpdate = (task: Task, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };
  const [currentView, setCurrentView] = useState<
    "list" | "kanban" | "dashboard"
  >("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTaskTab, setSelectedTaskTab] = useState<"details" | "workflow" | "hours">("details");
  const [personalViews, setPersonalViews] = useState<ViewDefinition[]>([
    {
      id: "v_mine",
      name: "归属于我的",
      icon: <Inbox className="w-3.5 h-3.5" />,
      filters: [
        {
          id: "f_mine",
          field: "assigneeName",
          operator: "contains",
          value: "陈总",
        },
      ],
      type: "list",
    },
    {
      id: "v_created",
      name: "我创建的",
      icon: <Plus className="w-3.5 h-3.5" />,
      filters: [
        {
          id: "f_created",
          field: "creatorName",
          operator: "contains",
          value: "陈总",
        },
      ],
      type: "list",
    },
    {
      id: "v_participated",
      name: "我参与的",
      icon: <Star className="w-3.5 h-3.5" />,
      filters: [
        {
          id: "f_participated",
          field: "participantNames",
          operator: "contains",
          value: "陈总",
        },
      ],
      type: "list",
    },
  ]);
  const [activeViewId, setActiveViewId] = useState("v4");
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<(keyof Task)[]>([
    "id",
    "name",
    "type",
    "assetType",
    "assetIds",
    "status",
    "priority",
    "assigneeName",
    "participantNames",
    "reviewerName",
    "actualStartDate",
    "plannedEndDate",
    "overdueTime",
    "plannedHours",
    "actualHours",
    "projectName",
    "projectStatus",
    "projectDirector",
    "projectLead",
    "creatorName",
  ]);
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false);
  const [isGroupConfigOpen, setIsGroupConfigOpen] = useState(false);
  const [isSortConfigOpen, setIsSortConfigOpen] = useState(false);
  const [isRowHeightConfigOpen, setIsRowHeightConfigOpen] = useState(false);
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false);
  const [isAddShortcutOpen, setIsAddShortcutOpen] = useState(false);
  const [newShortcutName, setNewShortcutName] = useState("");
  const [newShortcutUrl, setNewShortcutUrl] = useState("");
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([
    { id: 's1', name: 'Kmoke 官网', url: 'https://kmoke.com', color: '#6366f1' },
    { id: 's2', name: '项目文档', url: 'https://docs.example.com', color: '#10b981' },
    { id: 's3', name: '资源库', url: 'https://assets.example.com', color: '#f59e0b' },
  ]);

  // New States for Grouping, Sorting, Row Height, and Pagination
  const [groupBy, setGroupBy] = useState<keyof Task | "none">("none");
  const [sortBy, setSortBy] = useState<SortConfig>(null);
  const [rowHeight, setRowHeight] = useState<RowHeight>("standard");
  const [confirmAction, setConfirmAction] = useState<{ 
    isOpen: boolean; 
    message: string; 
    onConfirm: () => void;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [viewParams, setViewParams] = useState<any>(null);

  const handleNavigate = (viewId: string, params?: any) => {
    setActiveViewId(viewId);
    setViewParams(params);
  };

  const systemViews: ViewDefinition[] = [
    {
      id: "v4",
      name: "所有任务",
      icon: <ListIcon className="w-4 h-4" />,
      filters: [],
      type: "list",
    },
    {
      id: "v_submissions",
      name: "我的提交",
      icon: <ArrowUpRight className="w-4 h-4" />,
      filters: [],
      type: "submissions",
    },
    {
      id: "today_prod",
      name: "今日制作",
      icon: <Layers className="w-4 h-4" />,
      filters: [],
      type: "kanban",
    },
  ];

  const workHourViews: ViewDefinition[] = [
    {
      id: "wh1",
      name: "创作打卡",
      icon: <Timer className="w-4 h-4" />,
      filters: [],
      type: "clock_in",
    },
    {
      id: "wh2",
      name: "我的工时",
      icon: <Clock className="w-4 h-4" />,
      filters: [],
      type: "work_hours",
    },
    {
      id: "wh_stats",
      name: "团队工时",
      icon: <PieChartIcon className="w-4 h-4" />,
      filters: [],
      type: "work_hours",
    },
    {
      id: "wh5",
      name: "工时审批",
      icon: <CheckSquare className="w-4 h-4" />,
      filters: [],
      type: "work_hours",
    },
  ];

  const favoriteViews: ViewDefinition[] = [
    {
      id: "fav1",
      name: "收藏的任务",
      icon: <Star className="w-4 h-4 text-amber-400 fill-amber-400" />,
      filters: [],
      type: "list",
    },
    {
      id: "fav2",
      name: "收藏的项目",
      icon: <Briefcase className="w-4 h-4 text-indigo-400 fill-indigo-400" />,
      filters: [],
      type: "list",
    },
  ];

  const handleViewChange = (viewId: string) => {
    setActiveViewId(viewId);
    const allViews = [
      ...systemViews,
      ...workHourViews,
      ...personalViews,
      ...favoriteViews,
    ];
    const view = allViews.find((v) => v.id === viewId);
    if (view) {
      setFilters(view.filters);
    }
  };

  const handleCreateView = (newView: ViewDefinition) => {
    setPersonalViews([...personalViews, newView]);
    setActiveViewId(newView.id);
    setFilters(newView.filters);
    setIsCreateViewOpen(false);
  };

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((task) => {
      // Search Query
      const matchesSearch =
        task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Advanced Filters
      return filters.every((condition) => {
        const rawValue = task[condition.field];
        if (Array.isArray(rawValue)) {
          const filterValue = String(condition.value || "").toLowerCase();
          const stringified = rawValue.join("|").toLowerCase();
          switch (condition.operator) {
            case "equals":
              return rawValue.some(v => String(v).toLowerCase() === filterValue);
            case "not_equals":
              return !rawValue.some(v => String(v).toLowerCase() === filterValue);
            case "contains":
              return stringified.includes(filterValue);
            case "not_contains":
              return !stringified.includes(filterValue);
            case "is_empty":
              return rawValue.length === 0;
            case "is_not_empty":
              return rawValue.length > 0;
            default:
              return true;
          }
        }
        
        const fieldValue = String(rawValue || "").toLowerCase();
        const filterValue = String(condition.value || "").toLowerCase();

        switch (condition.operator) {
          case "equals":
            return fieldValue === filterValue;
          case "not_equals":
            return fieldValue !== filterValue;
          case "contains":
            return fieldValue.includes(filterValue);
          case "not_contains":
            return !fieldValue.includes(filterValue);
          case "is_empty":
            return !rawValue || rawValue === "";
          case "is_not_empty":
            return !!rawValue && rawValue !== "";
          default:
            return true;
        }
      });
    });

    // Sorting
    if (sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortBy.field];
        const bVal = b[sortBy.field];
        if (aVal === bVal) return 0;
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        const comparison = aVal < bVal ? -1 : 1;
        return sortBy.order === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [tasks, searchQuery, filters, sortBy]);

  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  const groupedTasks = useMemo<Record<string, Task[]>>(() => {
    if (groupBy === "none") return { 所有任务: filteredTasks };

    const groups: Record<string, Task[]> = {};
    filteredTasks.forEach((task) => {
      const key = String(task[groupBy as keyof Task] || "未分类");
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return groups;
  }, [filteredTasks, groupBy]);

  const kanbanGroups = useMemo<Record<string, Task[]>>(() => {
    const groupField = groupBy === "none" ? "status" : groupBy;
    const groups: Record<string, Task[]> = {};

    // Initialize groups based on field type if possible
    if (groupField === "status") {
      ["todo", "in_progress", "review", "paused", "done", "cancelled"].forEach(
        (s) => (groups[s] = []),
      );
    } else if (groupField === "priority") {
      ["low", "medium", "high"].forEach((p) => (groups[p] = []));
    }

    filteredTasks.forEach((t) => {
      const key = String(t[groupField as keyof Task] || "其他");
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [filteredTasks, groupBy]);

  const activeView = useMemo(() => {
    const allViews = [
      ...systemViews,
      ...workHourViews,
      ...personalViews,
      ...favoriteViews,
    ];
    return allViews.find((v) => v.id === activeViewId) || systemViews[0];
  }, [activeViewId, personalViews, systemViews, workHourViews, favoriteViews]);

  useEffect(() => {
    if (activeView.type === "work_hours") {
      if (activeView.id === "wh5") {
        setCurrentView("dashboard");
      } else {
        setCurrentView("list");
      }
    }
  }, [activeView.id, activeView.type]);

  useEffect(() => {
    if (selectedTask) {
      setSelectedTaskTab("details");
    }
  }, [selectedTask?.id]);

  // Helper for task detail theme
  const getTaskTheme = (task: Task) => {
    const isAsset = task.type === TaskType.Asset || task.type === TaskType.AssetModification;
    const isShot = task.type === TaskType.Shot;
    const isOther = !isAsset && !isShot;

    if (isAsset) return { 
      base: "indigo", 
      text: "text-indigo-600", 
      bg: "bg-indigo-600", 
      lightBg: "bg-indigo-50", 
      border: "border-indigo-100", 
      shadow: "shadow-indigo-200", 
      label: "资产任务" 
    };
    if (isShot) return { 
      base: "amber", 
      text: "text-amber-600", 
      bg: "bg-amber-600", 
      lightBg: "bg-amber-50", 
      border: "border-amber-100", 
      shadow: "shadow-amber-200", 
      label: "镜头任务" 
    };
    return { 
      base: "emerald", 
      text: "text-emerald-600", 
      bg: "bg-emerald-600", 
      lightBg: "bg-emerald-50", 
      border: "border-emerald-100", 
      shadow: "shadow-emerald-200", 
      label: "通用任务" 
    };
  };

  const currentTheme = selectedTask ? getTaskTheme(selectedTask) : null;
  const isPipelineTask = selectedTask ? (selectedTask.type === TaskType.Asset || selectedTask.type === TaskType.AssetModification || selectedTask.type === TaskType.Shot) : false;

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold italic">
              CF
            </div>
            <h1 className="text-lg font-bold tracking-tight">CineFlow</h1>
          </div>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-4">
            影视项目管理系统
          </p>
          <button
            onClick={() => setIsCreateTaskModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2.5 text-sm font-bold transition-all shadow-md shadow-indigo-200 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h2 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              系统视图
            </h2>
            <div className="space-y-1">
              {systemViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleViewChange(view.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    activeViewId === view.id
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {view.icon}
                  {view.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              工时情况
            </h2>
            <div className="space-y-1">
              {workHourViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleViewChange(view.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    activeViewId === view.id
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {view.icon}
                  {view.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                个人视图
              </h2>
              <button
                onClick={() => setIsCreateViewOpen(true)}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {personalViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => handleViewChange(view.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    activeViewId === view.id
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {view.icon}
                  {view.name}
                </button>
              ))}
            </div>
          </div>

          {/* Favorites & Shortcuts placeholder - removed */}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <img
              src="https://picsum.photos/seed/me/40/40"
              className="w-8 h-8 rounded-full border border-slate-200"
              alt="Me"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">制片人-陈总</p>
              <p className="text-[10px] text-slate-400 truncate">
                d05009681@gmail.com
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
          {activeView.type === "submissions" ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">我的提交</h2>
            </div>
          ) : activeView.id === "today_prod" ? (
             <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">今日制作看板管理</h2>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索任务名称、ID..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-1 border-l border-slate-200 pl-4 relative">
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={cn(
                      "p-2 rounded-lg transition-all flex items-center gap-2",
                      isFilterOpen || filters.length > 0
                        ? "bg-indigo-50 text-indigo-600"
                        : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    <Filter className="w-4 h-4" />
                    {filters.length > 0 && (
                      <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {filters.length}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isFilterOpen && (
                      <FilterPanel
                        conditions={filters}
                        onUpdate={setFilters}
                        onClose={() => setIsFilterOpen(false)}
                      />
                    )}
                  </AnimatePresence>

                  <button
                    onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)}
                    className={cn(
                      "p-2 rounded-lg transition-all flex items-center gap-2",
                      isColumnConfigOpen
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-500 hover:bg-slate-50",
                    )}
                  >
                    <Columns className="w-4 h-4" />
                    <span className="text-xs font-medium">字段配置</span>
                  </button>

                  <AnimatePresence>
                    {isColumnConfigOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2"
                      >
                        <div className="px-2 py-1.5 border-b border-slate-50 mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            显示字段
                          </span>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-0.5">
                          {TASK_FIELDS.map((field) => (
                            <label
                              key={field.value}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={visibleColumns.includes(field.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setVisibleColumns([
                                      ...visibleColumns,
                                      field.value,
                                    ]);
                                  } else {
                                    setVisibleColumns(
                                      visibleColumns.filter(
                                        (c) => c !== field.value,
                                      ),
                                    );
                                  }
                                }}
                              />
                              <span className="text-xs text-slate-600">
                                {field.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="relative">
                    <button
                      onClick={() => setIsGroupConfigOpen(!isGroupConfigOpen)}
                      className={cn(
                        "p-2 rounded-lg transition-all flex items-center gap-2",
                        groupBy !== "none"
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-500 hover:bg-slate-50",
                      )}
                    >
                      <Layers className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        分组:{" "}
                        {groupBy === "none"
                          ? "无"
                          : TASK_FIELDS.find((f) => f.value === groupBy)?.label}
                      </span>
                    </button>
                    <AnimatePresence>
                      {isGroupConfigOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2"
                        >
                          <div className="px-2 py-1.5 border-b border-slate-50 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              选择分组字段
                            </span>
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-0.5">
                            <button
                              onClick={() => {
                                setGroupBy("none");
                                setIsGroupConfigOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors",
                                groupBy === "none"
                                  ? "bg-indigo-50 text-indigo-600 font-medium"
                                  : "text-slate-600 hover:bg-slate-50",
                              )}
                            >
                              不分组
                            </button>
                            {TASK_FIELDS.map((field) => (
                              <button
                                key={field.value}
                                onClick={() => {
                                  setGroupBy(field.value);
                                  setIsGroupConfigOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors",
                                  groupBy === field.value
                                    ? "bg-indigo-50 text-indigo-600 font-medium"
                                    : "text-slate-600 hover:bg-slate-50",
                                )}
                              >
                                {field.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() => setIsSortConfigOpen(!isSortConfigOpen)}
                      className={cn(
                        "p-2 rounded-lg transition-all flex items-center gap-2",
                        sortBy
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-500 hover:bg-slate-50",
                      )}
                    >
                      <ArrowUpRight
                        className={cn(
                          "w-4 h-4 transition-transform",
                          sortBy?.order === "desc" ? "rotate-180" : "",
                        )}
                      />
                      <span className="text-xs font-medium">
                        排序:{" "}
                        {sortBy
                          ? TASK_FIELDS.find((f) => f.value === sortBy.field)
                              ?.label
                          : "默认"}
                      </span>
                    </button>
                    <AnimatePresence>
                      {isSortConfigOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2"
                        >
                          <div className="px-2 py-1.5 border-b border-slate-50 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              选择排序字段
                            </span>
                          </div>
                          <div className="max-h-64 overflow-y-auto space-y-0.5">
                            <button
                              onClick={() => {
                                setSortBy(null);
                                setIsSortConfigOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors",
                                !sortBy
                                  ? "bg-indigo-50 text-indigo-600 font-medium"
                                  : "text-slate-600 hover:bg-slate-50",
                              )}
                            >
                              默认排序
                            </button>
                            {TASK_FIELDS.map((field) => (
                              <div
                                key={field.value}
                                className="flex items-center gap-1"
                              >
                                <button
                                  onClick={() => {
                                    setSortBy({
                                      field: field.value,
                                      order: "asc",
                                    });
                                    setIsSortConfigOpen(false);
                                  }}
                                  className={cn(
                                    "flex-1 text-left px-2 py-1.5 rounded-lg text-xs transition-colors",
                                    sortBy?.field === field.value &&
                                      sortBy.order === "asc"
                                      ? "bg-indigo-50 text-indigo-600 font-medium"
                                      : "text-slate-600 hover:bg-slate-50",
                                  )}
                                >
                                  {field.label} (升序)
                                </button>
                                <button
                                  onClick={() => {
                                    setSortBy({
                                      field: field.value,
                                      order: "desc",
                                    });
                                    setIsSortConfigOpen(false);
                                  }}
                                  className={cn(
                                    "flex-1 text-left px-2 py-1.5 rounded-lg text-xs transition-colors",
                                    sortBy?.field === field.value &&
                                      sortBy.order === "desc"
                                      ? "bg-indigo-50 text-indigo-600 font-medium"
                                      : "text-slate-600 hover:bg-slate-50",
                                  )}
                                >
                                  (降序)
                                </button>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <button
                      onClick={() =>
                        setIsRowHeightConfigOpen(!isRowHeightConfigOpen)
                      }
                      className={cn(
                        "p-2 rounded-lg transition-all flex items-center gap-2",
                        rowHeight !== "standard"
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-500 hover:bg-slate-50",
                      )}
                    >
                      <GripVertical className="w-4 h-4" />
                      <span className="text-xs font-medium">行高</span>
                    </button>
                    <AnimatePresence>
                      {isRowHeightConfigOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 mt-2 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2"
                        >
                          {(
                            [
                              "compact",
                              "standard",
                              "comfortable",
                            ] as RowHeight[]
                          ).map((h) => (
                            <button
                              key={h}
                              onClick={() => {
                                setRowHeight(h);
                                setIsRowHeightConfigOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors capitalize",
                                rowHeight === h
                                  ? "bg-indigo-50 text-indigo-600 font-medium"
                                  : "text-slate-600 hover:bg-slate-50",
                              )}
                            >
                              {h === "compact"
                                ? "紧凑"
                                : h === "standard"
                                  ? "标准"
                                  : "宽松"}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {activeView.id !== "today_prod" && (
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setCurrentView("list")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                        currentView === "list"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      <ListIcon className="w-3.5 h-3.5" />
                      列表
                    </button>
                    <button
                      onClick={() => setCurrentView("kanban")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                        currentView === "kanban"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      泳道视图
                    </button>
                    <button
                      onClick={() => setCurrentView("dashboard")}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2",
                        currentView === "dashboard"
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700",
                      )}
                    >
                      <PieChartIcon className="w-3.5 h-3.5" />
                      仪表盘
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </header>
        � {/* View Content */}
        <div className="flex-1 overflow-auto p-6" data-view-content="true">
          {activeView.type === "clock_in" ? (
            <ClockInView />
          ) : activeView.type === "work_hours" ? (
            <WorkHoursView 
              viewId={activeView.id} 
              currentView={currentView} 
              initialDate={viewParams?.startDate}
            />
          ) : activeView.type === "submissions" ? (
            <MySubmissionsView onNavigate={handleNavigate} />
          ) : activeView.type === "kanban" ? (
            <KanbanBoard tasks={filteredTasks} onTaskClick={setSelectedTask} onTaskUpdate={handleTaskUpdate} />
          ) : currentView === "list" ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="bg-slate-50/50 border-b border-slate-200">
                      <th className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      {visibleColumns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider"
                        >
                          <div
                            className="flex items-center gap-1 cursor-pointer hover:text-slate-600 transition-colors"
                            onClick={() =>
                              setSortBy({
                                field: col,
                                order:
                                  sortBy?.field === col &&
                                  sortBy.order === "asc"
                                    ? "desc"
                                    : "asc",
                              })
                            }
                          >
                            {TASK_FIELDS.find((f) => f.value === col)?.label}
                            {sortBy?.field === col && (
                              <ArrowUpRight
                                className={cn(
                                  "w-3 h-3",
                                  sortBy.order === "desc" ? "rotate-180" : "",
                                )}
                              />
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(Object.entries(groupedTasks) as [string, Task[]][]).map(
                      ([groupName, groupTasks]) => (
                        <React.Fragment key={groupName}>
                          {groupBy !== "none" && (
                            <tr className="bg-slate-50/30">
                              <td
                                colSpan={visibleColumns.length + 2}
                                className="px-4 py-2 text-xs font-bold text-slate-500 border-b border-slate-100"
                              >
                                <div className="flex items-center gap-2">
                                  <ChevronDown className="w-3 h-3" />
                                  {groupName} ({groupTasks.length})
                                </div>
                              </td>
                            </tr>
                          )}
                          {groupTasks
                            .slice(
                              (currentPage - 1) * pageSize,
                              currentPage * pageSize,
                            )
                            .map((task) => (
                              <motion.tr
                                key={task.id}
                                layoutId={task.id}
                                onClick={() => setSelectedTask(task)}
                                className={cn(
                                  "hover:bg-slate-50/50 transition-colors cursor-pointer group",
                                  rowHeight === "compact"
                                    ? "h-10"
                                    : rowHeight === "comfortable"
                                      ? "h-20"
                                      : "h-14",
                                )}
                              >
                                <td
                                  className="px-4 py-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                </td>
                                {visibleColumns.map((col) => (
                                  <td key={col} className="px-4 py-0 text-sm">
                                    {col === "id" ? (
                                      <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                                        {task.id}
                                      </span>
                                    ) : col === "name" ? (
                                      <div className="flex items-center gap-3">
                                        <TaskTypeIcon type={task.type} />
                                        <p className="text-sm font-medium text-slate-900 truncate max-w-[240px]">
                                          {task.name}
                                        </p>
                                      </div>
                                    ) : col === "status" ? (
                                      <div className="flex flex-col gap-1 items-start">
                                        <StatusBadge status={task.status} />
                                        <ProcessStatusBadge status={task.processStatus} />
                                      </div>
                                    ) : col === "priority" ? (
                                      <PriorityBadge priority={task.priority} />
                                    ) : col === "assetIds" ? (
                                      <div className="flex flex-col gap-1 max-h-[60px] overflow-hidden py-1 relative">
                                        {(task.assetIds?.slice(0, 3) || []).map((aid) => (
                                          <span key={aid} className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded uppercase font-bold w-fit truncate max-w-full cursor-pointer hover:bg-indigo-100 transition-colors">
                                            {aid}
                                          </span>
                                        ))}
                                        {task.assetIds && task.assetIds.length > 3 && (
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // Implement show all modal/popover logic
                                            }}
                                            className="text-[9px] text-indigo-400 font-bold hover:text-indigo-600 transition-colors mt-auto self-end"
                                          >
                                            更多({task.assetIds.length - 3})
                                          </button>
                                        )}
                                      </div>
                                    ) : col === "assigneeName" ? (
                                      <div className="flex items-center gap-2">
                                        {task.assigneeAvatar ? (
                                          <img
                                            src={task.assigneeAvatar}
                                            className="w-6 h-6 rounded-full"
                                            alt=""
                                          />
                                        ) : (
                                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                            <User className="w-3 h-3 text-slate-400" />
                                          </div>
                                        )}
                                        <span className="text-xs text-slate-600">
                                          {task.assigneeName}
                                        </span>
                                      </div>
                                    ) : col === "participantNames" ? (
                                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                                        {(task.participantNames || []).map((name) => (
                                          <span key={name} className="text-[10px] text-slate-500 bg-slate-50 px-1 py-0.5 rounded">
                                            {name}
                                          </span>
                                        )) || "-"}
                                      </div>
                                    ) : col === "progress" ? (
                                      <div className="flex items-center gap-2 w-24">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div
                                            className={cn(
                                              "h-full rounded-full transition-all duration-500",
                                              task.progress === 100 ? "bg-emerald-500" : "bg-indigo-500"
                                            )}
                                            style={{
                                              width: `${task.progress}%`,
                                            }}
                                          />
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          {task.progress}%
                                        </span>
                                      </div>
                                    ) : ["actualStartDate", "plannedEndDate", "overdueTime"].includes(col) ? (
                                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <CalendarIcon className="w-3 h-3" />
                                        {task[col as keyof Task] ? format(new Date(task[col as keyof Task] as string), "MM-dd") : "-"}
                                      </div>
                                    ) : [
                                        "plannedHours",
                                        "actualHours",
                                      ].includes(col) ? (
                                      <div className="flex items-center gap-1.5">
                                        <span
                                          className={cn(
                                            "text-xs font-medium",
                                            col === "actualHours" &&
                                              task.plannedHours > 0 &&
                                              task.actualHours > task.plannedHours * 1.2
                                              ? "text-rose-600"
                                              : "text-slate-600",
                                          )}
                                        >
                                          {task[col as keyof Task] || 0}h
                                        </span>
                                      </div>
                                    ) : (
                                      <span className={cn(
                                        "text-xs text-slate-600",
                                        col === "description" ? "truncate max-w-[200px]" : ""
                                      )}>
                                        {String(task[col as keyof Task] || "-")}
                                      </span>
                                    )}
                                  </td>
                                ))}
                                <td className="px-4 py-0 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button className="p-1 hover:bg-slate-100 rounded">
                                    <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                  </button>
                                </td>
                              </motion.tr>
                            ))}
                        </React.Fragment>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="h-12 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">
                    共 {filteredTasks.length} 条记录
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">每页显示</span>
                    <select
                      className="bg-transparent text-xs font-medium outline-none cursor-pointer"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({
                      length: Math.ceil(filteredTasks.length / pageSize),
                    }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i + 1)}
                        className={cn(
                          "w-7 h-7 rounded-lg text-xs font-bold transition-all",
                          currentPage === i + 1
                            ? "bg-indigo-600 text-white"
                            : "text-slate-500 hover:bg-slate-200",
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    disabled={
                      currentPage === Math.ceil(filteredTasks.length / pageSize)
                    }
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(
                          Math.ceil(filteredTasks.length / pageSize),
                          p + 1,
                        ),
                      )
                    }
                    className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <DashboardView 
              tasks={filteredTasks} 
              shortcuts={shortcuts}
              onAddShortcut={() => setIsAddShortcutOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Add Shortcut Modal */}
      <AnimatePresence>
        {isAddShortcutOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddShortcutOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-[70] overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-900">自定义入口</h3>
                <button
                  onClick={() => setIsAddShortcutOpen(false)}
                  className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    入口名称
                  </label>
                  <input
                    type="text"
                    placeholder="例如：Kmoke 官网"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    value={newShortcutName}
                    onChange={(e) => setNewShortcutName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    跳转链接
                  </label>
                  <input
                    type="text"
                    placeholder="https://kmoke.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    value={newShortcutUrl}
                    onChange={(e) => setNewShortcutUrl(e.target.value)}
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      if (newShortcutName && newShortcutUrl) {
                        const newShortcut: Shortcut = {
                          id: `s-${Date.now()}`,
                          name: newShortcutName,
                          url: newShortcutUrl.startsWith('http') ? newShortcutUrl : `https://${newShortcutUrl}`,
                          color: ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'][Math.floor(Math.random() * 5)]
                        };
                        setShortcuts([...shortcuts, newShortcut]);
                        setNewShortcutName("");
                        setNewShortcutUrl("");
                        setIsAddShortcutOpen(false);
                      }
                    }}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]"
                  >
                    确认添加
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={cn(
                "fixed right-0 top-0 bottom-0 w-[900px] bg-white shadow-2xl z-50 flex flex-col border-l-4",
                currentTheme?.border?.replace("border-", "border-l-") || "border-l-indigo-600"
              )}
            >
              {/* Header */}
              <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 bg-white">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "p-3 rounded-2xl",
                    currentTheme?.lightBg,
                    currentTheme?.text
                  )}>
                    <TaskTypeIcon type={selectedTask.type} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-bold text-slate-900">
                        {selectedTask.name}
                      </h2>
                      <StatusBadge status={selectedTask.status} />
                    </div>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                         {selectedTask.id}
                       </span>
                       <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                         {currentTheme?.label}
                       </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                        const isPipeline = isPipelineTask;
                        const msg = isPipeline 
                          ? "注意，提审表示当前任务制作完成，不需要进一步制作，如果还需要进一步制作，可以选择发布版本，或者在Dcc的kmoke插件里面点击发布版本"
                          : "确定提交吗？";

                        setConfirmAction({
                          isOpen: true,
                          message: msg,
                          onConfirm: () => console.log("提交/提审任务确认")
                        });
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-md",
                      currentTheme?.bg,
                      currentTheme?.shadow
                    )}>
                    <CheckCheck className="w-4 h-4" />
                    {isPipelineTask ? "提审" : "提交"}
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      setSelectedTaskTab("details");
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Left Tabs Sidebar */}
                  <div className="w-20 border-r border-slate-100 flex flex-col items-center py-8 gap-8 bg-slate-50/30">
                    <button
                      onClick={() => setSelectedTaskTab("details")}
                      className={cn(
                        "flex flex-col items-center gap-1 transition-all group",
                        selectedTaskTab === "details" ? currentTheme?.text : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        selectedTaskTab === "details" ? cn(currentTheme?.bg, "text-white shadow-lg", currentTheme?.shadow) : "bg-white border border-slate-200 group-hover:border-slate-300"
                      )}>
                        <Info className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold">详情</span>
                    </button>

                    <button
                      onClick={() => setSelectedTaskTab("workflow")}
                      className={cn(
                        "flex flex-col items-center gap-1 transition-all group",
                        selectedTaskTab === "workflow" ? currentTheme?.text : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        selectedTaskTab === "workflow" ? cn(currentTheme?.bg, "text-white shadow-lg", currentTheme?.shadow) : "bg-white border border-slate-200 group-hover:border-slate-300"
                      )}>
                        <Activity className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold">{isPipelineTask ? "流程" : "审批"}</span>
                    </button>

                    <button
                      onClick={() => setSelectedTaskTab("hours")}
                      className={cn(
                        "flex flex-col items-center gap-1 transition-all group",
                        selectedTaskTab === "hours" ? currentTheme?.text : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        selectedTaskTab === "hours" ? cn(currentTheme?.bg, "text-white shadow-lg", currentTheme?.shadow) : "bg-white border border-slate-200 group-hover:border-slate-300"
                      )}>
                        <Clock3 className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold">工时</span>
                    </button>

                    <button
                      onClick={() => setSelectedTaskTab("materials")}
                      className={cn(
                        "flex flex-col items-center gap-1 transition-all group",
                        selectedTaskTab === "materials" ? currentTheme?.text : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        selectedTaskTab === "materials" ? cn(currentTheme?.bg, "text-white shadow-lg", currentTheme?.shadow) : "bg-white border border-slate-200 group-hover:border-slate-300"
                      )}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold">资料</span>
                    </button>

                    <button
                      onClick={() => setSelectedTaskTab("logs")}
                      className={cn(
                        "flex flex-col items-center gap-1 transition-all group",
                        selectedTaskTab === "logs" ? currentTheme?.text : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-xl transition-all",
                        selectedTaskTab === "logs" ? cn(currentTheme?.bg, "text-white shadow-lg", currentTheme?.shadow) : "bg-white border border-slate-200 group-hover:border-slate-300"
                      )}>
                        <History className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold">记录</span>
                    </button>
                  </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-white p-8">
                  {selectedTaskTab === "details" && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* Asset Card for Pipeline Tasks (Asset & Shot) */}
                      {isPipelineTask && (
                        <div className={cn(
                          "p-4 rounded-2xl flex items-center gap-6 relative overflow-hidden group border",
                          currentTheme?.lightBg,
                          currentTheme?.border
                        )}>
                          <div className={cn(
                            "absolute top-0 right-0 p-2 text-white text-[9px] font-bold uppercase tracking-widest rounded-bl-lg",
                            currentTheme?.bg
                          )}>
                            {selectedTask.type === TaskType.Shot ? "镜头资产" : "管线资产"}
                          </div>
                          <img
                            src={selectedTask.relatedAsset?.thumbnail || "https://picsum.photos/seed/asset/100/100"}
                            className="w-24 h-24 rounded-xl object-cover shadow-md"
                            alt=""
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-bold text-slate-900">{selectedTask.relatedAsset?.name || (selectedTask.shotId ? `镜头 ${selectedTask.shotId}` : "未知资产")}</h3>
                              <span className={cn(
                                "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider",
                                currentTheme?.lightBg === "bg-indigo-50" ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-600"
                              )}>
                                {selectedTask.assetType || (selectedTask.shotId ? "场次/镜头" : "通用")}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Box className="w-3.5 h-3.5" />
                                <span>{selectedTask.pipelineStepId ? `管线步骤: ${selectedTask.pipelineStepId}` : `所属镜头: ${selectedTask.shotId || "-"}`}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Database className="w-3.5 h-3.5" />
                                <span>实体ID: {selectedTask.assetIds?.[0] || selectedTask.shotId || "-"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Project/Context Card for Universal Tasks */}
                      {!isPipelineTask && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-6 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-2 bg-slate-600 text-white text-[9px] font-bold uppercase tracking-widest rounded-bl-lg">通用工作流</div>
                          <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                            <Briefcase className="w-10 h-10 text-slate-300" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-bold text-slate-900">{selectedTask.projectName}</h3>
                              <span className={cn(
                                "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider",
                                selectedTask.projectStatus === "进行中" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-600"
                              )}>
                                {selectedTask.projectStatus || "项目任务"}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <User className="w-3.5 h-3.5" />
                                <span>负责人: {selectedTask.projectLead || "未分配"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Flag className="w-3.5 h-3.5" />
                                <span>优先级: {selectedTask.priority}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expected Cycle & Remaining Alert */}
                      <div className="flex items-center gap-4 bg-white border border-slate-100 p-4 rounded-xl shadow-sm my-6">
                        <div className="flex-1">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase">计划周期</h4>
                          <p className="text-sm font-bold text-slate-900">{selectedTask.plannedStartDate} ~ {selectedTask.plannedEndDate}</p>
                          <p className="text-[10px] text-slate-400">共计 {selectedTask.plannedHours / 8} 个工作日 (8h/d)</p>
                        </div>
                        <div className="h-8 w-px bg-slate-100"></div>
                        <div className="flex-1">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase">期限预警</h4>
                          {(() => {
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const end = new Date(selectedTask.plannedEndDate);
                            end.setHours(0,0,0,0);
                            const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            const isOverdue = diffDays < 0;
                            return (
                              <p className={cn("text-sm font-bold", isOverdue ? "text-red-500" : "text-emerald-600")}>
                                {isOverdue ? `已逾期 ${Math.abs(diffDays)} 天` : `剩余 ${diffDays} 天`}
                              </p>
                            );
                          })()}
                        </div>
                      </div>

                            <div className={cn(
                              "flex items-center justify-between pb-6 border-b",
                              currentTheme?.border || "border-slate-100"
                            )}>
                              <div className="flex items-center gap-3">
                                <StatusBadge status={selectedTask.status} />
                                <PriorityBadge priority={selectedTask.priority} />
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
                                  <Pencil className="w-3.5 h-3.5" />
                                  编辑任务
                                </button>
                                <button 
                                  onClick={() => {
                                    setConfirmAction({
                                      isOpen: true,
                                      message: "确定要发布新版本吗？",
                                      onConfirm: () => console.log("模拟发布版本逻辑")
                                    });
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 border border-sky-100 rounded-xl text-xs font-bold hover:bg-sky-100 transition-all active:scale-95 shadow-sm">
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  发布版本
                                </button>
                                {selectedTask.status !== TaskStatus.Doing && (
                                  <button className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg",
                                    currentTheme?.bg,
                                    currentTheme?.base ? `shadow-${currentTheme.base}-100` : ""
                                  )}>
                                    <Play className="w-3.5 h-3.5" />
                                    开始制作
                                  </button>
                                )}
                                </div>
                              </div>

                      {/* Basic Info Grid */}
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">负责人</label>
                            <div className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                              <img src={selectedTask.assigneeAvatar} className="w-10 h-10 rounded-full border border-slate-100" alt="" />
                              <div>
                                <p className="text-sm font-bold text-slate-900">{selectedTask.assigneeName}</p>
                                <p className="text-[10px] text-slate-400">{selectedTask.assigneeId}</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">创建人</label>
                            <div className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                {selectedTask.creatorName?.charAt(0) || "C"}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{selectedTask.creatorName || "系统管理员"}</p>
                                <p className="text-[10px] text-slate-400">{selectedTask.createdAt.split('T')[0]} 创建</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">参与人</label>
                            <div className="flex flex-wrap gap-2">
                              {selectedTask.participantNames?.map(p => (
                                <span key={p} className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-medium rounded-xl border border-slate-100">{p}</span>
                              )) || <span className="text-xs text-slate-400">暂无参与人</span>}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">所属项目</label>
                            <button 
                              onClick={() => {
                                // Placeholder for navigation
                                alert(`正在跳转至项目: ${selectedTask.projectName} 详情页`);
                              }}
                              className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-3 w-full text-left hover:border-amber-200 transition-all group"
                            >
                              <Briefcase className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
                              <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold text-slate-900 flex items-center justify-between truncate">
                                  {selectedTask.projectName}
                                  <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {selectedTask.projectDirector ? `导演: ${selectedTask.projectDirector}` : `负责人: ${selectedTask.projectLead || "未分配"}`}
                                </p>
                              </div>
                            </button>
                          </div>
                          
                          {/* DCC Tools for pipeline tasks */}
                          {isPipelineTask && selectedTask.dccTools && selectedTask.dccTools.length > 0 && (
                            <div>
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">DCC 启动工具</label>
                              <div className="flex flex-wrap gap-2">
                                {selectedTask.dccTools.map(tool => (
                                  <button 
                                    key={tool} 
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100"
                                  >
                                    <Terminal className="w-3 h-3" />
                                    启动 {tool}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">任务描述</label>
                        <div className="p-5 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-sm text-slate-600 leading-relaxed italic">
                          "{selectedTask.description || "暂无描述"}"
                        </div>
                      </div>

                      {/* Collaboration Section */}
                      <div className="border-t border-slate-100 pt-8 mt-10">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            协作讨论
                          </h3>
                          <span className="text-xs text-slate-400">
                            {selectedTask.commentsCount} 条评论
                          </span>
                        </div>

                        <div className="space-y-6 mb-8">
                          <div className="flex gap-3">
                            <img
                              src="https://picsum.photos/seed/user2/40/40"
                              className="w-8 h-8 rounded-full shrink-0"
                              alt=""
                            />
                            <div className="flex-1 bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold">概念师-小李</span>
                                <span className="text-[10px] text-slate-400">2小时前</span>
                              </div>
                              <p className="text-sm text-slate-600">
                                <span className="text-indigo-600 font-medium">@建模师-老王</span> 模型面数是否需要严格控制在 50w 以内？
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <img
                            src="https://picsum.photos/seed/me/40/40"
                            className="w-8 h-8 rounded-full shrink-0"
                            alt=""
                          />
                          <div className="flex-1 relative">
                            <textarea
                              placeholder="输入评论，使用 @ 提及同事..."
                              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all resize-none h-24"
                            />
                            <div className="absolute right-3 bottom-3 flex items-center gap-2">
                              <button className="p-2 text-slate-400 hover:text-slate-600">
                                <Paperclip className="w-4 h-4" />
                              </button>
                              <button className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold">
                                发送
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {selectedTaskTab === "workflow" && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-8"
                    >
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Activity className={cn("w-5 h-5", currentTheme?.text || "text-indigo-600")} />
                        {isPipelineTask ? "制作流程现状" : "任务/审批流跟踪"}
                      </h3>
                      
                      <div className="relative space-y-12 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {/* Current Step */}
                        <div className="relative pl-14">
                          <div className={cn(
                            "absolute left-4 w-4 h-4 rounded-full border-2 border-white ring-4",
                            currentTheme?.bg || "bg-emerald-500",
                            currentTheme?.base === "indigo" ? "ring-indigo-50" : currentTheme?.base === "amber" ? "ring-amber-50" : "ring-emerald-50"
                          )} />
                          <div className={cn(
                            "p-5 border rounded-2xl relative",
                            currentTheme?.lightBg || "bg-emerald-50/30",
                            currentTheme?.border || "border-emerald-100"
                          )}>
                            <span className={cn(
                              "absolute top-2 right-2 px-2 py-0.5 text-[8px] font-bold uppercase rounded-full",
                              currentTheme?.lightBg ? currentTheme.lightBg.replace("50", "100") : "bg-emerald-100",
                              currentTheme?.text || "text-emerald-600"
                            )}>当前环节</span>
                            <div className="flex items-center gap-3 mb-3">
                              <div className={cn(
                                "w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm",
                                currentTheme?.text || "text-emerald-600"
                              )}>
                                {isPipelineTask ? <TaskTypeIcon type={selectedTask.type} /> : <Clock3 className="w-5 h-5" />}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">
                                  {isPipelineTask ? (selectedTask.pipelineStepId || "当前环节") : (
                                    selectedTask.status === TaskStatus.Todo ? "待启动阶段" :
                                    selectedTask.status === TaskStatus.Doing ? "执行撰写阶段" :
                                    selectedTask.status === TaskStatus.Review ? "评审审批阶段" : "已归档阶段"
                                  )}
                                </h4>
                                <p className="text-[10px] text-slate-400">主要责任人: {selectedTask.assigneeName}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <ProcessStatusBadge status={selectedTask.processStatus} />
                              <span className="text-[10px] text-slate-500">最近活跃于 20分钟前</span>
                            </div>

                            {/* Versions */}
                            {selectedTask.versions && selectedTask.versions.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                <h5 className="text-[10px] uppercase font-bold text-slate-400">已发布版本记录</h5>
                                <div className="grid grid-cols-2 gap-2">
                                  {selectedTask.versions.map(version => (
                                    <div key={version.id} className="p-2 bg-slate-50 rounded-lg flex items-center justify-between text-[10px] border border-slate-100 group hover:border-slate-300 transition-colors">
                                      <span className="font-bold text-slate-900 group-hover:text-indigo-600">{version.versionNumber}</span>
                                      <span className={cn("px-1.5 py-0.5 rounded-full font-bold uppercase", 
                                          version.status === 'approved' ? "bg-emerald-100 text-emerald-700" : 
                                          version.status === 'rejected' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                                      )}>
                                        {version.status === 'approved' ? '已通过' : version.status === 'rejected' ? '已驳回' : '待审'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Universal Next Step info */}
                        {!selectedTask.pipelineStepId && (
                          <div className="relative pl-14 opacity-60">
                            <div className="absolute left-4 w-4 h-4 rounded-full bg-slate-200 border-2 border-white" />
                            <div className="p-5 bg-white border border-slate-200 border-dashed rounded-2xl">
                              <h4 className="font-bold text-slate-400 text-sm mb-1 uppercase tracking-wider">后续预期流程</h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                完成当前阶段后，任务将流转至 <span className="font-bold text-slate-700">相关部门会签</span> 以及 <span className="font-bold text-slate-700">最终决策归档</span> 环节。
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Next Step */}
                        <div className="relative pl-14">
                          <div className="absolute left-4 w-4 h-4 rounded-full bg-slate-200 border-2 border-white" />
                          <div className="p-5 bg-white border border-slate-200 border-dashed rounded-2xl">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">下一阶段预告</span>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                                <Play className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-400 uppercase tracking-wider">审核 / 修改环节</h4>
                                <p className="text-[10px] text-slate-400">预定负责人: {selectedTask.reviewerName || "待定组长"}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Review History Placeholder */}
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-400 flex items-center gap-2">
                            <History className="w-3.5 h-3.5" />
                            历史提审次数: {selectedTask.reviewIteration} 次
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {selectedTaskTab === "hours" && (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-8"
                    >
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Clock3 className="w-5 h-5 text-indigo-600" />
                        工时绩效与统计
                      </h3>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">规划参考 (Standard)</p>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                              <span className="text-xs text-slate-500">管理预估工时</span>
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-slate-900">{selectedTask.plannedHours}h</span>
                                <span className="text-[9px] text-slate-400">全局配置自动生成</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">任务计划工时</span>
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-indigo-600">
                                  {(() => {
                                    const start = new Date(selectedTask.plannedStartDate);
                                    const end = new Date(selectedTask.plannedEndDate);
                                    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                                    return days * 8;
                                  })()}h
                                </span>
                                <span className="text-[9px] text-slate-400">基于计划周期自动计算</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">执行实绩 (Execution)</p>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                              <span className="text-xs text-slate-500">打卡工时</span>
                              <span className="text-sm font-bold text-slate-900">{selectedTask.attendanceHours}h</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500">实际核准工时</span>
                              <span className="text-sm font-bold text-emerald-600">{selectedTask.approvedHours ?? 0}h</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Productivity Analysis */}
                      <div className="p-6 bg-slate-900 rounded-3xl text-white">
                        <div className="flex justify-between items-end mb-6">
                          <div>
                            <p className={cn(
                              "text-[10px] font-bold uppercase tracking-widest mb-1",
                              currentTheme?.text || "text-indigo-400"
                            )}>当前工时进度</p>
                            <h4 className="text-2xl font-bold">
                              {((selectedTask.actualHours / selectedTask.plannedHours) * 100).toFixed(1)}%
                            </h4>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">健康度评分</p>
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-bold",
                              selectedTask.actualHours > selectedTask.plannedHours ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
                            )}>
                              {selectedTask.actualHours > selectedTask.plannedHours ? "消耗过快" : "运行正常"}
                            </span>
                          </div>
                        </div>
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full transition-all duration-700",
                              selectedTask.actualHours > selectedTask.plannedHours ? "bg-rose-500" : currentTheme?.bg || "bg-indigo-500"
                            )}
                            style={{ width: `${Math.min(100, (selectedTask.actualHours / selectedTask.plannedHours * 100))}%` }}
                          />
                        </div>
                        <p className="mt-4 text-[11px] text-slate-400 leading-relaxed">
                          基于管理预估 {selectedTask.plannedHours}h，当前核准工时已记录 {selectedTask.approvedHours ?? 0}h。
                          {(selectedTask.approvedHours ?? 0) > selectedTask.plannedHours && " 警告：核准工时已超出管理预算。"}
                        </p>
                      </div>

                      {/* Clock-in Records section */}
                      <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">周期内打卡明细</h4>
                          <button className="text-[10px] font-bold text-indigo-600 hover:underline">分配通用工时到此任务</button>
                        </div>
                        <div className="space-y-2">
                          {selectedTask.clockInRecords && selectedTask.clockInRecords.length > 0 ? (
                            selectedTask.clockInRecords.map(record => (
                              <div key={record.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs transition-all hover:bg-white hover:shadow-sm group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                                    <LogIn className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900">{record.startTime.split('T')[0]}</p>
                                    <p className="text-[10px] text-slate-400">{record.startTime.split('T')[1].slice(0,5)} - {record.endTime?.split('T')[1].slice(0,5)}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-900">{record.duration}h</p>
                                  <span className="text-[8px] px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded-full font-bold uppercase">考勤记录</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-10 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                              <Clock className="w-8 h-8 text-slate-200 mb-2" />
                              <p className="text-xs text-slate-400">暂无打卡数据</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {selectedTaskTab === "materials" && (
                    <motion.div 
                      key="materials"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <FileText className={cn("w-5 h-5", currentTheme?.text || "text-indigo-600")} />
                          任务关联资产资料
                        </h3>
                        <div className="flex items-center gap-2">
                           <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">极速发布</button>
                           <button className={cn(
                            "px-4 py-2 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-lg",
                            currentTheme?.bg,
                            currentTheme?.shadow
                          )}>
                            上传附件
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6">
                        {['reference', 'work_in_progress', 'published'].map((cat) => {
                          const catMaterials = selectedTask.materials?.filter(m => m.category === cat) || [];
                          
                          return (
                            <div key={cat} className="space-y-3">
                              <div className="flex items-center justify-between px-1">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {cat === 'reference' ? '任务设计资料 / 参考' : cat === 'work_in_progress' ? '制作环节过程资料' : '已发布成果素材'}
                                </h4>
                                <span className="text-[10px] text-slate-400">{catMaterials.length} 个文件</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {catMaterials.length > 0 ? catMaterials.map(mat => (
                                  <div key={mat.id} className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-200 transition-all group cursor-pointer">
                                    <div className="flex items-start gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                        {mat.type === 'image' ? <Box className="w-5 h-5" /> : mat.type === 'video' ? <Activity className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                      </div>
                                      <div className="flex-1 overflow-hidden font-sans">
                                        <p className="text-xs font-bold text-slate-900 truncate">{mat.name}</p>
                                        <p className="text-[10px] text-slate-400 font-sans">{mat.size} • {mat.uploadedBy}</p>
                                      </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                      <span className="text-[9px] text-slate-400 font-medium font-sans">{format(new Date(mat.uploadedAt), 'MM-dd HH:mm')}</span>
                                      <div className="flex items-center gap-2">
                                        <button className="text-[10px] font-bold text-indigo-600 hover:underline">预览</button>
                                        <button className="text-[10px] font-bold text-slate-400 hover:text-slate-600">下载</button>
                                      </div>
                                    </div>
                                  </div>
                                )) : (
                                  <div className="col-span-2 p-10 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                                      <FileText className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <p className="text-xs text-slate-400">暂无此类别资料</p>
                                    <p className="text-[9px] text-slate-300 mt-1 uppercase tracking-tighter">no data found</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {selectedTaskTab === "logs" && (
                    <motion.div 
                      key="logs"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-8"
                    >
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <History className={cn("w-5 h-5", currentTheme?.text || "text-indigo-600")} />
                        全周期操作流水日志
                      </h3>

                      <div className="relative space-y-6 before:absolute before:left-[17px] before:top-4 before:bottom-0 before:w-0.5 before:bg-slate-100">
                        {selectedTask.activityLogs?.map((log) => (
                          <div key={log.id} className="relative pl-12">
                            <div className={cn(
                              "absolute left-0 w-9 h-9 rounded-xl border-2 border-white flex items-center justify-center z-10 shadow-sm",
                              log.type === 'creation' ? "bg-emerald-500 text-white" : 
                              log.type === 'status_change' ? "bg-indigo-500 text-white" :
                              log.type === 'submission' ? "bg-amber-500 text-white" : "bg-slate-200 text-slate-500"
                            )}>
                              {log.type === 'creation' ? <Box className="w-4 h-4" /> : 
                               log.type === 'status_change' ? <Activity className="w-4 h-4" /> :
                               log.type === 'submission' ? <CheckCheck className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                            </div>
                            <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all font-sans">
                              <div className="flex justify-between items-start mb-2 font-sans">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 font-sans">{log.action}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium font-sans">{format(new Date(log.timestamp), 'yyyy年MM月dd日 HH:mm:ss')}</p>
                                </div>
                                <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg">
                                  <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 uppercase">
                                    {log.userName.charAt(0)}
                                  </div>
                                  <span className="text-[9px] text-slate-600 font-bold">{log.userName}</span>
                                </div>
                              </div>
                              {log.details && (
                                <div className="mt-3 text-[10px] text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                                  “ {log.details} ”
                                </div>
                              )}
                            </div>
                          </div>
                        )) || (
                          <div className="p-20 text-center border border-dashed border-slate-200 rounded-3xl">
                            <History className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-bold">暂无操作明细记录</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {/* Confirm Dialog */}
        {confirmAction?.isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold text-slate-900 mb-2">确认操作</h3>
              <p className="text-slate-600 mb-6">{confirmAction.message}</p>
              <div className="flex gap-3">
                <button 
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200"
                  onClick={() => setConfirmAction(null)}
                >
                  取消
                </button>
                <button 
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                  onClick={() => {
                    confirmAction.onConfirm();
                    setConfirmAction(null);
                  }}
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        )}
        {isCreateViewOpen && (
          <CreateViewModal
            onClose={() => setIsCreateViewOpen(false)}
            onCreate={handleCreateView}
          />
        )}
        {isCreateTaskModalOpen && (
          <CreateTaskModal
            onClose={() => setIsCreateTaskModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
