import { useNavigate } from 'react-router-dom';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useClientMonth } from '@/hooks/useClientMonth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { Palette, Clock, ChevronRight } from 'lucide-react';

const statusMap: Record<string, { label: string; color: string }> = {
  new: { label: 'Nouveau', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  active: { label: 'En cours', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  in_progress: { label: 'En cours', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  review_admin: { label: 'En revue', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  review_client: { label: 'À valider', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  completed: { label: 'Terminé', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
};

interface ParsedItem {
  type: string;
  count: number;
  pages?: number;
}

function parseDescription(description: string | null): ParsedItem[] {
  if (!description) return [];
  const match = description.match(/^\[(.+?)\]/);
  if (!match) return [];
  const content = match[1];
  const items: ParsedItem[] = [];

  const parts = content.split('+').map(p => p.trim());
  for (const part of parts) {
    const m = part.match(/(\d+)x\s+(Post|Miniature|Carrousel)(?:\s+(\d+)p)?/i);
    if (m) {
      const type = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase();
      items.push({ type, count: parseInt(m[1]), pages: m[3] ? parseInt(m[3]) : undefined });
    }
  }
  return items;
}

export default function ClientDesigns() {
  const navigate = useNavigate();
  const { selectedMonth } = useClientMonth();
  const { profile, designProjects } = useClientProfile(selectedMonth);
  const primaryColor = profile?.primary_color || '#22c55e';
  const secondaryColor = profile?.secondary_color || '#0f172a';
  const accentColor = profile?.accent_color || '#f59e0b';

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Mes Designs</h1>
          <p className="text-muted-foreground">Suivez l'avancement de vos projets design</p>
        </div>

        {designProjects.length === 0 ? (
          <Card className="border-0 shadow-lg" style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}>
            <CardContent className="p-12 text-center">
              <Palette className="h-12 w-12 mx-auto mb-4" style={{ color: accentColor, opacity: 0.5 }} />
              <h3 className="text-lg font-semibold text-white mb-2">Aucun design pour le moment</h3>
              <p className="text-white/50">Vos designs apparaîtront ici une fois les projets lancés.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {designProjects.map((task: any, i: number) => {
              const total = task.design_count || 0;
              const done = task.designs_completed || 0;
              const progress = total > 0 ? Math.round((done / total) * 100) : 0;
              const st = statusMap[task.status] || statusMap.new;
              const parsedItems = parseDescription(task.description);

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="border-0 shadow-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all" style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }} onClick={() => navigate(`/client/designs/${task.id}`)}>
                    <CardContent className="p-5 space-y-4">
                      {/* Header with logo */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {profile?.logo_url ? (
                            <img src={profile.logo_url} alt={task.client_name || profile.company_name} className="h-10 w-10 rounded-xl object-cover border border-white/10" />
                          ) : (
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}15` }}>
                              <Palette className="h-5 w-5" style={{ color: accentColor }} />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-white">{task.title}</h3>
                            {task.deadline && (
                              <p className="text-xs text-white/40">
                                <Clock className="inline h-3 w-3 mr-1" />
                                {new Date(task.deadline).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={st.color} variant="outline">{st.label}</Badge>
                      </div>

                      {/* Parsed items breakdown */}
                      {parsedItems.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {parsedItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-white/10 p-3 flex items-center gap-3 cursor-pointer hover:border-white/30 transition-all"
                              style={{ background: `${primaryColor}10` }}
                              onClick={(e) => { e.stopPropagation(); navigate(`/client/designs/${task.id}?type=${item.type}`); }}
                            >
                              <div className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: `${primaryColor}30`, color: primaryColor }}>
                                {item.type.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="text-white font-medium text-sm">
                                  {item.count}x {item.type}
                                </p>
                                {item.pages && (
                                  <p className="text-white/40 text-xs">{item.pages} pages</p>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 text-white/30" />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/50">Progression</span>
                          <span className="text-white font-medium">{done}/{total}</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Click hint */}
                      <div className="flex items-center justify-end text-white/30 text-xs gap-1">
                        <span>Voir les détails</span>
                        <ChevronRight className="h-3.5 w-3.5" />
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
