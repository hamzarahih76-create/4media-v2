import { useState, useEffect, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Loader2, Users, Shuffle, Settings2, Link, Upload, PenTool, ExternalLink, Folder, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useActiveEditors, useActiveCopywriters } from '@/hooks/useTeamMembers';
import { useClients } from '@/hooks/useClients';
import { useQuery } from '@tanstack/react-query';

interface Editor {
  id: string;
  name: string;
  email: string;
}

interface EditorAllocation {
  editorId: string;
  videoCount: number;
}

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectModal({ open, onOpenChange }: CreateProjectModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: clients = [] } = useClients();

  const [formData, setFormData] = useState({
    title: '',
    clientName: '',
    clientUserId: '' as string,
    clientType: 'b2b' as 'b2b' | 'b2c' | 'international',
    videoCount: 1,
    description: '',
    deadline: undefined as Date | undefined,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    videoInstructions: '',
    durationMinutes: 300,
    copywriterId: '' as string,
  });

  const [selectedEditors, setSelectedEditors] = useState<string[]>([]);
  const [distributionMode, setDistributionMode] = useState<'auto' | 'manual'>('auto');
  const [manualAllocations, setManualAllocations] = useState<EditorAllocation[]>([]);

  // New rush creation state
  const [newRushes, setNewRushes] = useState<{ id: string; title: string; link: string; linkType: string; editorId: string }[]>([]);
  const [showAddRush, setShowAddRush] = useState(false);

  // Fetch ONLY ACTIVE editors from team_members table
  const { data: activeEditors = [], isLoading: editorsLoading } = useActiveEditors();
  const { data: activeCopywriters = [] } = useActiveCopywriters();

  // Fetch rushes for the selected client
  const { data: clientRushes = [] } = useQuery({
    queryKey: ['client-rushes', formData.clientUserId],
    queryFn: async () => {
      if (!formData.clientUserId) return [];
      const { data, error } = await supabase
        .from('client_rushes')
        .select('*')
        .eq('client_user_id', formData.clientUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.clientUserId,
  });

  // Transform team_members to Editor format for UI
  // IMPORTANT: Use user_id (not id) because videos.assigned_to references auth.users(id)
  const editors: Editor[] = activeEditors
    .filter(member => member.user_id) // Only editors with a linked user account
    .map(member => ({
      id: member.user_id!, // Use user_id for assignment
      name: member.full_name || member.email.split('@')[0],
      email: member.email,
    }));

  // Update manual allocations when selected editors or video count changes
  useEffect(() => {
    if (distributionMode === 'manual' && selectedEditors.length > 0) {
      const basePerEditor = Math.floor(formData.videoCount / selectedEditors.length);
      const remainder = formData.videoCount % selectedEditors.length;
      
      setManualAllocations(
        selectedEditors.map((editorId, index) => ({
          editorId,
          videoCount: basePerEditor + (index < remainder ? 1 : 0),
        }))
      );
    }
  }, [selectedEditors, formData.videoCount, distributionMode]);

  const toggleEditor = (editorId: string) => {
    setSelectedEditors(prev => 
      prev.includes(editorId) 
        ? prev.filter(id => id !== editorId)
        : [...prev, editorId]
    );
  };

  const updateManualAllocation = (editorId: string, count: number) => {
    setManualAllocations(prev =>
      prev.map(a => a.editorId === editorId ? { ...a, videoCount: count } : a)
    );
  };

  const getTotalAllocated = () => {
    return manualAllocations.reduce((sum, a) => sum + a.videoCount, 0);
  };

  const calculateDistribution = (): EditorAllocation[] => {
    if (selectedEditors.length === 0) return [];
    
    if (distributionMode === 'manual') {
      return manualAllocations;
    }
    
    // Auto distribution: split evenly
    const basePerEditor = Math.floor(formData.videoCount / selectedEditors.length);
    const remainder = formData.videoCount % selectedEditors.length;
    
    return selectedEditors.map((editorId, index) => ({
      editorId,
      videoCount: basePerEditor + (index < remainder ? 1 : 0),
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      clientName: '',
      clientUserId: '',
      clientType: 'b2b',
      videoCount: 1,
      description: '',
      deadline: undefined,
      priority: 'medium',
      videoInstructions: '',
      durationMinutes: 300,
      copywriterId: '',
    });
    setSelectedEditors([]);
    setDistributionMode('auto');
    setManualAllocations([]);
    setNewRushes([]);
    setShowAddRush(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate title from client name + month/year
    const now = new Date();
    const monthYear = format(now, 'MMMM yyyy', { locale: fr });
    const autoTitle = formData.clientName 
      ? `${formData.clientName} — ${monthYear}` 
      : `Projet ${monthYear}`;
    
    if (formData.videoCount < 1) {
      toast.error('Le nombre de vidéos doit être au moins 1');
      return;
    }

    if (selectedEditors.length === 0) {
      toast.error('Sélectionnez au moins un éditeur');
      return;
    }

    if (distributionMode === 'manual' && getTotalAllocated() !== formData.videoCount) {
      toast.error(`Le total alloué (${getTotalAllocated()}) doit correspondre au nombre de vidéos (${formData.videoCount})`);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create the task (project)
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          title: autoTitle,
          description: formData.description.trim() || null,
          client_name: formData.clientName.trim() || null,
          client_user_id: formData.clientUserId || null,
          client_type: formData.clientType,
          video_count: formData.videoCount,
          videos_completed: 0,
          deadline: formData.deadline?.toISOString() || null,
          priority: formData.priority,
          status: 'active',
          created_by: user?.id,
          copywriter_id: formData.copywriterId || null,
          
          editor_instructions: formData.videoInstructions.trim() || null,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // 2. Generate videos with editor assignments based on distribution
      const distribution = calculateDistribution();
      const videosToCreate: {
        task_id: string;
        title: string;
        description: string | null;
        status: string;
        deadline: string | null;
        assigned_to: string;
        allowed_duration_minutes: number;
      }[] = [];
      
      // Instructions for each video (stored on task level too)
      const fullDescription = formData.videoInstructions.trim() || null;

      let videoIndex = 1;
      for (const allocation of distribution) {
        for (let i = 0; i < allocation.videoCount; i++) {
            videosToCreate.push({
              task_id: task.id,
              title: `Vidéo ${videoIndex}`,
              description: fullDescription,
              status: 'new',
              deadline: formData.deadline?.toISOString() || null,
              assigned_to: allocation.editorId,
              allowed_duration_minutes: formData.durationMinutes,
            });
          videoIndex++;
        }
      }

      const { data: createdVideos, error: videosError } = await supabase
        .from('videos')
        .insert(videosToCreate)
        .select('id, assigned_to, title');

      if (videosError) throw videosError;

      // Save new rushes if any
      if (newRushes.length > 0 && formData.clientUserId) {
        const rushInserts = newRushes
          .filter(r => r.title.trim() && r.link.trim())
          .map(r => ({
            client_user_id: formData.clientUserId,
            title: r.title.trim(),
            external_link: r.link.trim(),
            link_type: r.linkType,
            created_by: user?.id,
            editor_id: r.editorId || null,
          }));
        if (rushInserts.length > 0) {
          await supabase.from('client_rushes').insert(rushInserts);
          queryClient.invalidateQueries({ queryKey: ['client-rushes'] });
        }
      }
      // Create notifications and send emails for each created video
      for (const video of createdVideos || []) {
        if (!video.assigned_to) continue;
        
        try {
          const { data: notifId } = await supabase.rpc('create_notification', {
            p_user_id: video.assigned_to,
            p_title: 'Nouvelle vidéo assignée',
            p_message: `${formData.title} • ${formData.clientName || 'Client'} - La vidéo "${video.title}" vous a été assignée.`,
            p_type: 'video_assigned',
            p_link: '/editor',
            p_metadata: {
              task_id: task.id,
              video_id: video.id,
              project_name: formData.title,
              client_name: formData.clientName || 'Client',
              video_title: video.title,
              requires_email: true,
            },
          });

          // Send email for this notification
          if (notifId) {
            await supabase.functions.invoke('send-notification-email', {
              body: { notification_id: notifId },
            });
          }
        } catch (emailError) {
          console.error('Failed to send assignment notification/email:', emailError);
          // Don't fail the whole operation if email fails
        }
      }

      // Format success message with editor distribution
      const editorSummary = distribution.map(d => {
        const editor = editors.find(e => e.id === d.editorId);
        return `${editor?.name || 'Editor'}: ${d.videoCount}`;
      }).join(', ');

      toast.success(`Projet créé avec ${formData.videoCount} vidéo(s)! Distribution: ${editorSummary}`);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['pm-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['pm-videos'] });
      queryClient.invalidateQueries({ queryKey: ['pm-editor-stats'] });
      
      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Erreur lors de la création du projet');
    } finally {
      setIsLoading(false);
    }
  };

  const getEditorName = (editorId: string) => {
    return editors.find(e => e.id === editorId)?.name || 'Editor';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau Projet</DialogTitle>
          <DialogDescription>
            Créez un projet client et assignez les vidéos aux éditeurs
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Client Selection */}
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={formData.clientUserId || '_manual'}
              onValueChange={(v) => {
                if (v === '_manual') {
                  setFormData({ ...formData, clientUserId: '', clientName: '' });
                } else {
                  const client = clients.find(c => c.user_id === v);
                  setFormData({ 
                    ...formData, 
                    clientUserId: v, 
                    clientName: client?.company_name || '',
                    // Auto-fill from client profile
                    videoCount: client?.videos_per_month || formData.videoCount,
                    copywriterId: client?.copywriter_id || formData.copywriterId,
                  });
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
            {!formData.clientUserId && (
              <Input
                placeholder="Ex: Acme Corp"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="mt-2"
              />
            )}
            {/* Client Info Auto-populated */}
            {formData.clientUserId && (() => {
              const cl = clients.find(c => c.user_id === formData.clientUserId);
              if (!cl) return null;
              const colors = [cl.primary_color, cl.secondary_color, cl.accent_color].filter(Boolean);
              return (
                <div className="mt-2 p-3 bg-muted/50 border border-border rounded-lg space-y-2 text-xs">
                  {colors.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Identité :</span>
                      {colors.map((color, i) => (
                        <div key={i} className="h-5 w-5 rounded-full border border-border" style={{ backgroundColor: color! }} />
                      ))}
                    </div>
                  )}
                  {cl.videos_per_month && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Vidéos/mois :</span>
                      <span className="font-semibold">{cl.videos_per_month}</span>
                    </div>
                  )}
                  {cl.domain_activity && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Domaine :</span>
                      <span className="font-medium">{cl.domain_activity}</span>
                    </div>
                  )}
                  {cl.tone_style && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Ton :</span>
                      <span className="font-medium">{cl.tone_style}</span>
                    </div>
                  )}
                  {cl.positioning && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Positionnement :</span>
                      <span className="font-medium">{cl.positioning}</span>
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Client Rushes */}
            {formData.clientUserId && (
              <div className="mt-2 p-3 bg-muted/50 border border-border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Folder className="h-4 w-4 text-orange-500" />
                    Rushs du client
                    {(clientRushes.length + newRushes.length) > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{clientRushes.length + newRushes.length}</Badge>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => {
                      setNewRushes(prev => [...prev, { id: crypto.randomUUID(), title: '', link: '', linkType: 'drive', editorId: '' }]);
                      setShowAddRush(true);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Ajouter
                  </Button>
                </div>
                {/* Existing rushes */}
                {clientRushes.length > 0 && (
                  <div className="space-y-1">
                    {clientRushes.map((rush) => (
                      <a
                        key={rush.id}
                        href={rush.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                      >
                        <Folder className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate flex-1">{rush.title}</span>
                        {rush.editor_id && (() => {
                          const ed = editors.find(e => e.id === rush.editor_id);
                          return ed ? <Badge variant="outline" className="text-[9px] px-1 py-0">{ed.name}</Badge> : null;
                        })()}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
                {/* New rushes being added */}
                {newRushes.map((rush) => (
                  <div key={rush.id} className="p-2 border rounded-md bg-background space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Titre du rush"
                        value={rush.title}
                        onChange={(e) => setNewRushes(prev => prev.map(r => r.id === rush.id ? { ...r, title: e.target.value } : r))}
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                        onClick={() => setNewRushes(prev => prev.filter(r => r.id !== rush.id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Lien (Google Drive, WeTransfer...)"
                      value={rush.link}
                      onChange={(e) => setNewRushes(prev => prev.map(r => r.id === rush.id ? { ...r, link: e.target.value } : r))}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                      <Select
                        value={rush.linkType}
                        onValueChange={(v) => setNewRushes(prev => prev.map(r => r.id === rush.id ? { ...r, linkType: v } : r))}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="drive">📁 Google Drive</SelectItem>
                          <SelectItem value="dropbox">📦 Dropbox</SelectItem>
                          <SelectItem value="wetransfer">📤 WeTransfer</SelectItem>
                          <SelectItem value="onedrive">☁️ OneDrive</SelectItem>
                          <SelectItem value="other">🔗 Autre</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={rush.editorId || '_none'}
                        onValueChange={(v) => setNewRushes(prev => prev.map(r => r.id === rush.id ? { ...r, editorId: v === '_none' ? '' : v } : r))}
                      >
                        <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Tagger un éditeur" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">👤 Tous les éditeurs</SelectItem>
                          {editors.map((ed) => (
                            <SelectItem key={ed.id} value={ed.id}>{ed.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                {clientRushes.length === 0 && newRushes.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Aucun rush</p>
                )}
              </div>
            )}
          </div>



          {/* Video Count */}
          <div className="space-y-2">
            <Label htmlFor="videoCount">Nombre de vidéos *</Label>
            <Input
              id="videoCount"
              type="number"
              min={1}
              max={50}
              value={formData.videoCount}
              onChange={(e) => setFormData({ ...formData, videoCount: parseInt(e.target.value) || 1 })}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <Label>Date limite</Label>
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
                  {formData.deadline ? (
                    format(formData.deadline, 'PPP', { locale: fr })
                  ) : (
                    'Sélectionner une date'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.deadline}
                  onSelect={(date) => setFormData({ ...formData, deadline: date })}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Editor Selection */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assignation des éditeurs *
              </Label>
              {selectedEditors.length > 0 && (
                <Badge variant="secondary">
                  {selectedEditors.length} sélectionné{selectedEditors.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            
            <ScrollArea className="h-32 rounded border bg-background p-2">
              {editorsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Chargement...</span>
                </div>
              ) : editors.length > 0 ? (
                <div className="space-y-2">
                  {editors.map((editor) => (
                    <div key={editor.id} className="flex items-center space-x-3">
                      <Checkbox
                        id={editor.id}
                        checked={selectedEditors.includes(editor.id)}
                        onCheckedChange={() => toggleEditor(editor.id)}
                      />
                      <label
                        htmlFor={editor.id}
                        className="flex-1 text-sm font-medium cursor-pointer"
                      >
                        {editor.name}
                        <span className="text-muted-foreground ml-2 text-xs">
                          {editor.email}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4 space-y-1">
                  <p>Aucun éditeur disponible</p>
                  <p className="text-xs">Les utilisateurs inscrits apparaîtront ici</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Distribution Mode */}
          {selectedEditors.length > 1 && (
            <div className="space-y-3 border rounded-lg p-4">
              <Label className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Mode de distribution
              </Label>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={distributionMode === 'auto' ? 'default' : 'outline'}
                  onClick={() => setDistributionMode('auto')}
                  className="flex-1"
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  Auto (égal)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={distributionMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setDistributionMode('manual')}
                  className="flex-1"
                >
                  Manuel
                </Button>
              </div>

              {distributionMode === 'auto' && (
                <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                  {calculateDistribution().map((d, i) => (
                    <div key={d.editorId} className="flex justify-between">
                      <span>{getEditorName(d.editorId)}</span>
                      <span className="font-medium">{d.videoCount} vidéo{d.videoCount > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {distributionMode === 'manual' && (
                <div className="space-y-2">
                  {manualAllocations.map((allocation) => (
                    <div key={allocation.editorId} className="flex items-center gap-3">
                      <span className="flex-1 text-sm">{getEditorName(allocation.editorId)}</span>
                      <Input
                        type="number"
                        min={0}
                        max={formData.videoCount}
                        value={allocation.videoCount}
                        onChange={(e) => updateManualAllocation(allocation.editorId, parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                    </div>
                  ))}
                  <div className={cn(
                    "text-sm text-right font-medium",
                    getTotalAllocated() !== formData.videoCount && "text-destructive"
                  )}>
                    Total: {getTotalAllocated()} / {formData.videoCount}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Single editor info */}
          {selectedEditors.length === 1 && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
              <span className="font-medium">{getEditorName(selectedEditors[0])}</span> recevra les {formData.videoCount} vidéo{formData.videoCount > 1 ? 's' : ''}
            </div>
          )}


          {/* Instructions pour l'éditeur */}
          <div className="space-y-2">
            <Label htmlFor="videoInstructions">Instructions pour l'éditeur</Label>
            <Textarea
              id="videoInstructions"
              placeholder="Consignes spécifiques pour le montage, style attendu, références..."
              value={formData.videoInstructions}
              onChange={(e) => setFormData({ ...formData, videoInstructions: e.target.value })}
              rows={3}
            />
          </div>

          {/* Description du projet */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes internes (PM)</Label>
            <Textarea
              id="description"
              placeholder="Notes privées sur le projet (non visibles par l'éditeur)..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || selectedEditors.length === 0} 
              className="gradient-primary text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Création...
                </>
              ) : (
                `Créer ${formData.videoCount} vidéo${formData.videoCount > 1 ? 's' : ''}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
