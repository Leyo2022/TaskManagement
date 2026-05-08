import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { X, Search, FileText, Layers, Paperclip } from "lucide-react";
import { cn } from "../lib/utils";

export const CreateTaskModal = ({ onClose }: { onClose: () => void }) => {
  const [mode, setMode] = useState<'selection' | 'normal' | 'pipeline'>('selection');
  const [pipelineStep, setPipelineStep] = useState<'asset' | 'details'>('asset');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [assetTab, setAssetTab] = useState<'asset' | 'entity'>('asset');
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const mockData = {
    assets: [
      { id: '1', name: '角色_阿凡达', type: '角色', level: 'S', hasTask: false },
      { id: '2', name: '场景_森林', type: '场景', level: 'A', hasTask: true },
      { id: '3', name: '道具_宝剑', type: '道具', level: 'B', hasTask: false },
      { id: '4', name: '特效_火焰', type: '特效', level: 'C', hasTask: false },
      { id: '5', name: '角色_纳美女孩', type: '角色', level: 'S', hasTask: true },
      { id: '6', name: '场景_太空站', type: '场景', level: 'A', hasTask: false },
      { id: '7', name: '道具_飞船', type: '道具', level: 'D', hasTask: false },
      { id: '8', name: '特效_爆炸', type: '特效', level: 'B', hasTask: true },
    ],
    entities: [
      { id: 'e1', name: '场次_001', type: '制作场次', level: 'A', hasTask: false },
      { id: 'e2', name: '镜头_001_A', type: '镜头', level: 'B', hasTask: false },
      { id: 'e3', name: '镜头_001_B', type: '镜头', level: 'C', hasTask: true },
      { id: 'e4', name: '场次_002', type: '制作场次', level: 'A', hasTask: true },
      { id: 'e5', name: '镜头_002_A', type: '镜头', level: 'D', hasTask: false },
    ]
  };

  const currentList = useMemo(() => {
    let list = assetTab === 'asset' ? mockData.assets : mockData.entities;
    if (search) list = list.filter(i => i.name.includes(search));
    
    // Explicitly separating by hasTask status
    const unCreated = list.filter(i => !i.hasTask);
    const created = list.filter(i => i.hasTask);

    if (typeFilter) {
      return {
        unCreated: unCreated.filter(i => i.type === typeFilter),
        created: created.filter(i => i.type === typeFilter)
      };
    }
    
    return { unCreated, created };
  }, [assetTab, search, typeFilter]);

  const types = useMemo(() => Array.from(new Set((assetTab === 'asset' ? mockData.assets : mockData.entities).map(i => i.type))), [assetTab]);

  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [estimatedHours, setEstimatedHours] = useState('8');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const mockUsers = [
    { id: 'u1', name: '张三' },
    { id: 'u2', name: '李四' },
    { id: 'u3', name: '王五' },
  ];
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [taskName, setTaskName] = useState<string>('');

  const pipelineData: Record<string, string[]> = {
    '角色制作': ['模型设计', '拓扑', '高模', '贴图', '绑定'],
    '场景制作': ['布景', '资产整理', '材质', '渲染'],
    '特效制作': ['粒子', '流体', '破坏'],
  };

  const assetNames = useMemo(() => {
    const all = [...mockData.assets, ...mockData.entities];
    return selectedAssets.map(id => all.find(i => i.id === id)?.name).filter(Boolean);
  }, [selectedAssets]);

  React.useEffect(() => {
    if (assetNames.length > 0 && selectedStage) {
      setTaskName(`${assetNames[0]}_${selectedStage}`);
    } else if (assetNames.length > 0) {
        setTaskName(`${assetNames[0]}`);
    }
  }, [assetNames, selectedStage]);

  const toggleAsset = (id: string) => {
    setSelectedAssets(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };


  const handleCreateTask = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {mode === 'selection' ? "新建任务" : mode === 'normal' ? "新建普通任务" : (pipelineStep === 'asset' ? "关联制作对象" : "填写制作信息")}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8">
          {mode === 'selection' && (
            <div className="grid grid-cols-2 gap-6 h-full items-center">
              <button 
                onClick={() => setMode('normal')}
                className="p-6 border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-slate-50 transition-all text-left flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-100 rounded-xl"><FileText className="w-6 h-6 text-indigo-600" /></div>
                  <div className="font-bold text-xl text-indigo-900">普通任务</div>
                </div>
                <div className="text-sm text-slate-500">不绑定资产的自由任务，适用于临时排期或非管线流程任务。</div>
              </button>
              <button 
                onClick={() => { setMode('pipeline'); setPipelineStep('asset'); }}
                className="p-6 border-2 border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-slate-50 transition-all text-left flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 rounded-xl"><Layers className="w-6 h-6 text-emerald-600" /></div>
                  <div className="font-bold text-xl text-emerald-900">管线制作任务</div>
                </div>
                <div className="text-sm text-slate-500">基于管线流程，需关联资产或镜头实体，自动化追踪进度。</div>
              </button>
            </div>
          )}
          
          {mode === 'pipeline' && pipelineStep === 'asset' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button onClick={() => { setAssetTab('asset'); }} className={cn("px-6 py-2 text-sm font-bold rounded-md transition-all", assetTab === 'asset' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}>关联资产</button>
                  <button onClick={() => { setAssetTab('entity'); }} className={cn("px-6 py-2 text-sm font-bold rounded-md transition-all", assetTab === 'entity' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500")}>关联实体</button>
                </div>
                <div className="flex gap-2">
                   <div className="relative">
                     <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                     <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索..." className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-48" />
                   </div>
                   <div className="flex bg-slate-100 p-1 rounded-lg">
                     {types.map(t => <button key={t} onClick={() => setTypeFilter(typeFilter === t ? null : t)} className={cn("px-3 py-1.5 text-xs font-bold rounded-md", typeFilter === t ? "bg-white text-indigo-600" : "text-slate-500")}>{t}</button>)}
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 max-h-[500px] overflow-y-auto">
                {currentList.unCreated.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                      待创建
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">可选择</span>
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      {currentList.unCreated.map(item => (
                        <button 
                          key={item.id}
                          onClick={() => toggleAsset(item.id)}
                          className={cn(
                            "p-3 rounded-xl border flex items-center gap-3 transition-all text-left",
                            selectedAssets.includes(item.id) ? "border-indigo-500 bg-indigo-50" : "border-slate-100 hover:border-indigo-300 bg-white"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px]", selectedAssets.includes(item.id) ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600")}>
                            {item.name.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{item.name}</div>
                            <div className="flex gap-2 text-[10px] text-slate-400">
                                <span>{item.type}</span>
                                <span className="text-indigo-600 font-bold">等级: {item.level}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {currentList.created.length > 0 && (
                  <div className="border-t pt-6">
                      <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-between">
                      已创建任务
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      {currentList.created.map(item => (
                        <button
                          key={item.id}
                          onClick={() => toggleAsset(item.id)}
                          className={cn(
                            "p-3 rounded-xl border flex items-center gap-3 transition-all text-left",
                            selectedAssets.includes(item.id) 
                              ? "border-indigo-500 bg-indigo-50" 
                              : "border-slate-100 bg-slate-50"
                          )}
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px]", 
                              selectedAssets.includes(item.id) ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400")}>
                            {item.name.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={cn("text-xs font-bold truncate", selectedAssets.includes(item.id) ? "text-slate-900" : "text-slate-400")}>{item.name}</div>
                            <div className="flex gap-2 text-[10px] text-slate-300">
                                <span>{item.type}</span>
                                <span className={cn("font-bold", selectedAssets.includes(item.id) ? "text-indigo-600" : "text-slate-400")}>等级: {item.level}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button disabled={selectedAssets.length === 0} onClick={() => setPipelineStep('details')} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg disabled:opacity-50">下一步：填写任务信息 ({selectedAssets.length} 已选)</button>
            </div>
          )}

          {(mode === 'normal' || (mode === 'pipeline' && pipelineStep === 'details')) && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="font-bold text-sm text-slate-900 border-b pb-2">填写任务详情</div>
              {mode === 'pipeline' && (
                <button onClick={() => setPipelineStep('asset')} className="text-xs text-indigo-600 hover:underline">← 返回重新选择</button>
              )}
              <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} placeholder="任务名称" className="w-full p-4 border border-slate-200 rounded-xl text-sm" />
              <div className="grid grid-cols-1 gap-4">
                  <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} className="p-4 border border-slate-200 rounded-xl text-sm bg-white">
                    <option value="">选择环节</option>
                    {Object.keys(pipelineData).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {selectedStage && pipelineData[selectedStage] && (
                      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-400 font-bold self-center">管线：</span>
                        {pipelineData[selectedStage].map(step => (
                            <span key={step} className="px-3 py-1 bg-white border border-slate-200 text-xs text-slate-600 rounded-full shadow-sm">{step}</span>
                        ))}
                      </div>
                  )}
               </div>

              <div className="grid grid-cols-2 gap-4">
                 <select className="p-4 border border-slate-200 rounded-xl text-sm bg-white" 
                        value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)}>
                    <option value="">责任人</option>
                    {mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <input type="number" placeholder="预估时长(小时)" className="p-4 border border-slate-200 rounded-xl text-sm" 
                       value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} />
              </div>
              
              <div>
                  <label className="text-xs text-slate-500 font-bold mb-2 block">参与人</label>
                  <select multiple className="w-full p-4 border border-slate-200 rounded-xl text-sm bg-white"
                          value={participants} onChange={e => setParticipants(Array.from(e.target.selectedOptions, option => option.value))}>
                      {mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <input type="date" placeholder="计划开始时间" className="p-4 border border-slate-200 rounded-xl text-sm"
                         value={startDate} onChange={e => setStartDate(e.target.value)}/>
                  <input type="date" placeholder="计划结束时间 (非必填)" className="p-4 border border-slate-200 rounded-xl text-sm" 
                         value={endDate} onChange={e => setEndDate(e.target.value)}/>
              </div>
              <textarea placeholder="任务描述" className="w-full p-4 border border-slate-200 rounded-xl text-sm h-32" />

              <div>
                <label className="text-xs text-slate-500 font-bold mb-2 block">任务资料/附件</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-400 transition-all bg-slate-50">
                  <input type="file" multiple className="hidden" id="file-upload" onChange={(e) => {
                    if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
                  }} />
                  <label htmlFor="file-upload" className="cursor-pointer">
                     <Paperclip className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                     <span className="text-xs text-slate-500">点击上传或拖拽文件到这里</span>
                  </label>
                </div>
                {files.length > 0 && (
                   <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
                     <FileText className="w-3 h-3" />
                     已选择 {files.length} 个文件
                   </div>
                )}
              </div>
              <button onClick={handleCreateTask} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg">确认创建任务</button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
