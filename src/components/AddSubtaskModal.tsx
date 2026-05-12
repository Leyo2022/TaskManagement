import React, { useState } from "react";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { Subtask, TaskStatus, Task } from "../types";

export const AddSubtaskModal = ({ 
    onClose, 
    parentTask,
    onAdd 
}: { 
    onClose: () => void, 
    parentTask: Task,
    onAdd: (subtask: Subtask) => void
}) => {
    const [name, setName] = useState('');
    const [assignee, setAssignee] = useState('');
    const [desc, setDesc] = useState('');
    const [date, setDate] = useState('');

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">添加子任务</h2>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <div className="space-y-4">
                    <input type="text" placeholder="输入子任务名称" className="w-full p-3 border border-slate-200 rounded-lg" value={name} onChange={e => setName(e.target.value)} />
                    <input type="text" placeholder="输入责任人名称" className="w-full p-3 border border-slate-200 rounded-lg" value={assignee} onChange={e => setAssignee(e.target.value)} />
                    <textarea placeholder="输入子任务描述" className="w-full p-3 border border-slate-200 rounded-lg" value={desc} onChange={e => setDesc(e.target.value)} />
                    <input type="date" className="w-full p-3 border border-slate-200 rounded-lg" value={date} onChange={e => setDate(e.target.value)} />
                    <button 
                        onClick={() => {
                            if (name) {
                                onAdd({
                                    id: "s_" + Math.random().toString(36).substr(2, 9),
                                    parentTaskId: parentTask.id,
                                    name,
                                    description: desc,
                                    assigneeId: "u_" + Math.random().toString(36).substr(2, 9),
                                    assigneeName: assignee || "未知人员",
                                    status: TaskStatus.Todo,
                                    dueDate: date
                                });
                                onClose();
                            }
                        }}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold"
                    >
                        确认添加
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
