import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  FolderKanban,
  Clock,
  Video,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data
const projects = [
  { 
    id: 1, 
    title: 'Pack Reels Octobre', 
    client: 'TechStartup',
    status: 'in_progress',
    deadline: '2025-01-15',
    video_count: 12,
    videos_delivered: 8
  },
  { 
    id: 2, 
    title: 'Campagne TikTok Q1', 
    client: 'FashionBrand',
    status: 'review',
    deadline: '2025-01-20',
    video_count: 8,
    videos_delivered: 6
  },
  { 
    id: 3, 
    title: 'Shorts YouTube Fitness', 
    client: 'FitCoach',
    status: 'pending',
    deadline: '2025-01-25',
    video_count: 15,
    videos_delivered: 0
  },
  { 
    id: 4, 
    title: 'Reels Instagram Novembre', 
    client: 'TechStartup',
    status: 'completed',
    deadline: '2024-12-30',
    video_count: 10,
    videos_delivered: 10
  },
];

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-warning/20 text-warning' },
  in_progress: { label: 'En cours', color: 'bg-primary/20 text-primary' },
  review: { label: 'En review', color: 'bg-accent/20 text-accent' },
  completed: { label: 'Terminé', color: 'bg-success/20 text-success' },
  cancelled: { label: 'Annulé', color: 'bg-destructive/20 text-destructive' },
};

export default function Projects() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projets</h1>
            <p className="text-muted-foreground">Gérez vos projets de production</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau projet
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher un projet..." 
            className="pl-10"
          />
        </div>

        {/* Projects Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const progress = project.video_count > 0 
              ? Math.round((project.videos_delivered / project.video_count) * 100) 
              : 0;
            const status = statusConfig[project.status as keyof typeof statusConfig];
            
            return (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{project.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{project.client}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Voir détails</DropdownMenuItem>
                      <DropdownMenuItem>Modifier</DropdownMenuItem>
                      <DropdownMenuItem>Voir tâches</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Archiver</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {new Date(project.deadline).toLocaleDateString('fr-FR')}
                    </div>
                    <Badge className={status.color}>
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-muted-foreground" />
                        <span>Progression</span>
                      </div>
                      <span className="font-medium">{project.videos_delivered}/{project.video_count}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
