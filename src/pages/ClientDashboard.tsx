import { ClientLayout } from '@/components/layout/ClientLayout';
import { ClientContractCard } from '@/components/contract/ClientContractCard';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useAuth } from '@/hooks/useAuth';
import { useClientMonth } from '@/hooks/useClientMonth';
import { ClientPendingValidation } from '@/components/client/ClientPendingValidation';
import { WorkflowProgress } from '@/components/client/WorkflowProgress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Video, 
  Image as ImageIcon, 
  CheckCircle, 
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Users,
  Sparkles,
  ArrowRight,
  Zap,
  Palette,
  FolderKanban,
  Banknote,
  Send
} from 'lucide-react';

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '34, 197, 94';
}

export default function ClientDashboard() {
  const { selectedMonth } = useClientMonth();
  const { profile, contentItems, contentByStep, analytics, videoProjects, designProjects } = useClientProfile(selectedMonth);
  const { user, signOut } = useAuth();

  // If client profile is pending, show pending screen
  if (profile && (profile as any).account_status === 'pending') {
    return (
      <ClientPendingValidation
        fullName={profile.contact_name || user?.user_metadata?.full_name || 'Client'}
        avatarUrl={(profile as any).avatar_url}
        email={profile.email || user?.email}
        onSignOut={signOut}
      />
    );
  }
  
  const primaryColor = profile?.primary_color || '#22c55e';
  const secondaryColor = profile?.secondary_color || '#0f172a';
  const accentColor = profile?.accent_color || '#f59e0b';
  const primaryRgb = hexToRgb(primaryColor);
  const currentMonth = analytics[0];
  
  // Count from both content items AND linked projects
  const allVideos = videoProjects.flatMap((p: any) => p.videos || []);
  const totalLinkedVideos = allVideos.length;
  const completedVideos = allVideos.filter((v: any) => v.status === 'completed').length;
  const inReviewVideos = allVideos.filter((v: any) => v.status === 'review_client' || v.status === 'in_review').length;
  const activeVideos = allVideos.filter((v: any) => ['new', 'active', 'in_progress'].includes(v.status)).length;
  
  const totalItems = contentItems.length + totalLinkedVideos + designProjects.length;
  const validatedItems = contentItems.filter(i => i.status === 'validated' || i.status === 'delivered').length + completedVideos + designProjects.filter((d: any) => d.status === 'completed').length;
  const pendingItems = contentItems.filter(i => i.status === 'pending_review').length + inReviewVideos;
  const inProgressItems = contentItems.filter(i => i.status === 'in_progress').length + activeVideos + designProjects.filter((d: any) => ['new', 'active', 'in_progress'].includes(d.status)).length;

  // Validated videos count
  const validatedVideoCount = allVideos.filter((v: any) => v.is_validated || v.status === 'completed').length;
  const videosPerMonth = profile?.videos_per_month || 8;
  
  // Validated designs count
  const validatedDesignCount = designProjects.filter((d: any) => d.status === 'completed').length;
  const totalDesignsOrdered = designProjects.reduce((s: number, d: any) => s + (d.design_count || 0), 0) || designProjects.length;
  
  // Published videos (planning items marked as delivered = client clicked "Publier")
  const publishedVideos = contentItems.filter(i => i.status === 'delivered').length;

  const displayName = profile?.contact_name || profile?.company_name || '';
  const firstName = displayName.split(' ')[0];

  const monthlyBudget = profile?.monthly_price || 0;

  const kpiStats = [
    { icon: Banknote, label: 'Budget / mois', value: `${monthlyBudget.toLocaleString()} DH`, color: primaryColor },
    { icon: Video, label: 'Vidéos validées', value: `${validatedVideoCount}/${videosPerMonth}`, color: '#22c55e' },
    { icon: Palette, label: 'Designs validés', value: `${validatedDesignCount}/${totalDesignsOrdered}`, color: accentColor },
    { icon: Send, label: 'Vidéos publiées', value: publishedVideos, color: primaryColor },
  ];

  return (
    <ClientLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Hero Welcome Banner - Ultra Magic */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl p-8 md:p-12"
          style={{ 
            background: `linear-gradient(135deg, ${secondaryColor} 0%, #0a0a0a 40%, ${secondaryColor} 100%)`,
            border: `1px solid ${primaryColor}25`,
            boxShadow: `0 0 80px ${primaryColor}10, inset 0 1px 0 ${primaryColor}15`
          }}
        >
          {/* Aurora sweep effect */}
          <motion.div
            animate={{
              x: ['-100%', '200%'],
              opacity: [0, 0.4, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent, ${primaryColor}20, ${accentColor}15, transparent)`,
              width: '50%',
            }}
          />
          
          {/* Main glow orb */}
          <motion.div 
            animate={{ 
              scale: [1, 1.4, 1],
              opacity: [0.12, 0.3, 0.12],
              x: [0, 30, 0],
              y: [0, -20, 0]
            }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-[100px]"
            style={{ backgroundColor: primaryColor }}
          />
          
          {/* Secondary accent orb */}
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.06, 0.18, 0.06],
              x: [0, -20, 0],
              y: [0, 20, 0]
            }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            className="absolute -bottom-10 left-1/4 w-72 h-72 rounded-full blur-[80px]"
            style={{ backgroundColor: accentColor }}
          />
          
          {/* Third orb for depth */}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.04, 0.1, 0.04],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full blur-[60px]"
            style={{ backgroundColor: primaryColor }}
          />

          {/* Floating sparkle particles */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1.2, 0],
                y: [0, -(20 + Math.random() * 60)],
                x: [0, (Math.random() - 0.5) * 30],
              }}
              transition={{ 
                duration: 2 + Math.random() * 2, 
                repeat: Infinity, 
                delay: i * 0.5, 
                ease: 'easeOut' 
              }}
              className="absolute rounded-full"
              style={{ 
                backgroundColor: i % 3 === 0 ? accentColor : primaryColor,
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
                left: `${5 + i * 8}%`,
                top: `${50 + (i % 4) * 12}%`,
                boxShadow: `0 0 ${6 + i * 2}px ${i % 3 === 0 ? accentColor : primaryColor}`
              }}
            />
          ))}
          
          {/* Subtle grid overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(${primaryColor}40 1px, transparent 1px), linear-gradient(90deg, ${primaryColor}40 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 mb-4"
              >
                <motion.div
                  animate={{ 
                    rotate: [0, 15, -15, 0],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                  className="relative"
                >
                  <Sparkles className="h-5 w-5" style={{ color: accentColor }} />
                  <motion.div
                    animate={{ opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 blur-sm"
                  >
                    <Sparkles className="h-5 w-5" style={{ color: accentColor }} />
                  </motion.div>
                </motion.div>
                <span 
                  className="text-xs font-bold tracking-[0.2em] uppercase px-3 py-1 rounded-full"
                  style={{ 
                    color: accentColor,
                    backgroundColor: `${accentColor}12`,
                    border: `1px solid ${accentColor}25`
                  }}
                >
                  Espace Client
                </span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl md:text-5xl font-bold text-white mb-3"
              >
                Bonjour, {firstName}{' '}
                <motion.span
                  animate={{ rotate: [0, 14, -8, 14, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                  className="inline-block origin-bottom-right"
                >
                  👋
                </motion.span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white/50 text-base md:text-lg max-w-lg leading-relaxed"
              >
                Suivez l'avancement de votre projet en temps réel et consultez vos contenus.
              </motion.p>
            </div>

            {/* Client Profile Photo */}
            {(profile?.avatar_url || profile?.logo_url) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="relative"
              >
                <motion.div
                  animate={{ 
                    boxShadow: [
                      `0 0 30px ${primaryColor}30`,
                      `0 0 60px ${primaryColor}50`,
                      `0 0 30px ${primaryColor}30`,
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="h-24 w-24 md:h-32 md:w-32 lg:h-40 lg:w-40 rounded-2xl overflow-hidden border-2"
                  style={{ borderColor: `${primaryColor}50` }}
                >
                  <img 
                    src={profile?.avatar_url || profile?.logo_url} 
                    alt={profile?.company_name}
                    className="h-full w-full object-cover"
                  />
                </motion.div>
                {/* Glow ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-1 rounded-2xl"
                  style={{
                    border: '2px solid transparent',
                    borderTopColor: primaryColor,
                    borderRightColor: `${accentColor}50`,
                    opacity: 0.5,
                  }}
                />
              </motion.div>
            )}
          </div>
          
          {/* Bottom light streak */}
          <motion.div
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${primaryColor}60, ${accentColor}40, transparent)`
            }}
          />
        </motion.div>

        {/* KPI Cards with stagger animation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiStats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className="group relative overflow-hidden border-0 shadow-lg cursor-pointer"
                style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}
              >
                {/* Hover glow effect */}
                <motion.div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    background: `radial-gradient(circle at 50% 50%, ${stat.color}15, transparent 70%)`,
                  }} 
                />
                {/* Border glow on hover */}
                <div 
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ 
                    boxShadow: `inset 0 0 0 1px ${stat.color}40, 0 0 20px ${stat.color}15`
                  }}
                />
                <CardContent className="p-5 relative">
                  <div className="flex flex-col gap-3">
                    <motion.div 
                      className="h-12 w-12 rounded-xl flex items-center justify-center relative"
                      style={{ backgroundColor: `${stat.color}15` }}
                      whileHover={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.4 }}
                    >
                      <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                      {/* Pulse ring */}
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                        style={{ border: `1px solid ${stat.color}` }}
                      />
                    </motion.div>
                    <div>
                      <p className="text-3xl font-bold text-white">{stat.value}</p>
                      <p className="text-xs text-white/50 mt-1">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Analytics Summary */}
        {currentMonth && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card 
              className="border-0 shadow-lg overflow-hidden"
              style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}
            >
              <CardHeader className="pb-3 border-b" style={{ borderColor: `${primaryColor}20` }}>
                <CardTitle className="text-base font-semibold flex items-center gap-2 text-white">
                  <BarChartIcon className="h-4 w-4" style={{ color: primaryColor }} />
                  Performance du mois
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { icon: Users, label: 'Abonnés', value: currentMonth.followers_count?.toLocaleString() || '—', change: currentMonth.followers_change },
                    { icon: Eye, label: 'Vues', value: currentMonth.total_views?.toLocaleString() || '0' },
                    { icon: Heart, label: 'Likes', value: currentMonth.total_likes?.toLocaleString() || '0' },
                    { icon: MessageCircle, label: 'Commentaires', value: currentMonth.total_comments?.toLocaleString() || '0' },
                  ].map((metric, i) => (
                    <motion.div 
                      key={i} 
                      className="flex items-center gap-3"
                      whileHover={{ x: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <metric.icon className="h-5 w-5 text-white/40" />
                      <div>
                        <p className="text-lg font-semibold text-white">{metric.value}</p>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-white/50">{metric.label}</p>
                          {'change' in metric && metric.change !== 0 && metric.change && (
                            <span className={`text-xs flex items-center ${metric.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {metric.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {metric.change > 0 ? '+' : ''}{metric.change}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Workflow Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
        >
          <Card 
            className="border-0 shadow-lg"
            style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}
          >
            <CardContent className="p-6 md:p-8">
              <WorkflowProgress contentByStep={contentByStep} primaryColor={primaryColor} workflowStatus={profile?.workflow_status} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Contract Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <ClientContractCard />
        </motion.div>

        {/* Empty state */}
        {contentItems.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Card 
              className="border-0 shadow-lg overflow-hidden"
              style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}
            >
              <CardContent className="p-16 text-center relative">
                {/* Animated background glow */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.05, 0.12, 0.05]
                  }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="relative z-10">
                  <motion.div 
                    className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
                    style={{ 
                      backgroundColor: `${primaryColor}15`,
                    }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {/* Rotating ring */}
                    <motion.div
                      className="absolute inset-[-4px] rounded-2xl"
                      style={{ 
                        border: `2px solid transparent`,
                        borderTopColor: primaryColor,
                        borderRightColor: `${primaryColor}50`,
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    />
                    <Video className="h-10 w-10" style={{ color: primaryColor }} />
                  </motion.div>
                  
                  <h3 className="text-xl font-bold text-white mb-3">
                    Votre projet est en préparation
                  </h3>
                  <p className="text-white/50 max-w-md mx-auto leading-relaxed mb-6">
                    Notre équipe travaille sur votre contenu. Vous verrez bientôt apparaître ici 
                    vos idées, scripts, vidéos et designs au fur et à mesure de l'avancement.
                  </p>
                  
                  {/* Magic status indicator */}
                  <motion.div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white/80"
                    style={{ 
                      backgroundColor: `${primaryColor}15`,
                      border: `1px solid ${primaryColor}30`
                    }}
                    animate={{ boxShadow: [`0 0 0px ${primaryColor}00`, `0 0 20px ${primaryColor}30`, `0 0 0px ${primaryColor}00`] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Zap className="h-4 w-4" style={{ color: primaryColor }} />
                    En cours de création...
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </ClientLayout>
  );
}

function BarChartIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <svg className={className} style={style} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>;
}
