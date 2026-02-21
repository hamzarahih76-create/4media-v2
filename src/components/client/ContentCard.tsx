import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Video, Image, Layers, Sparkles, ExternalLink, Check, MessageSquare, Edit2, Save, X, Hash, Copy, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getDirectionStyle } from '@/lib/textDirection';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ClientContentItem } from '@/hooks/useClientProfile';

interface ContentCardProps {
  item: ClientContentItem;
  primaryColor?: string;
}

interface ContentCardState extends ClientContentItem {
  id: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  in_progress: { label: 'En cours', variant: 'default' },
  pending_review: { label: 'En validation', variant: 'outline' },
  validated: { label: 'Validé ✅', variant: 'default' },
  delivered: { label: 'Livré', variant: 'default' },
  revision_requested: { label: 'Modification', variant: 'destructive' },
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  idea: FileText,
  script: FileText,
  video: Video,
  design: Image,
  post: Image,
  carousel: Layers,
  thumbnail: Image,
};

const TYPE_LABELS: Record<string, string> = {
  idea: 'Idée',
  script: 'Script',
  video: 'Vidéo',
  design: 'Design',
  post: 'Post',
  carousel: 'Carrousel',
  thumbnail: 'Miniature',
};

export function ContentCard({ item, primaryColor }: ContentCardProps) {
  const [open, setOpen] = useState(false);
  const [showModifyForm, setShowModifyForm] = useState(false);
  const [modifyNote, setModifyNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditingInspiration, setIsEditingInspiration] = useState(false);
  const [editedInspiration, setEditedInspiration] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
  const Icon = TYPE_ICONS[item.content_type] || FileText;
  const meta = item.metadata as any;
  const inspiration = meta?.inspiration || item.description;
  const scriptDescription = meta?.description || '';
  const scriptHashtags: string[] = meta?.hashtags || [];

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copié !');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const canAct = item.status !== 'validated';

  const handleValidate = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('client_content_items')
      .update({ status: 'validated' })
      .eq('id', item.id);
    setLoading(false);
    if (error) {
      toast.error('Erreur lors de la validation');
    } else {
      toast.success('Contenu validé ✅');
      queryClient.invalidateQueries({ queryKey: ['client-content-items'] });
      setOpen(false);
    }
  };

  const handleRequestModification = async () => {
    if (!modifyNote.trim()) {
      toast.error('Veuillez préciser la modification souhaitée');
      return;
    }
    setLoading(true);
    const existingMeta = (item.metadata || {}) as Record<string, any>;
    const { error } = await supabase
      .from('client_content_items')
      .update({ 
        status: 'revision_requested',
        metadata: { ...existingMeta, revision_note: modifyNote.trim() },
      })
      .eq('id', item.id);
    setLoading(false);
    if (error) {
      toast.error('Erreur lors de la demande');
    } else {
      toast.success('Demande de modification envoyée');
      queryClient.invalidateQueries({ queryKey: ['client-content-items'] });
      setShowModifyForm(false);
      setModifyNote('');
      setOpen(false);
    }
  };

  return (
    <>
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div 
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${primaryColor || '#22c55e'}20` }}
            >
              <Icon className="h-5 w-5" style={{ color: primaryColor || '#22c55e' }} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-foreground truncate">{item.title}</h4>
                <Badge variant={status.variant} className="shrink-0 text-xs">
                  {status.label}
                </Badge>
              </div>
              
              {inspiration && (
                <p dir="auto" className="text-xs text-muted-foreground mt-1 line-clamp-1" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>
                  {inspiration}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setShowModifyForm(false); setModifyNote(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" style={{ color: primaryColor || '#22c55e' }} />
              {item.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={status.variant} className="ml-auto text-xs">
                {status.label}
              </Badge>
            </div>

            {inspiration && (
              <div className="rounded-lg border p-4 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Inspiration
                </div>
                <p dir="auto" className="text-sm whitespace-pre-wrap leading-relaxed" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>{inspiration}</p>
              </div>
            )}

            {/* Description (pour le planning) */}
            {scriptDescription && (
              <div className="rounded-lg border p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    Description
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => handleCopy(scriptDescription, 'desc')}
                  >
                    {copiedField === 'desc' ? <ClipboardCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedField === 'desc' ? 'Copié' : 'Copier'}
                  </Button>
                </div>
                <p dir="auto" className="text-sm whitespace-pre-wrap leading-relaxed" style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}>{scriptDescription}</p>
              </div>
            )}

            {/* Hashtags */}
            {scriptHashtags.length > 0 && (
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    Hashtags
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1"
                    onClick={() => handleCopy(scriptHashtags.map(h => `#${h}`).join(' '), 'hash')}
                  >
                    {copiedField === 'hash' ? <ClipboardCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedField === 'hash' ? 'Copié' : 'Copier'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {scriptHashtags.map((h: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">#{h}</Badge>
                  ))}
                </div>
              </div>
            )}

            {(item.file_url || item.external_link) && (
              <a 
                href={item.external_link || item.file_url || '#'}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                style={{ color: primaryColor || '#22c55e' }}
              >
                <ExternalLink className="h-4 w-4" />
                Voir le contenu
              </a>
            )}

            {/* Modification form */}
            {showModifyForm && (
              <div className="space-y-2 rounded-lg border p-3">
                <label className="text-sm font-medium">Précisez la modification :</label>
                <Textarea 
                  value={modifyNote} 
                  onChange={(e) => setModifyNote(e.target.value)} 
                  placeholder="Décrivez ce que vous souhaitez modifier..."
                  rows={3}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setShowModifyForm(false); setModifyNote(''); }}>
                    Annuler
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleRequestModification} disabled={loading}>
                    Envoyer
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {canAct && !showModifyForm && (
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  className="flex-1 gap-1.5" 
                  size="sm"
                  onClick={handleValidate} 
                  disabled={loading}
                  style={{ backgroundColor: primaryColor || '#22c55e' }}
                >
                  <Check className="h-4 w-4" />
                  Valider
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 gap-1.5" 
                  size="sm"
                  onClick={() => setShowModifyForm(true)}
                  disabled={loading}
                >
                  <MessageSquare className="h-4 w-4" />
                  Modifier
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
