import { Button } from '@/components/ui/button';
import {
  Plus,
  RefreshCw,
  Download,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface PMQuickActionsProps {
  onNewProject: () => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function PMQuickActions({
  onNewProject,
  viewMode = 'grid',
  onViewModeChange,
  onRefresh,
  isLoading,
}: PMQuickActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* View mode toggle */}
      {onViewModeChange && (
        <div className="flex items-center rounded-lg border border-border/50 p-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              viewMode === 'grid' && 'bg-muted'
            )}
            onClick={() => onViewModeChange('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              viewMode === 'list' && 'bg-muted'
            )}
            onClick={() => onViewModeChange('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Refresh */}
      {onRefresh && (
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      )}

      {/* Filter dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Filtrer
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Statut</DropdownMenuLabel>
          <DropdownMenuItem>Tous les projets</DropdownMenuItem>
          <DropdownMenuItem>En cours</DropdownMenuItem>
          <DropdownMenuItem>En retard</DropdownMenuItem>
          <DropdownMenuItem>Terminés</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Tri</DropdownMenuLabel>
          <DropdownMenuItem>Plus récent</DropdownMenuItem>
          <DropdownMenuItem>Deadline proche</DropdownMenuItem>
          <DropdownMenuItem>Progression</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* New Project - Primary action */}
      <Button 
        className="h-9 gap-2 bg-primary hover:bg-primary/90"
        onClick={onNewProject}
      >
        <Plus className="h-4 w-4" />
        Nouveau Projet
      </Button>
    </div>
  );
}
