import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaskCard } from './TaskCard';
import { AlertTriangle, Play, Clock, CheckCircle, FileText, UserCheck, RotateCcw } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  client: string;
  project: string;
  status: 'new' | 'active' | 'late' | 'review_admin' | 'review_client' | 'revision_requested' | 'completed';
  deadline: string;
  rewardLevel: 'standard' | 'high' | 'premium';
  clientType?: 'b2b' | 'b2c' | 'international';
  source?: 'assigned' | 'created';
  startedAt?: Date | null;
  completedAt?: Date | null;
}

interface TaskTabsProps {
  tasks: Task[];
  onStart?: (taskId: string) => void;
  onOpenWorkflow?: (taskId: string) => void;
}

export function TaskTabs({ tasks, onStart, onOpenWorkflow }: TaskTabsProps) {
  // Categorize tasks by unified workflow status
  
  // NEW tasks - not started yet
  const newTasks = tasks.filter(t => t.status === 'new');
  
  // Active: currently working on
  const activeTasks = tasks.filter(t => t.status === 'active');
  
  // Late: deadline passed
  const lateTasks = tasks.filter(t => t.status === 'late');
  
  // Attente de révision: submitted by editor, waiting for admin validation (review_admin only)
  const waitingReviewTasks = tasks.filter(t => t.status === 'review_admin');
  
  // Révision client: PM/Admin requested revision OR with client for approval
  const reviewClientTasks = tasks.filter(t => t.status === 'review_client' || t.status === 'revision_requested');
  
  // Completed
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const tabs = [
    { 
      id: 'new', 
      label: 'Nouveau', 
      icon: FileText, 
      tasks: newTasks,
      count: newTasks.length,
      highlight: newTasks.length > 0 
    },
    { 
      id: 'active', 
      label: 'Active', 
      icon: Play, 
      tasks: activeTasks,
      count: activeTasks.length 
    },
    { 
      id: 'late', 
      label: 'En retard', 
      icon: AlertTriangle, 
      tasks: lateTasks,
      count: lateTasks.length 
    },
    { 
      id: 'waiting_review', 
      label: 'Attente de révision', 
      icon: Clock, 
      tasks: waitingReviewTasks,
      count: waitingReviewTasks.length 
    },
    { 
      id: 'review_client', 
      label: 'Révision client', 
      icon: UserCheck,
      tasks: reviewClientTasks,
      count: reviewClientTasks.length 
    },
    { 
      id: 'completed', 
      label: 'Terminé', 
      icon: CheckCircle, 
      tasks: completedTasks,
      count: completedTasks.length 
    },
  ];

  // Find default tab (first one with tasks, prioritizing new/active)
  const defaultTab = tabs.find(t => t.count > 0)?.id || 'new';

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="w-full h-auto p-0 bg-transparent grid grid-cols-6 border-b border-border mb-4">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex items-center justify-center gap-1.5 px-2 py-3 text-sm font-medium text-muted-foreground bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-foreground transition-colors"
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
                tab.id === 'late'
                  ? 'bg-destructive/15 text-destructive font-medium' 
                  : tab.id === 'new' && tab.highlight
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {tab.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0">
          {tab.tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <tab.icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {tab.id === 'new' 
                  ? 'Aucune tâche en attente de démarrage'
                  : tab.id === 'active'
                    ? 'Aucune tâche active'
                  : tab.id === 'late'
                    ? 'Aucune tâche en retard'
                  : tab.id === 'waiting_review'
                    ? 'Aucune tâche en attente de révision'
                  : tab.id === 'review_client'
                    ? 'Aucune tâche chez le client'
                    : 'Aucune tâche terminée'
                }
              </p>
              {tab.id === 'new' && (
                <p className="text-xs mt-1">Créez une tâche B2C ou attendez une assignation</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {tab.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onOpenWorkflow={() => onOpenWorkflow?.(task.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
