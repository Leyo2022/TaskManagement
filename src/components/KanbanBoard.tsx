import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Task, TaskStatus } from '../types';
import { format, isPast, isToday } from 'date-fns';
import { cn } from '../lib/utils';
import { CalendarIcon, FilterIcon } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter, useDroppable, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate?: (task: Task, newStatus: TaskStatus) => void;
  defaultViewMode?: 'kanban' | 'swimlane';
  showSwitcher?: boolean;
}

const TaskCard: React.FC<{ task: Task, onClick: () => void, isOverlay?: boolean, className?: string }> = ({ task, onClick, isOverlay, className }) => {
    return (
        <div onClick={onClick} className={cn("bg-white border border-slate-200 rounded-xl shadow-sm w-full cursor-pointer hover:shadow-md transition-shadow", isOverlay ? "opacity-100 rotate-2 cursor-grabbing" : "", className)}>
            <div className="p-4 border-b border-slate-100">
                <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{task.id}</span>
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded uppercase", 
                        task.priority === 'urgent' ? 'bg-red-100 text-red-700' : 
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-600'
                    )}>{task.priority}</span>
                </div>
                <div className="text-sm font-semibold text-slate-900 mt-2">{task.name}</div>
            </div>
            <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3 h-3 text-slate-400"/> {format(new Date(task.plannedEndDate), 'MM-dd')}
                </div>
                {task.assigneeAvatar ? (
                  <img src={task.assigneeAvatar} className="w-6 h-6 rounded-full border border-slate-100" alt={task.assigneeName} title={task.assigneeName} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                    {task.assigneeName.slice(0, 1)}
                  </div>
                )}
            </div>
        </div>
    );
};

const SortableTask: React.FC<{ task: Task, onClick: () => void, isOverlay?: boolean }> = ({ task, onClick, isOverlay }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  
  return (
    <div ref={isOverlay ? undefined : setNodeRef} style={style} className="w-full">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <TaskCard task={task} onClick={onClick} />
        </div>
    </div>
  );
};

const DroppableColumn: React.FC<{ col: { id: string, label: string, colorClass: string }, tasks: Task[], onTaskClick: (t: Task) => void }> = ({ col, tasks, onTaskClick }) => {
    const { setNodeRef } = useDroppable({ id: col.id });
    
    return (
      <div ref={setNodeRef} className={cn("w-80 shrink-0 flex flex-col rounded-xl border", col.colorClass)}>
          <div className="p-4 font-bold text-sm text-slate-700 border-b border-white/50 flex justify-between items-center">
          {col.label}
          <span className="text-xs bg-white/50 text-slate-500 px-2 py-0.5 rounded">{tasks.length}</span>
          </div>
          <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {tasks.map(task => (
                      <SortableTask key={task.id} task={task} onClick={() => onTaskClick(task)} />
                  ))}
              </SortableContext>
          </div>
      </div>
    );
  };

export const KanbanBoard: React.FC<Props> = ({ tasks, onTaskClick, onTaskUpdate, defaultViewMode = 'kanban', showSwitcher = true }) => {
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedPipeline, setSelectedPipeline] = useState<string>('all');
  const [selectedStep, setSelectedStep] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'swimlane'>(defaultViewMode);
  const [swimlaneGroup, setSwimlaneGroup] = useState<'step' | 'assignee'>('step');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    if (viewMode === 'swimlane') return;
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };


  // Hardcoded mapping for demo as requested by user constraints
  const pipelines = {
    'Modeling': ['Blockout', 'Details', 'HighPoly'],
    'Rigging': ['Skinning', 'Controls'],
  };
  
  const columns = [
    { id: 'yesterday', label: '逾期遗留项', colorClass: 'bg-rose-50 border-rose-200' },
    { id: 'todo', label: '待办任务', colorClass: 'bg-slate-50 border-slate-200' },
    { id: 'in_progress', label: '今日制作', colorClass: 'bg-blue-50 border-blue-200' },
    { id: 'review', label: '审批中', colorClass: 'bg-amber-50 border-amber-200' },
    { id: 'done', label: '已完成', colorClass: 'bg-emerald-50 border-emerald-200' },
  ];

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
        (selectedAssignee === 'all' || t.assigneeName === selectedAssignee) &&
        (selectedPipeline === 'all' || true) && // TODO: Implement real pipeline/step logic
        (selectedStep === 'all' || true)
    );
  }, [tasks, selectedAssignee, selectedPipeline, selectedStep]);

  const assignees = useMemo(() => ['all', ...Array.from(new Set(tasks.map(t => t.assigneeName)))], [tasks]);

  const getTaskColumn = (task: Task): string => {
    if (task.status === TaskStatus.Done) return 'done';
    if (task.status === TaskStatus.Review) return 'review';
    if (task.status === TaskStatus.Doing) return 'in_progress';
    if (task.status === TaskStatus.Todo) {
        if (isPast(new Date(task.plannedEndDate)) && !isToday(new Date(task.plannedEndDate))) return 'yesterday';
        return 'todo';
    }
    return 'todo';
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    
    const task = tasks.find(t => t.id === active.id);
    const newColumnId = over.id as string;
    
    if (task && onTaskUpdate) {
        const newStatus = newColumnId === 'done' ? TaskStatus.Done : 
                          newColumnId === 'review' ? TaskStatus.Review :
                          newColumnId === 'in_progress' ? TaskStatus.Doing :
                          TaskStatus.Todo;
        onTaskUpdate(task, newStatus);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
        <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center text-sm shadow-sm">
            <div className="flex gap-4 items-center">
                <div className="relative">
                    <button onClick={() => setShowFilters(!showFilters)} className={cn("flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors", showFilters ? "bg-slate-100" : "bg-white")}>
                        <FilterIcon className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-700">筛选</span>
                    </button>
                    {showFilters && (
                        <div className="absolute top-full left-0 mt-2 p-4 bg-white border border-slate-200 rounded-xl shadow-xl z-20 w-64 space-y-4">
                            <select value={selectedAssignee} onChange={e => setSelectedAssignee(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500">
                                {assignees.map(a => <option key={a} value={a}>{a === 'all' ? '所有人员' : a}</option>)}
                            </select>
                            
                            <div className="border-t pt-2 space-y-2">
                                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider">环节与步骤</label>
                                <select value={selectedPipeline} onChange={e => { setSelectedPipeline(e.target.value); setSelectedStep('all'); }} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500">
                                    <option value="all">所有环节</option>
                                    {Object.keys(pipelines).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <select value={selectedStep} onChange={e => setSelectedStep(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-indigo-500" disabled={selectedPipeline === 'all'}>
                                    <option value="all">所有步骤</option>
                                    {selectedPipeline !== 'all' && pipelines[selectedPipeline as keyof typeof pipelines].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {showSwitcher && (
                <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl">
                    <button onClick={() => setViewMode('kanban')} className={cn("px-4 py-1.5 rounded-lg font-medium transition-all", viewMode === 'kanban' ? "bg-white shadow text-slate-900" : "text-slate-500")}>看板管理</button>
                    <button onClick={() => setViewMode('swimlane')} className={cn("px-4 py-1.5 rounded-lg font-medium transition-all", viewMode === 'swimlane' ? "bg-white shadow text-slate-900" : "text-slate-500")}>泳道视图</button>
                </div>
            )}
        </div>
        
        {viewMode === 'swimlane' ? (
            <div className="p-4 h-full flex flex-col gap-4 overflow-x-auto">
                <div className="flex gap-4 h-full">
                    {/* Render Swimlanes */}
                    {(swimlaneGroup === 'assignee' ? assignees.filter(a => a !== 'all') : ['Blockout', 'Details', 'HighPoly']).map(group => {
                        const groupTasks = filteredTasks.filter(t => swimlaneGroup === 'assignee' ? t.assigneeName === group : true); // Simplified filtering for demo
                        return (
                           <div key={group} className="w-80 shrink-0 flex flex-col bg-slate-100 rounded-xl p-2 h-full">
                               <div className="p-2 font-bold text-sm text-slate-600 flex items-center gap-2 mb-2">
                                <div className={cn("w-2 h-2 rounded-full", swimlaneGroup === 'assignee' ? "bg-indigo-400" : "bg-amber-400")}></div>
                                {group} <span className="bg-slate-200 text-slate-600 px-2 rounded-full text-xs">{groupTasks.length}</span>
                               </div>
                               <div className="flex-1 space-y-3 overflow-y-auto">
                                   {groupTasks.map(task => (
                                       <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} className="bg-white" />
                                   ))}
                               </div>
                           </div>
                        );
                    })}
                </div>
            </div>
        ) : (
            <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="flex gap-4 h-full p-4 overflow-x-auto">
                    {columns.map(col => {
                        const columnTasks = filteredTasks.filter(t => getTaskColumn(t) === col.id);
                        return <DroppableColumn key={col.id} col={col} tasks={columnTasks} onTaskClick={onTaskClick} />;
                    })}
                </div>
                <DragOverlay>
                    {activeTask ? <SortableTask task={activeTask} onClick={() => {}} isOverlay /> : null}
                </DragOverlay>
            </DndContext>
        )}
    </div>
  );
};
