import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Film, Plus, Trash2, ExternalLink, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClientRushes } from '@/hooks/useClientRushes';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ClientRushesSectionProps {
  clientUserId: string;
}

const LINK_TYPES: Record<string, { label: string; icon: string }> = {
  drive: { label: 'Google Drive', icon: '📁' },
  dropbox: { label: 'Dropbox', icon: '📦' },
  wetransfer: { label: 'WeTransfer', icon: '📤' },
  onedrive: { label: 'OneDrive', icon: '☁️' },
  other: { label: 'Autre', icon: '🔗' },
};

export function ClientRushesSection({ clientUserId }: ClientRushesSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: rushes = [], isLoading } = useClientRushes(clientUserId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [linkType, setLinkType] = useState('drive');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingRush, setEditingRush] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editLinkType, setEditLinkType] = useState('drive');
  const [editSaving, setEditSaving] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['client-rushes', clientUserId] });
  };

  const handleAdd = async () => {
    if (!title.trim() || !link.trim()) {
      toast.error('Titre et lien requis');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('client_rushes').insert({
      client_user_id: clientUserId,
      title: title.trim(),
      external_link: link.trim(),
      link_type: linkType,
      created_by: user?.id,
    });
    setSaving(false);
    if (error) {
      toast.error('Erreur lors de l\'ajout');
      console.error(error);
    } else {
      toast.success('🎬 Rush ajouté !');
      setTitle('');
      setLink('');
      setLinkType('drive');
      setOpen(false);
      invalidate();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error, count } = await supabase.from('client_rushes').delete().eq('id', id).select();
    setDeletingId(null);
    if (error) {
      toast.error('Erreur lors de la suppression');
      console.error('Delete error:', error);
    } else {
      toast.success('Rush supprimé');
      invalidate();
    }
  };

  const startEdit = (rush: any) => {
    setEditingRush(rush);
    setEditTitle(rush.title);
    setEditLink(rush.external_link);
    setEditLinkType(rush.link_type || 'drive');
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingRush || !editTitle.trim() || !editLink.trim()) {
      toast.error('Titre et lien requis');
      return;
    }
    setEditSaving(true);
    const { error } = await supabase.from('client_rushes').update({
      title: editTitle.trim(),
      external_link: editLink.trim(),
      link_type: editLinkType,
    }).eq('id', editingRush.id);
    setEditSaving(false);
    if (error) {
      toast.error('Erreur lors de la modification');
      console.error(error);
    } else {
      toast.success('✏️ Rush modifié !');
      setEditOpen(false);
      setEditingRush(null);
      invalidate();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Film className="h-4 w-4 text-orange-500" />
          </div>
          <h4 className="text-sm font-semibold">Rushs du client</h4>
          {rushes.length > 0 && (
            <span className="text-xs bg-muted rounded-full px-2 py-0.5">{rushes.length}</span>
          )}
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3 pointer-events-auto" align="end">
            <div className="space-y-3">
              <p className="text-sm font-medium">Nouveau rush</p>
              <Input
                placeholder="Titre (ex: Rush Tournage Janvier)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Input
                placeholder="Lien (Google Drive, WeTransfer...)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              <Select value={linkType} onValueChange={setLinkType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LINK_TYPES).map(([key, { label, icon }]) => (
                    <SelectItem key={key} value={key}>{icon} {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="w-full" onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Ajouter le rush
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Chargement...
        </div>
      ) : rushes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-1">Aucun rush uploadé</p>
      ) : (
        <div className="space-y-1.5">
          {rushes.map((rush: any) => (
            <div key={rush.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 group">
              <span className="text-sm">{LINK_TYPES[rush.link_type]?.icon || '🔗'}</span>
              <span className="text-sm font-medium flex-1 truncate">{rush.title}</span>
              <a
                href={rush.external_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Popover
                open={editOpen && editingRush?.id === rush.id}
                onOpenChange={(isOpen) => {
                  if (!isOpen) { setEditOpen(false); setEditingRush(null); }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEdit(rush)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3 pointer-events-auto" align="end">
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Modifier le rush</p>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Titre" />
                    <Input value={editLink} onChange={(e) => setEditLink(e.target.value)} placeholder="Lien" />
                    <Select value={editLinkType} onValueChange={setEditLinkType}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(LINK_TYPES).map(([key, { label, icon }]) => (
                          <SelectItem key={key} value={key}>{icon} {label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="w-full" onClick={handleEdit} disabled={editSaving}>
                      {editSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Enregistrer
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                onClick={() => handleDelete(rush.id)}
                disabled={deletingId === rush.id}
              >
                {deletingId === rush.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
