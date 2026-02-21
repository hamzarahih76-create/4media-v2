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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2, Settings, Plus, Minus, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useActiveEditors } from '@/hooks/useTeamMembers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useClients } from '@/hooks/useClients';

interface VideoData {
  id: string;
  title: string;
  status: string;
  deadline: string | null;
  assigned_to: string | null;
  is_validated: boolean;
  description?: string | null;
}

interface EditProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  clientName: string | null;
  clientUserId?: string | null;
  deadline: string | null;
  description?: string | null;
  
  videos: VideoData[];
  getEditorName: (userId: string | null) => string;
}

export function EditProjectModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  clientName,
  clientUserId,
  deadline,
  
  description,
  videos,
  getEditorName,
}: EditProjectModalProps) {
  const queryClient = useQueryClient();
  const { data: activeEditors = [], isLoading: editorsLoading } = useActiveEditors();
  
  const { data: clients = [] } = useClients();

  // Parse description to extract source link
  const parseDescription = (desc: string | null | undefined) => {
    if (!desc) return { instructions: '', sourceLink: '' };
    const sourceMatch = desc.match(/📁 Fichiers source:\s*(https?:\/\/[^\s]+)/);
    const sourceLink = sourceMatch?.[1] || '';
    const instructions = desc.replace(/\n\n📁 Fichiers source:\s*https?:\/\/[^\s]+/, '').trim();
    return { instructions, sourceLink };
  };

  const parsed = parseDescription(description);

  // Form state
  const [formData, setFormData] = useState({
    title: projectTitle,
    client_name: clientName || '',
    client_user_id: clientUserId || '',
    deadline: deadline ? parseISO(deadline) : null,
    instructions: parsed.instructions,
    sourceFilesLink: parsed.sourceLink,
  });

  // Video assignments state - map of videoId -> assigned_to
  const [videoAssignments, setVideoAssignments] = useState<Record<string, string | null>>({});
  
  // New videos to add
  const [newVideosCount, setNewVideosCount] = useState(0);
  const [newVideoAssignments, setNewVideoAssignments] = useState<(string | null)[]>([]);
  
  // Videos to delete
  const [videosToDelete, setVideosToDelete] = useState<Set<string>>(new Set());

  // Initialize form when modal opens
  useEffect(() => {
    if (open) {
      // First try to parse from project description
      let parsed = parseDescription(description);
      
      // If project description is empty, try to get from first video
      if (!parsed.instructions && !parsed.sourceLink && videos.length > 0) {
        const firstVideoWithDesc = videos.find(v => v.description);
        if (firstVideoWithDesc?.description) {
          parsed = parseDescription(firstVideoWithDesc.description);
        }
      }
      
      setFormData({
        title: projectTitle,
        client_name: clientName || '',
        client_user_id: clientUserId || '',
        deadline: deadline ? parseISO(deadline) : null,
        instructions: parsed.instructions,
        sourceFilesLink: parsed.sourceLink,
        
      });
      
      // Initialize video assignments from current state
      const assignments: Record<string, string | null> = {};
      videos.forEach(video => {
        assignments[video.id] = video.assigned_to;
      });
      setVideoAssignments(assignments);
      
      // Reset new videos
      setNewVideosCount(0);
      setNewVideoAssignments([]);
      
      // Reset videos to delete
      setVideosToDelete(new Set());
    }
  }, [open, projectTitle, clientName, deadline, description, videos]);

  // Transform team_members to Editor format
  const editors = activeEditors
    .filter(member => member.user_id)
    .map(member => ({
      id: member.user_id!,
      name: member.full_name || member.email.split('@')[0],
      email: member.email,
    }));

  // Update mutation
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      // Calculate remaining videos count after deletions
      const remainingVideosCount = videos.filter(v => !videosToDelete.has(v.id)).length + newVideosCount;
      
      // 1. Delete marked videos first
      if (videosToDelete.size > 0) {
        const { error: deleteError } = await supabase
          .from('videos')
          .delete()
          .in('id', Array.from(videosToDelete));
        
        if (deleteError) {
          console.error('Error deleting videos:', deleteError);
          throw deleteError;
        }
      }
      
      // Combine instructions with source files link
      const fullDescription = [
        formData.instructions.trim(),
        formData.sourceFilesLink.trim() ? `\n\n📁 Fichiers source: ${formData.sourceFilesLink.trim()}` : ''
      ].filter(Boolean).join('') || null;

      // 2. Update the task (project)
      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          client_name: formData.client_name || null,
          client_user_id: formData.client_user_id || null,
          deadline: formData.deadline?.toISOString() || null,
          description: fullDescription,
          video_count: remainingVideosCount,
          source_files_link: formData.sourceFilesLink.trim() || null,
          editor_instructions: formData.instructions.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId);
      
      if (taskError) throw taskError;

      // 3. Update existing video assignments (skip deleted ones)
      for (const [videoId, assignedTo] of Object.entries(videoAssignments)) {
        // Skip videos that are being deleted
        if (videosToDelete.has(videoId)) continue;
        
        const { error: videoError } = await supabase
          .from('videos')
          .update({
            assigned_to: assignedTo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', videoId);
        
        if (videoError) {
          console.error(`Error updating video ${videoId}:`, videoError);
        }
      }

      // 4. Create new videos
      if (newVideosCount > 0) {
        const newVideos = [];
        for (let i = 0; i < newVideosCount; i++) {
          newVideos.push({
            task_id: projectId,
            title: `Vidéo ${videos.length + i + 1}`,
            status: 'new',
            assigned_to: newVideoAssignments[i] || null,
            deadline: formData.deadline?.toISOString() || null,
            description: fullDescription,
          });
        }
        
        const { error: newVideosError } = await supabase
          .from('videos')
          .insert(newVideos);
        
        if (newVideosError) {
          console.error('Error creating new videos:', newVideosError);
          throw newVideosError;
        }
      }

      // 5. Update deadline AND description on all existing videos
      const videoUpdates: { deadline?: string; description?: string | null; updated_at: string } = {
        updated_at: new Date().toISOString(),
      };
      
      if (formData.deadline) {
        videoUpdates.deadline = formData.deadline.toISOString();
      }
      
      // Always update video descriptions to match project description
      videoUpdates.description = fullDescription;
      
      const { error: videosUpdateError } = await supabase
        .from('videos')
        .update(videoUpdates)
        .eq('task_id', projectId);
      
      if (videosUpdateError) {
        console.error('Error updating videos:', videosUpdateError);
      }
    },
    onSuccess: () => {
      toast.success('Projet mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['pm-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pm-videos'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du projet');
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProjectMutation.mutate();
  };

  const handleVideoAssignmentChange = (videoId: string, editorId: string | null) => {
    setVideoAssignments(prev => ({
      ...prev,
      [videoId]: editorId === 'unassigned' ? null : editorId,
    }));
  };

  const handleAddNewVideo = () => {
    setNewVideosCount(prev => prev + 1);
    setNewVideoAssignments(prev => [...prev, null]);
  };

  const handleRemoveNewVideo = (index: number) => {
    setNewVideosCount(prev => prev - 1);
    setNewVideoAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewVideoAssignmentChange = (index: number, editorId: string | null) => {
    setNewVideoAssignments(prev => {
      const updated = [...prev];
      updated[index] = editorId === 'unassigned' ? null : editorId;
      return updated;
    });
  };

  const handleToggleDeleteVideo = (videoId: string) => {
    setVideosToDelete(prev => {
      const updated = new Set(prev);
      if (updated.has(videoId)) {
        updated.delete(videoId);
      } else {
        updated.add(videoId);
      }
      return updated;
    });
  };

  // Count remaining videos after deletions
  const remainingVideosCount = videos.filter(v => !videosToDelete.has(v.id)).length + newVideosCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Modifier le projet
          </DialogTitle>
          <DialogDescription>
            Modifiez les détails du projet et réassignez les vidéos aux éditeurs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-6 py-4">
              {/* Project Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre du projet</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Titre du projet"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select
                    value={formData.client_user_id || '_manual'}
                    onValueChange={(v) => {
                      if (v === '_manual') {
                        setFormData(prev => ({ ...prev, client_user_id: '', client_name: '' }));
                      } else {
                        const client = clients.find(c => c.user_id === v);
                        setFormData(prev => ({ 
                          ...prev, 
                          client_user_id: v, 
                          client_name: client?.company_name || '' 
                        }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_manual">✏️ Saisie manuelle</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.user_id} value={client.user_id}>
                          {client.company_name}{client.contact_name ? ` — ${client.contact_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formData.client_user_id && (
                    <Input
                      value={formData.client_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
                      placeholder="Nom du client"
                      className="mt-2"
                    />
                  )}
                  {/* Client Identity Colors */}
                  {formData.client_user_id && (() => {
                    const cl = clients.find(c => c.user_id === formData.client_user_id);
                    const colors = [cl?.primary_color, cl?.secondary_color, cl?.accent_color].filter(Boolean);
                    return colors.length > 0 ? (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Identité :</span>
                        {colors.map((color, i) => (
                          <div key={i} className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: color! }} />
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label>Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.deadline && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.deadline 
                        ? format(formData.deadline, 'PPP', { locale: fr }) 
                        : 'Sélectionner une date'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.deadline || undefined}
                      onSelect={(date) => setFormData(prev => ({ ...prev, deadline: date || null }))}
                      initialFocus
                      locale={fr}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Instructions pour les éditeurs..."
                  rows={3}
                />
              </div>

              {/* Source Files Link */}
              <div className="space-y-2">
                <Label htmlFor="sourceFilesLink">Lien fichiers source</Label>
                <Input
                  id="sourceFilesLink"
                  type="url"
                  value={formData.sourceFilesLink}
                  onChange={(e) => setFormData(prev => ({ ...prev, sourceFilesLink: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                />
              </div>


              {/* Video Assignments */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Assignation des vidéos</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {remainingVideosCount} vidéo{remainingVideosCount > 1 ? 's' : ''}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddNewVideo}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                </div>

                {editorsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="max-h-[350px] overflow-y-auto rounded-lg border">
                    <div className="space-y-3 p-4">
                    {/* Existing videos */}
                    {videos.map((video, index) => {
                      const isMarkedForDeletion = videosToDelete.has(video.id);
                      return (
                        <div
                          key={video.id}
                          className={cn(
                            "flex items-center gap-4 py-2 border-b last:border-0",
                            isMarkedForDeletion && "opacity-50 bg-destructive/5"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-muted-foreground">
                                #{index + 1}
                              </span>
                              <span className={cn(
                                "text-sm font-medium truncate",
                                isMarkedForDeletion && "line-through text-muted-foreground"
                              )}>
                                {video.title}
                              </span>
                              {isMarkedForDeletion && (
                                <Badge variant="destructive" className="text-[10px] h-4">
                                  Supprimer
                                </Badge>
                              )}
                            </div>
                          </div>
                          {!isMarkedForDeletion && (
                            <Select
                              value={videoAssignments[video.id] || 'unassigned'}
                              onValueChange={(value) => handleVideoAssignmentChange(video.id, value)}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Assigner un éditeur" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">
                                  <span className="text-muted-foreground">Non assigné</span>
                                </SelectItem>
                                {editors.map((editor) => (
                                  <SelectItem key={editor.id} value={editor.id}>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-5 w-5">
                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                          {editor.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span>{editor.name}</span>
                                      <span className="text-muted-foreground text-xs">({editor.email})</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            type="button"
                            variant={isMarkedForDeletion ? "outline" : "ghost"}
                            size="icon"
                            className={cn(
                              "h-8 w-8",
                              isMarkedForDeletion 
                                ? "text-primary hover:text-primary hover:bg-primary/10" 
                                : "text-destructive hover:text-destructive hover:bg-destructive/10"
                            )}
                            onClick={() => handleToggleDeleteVideo(video.id)}
                          >
                            {isMarkedForDeletion ? (
                              <Plus className="h-4 w-4" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
                    
                    {/* New videos to add */}
                    {Array.from({ length: newVideosCount }).map((_, index) => (
                      <div
                        key={`new-${index}`}
                        className="flex items-center gap-4 py-2 border-b last:border-0 bg-primary/5 -mx-4 px-4 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-primary">
                              #{videos.length + index + 1}
                            </span>
                            <span className="text-sm font-medium truncate text-primary">
                              Vidéo {videos.length + index + 1}
                            </span>
                            <Badge variant="secondary" className="text-[10px] h-4">
                              Nouvelle
                            </Badge>
                          </div>
                        </div>
                        <Select
                          value={newVideoAssignments[index] || 'unassigned'}
                          onValueChange={(value) => handleNewVideoAssignmentChange(index, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Assigner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">
                              <span className="text-muted-foreground">Non assigné</span>
                            </SelectItem>
                            {editors.map((editor) => (
                              <SelectItem key={editor.id} value={editor.id}>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-5 w-5">
                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                      {editor.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{editor.name}</span>
                                  <span className="text-muted-foreground text-xs">({editor.email})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveNewVideo(index)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={updateProjectMutation.isPending || !formData.title}
            >
              {updateProjectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}