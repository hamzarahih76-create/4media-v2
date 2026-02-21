import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Building, 
  CheckCircle, 
  CreditCard, 
  Video 
} from 'lucide-react';
import { PERMISSIONS_CONFIG, PermissionType } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

interface PermissionsCheckboxProps {
  selectedPermissions: PermissionType[];
  onPermissionsChange: (permissions: PermissionType[]) => void;
  disabled?: boolean;
  hiddenPermissions?: PermissionType[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  FolderKanban,
  Users,
  Building,
  CheckCircle,
  CreditCard,
  Video,
};

export function PermissionsCheckbox({
  selectedPermissions,
  onPermissionsChange,
  disabled = false,
  hiddenPermissions = [],
}: PermissionsCheckboxProps) {
  const visiblePermissions = PERMISSIONS_CONFIG.filter(p => !hiddenPermissions.includes(p.key));
  const handleToggle = (permission: PermissionType) => {
    if (disabled) return;
    
    if (selectedPermissions.includes(permission)) {
      onPermissionsChange(selectedPermissions.filter(p => p !== permission));
    } else {
      onPermissionsChange([...selectedPermissions, permission]);
    }
  };

  const toggleAll = () => {
    if (disabled) return;
    
    if (selectedPermissions.length >= visiblePermissions.length) {
      onPermissionsChange([]);
    } else {
      onPermissionsChange(visiblePermissions.map(p => p.key));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Permissions d'accès</Label>
        <button
          type="button"
          onClick={toggleAll}
          disabled={disabled}
          className="text-xs text-primary hover:underline disabled:opacity-50"
        >
          {selectedPermissions.length >= visiblePermissions.length ? 'Tout décocher' : 'Tout cocher'}
        </button>
      </div>
      
      <div className="grid gap-1.5">
        {visiblePermissions.map((permission) => {
          const IconComponent = iconMap[permission.icon];
          const isChecked = selectedPermissions.includes(permission.key);
          
          return (
            <label
              key={permission.key}
              htmlFor={`perm-${permission.key}`}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md border transition-colors cursor-pointer',
                isChecked 
                  ? 'bg-primary/5 border-primary/30' 
                  : 'bg-muted/30 border-transparent hover:border-muted-foreground/20',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Checkbox
                id={`perm-${permission.key}`}
                checked={isChecked}
                onCheckedChange={() => handleToggle(permission.key)}
                disabled={disabled}
              />
              {IconComponent && (
                <IconComponent className={cn(
                  'h-3.5 w-3.5',
                  isChecked ? 'text-primary' : 'text-muted-foreground'
                )} />
              )}
              <span
                className={cn(
                  'text-sm',
                  isChecked ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {permission.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
