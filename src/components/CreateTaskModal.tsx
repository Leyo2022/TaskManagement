import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Check, ArrowRight, User, AlertCircle, Calendar, Paperclip, FileText } from "lucide-react";
import { cn } from "../lib/utils";

export const CreateTaskModal = ({ onClose }: { onClose: () => void }) => {
  const [mode, setMode] = useState<'selection' | 'normal' | 'pipeline'>('selection');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold">新建任务</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        
        <div className="p-6">
          {mode === 'selection' && (
            <div className="flex gap-4">
              <button 
                onClick={() => setMode('normal')}
                className="flex-1 p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-500 transition-all text-center"
              >
                <div className="font-bold text-lg mb-1">普通任务</div>
                <div className="text-xs text-slate-500">不绑定资产的自由任务</div>
              </button>
              <button 
                onClick={() => setMode('pipeline')}
                className="flex-1 p-6 border-2 border-slate-200 rounded-xl hover:border-indigo-500 transition-all text-center"
              >
                <div className="font-bold text-lg mb-1">管线制作任务</div>
                <div className="text-xs text-slate-500">基于管线流程的制作任务</div>
              </button>
            </div>
          )}
          
          {(mode === 'normal' || mode === 'pipeline') && (
            <div className="space-y-4">
              <div className="font-bold text-sm text-slate-900 mb-4">
                {mode === 'normal' ? '新建普通任务' : '新建管线制作任务'}
              </div>
              {/* Form fields here */}
              <input type="text" placeholder="任务名称" className="w-full p-3 border border-slate-200 rounded-lg text-sm" />
              <button className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold">创建任务</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
