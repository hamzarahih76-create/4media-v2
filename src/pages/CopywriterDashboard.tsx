import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CopywriterLayout } from '@/components/layout/CopywriterLayout';
import { FullProfileCompletionModal } from '@/components/editor/FullProfileCompletionModal';
import { ProfilePendingValidation } from '@/components/editor/ProfilePendingValidation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  PenTool, Loader2, Sparkles, Users, FileText, Lightbulb, FolderOpen, Video, Brain, Target
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCopywriterTasks, useCopywriterClients, useCopywriterProfile } from '@/hooks/useCopywriterData';

export default function CopywriterDashboard() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: tasks = [], isLoading: tasksLoading } = useCopywriterTasks();
  const { data: clients = [], isLoading: clientsLoading } = useCopywriterClients();
  const { data: teamMember, isLoading: profileLoading } = useCopywriterProfile();

  const needsProfileCompletion = teamMember && !teamMember.profile_completed_at;
  const isAwaitingValidation = teamMember && 
    (teamMember.status === 'pending' || teamMember.validation_status === 'pending') && 
    !!teamMember.profile_completed_at;

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
      </div>
    );
  }

  if (isAwaitingValidation && teamMember) {
    return (
      <ProfilePendingValidation
        fullName={teamMember.full_name || 'Copywriter'}
        email={user?.email}
      />
    );
  }

  const shouldShowProfileModal = user && (needsProfileCompletion || profileLoading) && !isAwaitingValidation;
  const copywriterName = teamMember?.full_name || user?.email?.split('@')[0] || 'Copywriter';

  const activeProjects = tasks.filter(t => !['completed', 'cancelled'].includes(t.status));
  const completedProjects = tasks.filter(t => t.status === 'completed');

  return (
    <CopywriterLayout>
      <FullProfileCompletionModal
        open={shouldShowProfileModal}
        defaultEmail={user?.email}
        teamMemberId={teamMember?.id}
        role="copywriter"
      />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative space-y-8">
        {/* Header */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20">
            <Sparkles className="h-6 w-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Bonjour, {copywriterName} 👋</h1>
            <p className="text-muted-foreground">Votre espace de rédaction et planification</p>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Clients assignés', value: clients.length, color: 'text-violet-500', bg: 'bg-violet-500/10' },
            { icon: FolderOpen, label: 'Projets actifs', value: activeProjects.length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { icon: Lightbulb, label: 'Projets terminés', value: completedProjects.length, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { icon: FileText, label: 'Total projets', value: tasks.length, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="border-border/50 hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Clients list */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-500" />
                Mes Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : clients.length === 0 ? (
                <div className="text-center py-12">
                  <PenTool className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-semibold mb-2">Aucun client assigné</h3>
                  <p className="text-muted-foreground text-sm">Les projets vous seront assignés par l'administrateur.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clients.map((client: any) => (
                    <div
                      key={client.id}
                      onClick={() => navigate(`/copywriter/clients/${client.user_id}`)}
                      className="flex flex-col gap-3 p-4 rounded-lg border border-border/50 hover:border-violet-500/30 hover:bg-violet-500/5 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 w-full">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 rounded-lg border-2 border-border shadow-sm flex-shrink-0">
                              {client.avatar_url || client.logo_url ? (
                                <AvatarImage 
                                  src={client.avatar_url || client.logo_url} 
                                  alt={client.company_name} 
                                  className="rounded-lg object-cover w-full h-full"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <AvatarFallback className="rounded-lg bg-violet-500/10 text-violet-500 font-bold w-full h-full flex items-center justify-center">
                                {client.company_name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                           <div>
                             <p className="font-semibold">{client.company_name}</p>
                             <p className="text-sm text-muted-foreground">{client.contact_name || client.email}</p>
                           </div>
                         </div>
                         <Badge variant="secondary">{client.projectCount} projet{client.projectCount > 1 ? 's' : ''}</Badge>
                       </div>
                       
                       {/* Pack vidéo */}
                       {client.videos_per_month && (
                         <div className="flex items-center gap-2 p-2 rounded-md bg-emerald-500/5">
                           <Video className="h-4 w-4 text-emerald-500" />
                           <span className="text-sm font-medium">{client.videos_per_month} vidéos/mois</span>
                         </div>
                       )}

                       {/* Description & Objectifs */}
                       <div className="space-y-2 pt-2">
                         {client.strategic_description && (
                           <div className="p-2 rounded-md bg-blue-500/5">
                             <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Description</p>
                             <p className="text-sm text-foreground">{client.strategic_description}</p>
                           </div>
                         )}
                         {client.client_objectives && (
                           <div className="p-2 rounded-md bg-amber-500/5">
                             <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">Objectifs</p>
                             <p className="text-sm text-foreground">{client.client_objectives}</p>
                           </div>
                         )}
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </CopywriterLayout>
  );
}
