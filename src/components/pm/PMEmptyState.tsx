import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, FolderOpen, CheckCircle2, Users, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface PMEmptyStateProps {
  type: 'projects' | 'validation' | 'editors' | 'videos';
  onAction?: () => void;
  actionLabel?: string;
}

const emptyStates: Record<string, { 
  icon: LucideIcon; 
  title: string; 
  description: string;
  showAction: boolean;
}> = {
  projects: {
    icon: FolderOpen,
    title: 'Aucun projet en cours',
    description: 'Créez votre premier projet pour commencer à gérer vos vidéos',
    showAction: true,
  },
  validation: {
    icon: CheckCircle2,
    title: 'Aucune vidéo en attente',
    description: 'Toutes les vidéos ont été validées. Excellent travail !',
    showAction: false,
  },
  editors: {
    icon: Users,
    title: 'Aucun éditeur enregistré',
    description: 'Invitez des éditeurs pour constituer votre équipe',
    showAction: true,
  },
  videos: {
    icon: Video,
    title: 'Aucune vidéo trouvée',
    description: 'Les vidéos apparaîtront ici une fois créées',
    showAction: false,
  },
};

export function PMEmptyState({ type, onAction, actionLabel }: PMEmptyStateProps) {
  const state = emptyStates[type];
  const Icon = state.icon;
  
  return (
    <Card className="border-dashed border-2 border-border/50">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-semibold text-lg">{state.title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{state.description}</p>
        </div>
        {state.showAction && onAction && (
          <Button onClick={onAction} className="mt-2 gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel || 'Créer'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
