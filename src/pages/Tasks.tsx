import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Search, 
  Calendar,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data
const tasks = [
  { 
    id: 1, 
    title: 'Montage Reel #23 - TechStartup', 
    project: 'Pack Reels Octobre',
    assignee: 'Alex Moreau',
    status: 'in_progress',
    priority: 3,
    due_date: '2025-01-10'
  },
  { 
    id: 2, 
    title: 'Color grading vidéos FashionBrand', 
    project: 'Campagne TikTok Q1',
    assignee: 'Marie Laurent',
    status: 'todo',
    priority: 2,
    due_date: '2025-01-12'
  },
  { 
    id: 3, 
    title: 'Review client - Reel #20', 
    project: 'Pack Reels Octobre',
    assignee: 'Sophie Martin',
    status: 'todo',
    priority: 3,
    due_date: '2025-01-08'
  },
  { 
    id: 4, 
    title: 'Création motion graphics', 
    project: 'Shorts YouTube Fitness',
    assignee: 'Lucas Petit',
    status: 'in_progress',
    priority: 1,
    due_date: '2025-01-15'
  },
  { 
    id: 5, 
    title: 'Export final Reel #18', 
    project: 'Pack Reels Octobre',
    assignee: 'Alex Moreau',
    status: 'done',
    priority: 2,
    due_date: '2025-01-05'
  },
];

const statusConfig = {
  todo: { label: 'À faire', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'En cours', color: 'bg-primary/20 text-primary' },
  done: { label: 'Terminé', color: 'bg-success/20 text-success' },
};

const priorityConfig = {
  1: { label: 'Faible', color: 'bg-muted text-muted-foreground' },
  2: { label: 'Moyen', color: 'bg-warning/20 text-warning' },
  3: { label: 'Urgent', color: 'bg-destructive/20 text-destructive' },
};

export default function Tasks() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tâches</h1>
            <p className="text-muted-foreground">Gérez les tâches de l'équipe</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle tâche
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher une tâche..." 
            className="pl-10"
          />
        </div>

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle>Toutes les tâches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((task) => {
                const status = statusConfig[task.status as keyof typeof statusConfig];
                const priority = priorityConfig[task.priority as keyof typeof priorityConfig];
                
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox checked={task.status === 'done'} />
                      <div>
                        <p className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {task.project} • {task.assignee}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(task.due_date).toLocaleDateString('fr-FR')}
                      </div>
                      <Badge className={priority.color}>
                        {priority.label}
                      </Badge>
                      <Badge className={status.color}>
                        {status.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Modifier</DropdownMenuItem>
                          <DropdownMenuItem>Réassigner</DropdownMenuItem>
                          <DropdownMenuItem>Marquer terminé</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
