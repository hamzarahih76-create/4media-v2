import { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useClientProfile } from '@/hooks/useClientProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { FileText, PenLine, CheckCircle, Download, Eye, Clock, ArrowLeft, Shield, Calendar, CreditCard, Timer } from 'lucide-react';
import { ContractContent } from './ContractContent';
import { SignaturePad } from './SignaturePad';
import { ClientIdentificationForm, type ClientIdentificationData } from './ClientIdentificationForm';

const PACKS: Record<string, string> = {
  '8_videos': '💼 Pack 8 Vidéos',
  '12_videos': '💼 Pack 12 Vidéos',
  '16_videos': '💼 Pack 16 Vidéos',
  'custom': '⚡ Pack Personnalisé',
};

type SignStep = 'form' | 'contract' | 'signature';

export function ClientContractCard() {
  const { user } = useAuth();
  const { profile } = useClientProfile();
  const queryClient = useQueryClient();
  const [showSignContract, setShowSignContract] = useState(false);
  const [showViewContract, setShowViewContract] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signingContract, setSigningContract] = useState<any>(null);
  const [viewingContract, setViewingContract] = useState<any>(null);
  const [signStep, setSignStep] = useState<SignStep>('form');
  const [clientData, setClientData] = useState<ClientIdentificationData | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const primaryColor = profile?.primary_color || '#22c55e';
  const secondaryColor = profile?.secondary_color || '#0f172a';

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['client-contracts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('client_contracts')
        .select('*')
        .eq('client_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getClientIp = async (): Promise<string> => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  const signMutation = useMutation({
    mutationFn: async () => {
      if (!signingContract || !signatureData || !clientData) throw new Error('Missing data');
      const ip = await getClientIp();
      const { error } = await supabase
        .from('client_contracts')
        .update({
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          status: 'signed',
          client_full_name: clientData.fullName,
          client_address: clientData.address,
          client_city: clientData.city,
          client_phone: clientData.phone,
          client_email: clientData.email,
          client_activity: clientData.activity,
          client_name: clientData.fullName,
          client_legal_status: clientData.legalStatus,
          client_cin: clientData.legalStatus === 'personne_physique' ? clientData.cin : null,
          client_raison_sociale: clientData.legalStatus === 'societe' ? clientData.raisonSociale : null,
          client_ice: clientData.legalStatus === 'societe' ? clientData.ice : null,
          client_siege_address: clientData.legalStatus === 'societe' ? clientData.siegeAddress : null,
          client_representant_legal: clientData.legalStatus === 'societe' ? clientData.representantLegal : null,
          terms_accepted: true,
          signing_ip: ip,
        } as any)
        .eq('id', signingContract.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Contrat signé avec succès ! ✅');
      queryClient.invalidateQueries({ queryKey: ['client-contracts'] });
      setShowSignContract(false);
      setSigningContract(null);
      setSignatureData(null);
      setClientData(null);
      setSignStep('form');
    },
    onError: () => toast.error('Erreur lors de la signature'),
  });

  const handleDownloadPDF = async (contract: any) => {
    setIsGeneratingPDF(true);
    setViewingContract(contract);
    
    // Wait for the hidden container to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const element = pdfContainerRef.current;
      if (!element) throw new Error('Container not found');

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: 800,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20; // 10mm margin each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // top margin

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = -(imgHeight - heightLeft) + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      const clientName = contract.client_full_name || contract.client_name || 'client';
      pdf.save(`contrat-4media-${clientName.replace(/\s+/g, '-')}.pdf`);
      toast.success('Contrat PDF téléchargé ✅');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const activeContract = contracts.find((c: any) => c.status === 'signed');
  const pendingContract = contracts.find((c: any) => c.status === 'pending_signature');

  const openSignFlow = (contract: any) => {
    setSigningContract(contract);
    setSignatureData(null);
    setClientData(null);
    setSignStep('form');
    setShowSignContract(true);
  };

  const handleIdentificationSubmit = (data: ClientIdentificationData) => {
    setClientData(data);
    setSignStep('contract');
  };

  const contractProps = (c: any) => ({
    packLabel: PACKS[c.pack_type] || c.pack_type,
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
    <>
      <Card className="border-0 shadow-xl overflow-hidden relative" style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}>
        {/* Decorative accent line */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}cc, ${primaryColor}80)` }} />
        
        <CardHeader className="pb-2 pt-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2.5 text-white">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${primaryColor}15`, border: `1px solid ${primaryColor}30` }}>
                <FileText className="h-5 w-5" style={{ color: primaryColor }} />
              </div>
              Mon Contrat
            </CardTitle>
            <Shield className="h-5 w-5 text-white/20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          {isLoading ? (
            <p className="text-white/50 text-sm">Chargement...</p>
          ) : pendingContract && !activeContract ? (
            <div className="space-y-4">
              <Badge className="px-3 py-1" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}>
                <Clock className="h-3 w-3 mr-1.5" />
                En attente de signature
              </Badge>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-3.5 w-3.5" style={{ color: `${primaryColor}aa` }} />
                    <span className="text-[11px] text-white/50 uppercase tracking-wider">Prix mensuel</span>
                  </div>
                  <p className="text-lg font-bold text-white">{Number(pendingContract.pack_price).toLocaleString()} <span className="text-sm font-normal text-white/60">DH/mois</span></p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="h-3.5 w-3.5" style={{ color: `${primaryColor}aa` }} />
                    <span className="text-[11px] text-white/50 uppercase tracking-wider">Durée</span>
                  </div>
                  <p className="text-lg font-bold text-white">{pendingContract.duration_months} <span className="text-sm font-normal text-white/60">mois</span></p>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-white/20 text-white hover:bg-white/10"
                  onClick={() => { setViewingContract(pendingContract); setShowViewContract(true); }}
                >
                  <Eye className="h-3.5 w-3.5" /> Consulter
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-white font-semibold flex-1 shadow-lg"
                  style={{ backgroundColor: primaryColor, boxShadow: `0 4px 14px ${primaryColor}40` }}
                  onClick={() => openSignFlow(pendingContract)}
                >
                  <PenLine className="h-3.5 w-3.5" /> Signer maintenant
                </Button>
              </div>
            </div>
          ) : activeContract ? (
            <div className="space-y-4">
              <Badge className="px-3 py-1" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}>
                <CheckCircle className="h-3 w-3 mr-1.5" />
                Contrat signé
              </Badge>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-3.5 w-3.5" style={{ color: `${primaryColor}aa` }} />
                    <span className="text-[11px] text-white/50 uppercase tracking-wider">Prix mensuel</span>
                  </div>
                  <p className="text-lg font-bold text-white">{Number(activeContract.pack_price).toLocaleString()} <span className="text-sm font-normal text-white/60">DH/mois</span></p>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="h-3.5 w-3.5" style={{ color: `${primaryColor}aa` }} />
                    <span className="text-[11px] text-white/50 uppercase tracking-wider">Durée</span>
                  </div>
                  <p className="text-lg font-bold text-white">{activeContract.duration_months} <span className="text-sm font-normal text-white/60">mois</span></p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-white/40" />
                  <span className="text-[11px] text-white/50 uppercase tracking-wider">Signé le</span>
                </div>
                <p className="text-sm font-semibold text-white">{new Date(activeContract.signed_at).toLocaleDateString('fr-FR')}</p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-white/20 text-white hover:bg-white/10 flex-1"
                  onClick={() => { setViewingContract(activeContract); setShowViewContract(true); }}
                >
                  <Eye className="h-3.5 w-3.5" /> Voir le contrat
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 flex-1"
                  style={{ borderColor: `${primaryColor}30`, color: primaryColor }}
                  onClick={() => handleDownloadPDF(activeContract)}
                  disabled={isGeneratingPDF}
                >
                  <Download className="h-3.5 w-3.5" /> {isGeneratingPDF ? 'Génération...' : 'Télécharger PDF'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="p-3 rounded-full bg-white/5 w-fit mx-auto mb-3">
                <FileText className="h-6 w-6 text-white/30" />
              </div>
              <p className="text-white/50 text-sm">Aucun contrat disponible</p>
              <p className="text-white/30 text-xs mt-1">Votre contrat sera bientôt préparé par l'équipe</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign Contract Dialog - 3 steps: form → contract review → signature */}
      <Dialog open={showSignContract} onOpenChange={(open) => { setShowSignContract(open); if (!open) setSignStep('form'); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5 text-amber-500" />
              {signStep === 'form' && 'Informations obligatoires'}
              {signStep === 'contract' && 'Vérification du contrat'}
              {signStep === 'signature' && 'Signature électronique'}
            </DialogTitle>
            <DialogDescription>
              {signStep === 'form' && 'Veuillez remplir tous les champs obligatoires avant de signer'}
              {signStep === 'contract' && 'Vérifiez le contrat complet puis passez à la signature'}
              {signStep === 'signature' && 'Apposez votre signature électronique'}
            </DialogDescription>
            {/* Step indicator */}
            <div className="flex items-center gap-2 pt-2">
              {['form', 'contract', 'signature'].map((s, i) => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`h-2 w-2 rounded-full ${signStep === s ? 'bg-primary' : i < ['form', 'contract', 'signature'].indexOf(signStep) ? 'bg-green-500' : 'bg-muted'}`} />
                  <span className={`text-[10px] ${signStep === s ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {i === 0 ? 'Identification' : i === 1 ? 'Contrat' : 'Signature'}
                  </span>
                  {i < 2 && <span className="text-muted-foreground mx-1">→</span>}
                </div>
              ))}
            </div>
          </DialogHeader>

          {signingContract && signStep === 'form' && (
            <ClientIdentificationForm
              initialData={{
                fullName: signingContract.client_name || '',
                phone: signingContract.client_phone || '',
                email: signingContract.client_email || '',
                activity: signingContract.client_activity || '',
              }}
              onSubmit={handleIdentificationSubmit}
            />
          )}

          {signingContract && signStep === 'contract' && clientData && (
            <>
              <ContractContent
                {...contractProps(signingContract)}
                clientFullName={clientData.fullName}
                clientEmail={clientData.email}
                clientPhone={clientData.phone}
                clientActivity={clientData.activity}
                clientAddress={clientData.address}
                clientCity={clientData.city}
                clientLegalStatus={clientData.legalStatus}
                clientCin={clientData.cin}
                clientRaisonSociale={clientData.raisonSociale}
                clientIce={clientData.ice}
                clientSiegeAddress={clientData.siegeAddress}
                clientRepresentantLegal={clientData.representantLegal}
                termsAccepted={clientData.termsAccepted}
              />
              <div className="flex gap-2 pt-3 border-t sticky bottom-0 bg-background pb-1">
                <Button variant="outline" className="gap-1.5" onClick={() => setSignStep('form')}>
                  <ArrowLeft className="h-4 w-4" /> Modifier
                </Button>
                <Button className="flex-1 gap-2" onClick={() => setSignStep('signature')}>
                  <PenLine className="h-4 w-4" /> Passer à la signature
                </Button>
              </div>
            </>
          )}

          {signingContract && signStep === 'signature' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-300">⚠️ En signant, vous acceptez les termes du contrat</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  {Number(signingContract.pack_price).toLocaleString()} DH/mois – {signingContract.duration_months} mois – {Number(signingContract.total_amount).toLocaleString()} DH total
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                <p className="font-medium">Récapitulatif client :</p>
                <p>{clientData?.fullName} – {clientData?.email}</p>
                <p>{clientData?.legalStatus === 'societe' ? `Société: ${clientData?.raisonSociale} (ICE: ${clientData?.ice})` : `CIN: ${clientData?.cin}`}</p>
              </div>

              <div>
                <Label className="mb-2 block">Votre signature</Label>
                <SignaturePad onSignatureChange={setSignatureData} />
              </div>

              <p className="text-[11px] text-muted-foreground italic">
                La signature électronique a la même valeur juridique qu'une signature manuscrite conformément à la législation marocaine en vigueur. L'horodatage et l'adresse IP seront enregistrés automatiquement.
              </p>

              <div className="flex gap-2">
                <Button variant="outline" className="gap-1.5" onClick={() => setSignStep('contract')}>
                  <ArrowLeft className="h-4 w-4" /> Retour
                </Button>
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  disabled={!signatureData || signMutation.isPending}
                  onClick={() => signMutation.mutate()}
                >
                  <CheckCircle className="h-4 w-4" />
                  {signMutation.isPending ? 'Signature en cours...' : 'Signer le contrat'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={showViewContract} onOpenChange={setShowViewContract}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrat
            </DialogTitle>
            <DialogDescription>Consulter les détails de votre contrat</DialogDescription>
          </DialogHeader>
          {viewingContract && (
            <div className="pr-2">
              <ContractContent {...contractProps(viewingContract)} />
              {viewingContract.signature_data && (
                <div className="mt-4 p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Signature électronique :</p>
                  <img src={viewingContract.signature_data} alt="Signature" className="max-h-20 rounded" />
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowViewContract(false)}>Fermer</Button>
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
              {...contractProps(viewingContract)} 
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
    </>
  );
}
