// Video types for the new Task/Video architecture
// Task = Client Project (contains multiple videos)
// Video = Unit of work

// Unified video workflow statuses
export type VideoStatus = 
  | 'new'              // Video created, not started
  | 'active'           // Editor has started working
  | 'late'             // Deadline passed (automatic)
  | 'review_admin'     // Editor submitted, waiting for admin validation
  | 'review_client'    // Admin approved, sent to client
  | 'revision_requested' // Client or Admin requested revision
  | 'completed'        // Client approved
  | 'cancelled';       // Cancelled

export type VideoDeliveryType = 'file' | 'link';
export type VideoLinkType = 'drive' | 'frame' | 'dropbox' | 'other';

export interface Video {
  id: string;
  task_id: string;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: VideoStatus;
  deadline: string | null;
  allowed_duration_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  is_validated: boolean;
  validated_at: string | null;
  validated_by: string | null;
  validation_rating: number | null;
  revision_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  assignee?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface VideoDelivery {
  id: string;
  video_id: string;
  editor_id: string;
  version_number: number;
  delivery_type: VideoDeliveryType;
  file_path: string | null;
  external_link: string | null;
  link_type: VideoLinkType | null;
  notes: string | null;
  submitted_at: string;
  created_at: string;
}

export interface VideoReviewLink {
  id: string;
  video_id: string;
  delivery_id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  views_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

export interface VideoFeedback {
  id: string;
  video_id: string;
  delivery_id: string;
  review_link_id: string;
  decision: 'approved' | 'revision_requested';
  rating: number | null;
  feedback_text: string | null;
  revision_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string;
  created_at: string;
}

// Task as a Project container
export interface TaskProject {
  id: string;
  title: string;
  description: string | null;
  client_name: string | null;
  client_type: 'b2b' | 'b2c' | 'international' | null;
  project_name: string | null;
  status: string;
  reward_level: 'standard' | 'high' | 'premium';
  deadline: string | null;
  video_count: number;
  videos_completed: number;
  created_at: string;
  updated_at: string;
  // Computed/joined data
  videos?: Video[];
  progress_percentage?: number;
  late_videos_count?: number;
  in_review_videos_count?: number;
}

// PM Dashboard specific types
export interface EditorPerformance {
  id: string;
  name: string;
  avatar: string | null;
  level: number;
  rank: string;
  xp: number;
  videos_this_month: number;
  validated_videos: number;
  late_videos: number;
  on_time_rate: number;
  avg_quality: number;
  active_videos: number;
  streak: number;
  status: 'active' | 'warning' | 'at_risk';
}

export interface PendingVideoValidation {
  id: string;
  video_id: string;
  title: string;
  task_title: string;
  client_name: string | null;
  editor_id: string;
  editor_name: string;
  delivery_id: string;
  submitted_at: string;
  deadline: string | null;
  is_on_time: boolean;
  is_urgent: boolean;
  revision_count: number;
  // Preview link
  preview_link: string | null;
  preview_link_type: VideoLinkType | null;
  // File upload
  file_path: string | null;
  delivery_type: string | null;
  // Cloudflare Stream
  cloudflare_stream_id: string | null;
  // Video description (instructions + source link)
  description: string | null;
}

export interface TaskProjectSummary {
  id: string;
  title: string;
  client_name: string | null;
  client_avatar: string | null;
  video_count: number;
  videos_completed: number;
  videos_late: number;
  videos_in_review: number;
  videos_at_client: number;
  videos_active: number;
  deadline: string | null;
  editors: {
    id: string;
    name: string;
    videos_assigned: number;
    videos_completed: number;
  }[];
}
