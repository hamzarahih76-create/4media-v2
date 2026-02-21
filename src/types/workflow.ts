// Unified workflow statuses matching video workflow
export type TaskWorkflowStatus = 
  | 'new'              // Task created, not started
  | 'active'           // Editor has started working
  | 'late'             // Deadline passed (automatic)
  | 'review_admin'     // Editor submitted, waiting for admin validation
  | 'review_client'    // Admin approved, sent to client
  | 'revision_requested' // Client or Admin requested revision
  | 'completed'        // Client approved
  | 'cancelled';       // Cancelled

export type DeliveryType = 'file' | 'link';
export type LinkType = 'drive' | 'frame' | 'dropbox' | 'other';
export type FeedbackDecision = 'approved' | 'revision_requested';
export type ClientType = 'b2b' | 'b2c' | 'international';
export type TaskSource = 'assigned' | 'created'; // assigned = B2B from Admin, created = B2C by editor

export interface WorkflowTask {
  id: string;
  project_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  client_name: string | null;
  project_name: string | null;
  client_type: ClientType | null;
  status: TaskWorkflowStatus;
  reward_level: 'standard' | 'high' | 'premium';
  deadline: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskDelivery {
  id: string;
  task_id: string;
  editor_id: string;
  version_number: number;
  delivery_type: DeliveryType;
  file_path: string | null;
  external_link: string | null;
  link_type: LinkType | null;
  notes: string | null;
  submitted_at: string;
  created_at: string;
}

export interface ReviewLink {
  id: string;
  task_id: string;
  delivery_id: string;
  token: string;
  expires_at: string;
  is_active: boolean;
  views_count: number;
  last_viewed_at: string | null;
  created_at: string;
}

export interface ClientFeedback {
  id: string;
  review_link_id: string;
  task_id: string;
  delivery_id: string;
  decision: FeedbackDecision;
  rating: number | null;
  feedback_text: string | null;
  revision_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string;
  created_at: string;
}
