import { ClientLayout } from '@/components/layout/ClientLayout';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useClientMonth } from '@/hooks/useClientMonth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Video, Clock, FolderKanban, Film, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const statusMap: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  active: { label: 'En cours', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  in_progress: { label: 'En cours', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  review_admin: { label: 'En revue', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  review_client: { label: 'À valider', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  revision_requested: { label: 'Modification', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  completed: { label: 'Terminé', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  late: { label: 'En retard', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

export default function ClientVideos() {
  const navigate = useNavigate();
  const { selectedMonth } = useClientMonth();
  const { profile, videoProjects } = useClientProfile(selectedMonth);
  const primaryColor = profile?.primary_color || '#22c55e';
  const secondaryColor = profile?.secondary_color || '#0f172a';

  const allVideos = videoProjects.flatMap((p: any) => 
    (p.videos || []).map((v: any) => ({ ...v, projectTitle: p.title }))
  );

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Mes Vidéos</h1>
          <p className="text-muted-foreground">Suivez l'avancement de toutes vos vidéos</p>
        </div>

        {videoProjects.length === 0 ? (
          <Card className="border-0 shadow-lg" style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}>
            <CardContent className="p-12 text-center">
              <Film className="h-12 w-12 mx-auto mb-4" style={{ color: primaryColor, opacity: 0.5 }} />
              <h3 className="text-lg font-semibold text-white mb-2">Aucune vidéo pour le moment</h3>
              <p className="text-white/50">Vos vidéos apparaîtront ici une fois les projets lancés.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {videoProjects.map((project: any, i: number) => {
          const vids = project.videos || [];
              const totalCount = project.video_count || vids.length || 0;
              const done = project.videos_completed || vids.filter((v: any) => v.status === 'completed').length;
              const progress = totalCount > 0 ? Math.round((done / totalCount) * 100) : 0;

              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="border-0 shadow-lg overflow-hidden" style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                            <FolderKanban className="h-5 w-5" style={{ color: primaryColor }} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{project.title}</h3>
                            {project.deadline && (
                              <p className="text-xs text-white/40">
                                <Clock className="inline h-3 w-3 mr-1" />
                                Deadline : {new Date(project.deadline).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-white/50">{done}/{totalCount} terminées</span>
                          <Progress value={progress} className="h-1.5 w-24 mt-1" />
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {vids.map((video: any) => {
                          const st = statusMap[video.status] || statusMap.new;
                          const isViewable = ['review_client', 'completed', 'revision_requested'].includes(video.status);
                          return (
                            <div
                              key={video.id}
                              className={`rounded-lg p-3 border border-white/10 bg-white/5 transition-all ${
                                isViewable ? 'cursor-pointer hover:border-white/30 hover:bg-white/10 group' : ''
                              }`}
                              onClick={() => isViewable && navigate(`/delivery/${video.id}`)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Video className="h-4 w-4" style={{ color: primaryColor }} />
                                  <span className="text-sm font-medium text-white">{video.title}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isViewable && (
                                    <Play className="h-3.5 w-3.5 text-white/40 group-hover:text-white transition-colors" />
                                  )}
                                  <Badge className={st.color} variant="outline">{st.label}</Badge>
                                </div>
                              </div>
                              {video.deadline && (
                                <p className="text-xs text-white/30">
                                  <Clock className="inline h-3 w-3 mr-1" />
                                  {new Date(video.deadline).toLocaleDateString('fr-FR')}
                                </p>
                              )}
                              {isViewable && (
                                <p className="text-xs mt-1.5 font-medium transition-colors" style={{ color: `${primaryColor}99` }}>
                                  Cliquez pour voir la vidéo →
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
