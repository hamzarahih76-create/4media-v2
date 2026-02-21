import { useQuery } from '@tanstack/react-query';
import { DesignerLayout } from '@/components/layout/DesignerLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Medal, Award, Palette, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DesignerLeaderboard() {
  const { user } = useAuth();

  const { data: designers = [], isLoading } = useQuery({
    queryKey: ['designer-leaderboard'],
    queryFn: async () => {
      // Get all active designers with their stats
      const { data: teamMembers, error: tmError } = await supabase
        .from('team_members')
        .select('user_id, full_name, avatar_url')
        .eq('role', 'designer')
        .eq('status', 'active');

      if (tmError) throw tmError;
      if (!teamMembers || teamMembers.length === 0) return [];

      const userIds = teamMembers.map(m => m.user_id).filter(Boolean);

      const { data: stats, error: statsError } = await supabase
        .from('designer_stats')
        .select('*')
        .in('user_id', userIds);

      if (statsError) throw statsError;

      // Combine data
      const combined = teamMembers.map(member => {
        const memberStats = stats?.find(s => s.user_id === member.user_id);
        return {
          ...member,
          total_designs_delivered: memberStats?.total_designs_delivered || 0,
          average_rating: memberStats?.average_rating ? Number(memberStats.average_rating) : 5,
          streak_days: memberStats?.streak_days || 0,
        };
      });

      // Sort by designs delivered
      return combined.sort((a, b) => b.total_designs_delivered - a.total_designs_delivered);
    },
  });

  const getRankIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{position + 1}</span>;
    }
  };

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
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Classement Designers</h1>
          <p className="text-muted-foreground mt-1">
            Top performers de l'équipe design
          </p>
        </div>

        {designers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Aucun designer actif</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Le classement sera disponible une fois les designers activés
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {designers.map((designer, index) => {
              const isCurrentUser = designer.user_id === user?.id;

              return (
                <Card
                  key={designer.user_id}
                  className={cn(
                    'transition-all',
                    isCurrentUser && 'border-accent ring-1 ring-accent/20',
                    index < 3 && 'bg-gradient-to-r from-card to-accent/5'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getRankIcon(index)}
                      </div>

                      {/* Avatar */}
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-accent/10 text-accent">
                          {designer.full_name?.slice(0, 2).toUpperCase() || 'DS'}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {designer.full_name || 'Designer'}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">Vous</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Palette className="h-3 w-3" />
                            {designer.total_designs_delivered} designs
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {designer.average_rating.toFixed(1)}/5
                          </span>
                        </div>
                      </div>

                      {/* Score badge */}
                      <Badge
                        variant={index < 3 ? 'default' : 'secondary'}
                        className={cn(
                          'text-base px-3 py-1',
                          index === 0 && 'bg-yellow-500 hover:bg-yellow-600',
                          index === 1 && 'bg-gray-400 hover:bg-gray-500',
                          index === 2 && 'bg-amber-600 hover:bg-amber-700'
                        )}
                      >
                        {designer.total_designs_delivered}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DesignerLayout>
  );
}
