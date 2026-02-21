import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  LogOut, 
  LayoutDashboard, 
  User, 
  Headphones,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import logo4Media from '@/assets/4media-logo.png';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface CopywriterLayoutProps {
  children: ReactNode;
}

const copywriterNavigation = [
  { name: 'Dashboard', href: '/copywriter', icon: LayoutDashboard },
  { name: 'Mes Clients', href: '/copywriter/clients', icon: Users },
  { name: 'Profil', href: '/copywriter/profile', icon: User },
  { name: 'Support', href: '/copywriter/support', icon: Headphones },
];

export function CopywriterLayout({ children }: CopywriterLayoutProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => { await signOut(); };
  const initials = user?.email?.slice(0, 2).toUpperCase() || 'CW';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16 px-4 md:px-8">
          <div className="flex items-center gap-2">
            <img src={logo4Media} alt="4Media" className="h-16 w-auto" />
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {copywriterNavigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/copywriter' && location.pathname.startsWith(item.href));
              const isExactDashboard = item.href === '/copywriter' && location.pathname === '/copywriter';
              const active = item.href === '/copywriter' ? isExactDashboard : isActive;
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                    active
                      ? 'bg-violet-500 text-white'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-violet-500/10 text-violet-500 text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden lg:inline">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <nav className="md:hidden flex items-center gap-1 px-4 pb-3 overflow-x-auto">
          {copywriterNavigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/copywriter' && location.pathname.startsWith(item.href));
            const isExactDashboard = item.href === '/copywriter' && location.pathname === '/copywriter';
            const active = item.href === '/copywriter' ? isExactDashboard : isActive;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap',
                  active
                    ? 'bg-violet-500 text-white'
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

      <main className="w-full py-6 px-4 md:px-8 lg:px-12 xl:px-16">
        {children}
      </main>
    </div>
  );
}
