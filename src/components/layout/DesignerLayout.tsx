import { ReactNode, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  LogOut, 
  LayoutDashboard, 
  User, 
  Headphones, 
  Trophy,
  History,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import logo4Media from '@/assets/4media-logo.png';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface DesignerLayoutProps {
  children: ReactNode;
}

const baseDesignerNavigation = [
  { name: 'Dashboard', href: '/designer', icon: LayoutDashboard },
  { name: 'Profil', href: '/designer/profile', icon: User },
  { name: 'Historique', href: '/designer/history', icon: History },
  { name: 'Classement', href: '/designer/leaderboard', icon: Trophy },
  { name: 'Support', href: '/designer/support', icon: Headphones },
];

export function DesignerLayout({ children }: DesignerLayoutProps) {
  const { user, permissions, signOut } = useAuth();
  const location = useLocation();

  const designerNavigation = useMemo(() => {
    const nav = [...baseDesignerNavigation];
    if (permissions.includes('manage_clients')) {
      // Insert after Dashboard
      nav.splice(1, 0, { name: 'Gestion Client', href: '/client-management', icon: Users });
    }
    return nav;
  }, [permissions]);

  // Track designer presence
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel('designers-presence');

    const trackPresence = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      await presenceChannel.track({
        user_id: user.id,
        name: profile?.full_name || user.email?.split('@')[0] || 'Unknown',
        online_at: new Date().toISOString(),
      });
    };

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await trackPresence();
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        await trackPresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);
  
  const handleSignOut = async () => {
    await signOut();
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || 'DS';

  return (
    <div className="min-h-screen bg-background">
      {/* Header with integrated navigation */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4 md:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img 
              src={logo4Media} 
              alt="4Media" 
              className="h-16 w-auto"
            />
          </div>

          {/* Navigation - Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {designerNavigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/designer' && location.pathname.startsWith(item.href));
              const isExactDashboard = item.href === '/designer' && location.pathname === '/designer';
              const active = item.href === '/designer' ? isExactDashboard : isActive;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                    active
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="flex items-center gap-4">
            <NotificationBell />
            
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-accent/10 text-accent text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden lg:inline">
                {user?.email}
              </span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {designerNavigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/designer' && location.pathname.startsWith(item.href));
            const isExactDashboard = item.href === '/designer' && location.pathname === '/designer';
            const active = item.href === '/designer' ? isExactDashboard : isActive;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden xs:inline">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Main content */}
      <main className="w-full py-6 px-4 md:px-8 lg:px-12 xl:px-16">
        {children}
      </main>
    </div>
  );
}
