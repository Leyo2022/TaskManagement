import React, { useState } from "react";
import { X, Save, GripVertical, Settings, ChevronDown, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

type PipelineStep = {
    id: string;
    name: string;
    type: string;
    roles: string[];
    isParallel?: boolean;
};

export const PipelineEditModal = ({ 
    onClose, 
    pipelineName, 
    initialSteps,
    onSave 
}: { 
    onClose: () => void, 
    pipelineName: string, 
    initialSteps: string[],
    onSave: (steps: string[]) => void
}) => {
    // Convert flat initialSteps to rich objects for the UI
    const [steps, setSteps] = useState<PipelineStep[]>(initialSteps.map((s, i) => ({
        id: `step-${i}`, name: s, type: '制作步骤', roles: ['艺术家'], isParallel: false 
    })));
    const [selectedStepId, setSelectedStepId] = useState<string | null>(steps[0]?.id || null);

    const selectedStep = steps.find(s => s.id === selectedStepId);

    const updateStep = (id: string, updates: Partial<PipelineStep>) => {
        setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    return (
        <div className="fixed inset-0 z-[110] bg-slate-950 text-slate-100 flex flex-col">
            {/* Header */}
            <div className="h-20 border-b border-slate-800 flex items-center justify-between px-8">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg"><X className="w-6 h-6" /></button>
                    <div>
                        <h2 className="text-lg font-bold">{pipelineName} - 管线流程配置</h2>
                        <p className="text-sm text-slate-400">角色 • 步骤内嵌工作流: 模型三级审核工作流</p>
                    </div>
                </div>
                <button 
                  onClick={() => { onSave(steps.map(s => s.name)); onClose(); }} 
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold"
                >
                    <Save className="w-5 h-5" /> 保存管线
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Canvas Area */}
                <div className="flex-1 bg-slate-950 p-12 overflow-auto flex items-center gap-8">
                    {steps.map(step => (
                        <div key={step.id} onClick={() => setSelectedStepId(step.id)} className={cn("p-6 w-56 border-2 rounded-2xl cursor-pointer transition-all", selectedStepId === step.id ? "border-indigo-500 bg-slate-900 shadow-[0_0_20px_rgba(99,102,241,0.2)]" : "border-slate-800 bg-slate-900 hover:border-slate-600")}>
                            <h3 className="font-bold text-center">{step.name}</h3>
                            <p className="text-xs text-slate-500 text-center mt-2">12-20H</p>
                        </div>
                    ))}
                </div>

                {/* Properties Sidebar */}
                <div className="w-96 border-l border-slate-800 bg-slate-900 p-6 flex flex-col">
                    <h3 className="text-lg font-bold mb-6">步骤属性</h3>
                    
                    {selectedStep ? (
                        <div className="space-y-6 flex-1">
                            <div className="p-4 bg-slate-800 rounded-xl flex items-center gap-4">
                                <div className="p-3 bg-slate-700 rounded-lg"><Settings className="w-6 h-6" /></div>
                                <input value={selectedStep.name} onChange={e => updateStep(selectedStep.id, { name: e.target.value })} className="bg-transparent font-bold text-lg w-full outline-none" />
                            </div>

                            <div>
                                <label className="text-sm text-slate-400 block mb-2">步骤类型</label>
                                <div className="p-3 bg-slate-950 border border-slate-700 rounded-lg flex items-center justify-between">
                                    {selectedStep.type} <ChevronDown className="w-4 h-4 text-slate-500" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-slate-400 block mb-2">负责角色</label>
                                <div className="p-3 bg-slate-950 border border-slate-700 rounded-lg flex items-center justify-between">
                                    已选 {selectedStep.roles.length} 个角色 <ChevronDown className="w-4 h-4 text-slate-500" />
                                </div>
                            </div>

                            <button className="w-full py-3 border border-slate-700 hover:border-rose-900 hover:text-rose-400 rounded-lg text-sm mt-8">从管线中移除</button>
                            <button className="w-full py-3 bg-rose-950/30 text-rose-500 hover:bg-rose-900 rounded-lg text-sm"><Trash2 className="w-4 h-4 inline mr-2" /> 删除步骤</button>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-center">选择一个步骤以查看详情</p>
                    )}
                </div>
            </div>
        </div>
    );
};
