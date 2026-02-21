import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Video, Palette, Pencil, Eye, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TeamMemberFinancial, ClientFinancial } from '@/hooks/useFinanceData';
import { ClientProductionDetailModal } from './ClientProductionDetailModal';
import { DesignProductionDetailModal } from './DesignProductionDetailModal';

interface TeamFinanceTableProps {
  members: TeamMemberFinancial[];
  clientFinancials?: ClientFinancial[];
}

export function TeamFinanceTable({ members, clientFinancials = [] }: TeamFinanceTableProps) {
  const [tab, setTab] = useState('editor');
  const [selected, setSelected] = useState<TeamMemberFinancial | null>(null);
  const [editingRate, setEditingRate] = useState<Record<string, string>>({});
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedDesignClientName, setSelectedDesignClientName] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleSaveRate = async (userId: string) => {
    const newRate = Number(editingRate[userId]);
    if (isNaN(newRate) || newRate < 0) return;
    const { error } = await supabase
      .from('team_members')
      .update({ rate_per_video: newRate })
      .eq('user_id', userId);
    if (error) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }
    toast.success('Prix du mois mis à jour');
    setEditingRate(prev => { const n = { ...prev }; delete n[userId]; return n; });
    queryClient.invalidateQueries({ queryKey: ['finance-data'] });
  };

  const editors = members.filter((m) => m.role === 'editor');
  const designers = members.filter((m) => m.role === 'designer');
  const copywriters = members.filter((m) => m.role === 'copywriter');

  const totalEditorPay = editors.reduce((s, m) => s + m.totalEarned, 0);
  const totalDesignerPay = designers.reduce((s, m) => s + m.totalEarned, 0);
  const totalCopywriterPay = copywriters.reduce((s, m) => s + m.totalEarned, 0);

  const renderTable = (list: TeamMemberFinancial[], role: string) => {
    const isEditor = role === 'editor';
    const isDesigner = role === 'designer';
    const isCopywriter = role === 'copywriter';

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            {isEditor && <TableHead>Vidéos livrées</TableHead>}
            {isEditor && <TableHead>Tarif/vidéo</TableHead>}
            {isDesigner && <TableHead>Designs approuvés</TableHead>}
            {isCopywriter && <TableHead>Prix du mois</TableHead>}
            <TableHead>Clients</TableHead>
            <TableHead>Total à payer</TableHead>
            <TableHead className="w-[60px]">Détail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((m) => (
            <TableRow key={m.userId}>
              <TableCell>
                <p className="font-medium text-sm">{m.fullName}</p>
              </TableCell>
              {isEditor && <TableCell className="font-medium">{m.videosDelivered}</TableCell>}
              {isEditor && <TableCell>{m.ratePerVideo.toLocaleString('fr-FR')} DH</TableCell>}
              {isDesigner && <TableCell className="font-medium">{m.designsDelivered}</TableCell>}
              {isCopywriter && (
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      className="h-7 w-24 text-sm"
                      value={editingRate[m.userId] ?? m.ratePerVideo.toString()}
                      onChange={(e) => setEditingRate(prev => ({ ...prev, [m.userId]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRate(m.userId); }}
                    />
                    <span className="text-xs text-muted-foreground">DH</span>
                    {editingRate[m.userId] !== undefined && editingRate[m.userId] !== m.ratePerVideo.toString() && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleSaveRate(m.userId)}>
                        <Check className="h-3 w-3 text-success" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {m.details.map((d) => (
                    <Badge
                      key={d.clientName}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => isDesigner ? setSelectedDesignClientName(d.clientName) : setSelectedClientName(d.clientName)}
                    >
                      {d.count > 0 && <span className="font-bold mr-1">{d.count}</span>}
                      {d.clientName}
                    </Badge>
                  ))}
                  {m.details.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </TableCell>
              <TableCell className="font-bold text-success">
                {m.totalEarned.toLocaleString('fr-FR')} DH
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelected(m)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {list.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                Aucun membre trouvé
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Rémunération équipe
            </CardTitle>
            <div className="flex gap-3 text-sm flex-wrap">
              <span className="text-muted-foreground">
                Éditeurs: <span className="font-bold text-foreground">{totalEditorPay.toLocaleString('fr-FR')} DH</span>
              </span>
              <span className="text-muted-foreground">
                Designers: <span className="font-bold text-foreground">{totalDesignerPay.toLocaleString('fr-FR')} DH</span>
              </span>
              <span className="text-muted-foreground">
                Copywriters: <span className="font-bold text-foreground">{totalCopywriterPay.toLocaleString('fr-FR')} DH</span>
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="editor" className="gap-1.5">
                <Video className="h-3.5 w-3.5" /> Éditeurs ({editors.length})
              </TabsTrigger>
              <TabsTrigger value="designer" className="gap-1.5">
                <Palette className="h-3.5 w-3.5" /> Designers ({designers.length})
              </TabsTrigger>
              <TabsTrigger value="copywriter" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Copywriters ({copywriters.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="editor">{renderTable(editors, 'editor')}</TabsContent>
            <TabsContent value="designer">{renderTable(designers, 'designer')}</TabsContent>
            <TabsContent value="copywriter">{renderTable(copywriters, 'copywriter')}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Member detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selected?.fullName} — Détail financier</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Rôle</p>
                  <p className="font-bold capitalize">{selected.role}</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10">
                  <p className="text-xs text-muted-foreground">Total à payer</p>
                  <p className="font-bold text-success">{selected.totalEarned.toLocaleString('fr-FR')} DH</p>
                </div>
                {selected.role === 'editor' && (
                  <>
                    <div className="p-3 rounded-lg bg-primary/10">
                      <p className="text-xs text-muted-foreground">Vidéos livrées</p>
                      <p className="font-bold">{selected.videosDelivered}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Tarif/vidéo</p>
                      <p className="font-bold">{selected.ratePerVideo.toLocaleString('fr-FR')} DH</p>
                    </div>
                  </>
                )}
                {selected.role === 'designer' && (
                  <div className="p-3 rounded-lg bg-primary/10">
                    <p className="text-xs text-muted-foreground">Designs approuvés</p>
                    <p className="font-bold">{selected.designsDelivered}</p>
                  </div>
                )}
                {selected.role === 'copywriter' && (
                  <>
                    <div className="p-3 rounded-lg bg-primary/10">
                      <p className="text-xs text-muted-foreground">Prix du mois</p>
                      <p className="font-bold">{selected.ratePerVideo.toLocaleString('fr-FR')} DH</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Clients assignés</p>
                      <p className="font-bold">{selected.clients.length}</p>
                    </div>
                  </>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Détail par client</h4>
                {selected.details.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune activité ce mois</p>
                ) : (
                  <div className="space-y-2">
                    {selected.details.map((d) => (
                      <div key={d.clientName} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{d.clientName}</p>
                          <p className="text-xs text-muted-foreground">
                            {selected.role === 'editor' ? `${d.count} vidéo(s)` : selected.role === 'designer' ? `${d.count} design(s)` : `${selected.ratePerVideo.toLocaleString('fr-FR')} ÷ ${selected.clients.length}`}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-success">{d.earned.toLocaleString('fr-FR')} DH</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ClientProductionDetailModal
        clientName={selectedClientName}
        clientFinancials={clientFinancials}
        teamMembers={members}
        open={!!selectedClientName}
        onOpenChange={(open) => { if (!open) setSelectedClientName(null); }}
      />

      <DesignProductionDetailModal
        clientName={selectedDesignClientName}
        clientFinancials={clientFinancials}
        teamMembers={members}
        open={!!selectedDesignClientName}
        onOpenChange={(open) => { if (!open) setSelectedDesignClientName(null); }}
      />
    </>
  );
}
