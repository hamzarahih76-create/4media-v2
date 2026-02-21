import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Link2, 
  FileImage, 
  Loader2, 
  CheckCircle, 
  X,
  ExternalLink,
  Figma,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubmitDesignDelivery } from '@/hooks/useDesignerTasks';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DesignDeliveryUploadProps {
  taskId: string;
  taskDescription?: string | null;
  specificItemLabel?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const linkTypes = [
  { value: 'figma', label: 'Figma', icon: Figma },
  { value: 'drive', label: 'Google Drive', icon: ExternalLink },
  { value: 'dropbox', label: 'Dropbox', icon: ExternalLink },
  { value: 'other', label: 'Autre lien', icon: Link2 },
];

interface LinkEntry {
  id: string;
  url: string;
  linkType: string;
}

interface FileSlot {
  id: string;
  label: string;
  files: File[];
}

interface LinkSlot {
  id: string;
  label: string;
  links: LinkEntry[];
}

interface DesignTypeSection {
  typeLabel: string;
  fileSlots: FileSlot[];
  linkSlots: LinkSlot[];
}

function parseDesignTypes(description?: string | null): string[] {
  if (!description) return [];
  const match = description.match(/^\[(.+?)\]/);
  if (!match) return [];
  return match[1].split('+').map(s => s.trim()).filter(Boolean);
}

function makeSlotLabel(typeLabel: string, index: number): string {
  // Extract base name: "7x Carrousel 3p" -> "Carrousel 3p"
  const nameMatch = typeLabel.match(/^\d+x\s+(.+)$/i);
  const baseName = nameMatch ? nameMatch[1] : typeLabel;
  return `${baseName} ${index}`;
}

export function DesignDeliveryUpload({ taskId, taskDescription, specificItemLabel, onSuccess, onCancel }: DesignDeliveryUploadProps) {
  const { user } = useAuth();
  const { submitDelivery, isSubmitting } = useSubmitDesignDelivery();

  const designTypes = parseDesignTypes(taskDescription);
  const isSingleItem = !!specificItemLabel;
  const hasMultipleSections = !isSingleItem && designTypes.length > 1;

  const [deliveryType, setDeliveryType] = useState<'file' | 'link'>('file');
  
  const [sections, setSections] = useState<DesignTypeSection[]>(() => {
    if (isSingleItem) {
      // Single item mode: one section with one slot labeled with the specific item
      return [{
        typeLabel: specificItemLabel!,
        fileSlots: [{ id: crypto.randomUUID(), label: specificItemLabel!, files: [] }],
        linkSlots: [{ id: crypto.randomUUID(), label: specificItemLabel!, links: [{ id: crypto.randomUUID(), url: '', linkType: 'figma' }] }],
      }];
    }
    if (designTypes.length > 0) {
      return designTypes.map(typeLabel => {
        const qtyMatch = typeLabel.match(/^(\d+)x\s+/i);
        const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
        const fileSlots = Array.from({ length: qty }, (_, i) => ({
          id: crypto.randomUUID(),
          label: makeSlotLabel(typeLabel, i + 1),
          files: [],
        }));
        const linkSlots = Array.from({ length: qty }, (_, i) => ({
          id: crypto.randomUUID(),
          label: makeSlotLabel(typeLabel, i + 1),
          links: [{ id: crypto.randomUUID(), url: '', linkType: 'figma' }],
        }));
        return { typeLabel, fileSlots, linkSlots };
      });
    }
    return [{
      typeLabel: '',
      fileSlots: [{ id: crypto.randomUUID(), label: '', files: [] }],
      linkSlots: [{ id: crypto.randomUUID(), label: '', links: [{ id: crypto.randomUUID(), url: '', linkType: 'figma' }] }],
    }];
  });

  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  // Use a map for file input refs: "sectionIndex-slotIndex"
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addFileSlot = (sectionIndex: number) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIndex) return s;
      const nextNum = s.fileSlots.length + 1;
      return { ...s, fileSlots: [...s.fileSlots, { id: crypto.randomUUID(), label: makeSlotLabel(s.typeLabel, nextNum), files: [] }] };
    }));
  };

  const removeFileSlot = (sectionIndex: number, slotId: string) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIndex || s.fileSlots.length <= 1) return s;
      const newSlots = s.fileSlots.filter(sl => sl.id !== slotId);
      // Re-label
      return { ...s, fileSlots: newSlots.map((sl, idx) => ({ ...sl, label: makeSlotLabel(s.typeLabel, idx + 1) })) };
    }));
  };

  const handleFileSelect = (sectionIndex: number, slotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`${file.name} est trop volumineux (max 50MB)`);
        continue;
      }
      const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.psd', '.ai', '.svg'];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!allowedExtensions.includes(ext)) {
        toast.error(`${file.name} : format non supporté`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSections(prev => prev.map((s, i) => i === sectionIndex
        ? { ...s, fileSlots: s.fileSlots.map(sl => sl.id === slotId ? { ...sl, files: [...sl.files, ...validFiles] } : sl) }
        : s
      ));
    }
    const ref = fileInputRefs.current[`${sectionIndex}-${slotId}`];
    if (ref) ref.value = '';
  };

  const removeFile = (sectionIndex: number, slotId: string, fileIndex: number) => {
    setSections(prev => prev.map((s, i) => i === sectionIndex
      ? { ...s, fileSlots: s.fileSlots.map(sl => sl.id === slotId ? { ...sl, files: sl.files.filter((_, fi) => fi !== fileIndex) } : sl) }
      : s
    ));
  };

  // Link slot management
  const addLinkSlot = (sectionIndex: number) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIndex) return s;
      const nextNum = s.linkSlots.length + 1;
      return { ...s, linkSlots: [...s.linkSlots, { id: crypto.randomUUID(), label: makeSlotLabel(s.typeLabel, nextNum), links: [{ id: crypto.randomUUID(), url: '', linkType: 'figma' }] }] };
    }));
  };

  const removeLinkSlot = (sectionIndex: number, slotId: string) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIndex || s.linkSlots.length <= 1) return s;
      const newSlots = s.linkSlots.filter(sl => sl.id !== slotId);
      return { ...s, linkSlots: newSlots.map((sl, idx) => ({ ...sl, label: makeSlotLabel(s.typeLabel, idx + 1) })) };
    }));
  };

  const addLink = (sectionIndex: number, slotId: string) => {
    setSections(prev => prev.map((s, i) => i === sectionIndex
      ? { ...s, linkSlots: s.linkSlots.map(sl => sl.id === slotId ? { ...sl, links: [...sl.links, { id: crypto.randomUUID(), url: '', linkType: 'figma' }] } : sl) }
      : s
    ));
  };

  const removeLink = (sectionIndex: number, slotId: string, linkId: string) => {
    setSections(prev => prev.map((s, i) => i === sectionIndex
      ? { ...s, linkSlots: s.linkSlots.map(sl => {
          if (sl.id !== slotId || sl.links.length <= 1) return sl;
          return { ...sl, links: sl.links.filter(l => l.id !== linkId) };
        }) }
      : s
    ));
  };

  const updateLink = (sectionIndex: number, slotId: string, linkId: string, field: 'url' | 'linkType', value: string) => {
    setSections(prev => prev.map((s, i) => i === sectionIndex
      ? { ...s, linkSlots: s.linkSlots.map(sl => sl.id === slotId ? { ...sl, links: sl.links.map(l => l.id === linkId ? { ...l, [field]: value } : l) } : sl) }
      : s
    ));
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Vous devez être connecté');
      return;
    }

    try {
      setIsUploading(true);
      let totalCount = 0;

      for (const section of sections) {
        if (deliveryType === 'file') {
          for (const slot of section.fileSlots) {
            if (slot.files.length === 0) continue;

            for (const file of slot.files) {
              const fileExt = file.name.split('.').pop();
              const fileName = `${user.id}/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('design-files')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

              if (uploadError) {
                console.error('Upload error:', uploadError);
                toast.error(`Erreur pour ${file.name}`);
                continue;
              }

              const notePrefix = slot.label ? `[${slot.label}]` : '';
              await submitDelivery({
                taskId,
                deliveryType: 'file',
                filePath: uploadData.path,
                notes: `${notePrefix} ${notes}`.trim() || undefined,
              });
              totalCount++;
            }
          }
        } else {
          for (const slot of section.linkSlots) {
            const validLinks = slot.links.filter(l => l.url.trim());
            if (validLinks.length === 0) continue;

            for (const link of validLinks) {
              try {
                new URL(link.url);
              } catch {
                toast.error(`Lien invalide: ${link.url}`);
                continue;
              }

              const notePrefix = slot.label ? `[${slot.label}]` : '';
              await submitDelivery({
                taskId,
                deliveryType: 'link',
                externalLink: link.url.trim(),
                linkType: link.linkType,
                notes: `${notePrefix} ${notes}`.trim() || undefined,
              });
              totalCount++;
            }
          }
        }
      }

      if (totalCount === 0) {
        toast.error(deliveryType === 'file' ? 'Veuillez sélectionner au moins un fichier' : 'Veuillez entrer au moins un lien');
        return;
      }

      toast.success(`✨ ${totalCount} design${totalCount > 1 ? 's' : ''} livré${totalCount > 1 ? 's' : ''} avec succès !`);
      onSuccess?.();
    } catch (error: any) {
      console.error('Delivery error:', error);
      toast.error(error.message || 'Erreur lors de la livraison');
    } finally {
      setIsUploading(false);
    }
  };

  const totalItems = sections.reduce((acc, s) => {
    if (deliveryType === 'file') {
      return acc + s.fileSlots.reduce((a, sl) => a + sl.files.length, 0);
    }
    return acc + s.linkSlots.reduce((a, sl) => a + sl.links.filter(l => l.url.trim()).length, 0);
  }, 0);
  const isValid = totalItems > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5 text-emerald-500" />
          {specificItemLabel ? `Livrer : ${specificItemLabel}` : 'Livrer les designs'}
        </h3>
        {onCancel && (
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Tabs value={deliveryType} onValueChange={(v) => setDeliveryType(v as 'file' | 'link')}>
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="file" className="gap-2">
            <FileImage className="h-4 w-4" />
            Fichiers
          </TabsTrigger>
          <TabsTrigger value="link" className="gap-2">
            <Link2 className="h-4 w-4" />
            Liens externes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-6 mt-4">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              {hasMultipleSections && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    {section.typeLabel}
                  </Badge>
                </div>
              )}

              {/* File slots */}
              <div className="space-y-4">
              {section.fileSlots.map((slot) => (
                  <div key={slot.id} className="rounded-lg border border-border/60 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{slot.label}</span>
                      <div className="flex items-center gap-1">
                        {slot.files.length > 0 && (
                          <div className="flex items-center gap-1">
                            {slot.files.map((file, fileIndex) => (
                              <span key={fileIndex} className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded px-1.5 py-0.5">
                                <CheckCircle className="h-2.5 w-2.5" />
                                <span className="max-w-[80px] truncate">{file.name}</span>
                                <button onClick={() => removeFile(sectionIndex, slot.id, fileIndex)} className="hover:text-destructive">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        {section.fileSlots.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFileSlot(sectionIndex, slot.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={() => fileInputRefs.current[`${sectionIndex}-${slot.id}`]?.click()}
                      className={cn(
                        "relative border border-dashed rounded-md p-2 text-center cursor-pointer transition-all",
                        "border-border hover:border-emerald-500/30 hover:bg-muted/50"
                      )}
                    >
                      <input
                        ref={el => { fileInputRefs.current[`${sectionIndex}-${slot.id}`] = el; }}
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.psd,.ai,.svg"
                        onChange={(e) => handleFileSelect(sectionIndex, slot.id, e)}
                        className="hidden"
                        multiple
                      />
                      <div className="flex items-center justify-center gap-2">
                        <Plus className="h-3 w-3 text-muted-foreground" />
                        <p className="text-[11px] text-muted-foreground">
                          {slot.files.length > 0 ? 'Ajouter' : 'Fichiers'} · PNG, JPG, PDF, PSD, AI, SVG
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add another slot button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addFileSlot(sectionIndex)}
                className="w-full gap-2 border-dashed"
              >
                <Plus className="h-4 w-4" />
                Ajouter un autre {section.typeLabel ? section.typeLabel.replace(/^\d+x\s+/i, '') : 'design'}
              </Button>

              {hasMultipleSections && sectionIndex < sections.length - 1 && (
                <div className="border-b border-border/50" />
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="link" className="space-y-6 mt-4">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} className="space-y-3">
              {hasMultipleSections && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    {section.typeLabel}
                  </Badge>
                </div>
              )}

              <div className="space-y-4">
                {section.linkSlots.map((slot) => (
                  <div key={slot.id} className="space-y-2 rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{slot.label}</span>
                      {section.linkSlots.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLinkSlot(sectionIndex, slot.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {slot.links.map((link) => (
                        <div key={link.id} className="flex gap-2 items-start">
                          <div className="flex-1 flex gap-2">
                            <Select value={link.linkType} onValueChange={(v) => updateLink(sectionIndex, slot.id, link.id, 'linkType', v)}>
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {linkTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    <span className="flex items-center gap-2">
                                      <type.icon className="h-3.5 w-3.5" />
                                      {type.label}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="https://..."
                              value={link.url}
                              onChange={(e) => updateLink(sectionIndex, slot.id, link.id, 'url', e.target.value)}
                              className="bg-background flex-1"
                            />
                          </div>
                          {slot.links.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => removeLink(sectionIndex, slot.id, link.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addLink(sectionIndex, slot.id)}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter un lien
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addLinkSlot(sectionIndex)}
                className="w-full gap-2 border-dashed"
              >
                <Plus className="h-4 w-4" />
                Ajouter un autre {section.typeLabel ? section.typeLabel.replace(/^\d+x\s+/i, '') : 'design'}
              </Button>

              {hasMultipleSections && sectionIndex < sections.length - 1 && (
                <div className="border-b border-border/50" />
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <div className="space-y-3">
        <Label>Notes (optionnel)</Label>
        <Textarea
          placeholder="Ajoutez des notes pour le PM ou le client..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="bg-background resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Annuler
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting || isUploading}
          className={cn(
            "flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
            "text-white border-0 shadow-lg shadow-emerald-500/25"
          )}
        >
          {isSubmitting || isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Livrer {totalItems > 1 ? `${totalItems} designs` : 'le design'}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
