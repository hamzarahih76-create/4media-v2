import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, User, Calendar, Video } from 'lucide-react';

type ClientType = 'b2c' | 'b2b';

interface CreateTaskModalProps {
  onCreateTask: (task: {
    title: string;
    clientName: string;
    clientType: ClientType;
    description?: string;
    deadline?: string;
  }) => void;
}

const VIDEO_TYPES = [
  'Reel Instagram',
  'Vidéo TikTok',
  'Story Instagram',
  'YouTube Short',
  'Vidéo Promo',
  'Montage Photo',
  'Autre',
];

export function CreateTaskModal({ onCreateTask }: CreateTaskModalProps) {
  const [open, setOpen] = useState(false);
  const [clientType, setClientType] = useState<ClientType>('b2c');
  const [videoType, setVideoType] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoType || !clientName.trim()) return;

    setIsSubmitting(true);
    try {
      // Auto-generate title from video type and client
      const title = `${videoType} - ${clientName.trim()}`;
      
      await onCreateTask({
        title,
        clientName: clientName.trim(),
        clientType,
        description: description.trim() || undefined,
        deadline: deadline || undefined,
      });
      
      // Reset form
      setVideoType('');
      setClientName('');
      setDescription('');
      setDeadline('');
      setClientType('b2c');
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = videoType.length > 0 && clientName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Créer une tâche
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Nouvelle tâche
          </DialogTitle>
          <DialogDescription>
            Créez une tâche pour un client local ou entreprise
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client Type - B2C or B2B */}
          <div className="space-y-2">
            <Label>Type de client *</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={clientType === 'b2c' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setClientType('b2c')}
              >
                B2C (Local)
              </Button>
              <Button
                type="button"
                variant={clientType === 'b2b' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setClientType('b2b')}
              >
                B2B (Entreprise)
              </Button>
            </div>
          </div>

          {/* Video Type - Auto-generates title */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Video className="h-4 w-4 text-muted-foreground" />
              Type de vidéo *
            </Label>
            <Select value={videoType} onValueChange={setVideoType}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type..." />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Name - REQUIRED */}
          <div className="space-y-2">
            <Label htmlFor="clientName" className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Nom du client *
            </Label>
            <Input
              id="clientName"
              placeholder={clientType === 'b2c' ? "Ex: Mohamed - Café Central" : "Ex: Société XYZ"}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

          {/* Deadline - OPTIONAL */}
          <div className="space-y-2">
            <Label htmlFor="deadline" className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Deadline (optionnel)
            </Label>
            <Input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Notes - OPTIONAL */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optionnel)</Label>
            <Textarea
              id="description"
              placeholder="Instructions, liens de référence, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Info banner */}
          <div className={`p-3 rounded-lg text-sm border ${
            clientType === 'b2c' 
              ? 'bg-emerald-500/5 border-emerald-500/20' 
              : 'bg-blue-500/5 border-blue-500/20'
          }`}>
            <p className={`font-medium mb-1 ${clientType === 'b2c' ? 'text-emerald-700' : 'text-blue-700'}`}>
              {clientType === 'b2c' ? '💡 Tâche B2C' : '🏢 Tâche B2B'}
            </p>
            <p className="text-muted-foreground text-xs">
              {clientType === 'b2c' 
                ? 'Client local (WhatsApp, téléphone). Timer: 5h max.'
                : 'Client entreprise. Timer: 5h max.'}
            </p>
          </div>

          {/* Preview auto-generated title */}
          {videoType && clientName && (
            <div className="p-2 bg-muted rounded text-sm">
              <span className="text-muted-foreground">Titre: </span>
              <span className="font-medium">{videoType} - {clientName}</span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? 'Création...' : 'Créer la tâche'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
