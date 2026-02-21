import { ClientLayout } from '@/components/layout/ClientLayout';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useClientMonth } from '@/hooks/useClientMonth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { BarChart3, Eye, Heart, MessageCircle, Users, TrendingUp, TrendingDown } from 'lucide-react';

export default function ClientAnalytics() {
  const { selectedMonth } = useClientMonth();
  const { profile, analytics } = useClientProfile(selectedMonth);
  const primaryColor = profile?.primary_color || '#22c55e';
  const secondaryColor = profile?.secondary_color || '#0f172a';

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Performance & insights de vos contenus</p>
        </div>

        {analytics.length === 0 ? (
          <Card className="border-0 shadow-lg" style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}>
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" style={{ color: primaryColor, opacity: 0.5 }} />
              <h3 className="text-lg font-semibold text-white mb-2">Aucune donnée pour le moment</h3>
              <p className="text-white/50">Les analytics apparaîtront ici une fois les données saisies.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {analytics.map((month, i) => (
              <motion.div
                key={month.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-0 shadow-lg" style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-white">
                      {new Date(month.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-white/40" />
                        <div>
                          <p className="text-lg font-semibold text-white">{month.followers_count?.toLocaleString() || '—'}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-white/50">Abonnés</span>
                            {month.followers_change !== 0 && month.followers_change && (
                              <span className={`text-xs flex items-center ${month.followers_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {month.followers_change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {month.followers_change > 0 ? '+' : ''}{month.followers_change}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-white/40" />
                        <div>
                          <p className="text-lg font-semibold text-white">{month.total_views?.toLocaleString() || '0'}</p>
                          <span className="text-xs text-white/50">Vues</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-white/40" />
                        <div>
                          <p className="text-lg font-semibold text-white">{month.total_likes?.toLocaleString() || '0'}</p>
                          <span className="text-xs text-white/50">Likes</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-white/40" />
                        <div>
                          <p className="text-lg font-semibold text-white">{month.total_comments?.toLocaleString() || '0'}</p>
                          <span className="text-xs text-white/50">Commentaires</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
