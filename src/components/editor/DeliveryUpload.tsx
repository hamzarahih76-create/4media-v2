import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Link as LinkIcon, 
  ExternalLink,
  Loader2,
  Check,
  Cloud
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadToCloudflare } from '@/lib/api/cloudflareStream';
import type { LinkType } from '@/types/workflow';

interface DeliveryUploadProps {
  taskId: string;
  videoId?: string;
  onDeliveryCreated: (deliveryId: string) => void;
  className?: string;
}

const linkTypeOptions: { value: LinkType; label: string; icon: string }[] = [
  { value: 'drive', label: 'Google Drive', icon: '📁' },
  { value: 'frame', label: 'Frame.io', icon: '🎬' },
  { value: 'dropbox', label: 'Dropbox', icon: '📦' },
  { value: 'other', label: 'Autre', icon: '🔗' },
];

export function DeliveryUpload({ taskId, videoId, onDeliveryCreated, className }: DeliveryUploadProps) {
  const [activeTab, setActiveTab] = useState<'cloudflare' | 'link'>('cloudflare');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<LinkType>('drive');
  
  const [file, setFile] = useState<File | null>(null);

  const detectLinkType = (url: string): LinkType => {
    if (url.includes('drive.google.com')) return 'drive';
    if (url.includes('frame.io')) return 'frame';
    if (url.includes('dropbox.com')) return 'dropbox';
    return 'other';
  };

  const handleLinkChange = (url: string) => {
    setLinkUrl(url);
    setLinkType(detectLinkType(url));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (2GB limit for Cloudflare Stream)
      if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
        toast.error('Fichier trop volumineux (max 2GB)');
        return;
      }
      // Validate video file type
      if (!selectedFile.type.startsWith('video/')) {
        toast.error('Veuillez sélectionner un fichier vidéo');
        return;
      }
      setFile(selectedFile);
      setUploadProgress(0);
    }
  };

  const getNextVideoVersionNumber = async (videoId: string): Promise<number> => {
    const { data, error } = await supabase
      .from('video_deliveries')
      .select('version_number')
      .eq('video_id', videoId)
      .order('version_number', { ascending: false })
      .limit(1);
    
    if (error || !data || data.length === 0) {
      return 1;
    }
    return (data[0].version_number || 0) + 1;
  };

  const handleSubmit = async () => {
    if (activeTab === 'link' && !linkUrl.trim()) {
      toast.error('Veuillez entrer un lien');
      return;
    }
    if (activeTab === 'cloudflare' && !file) {
      toast.error('Veuillez sélectionner un fichier vidéo');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      let cloudflareStreamId: string | null = null;
      let deliveryId: string;

      if (videoId) {
        const nextVersion = await getNextVideoVersionNumber(videoId);

        // Upload to Cloudflare Stream if file selected
        if (activeTab === 'cloudflare' && file) {
          const { data: videoData } = await supabase
            .from('videos')
            .select('title')
            .eq('id', videoId)
            .single();

          const videoTitle = videoData?.title || file.name;
          
          const uploadResult = await uploadToCloudflare(
            file,
            `${videoTitle} - v${nextVersion}`,
            (progress) => setUploadProgress(progress)
          );

          if (!uploadResult.success || !uploadResult.cloudflareVideoId) {
            throw new Error(uploadResult.error || 'Échec de l\'upload vers Cloudflare Stream');
          }

          cloudflareStreamId = uploadResult.cloudflareVideoId;
          toast.success('Vidéo uploadée vers Cloudflare Stream');
        }

        // Create video delivery record
        const { data: delivery, error: deliveryError } = await supabase
          .from('video_deliveries')
          .insert({
            video_id: videoId,
            editor_id: user.id,
            version_number: nextVersion,
            delivery_type: activeTab === 'cloudflare' ? 'file' : 'link',
            file_path: null, // Not using local storage anymore
            cloudflare_stream_id: cloudflareStreamId,
            external_link: activeTab === 'link' ? linkUrl : null,
            link_type: activeTab === 'link' ? linkType : null,
            notes: null,
          })
          .select()
          .single();

        if (deliveryError) throw deliveryError;
        deliveryId = delivery.id;

        // Update video status to review_admin
        await supabase
          .from('videos')
          .update({ 
            status: 'review_admin', 
            started_at: new Date().toISOString() 
          })
          .eq('id', videoId);

        // Create notification for admin
        await supabase
          .from('notifications')
          .insert({
            user_id: user.id, // Will be replaced with admin ID in trigger
            type: 'video_uploaded',
            title: 'Nouvelle vidéo à valider',
            message: `L'éditeur a uploadé la version ${nextVersion}`,
            metadata: {
              video_id: videoId,
              version: nextVersion,
              delivery_id: deliveryId,
            },
          });

        toast.success(`Version ${nextVersion} uploadée - En attente de validation admin`);
      } else {
        // Legacy: use task_deliveries for tasks without videos
        const { data: nextVersion } = await supabase
          .rpc('get_next_version_number', { p_task_id: taskId });

        if (activeTab === 'cloudflare' && file) {
          const uploadResult = await uploadToCloudflare(
            file,
            `Task ${taskId} - v${nextVersion || 1}`,
            (progress) => setUploadProgress(progress)
          );

          if (!uploadResult.success || !uploadResult.cloudflareVideoId) {
            throw new Error(uploadResult.error || 'Échec de l\'upload vers Cloudflare Stream');
          }

          cloudflareStreamId = uploadResult.cloudflareVideoId;
        }

        const { data: delivery, error: deliveryError } = await supabase
          .from('task_deliveries')
          .insert({
            task_id: taskId,
            editor_id: user.id,
            version_number: nextVersion || 1,
            delivery_type: activeTab === 'cloudflare' ? 'file' : 'link',
            file_path: null,
            external_link: activeTab === 'link' ? linkUrl : (cloudflareStreamId ? `cf://${cloudflareStreamId}` : null),
            link_type: activeTab === 'link' ? linkType : null,
            notes: null,
          })
          .select()
          .single();

        if (deliveryError) throw deliveryError;
        deliveryId = delivery.id;

        await supabase
          .from('tasks')
          .update({ status: 'in_progress', started_at: new Date().toISOString() })
          .eq('id', taskId)
          .in('status', ['active']);

        toast.success(`Version ${nextVersion || 1} ajoutée`);
      }

      onDeliveryCreated(deliveryId);
      
      // Reset form
      setLinkUrl('');
      setFile(null);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Cloud className="h-4 w-4 text-orange-500" />
          Nouvelle livraison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cloudflare' | 'link')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="cloudflare" className="gap-2">
              <Cloud className="h-4 w-4" />
              Cloudflare
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Lien externe
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cloudflare" className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Fichier vidéo (Cloudflare Stream)</Label>
              <div className="mt-1.5">
                <label
                  htmlFor="file-upload"
                  className={cn(
                    'flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors',
                    file
                      ? 'border-orange-500/50 bg-orange-500/5'
                      : 'border-muted-foreground/25 hover:border-orange-500/50 hover:bg-orange-500/5'
                  )}
                >
                  {file ? (
                    <div className="flex flex-col items-center gap-2 text-sm">
                      <Check className="h-5 w-5 text-orange-500" />
                      <span className="font-medium truncate max-w-[200px] text-orange-600">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Cloud className="h-8 w-8 mb-2 text-orange-500/60" />
                      <span className="text-sm font-medium">Upload vers Cloudflare Stream</span>
                      <span className="text-xs mt-1">MP4, MOV, MKV... (max 2GB)</span>
                    </div>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
              {isUploading && uploadProgress > 0 && (
                <div className="mt-3 space-y-1">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Upload en cours... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div>
              <Label htmlFor="link-url">Lien de la vidéo</Label>
              <div className="relative mt-1.5">
                <Input
                  id="link-url"
                  placeholder="https://drive.google.com/..."
                  value={linkUrl}
                  onChange={(e) => handleLinkChange(e.target.value)}
                  className="pr-10"
                />
                <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {linkUrl && (
              <div>
                <Label>Type de lien détecté</Label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {linkTypeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setLinkType(option.value)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors',
                        linkType === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background hover:bg-muted'
                      )}
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>


        <Button
          onClick={handleSubmit}
          disabled={isUploading || (activeTab === 'link' && !linkUrl) || (activeTab === 'cloudflare' && !file)}
          className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {uploadProgress > 0 ? `Upload... ${uploadProgress}%` : 'Préparation...'}
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 mr-2" />
              Soumettre pour validation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
