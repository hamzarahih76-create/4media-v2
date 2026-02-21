import { ReactNode, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClientProfile } from '@/hooks/useClientProfile';
import { 
  LogOut, 
  LayoutDashboard, 
  Lightbulb,
  FileText,
  Video,
  Palette,
  CalendarDays,
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useClientMonth } from '@/hooks/useClientMonth';

interface ClientLayoutProps {
  children: ReactNode;
}

const clientNavigation = [
  { name: 'Dashboard', href: '/client', icon: LayoutDashboard },
  { name: 'Idées', href: '/client/ideas', icon: Lightbulb },
  { name: 'Scripts', href: '/client/scripts', icon: FileText },
  { name: 'Vidéos', href: '/client/videos', icon: Video },
  { name: 'Designs', href: '/client/designs', icon: Palette },
  { name: 'Planning', href: '/client/planning', icon: CalendarDays },
  { name: 'Analytics', href: '/client/analytics', icon: BarChart3 },
];

function ClientLayoutInner({ children }: ClientLayoutProps) {
  const { user, signOut } = useAuth();
  const { profile, isLoadingProfile } = useClientProfile();
  const location = useLocation();
  const { selectedMonth, setSelectedMonth } = useClientMonth();

  const brandStyles = useMemo(() => {
    if (!profile) return {};
    return {
      '--client-primary': profile.primary_color,
      '--client-secondary': profile.secondary_color,
      '--client-accent': profile.accent_color,
    } as React.CSSProperties;
  }, [profile]);

  const handleSignOut = async () => {
    await signOut();
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  const companyInitials = profile?.company_name?.slice(0, 2).toUpperCase() || 'CL';
  const primaryColor = profile?.primary_color || '#22c55e';
  const secondaryColor = profile?.secondary_color || 'hsl(var(--card))';

  return (
    <div className="min-h-screen bg-background flex flex-col" style={brandStyles}>
      <header 
        className="border-b border-border/50 sticky top-0 z-50"
        style={{ backgroundColor: secondaryColor }}
      >
        {/* Mobile: Month Selector */}
        <div 
          className="md:hidden flex items-center justify-center py-2.5"
        >
          <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl" style={{ backgroundColor: `${primaryColor}10` }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setSelectedMonth(m => subMonths(m, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-white min-w-[130px] text-center capitalize">
              {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setSelectedMonth(m => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile: Navigation icons */}
        <nav className="md:hidden flex items-center justify-between w-full px-4 pb-3">
          {clientNavigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/client' && location.pathname.startsWith(item.href));
            const isExactDashboard = item.href === '/client' && location.pathname === '/client';
            const active = item.href === '/client' ? isExactDashboard : isActive;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center justify-center p-2.5 rounded-xl transition-all flex-1',
                  active
                    ? 'text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                )}
                style={active ? { backgroundColor: primaryColor } : {}}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>

        {/* Desktop: Navigation + Month Selector */}
        <div className="hidden md:flex items-center justify-between h-14 px-8">
          <nav className="flex items-center gap-1">
            {clientNavigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/client' && location.pathname.startsWith(item.href));
              const isExactDashboard = item.href === '/client' && location.pathname === '/client';
              const active = item.href === '/client' ? isExactDashboard : isActive;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all',
                    active
                      ? 'text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  )}
                  style={active ? { backgroundColor: primaryColor } : {}}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl" style={{ backgroundColor: `${primaryColor}10` }}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setSelectedMonth(m => subMonths(m, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-white min-w-[130px] text-center capitalize">
              {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setSelectedMonth(m => addMonths(m, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full flex-1 py-6 px-4 md:px-8 lg:px-12 xl:px-16">
        {children}
      </main>

      {/* Footer: Profile & Logout */}
      <footer 
        className="border-t border-border/50 py-3 px-4 md:px-8"
        style={{ backgroundColor: secondaryColor }}
      >
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            {profile?.avatar_url || profile?.logo_url ? (
              <img 
                src={profile?.avatar_url || profile?.logo_url || ''} 
                alt={profile?.company_name} 
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <div 
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {companyInitials}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                {profile?.company_name || 'Mon Espace'}
              </span>
              <span className="text-xs text-white/50">
                {profile?.contact_name || user?.email}
              </span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSignOut}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return <ClientLayoutInner>{children}</ClientLayoutInner>;
}
