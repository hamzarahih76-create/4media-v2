import { useMemo } from 'react';
import { DesignerLayout } from '@/components/layout/DesignerLayout';
import { useDesignerTasks } from '@/hooks/useDesignerTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Clock, Calendar, Palette } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function DesignerHistory() {
  const { tasks, isLoading } = useDesignerTasks();

  // Only show completed tasks, sorted by completion date
  const completedTasks = useMemo(() => {
    return tasks
      .filter(t => t.status === 'completed')
      .sort((a, b) => {
        const dateA = a.completed_at ? new Date(a.completed_at).getTime() : 0;
        const dateB = b.completed_at ? new Date(b.completed_at).getTime() : 0;
        return dateB - dateA;
      });
  }, [tasks]);

  // Group by month
  const tasksByMonth = useMemo(() => {
    const grouped: Record<string, typeof completedTasks> = {};
    
    completedTasks.forEach(task => {
      if (task.completed_at) {
        const monthKey = format(parseISO(task.completed_at), 'MMMM yyyy', { locale: fr });
        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(task);
      }
    });

    return grouped;
  }, [completedTasks]);

  if (isLoading) {
    return (
      <DesignerLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </DesignerLayout>
    );
  }

  return (
    <DesignerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Historique</h1>
          <Badge variant="outline" className="text-sm">
            {completedTasks.length} designs terminés
          </Badge>
        </div>

        {completedTasks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Palette className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Aucun design terminé</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Vos designs terminés apparaîtront ici
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(tasksByMonth).map(([month, monthTasks]) => (
              <div key={month}>
                <h2 className="text-lg font-semibold text-muted-foreground mb-4 capitalize">
                  {month}
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {monthTasks.map((task) => (
                    <Card key={task.id} className="hover:border-accent/30 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base font-medium line-clamp-2">
                            {task.title}
                          </CardTitle>
                          <Badge className="bg-green-500/10 text-green-500 shrink-0">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Terminé
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2">
                        {task.client_name && (
                          <p className="text-sm text-muted-foreground">
                            Client: {task.client_name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {task.completed_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(task.completed_at), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          )}
                          {task.started_at && task.completed_at && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.round(
                                (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / (1000 * 60 * 60)
                              )}h
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DesignerLayout>
  );
}
