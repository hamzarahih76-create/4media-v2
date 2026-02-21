import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, User, Briefcase, Building } from 'lucide-react';
import { useCompleteEditorProfile } from '@/hooks/useEditorProfile';
import { toast } from 'sonner';

interface ProfileCompletionModalProps {
  open: boolean;
  defaultEmail?: string;
}

const departments = [
  'Production',
];

const positions = [
  'Video Editor',
];

export function ProfileCompletionModal({ open, defaultEmail }: ProfileCompletionModalProps) {
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Production');
  const [position, setPosition] = useState('Video Editor');

  const completeProfile = useCompleteEditorProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Le nom est requis');
      return;
    }

    try {
      await completeProfile.mutateAsync({
        fullName: fullName.trim(),
        department,
        position,
      });

      toast.success('Profil complété ! Bienvenue dans l\'équipe 🎉');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la mise à jour du profil');
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Complétez votre profil
          </DialogTitle>
          <DialogDescription>
            Bienvenue ! Renseignez vos informations pour activer votre compte éditeur.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fullName"
                placeholder="Jean Dupont"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Email (read-only) */}
          {defaultEmail && (
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={defaultEmail}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {/* Department */}
          <div className="space-y-2">
            <Label>Département</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger>
                <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label>Poste</Label>
            <Select value={position} onValueChange={setPosition}>
              <SelectTrigger>
                <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {positions.map((pos) => (
                  <SelectItem key={pos} value={pos}>
                    {pos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={completeProfile.isPending}
          >
            {completeProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activation...
              </>
            ) : (
              'Activer mon compte'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
