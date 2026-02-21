import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  FolderKanban, 
  CheckSquare, 
  CreditCard,
  Banknote,
  Settings,
  LogOut,
  Target,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { PermissionType } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import logo4Media from '@/assets/4media-logo.png';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredPermission?: PermissionType;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, requiredPermission: 'access_dashboard' },
  { name: 'Gestion Équipe', href: '/pm', icon: Target, requiredPermission: 'validate_videos' },
  { name: 'Gestion Client', href: '/client-management', icon: Users, requiredPermission: 'manage_clients' },
  { name: 'Payment Management', href: '/clients', icon: CreditCard, requiredPermission: 'view_clients' },
  { name: 'Staff', href: '/team', icon: UserCircle, requiredPermission: 'manage_team' },
  { name: 'Comptabilité', href: '/payments', icon: Banknote, requiredPermission: 'manage_payments' },
];

export function Sidebar() {
  const location = useLocation();
  const { user, role, permissions, signOut } = useAuth();

  // Determine if user should see a "back" link to their main space
  const backLink = role === 'designer' ? { name: 'Retour', href: '/designer' } 
    : role === 'editor' ? { name: 'Retour', href: '/editor' }
    : role === 'copywriter' ? { name: 'Retour', href: '/copywriter' }
    : null;

  // Filter navigation based on explicit permissions only
  const visibleNavigation = navigation.filter(item => {
    if (!item.requiredPermission) return true;
    return permissions.includes(item.requiredPermission);
  });

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4 border-b border-sidebar-border">
        <img 
          src={logo4Media} 
          alt="4Media" 
          className="h-16 w-auto"
        />
        <span className="text-xl font-bold text-sidebar-foreground">4Media</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {backLink && (
          <Link
            to={backLink.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-all mb-3 border border-primary/20"
          >
            <ArrowLeft className="h-5 w-5" />
            {backLink.name}
          </Link>
        )}
        {visibleNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent">
            <UserCircle className="h-5 w-5 text-sidebar-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            asChild
          >
            <Link to="/settings">
              <Settings className="h-4 w-4 mr-2" />
              Paramètres
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
