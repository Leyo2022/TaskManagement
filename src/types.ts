export enum TaskStatus {
  Todo = 'todo',
  Doing = 'in_progress',
  Review = 'review',
  Paused = 'paused',
  Done = 'done',
  Cancelled = 'cancelled'
}

export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent'
}

export enum TaskType {
  Asset = 'asset_creation',
  AssetModification = 'asset_modification',
  Shot = 'shoot_prep',
  Review = 'review_task',
  Other = 'other'
}

export enum TaskProcessStatus {
  NotStarted = 'not_started',
  Processing = 'producing',
  Auditing = 'reviewing',
  Finished = 'completed',
  Pause = 'paused',
  AssignPending = 'assign_pending',
  AssignRejected = 'assign_rejected',
  PendingDispatch = 'pending_dispatch',
  Accepting = 'accepting'
}

export interface ApprovalRecord {
  id: string;
  approverName: string;
  status: 'approved' | 'rejected';
  comment: string;
  time: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  details?: string;
  type: 'creation' | 'modification' | 'status_change' | 'comment' | 'submission';
}

export interface TaskMaterial {
  id: string;
  name: string;
  type: 'file' | 'image' | 'video' | 'link';
  url: string;
  size?: string;
  uploadedBy: string;
  uploadedAt: string;
  category: 'reference' | 'work_in_progress' | 'published';
}

export interface Subtask {
  id: string;
  parentTaskId: string;
  name: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar?: string;
  status: TaskStatus;
  dueDate: string; // YYYY-MM-DD
}

export interface Task {
  // 一、基础信息
  id: string;
  name: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  processStatus?: TaskProcessStatus;
  progress: number; // 0-100
  subtasks?: Subtask[];

  // 二、关联对象
  projectId: string;
  projectName: string;
  projectStatus?: string; // 项目状态
  projectDirector?: string; // 项目导演
  projectLead?: string; // 项目负责人
  productionSessionIds?: string[]; // 关联制作场次
  assetIds?: string[]; // 关联资产
  assetType?: string; // 资产类型
  pipelineStepId?: string; // 关联管线步骤
  parentTaskId?: string;
  precedentTaskIds?: string[]; // 前置任务
  announcementId?: string; // 关联通告
  shotId?: string; // 关联镜头
  timelineId?: string; // 关联时间线
  takeId?: string; // 关联Take条

  // 三、时间与工时
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  overdueTime?: string; // 超时时间
  plannedHours: number;
  attendanceHours: number; // 考勤工时
  dutyHours: number; // 出勤工时
  actualHours: number; // 实际工时
  approvedHours?: number; // 核准工时
  submissionTime?: string;

  // 四、负责人与参与人
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar?: string;
  participantIds?: string[]; // 参与人
  participantNames?: string[]; // 参与人姓名列表
  reviewerId?: string; // 审核人
  reviewerName?: string; // 审核人姓名
  creatorId: string;
  creatorName: string;
  modifierId?: string;
  createdAt: string;

  // 五、版本与审核（只记录，不展示在主列表）
  reviewIteration: number;
  reviewVersion?: string;
  processInstanceId?: string;

  // 六、资源与输出
  thumbnail?: string;
  gifUrl?: string;
  assetVersionId?: string;
  outputPath?: string;
  dccTools?: string[]; // DCC 启动工具

  // 七、其他 UI 辅助字段
  labels: string[];
  attachmentsCount: number;
  commentsCount: number;
  approvalRecords?: ApprovalRecord[];
  clockInRecords?: ClockInSession[]; // 打卡记录
  activityLogs?: ActivityLog[]; // 操作记录
  materials?: TaskMaterial[]; // 任务资料
  versions?: Version[]; // 版本发布信息
}

export interface Version {
  id: string;
  taskId: string;
  taskName: string;
  versionNumber: string; // e.g., v001
  publisherId: string;
  publisherName: string;
  publishedAt: string;
  description: string;
  thumbnail?: string;
  status: 'pending' | 'approved' | 'rejected';
  fileUrl?: string;
  assetName?: string;
  assetType?: string;
  dependencies?: {
    id: string;
    name: string;
    type: string;
  }[];
  approvalRecords?: ApprovalRecord[];
}

export type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than';

export interface FilterCondition {
  id: string;
  field: keyof Task;
  operator: FilterOperator;
  value: any;
}

export interface ViewConfig {
  id: string;
  name: string;
  icon: string;
  type: 'list' | 'kanban' | 'gantt' | 'calendar' | 'work_hours' | 'clock_in' | 'submissions';
  filters: FilterCondition[];
  visibleColumns: string[];
  groupBy?: string;
  sortBy?: { field: string; order: 'asc' | 'desc' };
}

export interface WorkLog {
  id: string;
  taskId: string;
  taskName: string;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD
  clockInHours: number;
  actualHours: number;
  approvedHours: number;
  attendanceHours: number;
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  projectName?: string;
  departmentName?: string;
}

export interface ClockInSession {
  id: string;
  userId: string;
  userName: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  duration?: number; // hours
  taskId?: string; // Optional: associated task
  taskName?: string;
  status: 'active' | 'completed' | 'allocated';
}

export interface WeeklyWorkLogSubmission {
  id: string;
  userId: string;
  userName: string;
  weekRange: string; // e.g., "04月06日 - 04月12日"
  startDate: string; // YYYY-MM-DD for linking
  submittedAt: string; // ISO string
  status: 'pending' | 'approved' | 'rejected';
  approvalRecords: ApprovalRecord[];
}

export interface UnassignedTime {
  id: string;
  userId: string;
  userName: string;
  date: string;
  totalDuration: number;
  allocatedDuration: number;
  duration: number;
  sourceSessionId?: string;
  status: 'pending' | 'completed';
}

export interface Shortcut {
  id: string;
  name: string;
  url: string;
  icon?: string;
  color?: string;
}
