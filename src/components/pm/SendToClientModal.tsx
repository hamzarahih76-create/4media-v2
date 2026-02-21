import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Mail, MessageCircle, Send, ExternalLink, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface SendToClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: {
    id: string;
    title: string;
    client_name: string | null;
    external_link: string | null;
  } | null;
  onSend?: (method: 'email' | 'whatsapp', message: string) => void;
}

export function SendToClientModal({
  open,
  onOpenChange,
  video,
  onSend,
}: SendToClientModalProps) {
  const [method, setMethod] = useState<'email' | 'whatsapp' | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deliveryLink, setDeliveryLink] = useState<string | null>(null);

  // Generate delivery link when modal opens
  useEffect(() => {
    if (open && video?.id) {
      generateDeliveryLink();
    } else {
      setDeliveryLink(null);
      setMethod(null);
      setMessage('');
    }
  }, [open, video?.id]);

  const generateDeliveryLink = async () => {
    if (!video) return;
    
    setIsGenerating(true);
    try {
      // First, get the latest delivery for this video
      const { data: delivery, error: deliveryError } = await supabase
        .from('video_deliveries')
        .select('id')
        .eq('video_id', video.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (deliveryError || !delivery) {
        console.error('Error fetching delivery:', deliveryError);
        toast.error('Aucune livraison trouvée pour cette vidéo');
        setIsGenerating(false);
        return;
      }

      // IMPORTANT: Always create a new review link when sending to client
      // This ensures the client can submit new feedback even after revision cycles
      
      // First, deactivate any existing active review links for this video
      await supabase
        .from('video_review_links')
        .update({ is_active: false })
        .eq('video_id', video.id)
        .eq('is_active', true);

      // Create a fresh review link
      const { data: newLink, error: linkError } = await supabase
        .from('video_review_links')
        .insert({
          video_id: video.id,
          delivery_id: delivery.id,
        })
        .select('token')
        .single();

      if (linkError) {
        console.error('Error creating review link:', linkError);
        toast.error('Erreur lors de la création du lien de revue');
        setIsGenerating(false);
        return;
      }
      
      const reviewLinkToken = newLink?.token || null;

      // Use production domain for client-facing links
      const productionDomain = 'https://4media.international';
      const link = `${productionDomain}/delivery/${video.id}`;
      setDeliveryLink(link);
      
      // Update video status to review_client
      const { error } = await supabase
        .from('videos')
        .update({ status: 'review_client' })
        .eq('id', video.id);
      
      if (error) {
        console.error('Error updating video status:', error);
      }
    } catch (error) {
      console.error('Error generating delivery link:', error);
      toast.error('Erreur lors de la génération du lien');
    } finally {
      setIsGenerating(false);
    }
  };

  const defaultMessage = video && deliveryLink
    ? `Bonjour,\n\nVotre vidéo "${video.title}" est prête pour votre validation.\n\nVous pouvez la visualiser et donner votre avis via ce lien :\n${deliveryLink}\n\nMerci de nous faire part de vos retours.\n\nCordialement,\nL'équipe 4Media`
    : '';

  const handleMethodSelect = (selectedMethod: 'email' | 'whatsapp') => {
    setMethod(selectedMethod);
    if (!message) {
      setMessage(defaultMessage);
    }
  };

  const handleCopyLink = async () => {
    if (deliveryLink) {
      await navigator.clipboard.writeText(deliveryLink);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSend = () => {
    if (!method || !video || !deliveryLink) return;

    if (method === 'email') {
      // Open email client
      const subject = encodeURIComponent(`Vidéo prête : ${video.title}`);
      const body = encodeURIComponent(message);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      toast.success('Email ouvert dans votre application');
    } else if (method === 'whatsapp') {
      // Open WhatsApp
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
      toast.success('WhatsApp ouvert');
    }

    onSend?.(method, message);
    onOpenChange(false);
    setMethod(null);
    setMessage('');
  };

  const handleClose = () => {
    onOpenChange(false);
    setMethod(null);
    setMessage('');
    setDeliveryLink(null);
  };

  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Envoyer au client
          </DialogTitle>
          <DialogDescription>
            Envoyez la vidéo "{video.title}" au client {video.client_name && `(${video.client_name})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Delivery Link Preview */}
          {isGenerating ? (
            <div className="p-4 rounded-lg border bg-muted/30 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Génération du lien de livraison...</span>
            </div>
          ) : deliveryLink ? (
            <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
              {/* Header */}
              <div className="px-4 py-2.5 bg-primary/10 border-b border-primary/20">
                <Label className="text-xs font-semibold text-primary uppercase tracking-wide">
                  🔗 Lien de livraison client
                </Label>
              </div>
              
              {/* Link content */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
                  <code className="flex-1 text-sm font-mono text-primary break-all leading-relaxed">
                    {deliveryLink}
                  </code>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-500" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copier le lien
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => window.open(deliveryLink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ouvrir
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Ce lien permet au client de voir et valider la vidéo sur la plateforme 4Media.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
              ⚠️ Erreur lors de la génération du lien de livraison.
            </div>
          )}

          {/* Channel Selection */}
          <div className="space-y-2">
            <Label>Choisir le canal d'envoi</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className={cn(
                  'h-20 flex-col gap-2 transition-all',
                  method === 'email' && 'border-primary bg-primary/10 text-primary'
                )}
                onClick={() => handleMethodSelect('email')}
                disabled={!deliveryLink}
              >
                <Mail className="h-6 w-6" />
                <span>Email</span>
              </Button>
              <Button
                variant="outline"
                className={cn(
                  'h-20 flex-col gap-2 transition-all',
                  method === 'whatsapp' && 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                )}
                onClick={() => handleMethodSelect('whatsapp')}
                disabled={!deliveryLink}
              >
                <MessageCircle className="h-6 w-6" />
                <span>WhatsApp</span>
              </Button>
            </div>
          </div>

          {/* Message Editor */}
          {method && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <Label>Message personnalisé</Label>
                <Badge variant="outline" className={cn(
                  method === 'email' && 'border-primary/30 text-primary',
                  method === 'whatsapp' && 'border-emerald-500/30 text-emerald-500'
                )}>
                  {method === 'email' ? 'Email' : 'WhatsApp'}
                </Badge>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Votre message..."
                className="min-h-[150px] resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={!method || !deliveryLink || isGenerating}
            className={cn(
              method === 'email' && 'bg-primary hover:bg-primary/90',
              method === 'whatsapp' && 'bg-emerald-500 hover:bg-emerald-600'
            )}
          >
            {method === 'email' && <Mail className="h-4 w-4 mr-2" />}
            {method === 'whatsapp' && <MessageCircle className="h-4 w-4 mr-2" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
