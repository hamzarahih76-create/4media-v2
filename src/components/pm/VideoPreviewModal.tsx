import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  ExternalLink, 
  Play, 
  Download, 
  FileVideo, 
  Loader2,
  CheckCircle2,
  Edit3,
  Send,
  Star,
  X,
  ImagePlus,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface VideoPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoTitle: string;
  externalLink: string | null;
  filePath?: string | null;
  cloudflareStreamId?: string | null;
  videoId?: string | null;
  showActions?: boolean;
  onValidate?: (videoId: string, rating: number) => void;
  onRequestRevision?: (videoId: string, notes: string, images: File[]) => void;
  onSendToClient?: (videoId: string) => void;
  isValidating?: boolean;
  isRequestingRevision?: boolean;
}

export function VideoPreviewModal({ 
  open, 
  onOpenChange, 
  videoTitle, 
  externalLink,
  filePath,
  cloudflareStreamId,
  videoId,
  showActions = false,
  onValidate,
  onRequestRevision,
  onSendToClient,
  isValidating = false,
  isRequestingRevision = false,
}: VideoPreviewModalProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [cloudflareIframeUrl, setCloudflareIframeUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Action states
  const [activeAction, setActiveAction] = useState<'validate' | 'revision' | null>(null);
  const [rating, setRating] = useState([4]);
  const [revisionImages, setRevisionImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      setActiveAction(null);
      setRating([4]);
      setRevisionNotes('');
      setRevisionImages([]);
      setCloudflareIframeUrl(null);
      // Revoke object URLs to prevent memory leaks
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      setImagePreviewUrls([]);
    }
  }, [open]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} n'est pas une image valide`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB max
        toast.error(`${file.name} est trop volumineux (max 5MB)`);
        return false;
      }
      return true;
    });

    setRevisionImages(prev => [...prev, ...validFiles]);
    const newUrls = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviewUrls(prev => [...prev, ...newUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setRevisionImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Generate signed URL when modal opens with a file path or Cloudflare Stream ID
  useEffect(() => {
    if (!open) return;
    
    // Case 1: Cloudflare Stream video - get signed URL
    if (cloudflareStreamId) {
      setIsLoadingUrl(true);
      setUrlError(null);
      
      supabase.functions
        .invoke('cloudflare-stream-signed-url', {
          body: { cloudflareVideoId: cloudflareStreamId }
        })
        .then(({ data, error }) => {
          if (error) {
            console.error('Error getting Cloudflare signed URL:', error);
            setUrlError('Impossible de charger la vidéo Cloudflare');
          } else if (data?.iframeUrl) {
            setCloudflareIframeUrl(data.iframeUrl);
          } else if (data?.error) {
            console.error('Cloudflare error:', data.error);
            setUrlError(data.error);
          }
          setIsLoadingUrl(false);
        });
      return;
    }
    
    // Case 2: Local file - create signed URL from Supabase storage
    if (filePath && !externalLink) {
      setIsLoadingUrl(true);
      setUrlError(null);
      
      supabase.storage
        .from('deliveries')
        .createSignedUrl(filePath, 3600) // 1 hour expiry
        .then(({ data, error }) => {
          if (error) {
            console.error('Error creating signed URL:', error);
            setUrlError('Impossible de charger la vidéo');
          } else {
            setSignedUrl(data.signedUrl);
          }
          setIsLoadingUrl(false);
        });
      return;
    }
    
    // No special handling needed
    setSignedUrl(null);
    setCloudflareIframeUrl(null);
    setUrlError(null);
  }, [open, filePath, externalLink, cloudflareStreamId]);

  const handleValidate = () => {
    if (videoId && onValidate) {
      onValidate(videoId, rating[0]);
    }
  };

  const handleRequestRevision = () => {
    if (videoId && onRequestRevision && revisionNotes.trim()) {
      onRequestRevision(videoId, revisionNotes, revisionImages);
    }
  };
  
  const renderVideoEmbed = () => {
    // Case 1: Loading signed URL for file upload
    if (isLoadingUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <Loader2 className="h-16 w-16 animate-spin" />
          <p>Chargement de la vidéo...</p>
        </div>
      );
    }

    // Case 2: Error loading signed URL
    if (urlError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <FileVideo className="h-16 w-16" />
          <p>{urlError}</p>
        </div>
      );
    }

    // Case 3: File uploaded - use HTML5 video player with signed URL
    if (signedUrl) {
      // Determine video type from file extension
      const extension = filePath?.split('.').pop()?.toLowerCase();
      let videoType = 'video/mp4';
      if (extension === 'webm') videoType = 'video/webm';
      else if (extension === 'mov') videoType = 'video/quicktime';
      else if (extension === 'avi') videoType = 'video/x-msvideo';
      else if (extension === 'mkv') videoType = 'video/x-matroska';
      
      return (
        <video 
          controls 
          className="w-full h-full rounded-lg bg-black"
          autoPlay
          playsInline
        >
          {/* Use explicit type based on extension to avoid application/octet-stream issue */}
          <source src={signedUrl} type={videoType} />
          Votre navigateur ne supporte pas la lecture vidéo.
        </video>
      );
    }

    // Case 4: Cloudflare Stream video with signed URL
    if (cloudflareIframeUrl) {
      return (
        <iframe
          src={cloudflareIframeUrl}
          className="w-full h-full rounded-lg"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Case 5: Cloudflare Stream video (unsigned - fallback)
    if (cloudflareStreamId) {
      return (
        <iframe
          src={`https://iframe.videodelivery.net/${cloudflareStreamId}`}
          className="w-full h-full rounded-lg"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      );
    }

    // Case 5: No link and no file
    if (!externalLink) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
          <FileVideo className="h-16 w-16" />
          <p>Aucun lien de prévisualisation disponible</p>
        </div>
      );
    }

    const url = externalLink;
    
    // Google Drive embed
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (driveMatch) {
      const fileId = driveMatch[1];
      return (
        <iframe
          src={`https://drive.google.com/file/d/${fileId}/preview`}
          className="w-full h-full rounded-lg"
          allow="autoplay"
          allowFullScreen
        />
      );
    }
    
    // YouTube embed
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
          className="w-full h-full rounded-lg"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    
    // Vimeo embed
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
          className="w-full h-full rounded-lg"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      );
    }
    
    // Loom embed
    const loomMatch = url.match(/loom\.com\/share\/([^?]+)/);
    if (loomMatch) {
      return (
        <iframe
          src={`https://www.loom.com/embed/${loomMatch[1]}`}
          className="w-full h-full rounded-lg"
          allowFullScreen
        />
      );
    }
    
    // Frame.io embed
    const frameioMatch = url.match(/frame\.io\/v\/([^?]+)/);
    if (frameioMatch) {
      return (
        <iframe
          src={`https://app.frame.io/reviews/${frameioMatch[1]}`}
          className="w-full h-full rounded-lg"
          allowFullScreen
        />
      );
    }
    
    // Fallback: show play button with external link
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Play className="h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          Ce type de lien ne peut pas être intégré directement.
        </p>
        <Button 
          onClick={() => window.open(url, '_blank')}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir dans un nouvel onglet
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw]">
        <DialogHeader>
          <DialogTitle>{videoTitle}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          {renderVideoEmbed()}
        </div>
        
        {/* Action buttons and forms */}
        {showActions && videoId && (
          <>
            <Separator />
            
            {/* Action buttons */}
            {!activeAction && (
              <div className="flex flex-wrap gap-2 justify-center">
                <Button 
                  onClick={() => setActiveAction('validate')}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Valider
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setActiveAction('revision')}
                  className="gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Demander révision
                </Button>
                {onSendToClient && (
                  <Button 
                    variant="outline"
                    onClick={() => onSendToClient(videoId)}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Envoyer au client
                  </Button>
                )}
              </div>
            )}

            {/* Validate form */}
            {activeAction === 'validate' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Valider la vidéo
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setActiveAction(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Note de qualité (optionnel) : {rating[0]}/5
                  </Label>
                  <Slider
                    value={rating}
                    onValueChange={setRating}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Faible</span>
                    <span>Excellent</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    La note finale sera attribuée par le client
                  </p>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveAction(null)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleValidate}
                    disabled={isValidating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Validation...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirmer la validation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Revision form */}
            {activeAction === 'revision' && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-orange-500" />
                    Demander une révision
                  </h4>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setActiveAction(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Notes pour l'éditeur</Label>
                  <Textarea
                    placeholder="Décrivez les modifications à apporter..."
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Image/Screenshot upload section */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImagePlus className="h-4 w-4" />
                    Captures d'écran (optionnel)
                  </Label>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <ImagePlus className="h-4 w-4" />
                    Ajouter une image
                  </Button>

                  {/* Image previews */}
                  {imagePreviewUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {imagePreviewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={url} 
                            alt={`Capture ${index + 1}`}
                            className="h-20 w-20 object-cover rounded-lg border"
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline"
                    onClick={() => setActiveAction(null)}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleRequestRevision}
                    disabled={isRequestingRevision || !revisionNotes.trim()}
                    variant="default"
                  >
                    {isRequestingRevision ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Envoyer la demande
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Download/Open buttons */}
        {(externalLink || signedUrl) && !activeAction && (
          <div className="flex justify-end gap-2">
            {signedUrl && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(signedUrl, '_blank')}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            )}
            {externalLink && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(externalLink, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir dans un nouvel onglet
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
