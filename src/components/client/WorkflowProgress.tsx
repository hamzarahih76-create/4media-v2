import { cn } from '@/lib/utils';
import { 
  Lightbulb, 
  FileText, 
  Camera, 
  Film, 
  Send, 
  BarChart3, 
  Check 
} from 'lucide-react';
import type { ClientContentItem } from '@/hooks/useClientProfile';

interface WorkflowProgressProps {
  contentByStep: Record<string, ClientContentItem[]>;
  primaryColor?: string;
  workflowStatus?: string;
}

const WORKFLOW_STEPS = [
  { key: 'idea', label: 'Idée', icon: Lightbulb, description: 'Brainstorming & concepts' },
  { key: 'script', label: 'Script', icon: FileText, description: 'Rédaction & validation' },
  { key: 'filmmaking', label: 'Filmmaking', icon: Camera, description: 'Tournage & production' },
  { key: 'editing', label: 'Montage & Design', icon: Film, description: 'Édition vidéo & visuels' },
  { key: 'publication', label: 'Publication', icon: Send, description: 'Mise en ligne' },
  { key: 'analysis', label: 'Analyse', icon: BarChart3, description: 'Performance & insights' },
];

function getStepStatus(items: ClientContentItem[]): 'empty' | 'in_progress' | 'completed' {
  if (items.length === 0) return 'empty';
  const allValidated = items.every(i => i.status === 'validated' || i.status === 'delivered');
  if (allValidated) return 'completed';
  return 'in_progress';
}

export function WorkflowProgress({ contentByStep, primaryColor = '#22c55e', workflowStatus }: WorkflowProgressProps) {
  const currentStepIndex = workflowStatus ? WORKFLOW_STEPS.findIndex(s => s.key === workflowStatus) : -1;

  return (
    <div className="w-full">
      <h2 className="text-lg font-semibold text-white mb-6">Avancement de votre projet</h2>
      
      {/* Desktop: horizontal steps */}
      <div className="hidden md:flex items-start justify-between gap-2 relative">
        {/* Connector line */}
        <div className="absolute top-6 left-[calc(8.33%+12px)] right-[calc(8.33%+12px)] h-0.5 bg-white/10" />
        
        {WORKFLOW_STEPS.map((step, index) => {
          const items = contentByStep[step.key] || [];
          // Use admin workflow_status if available, otherwise fall back to content-based status
          const status = currentStepIndex >= 0
            ? (index < currentStepIndex ? 'completed' : index === currentStepIndex ? 'in_progress' : 'empty')
            : getStepStatus(items);
          const itemCount = items.length;

          return (
            <div key={step.key} className="flex flex-col items-center text-center flex-1 relative z-10">
              {/* Circle */}
              <div
                className={cn(
                  'h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all',
                  status === 'completed' && 'text-white border-transparent',
                  status === 'in_progress' && 'border-transparent text-white animate-pulse',
                    status === 'empty' && 'bg-white/10 border-white/20 text-white/40'
                )}
                style={
                  status === 'completed' 
                    ? { backgroundColor: primaryColor, borderColor: primaryColor }
                    : status === 'in_progress'
                    ? { backgroundColor: `${primaryColor}cc`, borderColor: primaryColor }
                    : {}
                }
              >
                {status === 'completed' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                'mt-3 text-sm font-medium',
                status === 'empty' ? 'text-white/40' : 'text-white'
              )}>
                {step.label}
              </span>
              
              {/* Description */}
              <span className="text-xs text-white/30 mt-1">
                {step.description}
              </span>

              {/* Count badge */}
              {itemCount > 0 && (
                <span 
                  className="mt-2 text-xs px-2 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  {itemCount} {itemCount > 1 ? 'éléments' : 'élément'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical steps */}
      <div className="md:hidden space-y-4">
        {WORKFLOW_STEPS.map((step, index) => {
          const items = contentByStep[step.key] || [];
          const status = currentStepIndex >= 0
            ? (index < currentStepIndex ? 'completed' : index === currentStepIndex ? 'in_progress' : 'empty')
            : getStepStatus(items);
          const itemCount = items.length;

          return (
            <div key={step.key} className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all',
                    status === 'completed' && 'text-white border-transparent',
                    status === 'in_progress' && 'border-transparent text-white',
                    status === 'empty' && 'bg-white/10 border-white/20 text-white/40'
                  )}
                  style={
                    status !== 'empty' 
                      ? { backgroundColor: status === 'completed' ? primaryColor : `${primaryColor}cc` }
                      : {}
                  }
                >
                  {status === 'completed' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                {index < WORKFLOW_STEPS.length - 1 && (
                  <div className="w-0.5 h-6 bg-white/10 mt-1" />
                )}
              </div>
              
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-medium',
                    status === 'empty' ? 'text-white/40' : 'text-white'
                  )}>
                    {step.label}
                  </span>
                  {itemCount > 0 && (
                    <span 
                      className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="text-xs text-white/30">{step.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
