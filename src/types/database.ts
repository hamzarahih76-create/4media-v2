export type AppRole = 'admin' | 'editor' | 'client' | 'project_manager' | 'designer' | 'copywriter';
export type ProjectStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type SubscriptionType = 'starter' | 'growth' | 'premium';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Client {
  id: string;
  user_id: string | null;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  subscription_type: SubscriptionType;
  subscription_start: string | null;
  subscription_end: string | null;
  monthly_rate: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  position: string | null;
  department: string | null;
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  deadline: string | null;
  video_count: number;
  videos_delivered: number;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Task {
  id: string;
  project_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  project?: Project;
  assignee?: Profile;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  status: PaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  invoice_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}
