import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { FileText, CheckCircle, Clock, Send, Plus, Eye, XCircle, ArrowLeft, Trash2, Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ContractContent } from './ContractContent';

const PACKS: Record<string, { label: string; price: number }> = {
  '8_videos': { label: '💼 Pack 8 Vidéos', price: 5500 },
  '12_videos': { label: '💼 Pack 12 Vidéos', price: 6700 },
  '16_videos': { label: '💼 Pack 16 Vidéos', price: 8600 },
  'custom': { label: '⚡ Pack Personnalisé', price: 0 },
};

const DURATIONS = [4, 8, 12];

interface Props {
  clientUserId: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientActivity?: string;
  monthlyPrice?: number;
  contractDurationMonths?: number;
  videosPerMonth?: number;
}

export function AdminContractSection({
  clientUserId, clientName, clientEmail, clientPhone, clientActivity,
  monthlyPrice, contractDurationMonths, videosPerMonth,
}: Props) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState(false);
  const [viewingContract, setViewingContract] = useState<any>(null);
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [packType, setPackType] = useState('custom');
  const [packPrice, setPackPrice] = useState(String(monthlyPrice || 0));
  const [duration, setDuration] = useState(contractDurationMonths || 4);

  const { data: contracts = [] } = useQuery({
    queryKey: ['admin-contracts', clientUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_contracts')
        .select('*')
        .eq('client_user_id', clientUserId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientUserId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const p = parseFloat(packPrice) || 0;
      const total = p * duration;
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + duration);

      const { error } = await supabase.from('client_contracts').insert({
        client_user_id: clientUserId,
        pack_type: packType,
        pack_price: p,
        duration_months: duration,
        total_amount: total,
        client_name: clientName || '',
        client_email: clientEmail || '',
        client_phone: clientPhone || '',
        client_activity: clientActivity || '',
        status: 'pending_signature',
        contract_start_date: now.toISOString().split('T')[0],
        contract_end_date: endDate.toISOString().split('T')[0],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contrat envoyé au client pour signature ✅');
      queryClient.invalidateQueries({ queryKey: ['admin-contracts', clientUserId] });
      queryClient.invalidateQueries({ queryKey: ['client-contracts'] });
      setShowCreate(false);
      setStep('form');
    },
    onError: () => toast.error('Erreur lors de la création du contrat'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase.from('client_contracts').delete().eq('id', contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contrat supprimé ✅');
      queryClient.invalidateQueries({ queryKey: ['admin-contracts', clientUserId] });
      queryClient.invalidateQueries({ queryKey: ['client-contracts'] });
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  const price = parseFloat(packPrice) || 0;
  const totalAmount = price * duration;

  const resetForm = () => {
    setPackType('custom');
    setPackPrice(String(monthlyPrice || 0));
    setDuration(contractDurationMonths || 4);
    setStep('form');
  };

  const handlePackChange = (val: string) => {
    setPackType(val);
    const pack = PACKS[val];
    if (pack && pack.price > 0) {
      setPackPrice(String(pack.price));
    }
  };

  const packLabel = PACKS[packType]?.label || packType;

  const handleDownloadPDF = async (contract: any) => {
    setIsGeneratingPDF(true);
    setViewingContract(contract);
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      const element = pdfContainerRef.current;
      if (!element) throw new Error('Container not found');
      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
        width: element.scrollWidth, height: element.scrollHeight, windowWidth: 800,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft) + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }
      const name = contract.client_full_name || contract.client_name || 'client';
      pdf.save(`contrat-4media-${name.replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF téléchargé ✅');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const contractViewProps = (c: any) => ({
    packLabel: PACKS[c.pack_type]?.label || c.pack_type,
    packPrice: Number(c.pack_price),
    durationMonths: c.duration_months,
    totalAmount: Number(c.total_amount),
    clientName: c.client_name,
    clientEmail: c.client_email,
    clientPhone: c.client_phone,
    clientActivity: c.client_activity,
    signedAt: c.signed_at,
    clientFullName: c.client_full_name,
    clientAddress: c.client_address,
    clientCity: c.client_city,
    clientLegalStatus: c.client_legal_status,
    clientCin: c.client_cin,
    clientRaisonSociale: c.client_raison_sociale,
    clientIce: c.client_ice,
    clientSiegeAddress: c.client_siege_address,
    clientRepresentantLegal: c.client_representant_legal,
    signingIp: c.signing_ip,
    signatureData: c.signature_data,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-amber-500" />
          Contrat
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => { resetForm(); setShowCreate(true); }}
        >
          <Plus className="h-3 w-3" />
          Créer & Envoyer
        </Button>
      </div>

      {/* Status summary */}
      {contracts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun contrat</p>
      ) : (
        <div className="space-y-1.5">
          {contracts.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
              <div className="space-y-0.5">
                <p className="font-medium">
                  {Number(c.pack_price).toLocaleString()} DH/mois × {c.duration_months} mois
                </p>
                
              </div>
              <div className="flex items-center gap-2">
                {c.status === 'signed' ? (
                  <Badge className="bg-green-500/15 text-green-600 border-green-500/30 text-[10px]">
                    <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> Signé
                  </Badge>
                ) : c.status === 'pending_signature' ? (
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                    <Clock className="h-2.5 w-2.5 mr-0.5" /> En attente
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    <XCircle className="h-2.5 w-2.5 mr-0.5" /> {c.status}
                  </Badge>
                )}
                <button
                  onClick={() => { setViewingContract(c); setShowView(true); }}
                  className="hover:text-foreground text-muted-foreground"
                >
                  <Eye className="h-3 w-3" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="hover:text-destructive text-muted-foreground">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce contrat ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Le contrat sera définitivement supprimé.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMutation.mutate(c.id)}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Contract Dialog - 2 steps: form then preview */}
      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) setStep('form'); }}>
        <DialogContent className={step === 'preview' ? "max-w-3xl max-h-[90vh] overflow-y-auto" : "max-w-lg"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === 'preview' ? (
                <>
                  <Eye className="h-5 w-5 text-primary" />
                  Aperçu du contrat – {clientName}
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 text-primary" />
                  Envoyer un contrat à {clientName}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {step === 'preview'
                ? 'Vérifiez le contrat avant de l\'envoyer au client'
                : 'Sélectionnez le pack et le prix, puis prévisualisez le contrat'}
            </DialogDescription>
          </DialogHeader>

          {step === 'form' ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Pack</Label>
                <Select value={packType} onValueChange={handlePackChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PACKS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label} {v.price > 0 ? `– ${v.price.toLocaleString()} DH` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prix mensuel (DH)</Label>
                <Input
                  type="number"
                  value={packPrice}
                  onChange={(e) => setPackPrice(e.target.value)}
                  placeholder="Ex: 5500"
                />
              </div>

              <div className="space-y-2">
                <Label>Durée d'engagement</Label>
                <Select value={String(duration)} onValueChange={v => setDuration(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map(d => (
                      <SelectItem key={d} value={String(d)}>{d} mois</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {price > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Montant total</p>
                        <p className="text-2xl font-bold">{totalAmount.toLocaleString()} DH</p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>{price.toLocaleString()} DH × {duration} mois</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                className="w-full gap-2"
                disabled={price <= 0}
                onClick={() => setStep('preview')}
              >
                <Eye className="h-4 w-4" />
                Voir le contrat avant d'envoyer
              </Button>
            </div>
          ) : (
            <>
              <ContractContent
                packLabel={packLabel}
                packPrice={price}
                durationMonths={duration}
                totalAmount={totalAmount}
                clientName={clientName}
                clientEmail={clientEmail}
                clientPhone={clientPhone}
                clientActivity={clientActivity}
              />
              <div className="flex gap-2 pt-3 border-t">
                <Button variant="outline" className="gap-1.5" onClick={() => setStep('form')}>
                  <ArrowLeft className="h-4 w-4" />
                  Modifier
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  <Send className="h-4 w-4" />
                  {createMutation.isPending ? 'Envoi...' : 'Confirmer & Envoyer au client'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Détails du contrat
            </DialogTitle>
            <DialogDescription>
              {viewingContract?.status === 'pending_signature' ? 'En attente de signature du client' : 'Contrat signé'}
            </DialogDescription>
          </DialogHeader>
          {viewingContract && (
            <div className="pr-2">
              <ContractContent {...contractViewProps(viewingContract)} />
              {viewingContract.signature_data && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Signature :</p>
                  <img src={viewingContract.signature_data} alt="Signature" className="max-h-20 rounded" />
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowView(false)}>Fermer</Button>
            {viewingContract && (
              <Button className="gap-1.5" onClick={() => handleDownloadPDF(viewingContract)} disabled={isGeneratingPDF}>
                <Download className="h-4 w-4" /> {isGeneratingPDF ? 'Génération...' : 'Télécharger PDF'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden container for PDF generation */}
      <div 
        style={{ position: 'fixed', left: '-9999px', top: 0, width: '800px', background: '#fff', color: '#000', padding: '40px' }}
        ref={pdfContainerRef}
      >
        {viewingContract && (
          <div>
            <ContractContent 
              {...contractViewProps(viewingContract)} 
              termsAccepted={viewingContract.status === 'signed'}
            />
            {viewingContract.signature_data && (
              <div style={{ marginTop: '16px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>Signature électronique du client :</p>
                <img src={viewingContract.signature_data} alt="Signature" style={{ maxHeight: '80px' }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
