// オヤカツ 型定義

// ==================== ユーザー ====================
export type UserRole = 'parent' | 'child';

export interface User {
  id: string;
  phoneNumber?: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  role?: UserRole;
  createdAt: string;
  updatedAt: string;
}

// ==================== ファミリー ====================
export interface Family {
  id: string;
  name: string;
  iconUrl?: string;
  createdBy: string;
  memberCount: number;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  title: Title;
  monthlyAmount: number;
  joinedAt: string;
}

export interface FamilyDetail extends Family {
  members: FamilyMember[];
}

// ==================== 報酬設定 ====================
export type CallRewardType = 'fixed' | 'per_minute';

export interface RewardSetting {
  id: string;
  familyId: string;
  parentId: string;
  childId: string;
  childDisplayName: string;
  callRewardType: CallRewardType;
  callRewardAmount: number;
  photoRewardAmount: number;
  updatedAt: string;
}

// ==================== 通話 ====================
export type CallType = 'video' | 'audio';
export type CallStatus = 'ongoing' | 'completed' | 'missed';
export type CallRequestStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface CallRequest {
  id: string;
  familyId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  callType: CallType;
  estimatedReward: number;
  status: CallRequestStatus;
  expiresAt: string;
  createdAt: string;
}

export interface Call {
  id: string;
  familyId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  callType: CallType;
  durationSeconds: number;
  rewardAmount: number;
  status: CallStatus;
  startedAt: string;
  endedAt?: string;
}

// ==================== 写真 ====================
export type PhotoVisibility = 'all' | 'specific';
export type ReactionType = 'heart' | 'smile' | 'clap' | 'cry';

export interface Photo {
  id: string;
  familyId: string;
  uploaderId: string;
  uploaderName: string;
  uploaderAvatarUrl?: string;
  imageUrl: string;
  thumbnailUrl: string;
  caption?: string;
  visibility: PhotoVisibility;
  reactionCounts: Record<ReactionType, number>;
  rewardAmount: number;
  uploadedAt: string;
}

export interface Reaction {
  id: string;
  photoId: string;
  userId: string;
  userName: string;
  type: ReactionType;
  createdAt: string;
}

// ==================== 報酬 ====================
export type RewardSource = 'call' | 'photo';
export type RewardStatus = 'pending' | 'confirmed';

export interface Reward {
  id: string;
  familyId: string;
  parentId: string;
  parentName: string;
  childId: string;
  childName: string;
  sourceType: RewardSource;
  sourceId: string;
  amount: number;
  status: RewardStatus;
  confirmedAt?: string;
  createdAt: string;
}

export interface RewardSummary {
  month: string;
  totalAmount: number;
  pendingAmount: number;
  confirmedAmount: number;
  callCount: number;
  photoCount: number;
  title: Title;
  rank?: number;
}

// ==================== ランキング・称号 ====================
export interface Title {
  id: string;
  name: string;
  minAmount: number;
  maxAmount?: number;
  icon: string;
}

export interface RankingEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  amount: number;
  title: Title;
}

// ==================== 通知 ====================
export type NotificationType =
  | 'call_request'
  | 'photo_posted'
  | 'reward_received'
  | 'title_changed'
  | 'ranking_changed';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ==================== ページネーション ====================
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
