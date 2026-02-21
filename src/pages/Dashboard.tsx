import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  FolderKanban, 
  Video, 
  CreditCard,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Mock data for MVP
const stats = {
  activeClients: 12,
  activeProjects: 8,
  videosThisMonth: 47,
  revenue: '24,500€'
};

const recentProjects = [
  { id: 1, title: 'Pack Reels Octobre', client: 'TechStartup', status: 'in_progress', deadline: '15 Jan' },
  { id: 2, title: 'Campagne TikTok', client: 'FashionBrand', status: 'review', deadline: '20 Jan' },
  { id: 3, title: 'Shorts YouTube', client: 'FitCoach', status: 'pending', deadline: '25 Jan' },
];

const upcomingTasks = [
  { id: 1, title: 'Montage Reel #23', project: 'Pack Reels Octobre', assignee: 'Alex', priority: 'high' },
  { id: 2, title: 'Review client TikTok', project: 'Campagne TikTok', assignee: 'Marie', priority: 'medium' },
  { id: 3, title: 'Script Shorts', project: 'Shorts YouTube', assignee: 'Lucas', priority: 'low' },
];

const statusColors = {
  pending: 'bg-warning/20 text-warning',
  in_progress: 'bg-primary/20 text-primary',
  review: 'bg-accent/20 text-accent',
  completed: 'bg-success/20 text-success',
};

const priorityColors = {
  high: 'bg-destructive/20 text-destructive',
  medium: 'bg-warning/20 text-warning',
  low: 'bg-muted text-muted-foreground',
};

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Vue d'ensemble de 4Media</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Clients actifs"
            value={stats.activeClients}
            icon={<Users className="h-4 w-4" />}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Projets en cours"
            value={stats.activeProjects}
            icon={<FolderKanban className="h-4 w-4" />}
          />
          <StatCard
            title="Vidéos ce mois"
            value={stats.videosThisMonth}
            icon={<Video className="h-4 w-4" />}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Revenus mensuels"
            value={stats.revenue}
            icon={<CreditCard className="h-4 w-4" />}
            trend={{ value: 5, isPositive: true }}
          />
        </div>

        {/* Projects and Tasks */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Projets récents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{project.title}</p>
                      <p className="text-sm text-muted-foreground">{project.client}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {project.deadline}
                      </div>
                      <Badge className={statusColors[project.status as keyof typeof statusColors]}>
                        {project.status === 'in_progress' ? 'En cours' : 
                         project.status === 'review' ? 'Review' : 'En attente'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Tâches à venir
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">{task.project}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{task.assignee}</span>
                      <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                        {task.priority === 'high' ? 'Urgent' : 
                         task.priority === 'medium' ? 'Moyen' : 'Faible'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Actions rapides
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                <Users className="h-6 w-6 text-primary mb-2" />
                <p className="font-medium">Nouveau client</p>
                <p className="text-sm text-muted-foreground">Ajouter un client à la plateforme</p>
              </div>
              <div className="p-4 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                <FolderKanban className="h-6 w-6 text-primary mb-2" />
                <p className="font-medium">Nouveau projet</p>
                <p className="text-sm text-muted-foreground">Créer un projet de production</p>
              </div>
              <div className="p-4 rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer">
                <Video className="h-6 w-6 text-primary mb-2" />
                <p className="font-medium">Livrer des vidéos</p>
                <p className="text-sm text-muted-foreground">Marquer des vidéos comme livrées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
