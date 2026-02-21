import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Search, Building2, Mail, Phone, MoreHorizontal, Copy, Check,
  Wallet, TrendingUp, AlertTriangle, Globe, ChevronDown, ChevronUp,
  CalendarDays, Clock, Star, CreditCard, BarChart3, Users, Zap, FileText
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClients } from '@/hooks/useClients';
import { CreateClientModal } from '@/components/pm/CreateClientModal';
import { ClientDetailModal } from '@/components/pm/ClientDetailModal';
import { EditClientModal } from '@/components/pm/EditClientModal';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInMonths, differenceInDays, format, startOfMonth, endOfMonth, isBefore, isAfter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { MonthSelector } from '@/components/editor/MonthSelector';
import { PaymentCollectionBanner } from '@/components/clients/PaymentCollectionBanner';
import { AdminContractSection } from '@/components/contract/AdminContractSection';

const subscriptionLabels: Record<string, string> = {
  starter: 'Starter',
  growth: 'Growth',
  premium: 'Premium',
};

const subscriptionColors: Record<string, string> = {
  starter: 'bg-muted text-muted-foreground',
  growth: 'bg-primary/15 text-primary border-primary/20',
  premium: 'bg-accent/15 text-accent-foreground border-accent/20',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copié !');
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded-md hover:bg-muted transition-colors">
      {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
}

function getCollaborationDuration(createdAt: string) {
  const start = new Date(createdAt);
  const now = new Date();
  const months = differenceInMonths(now, start);
  const days = differenceInDays(now, start);
  if (months < 1) return `${days} jour${days > 1 ? 's' : ''}`;
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years} an${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} mois` : ''}`;
}

function getClientStatus(client: any) {
  if (client.account_status === 'pending') return { label: 'En attente', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20' };
  if (client.account_status === 'blocked') return { label: 'Suspendu', color: 'bg-destructive/15 text-destructive border-destructive/20' };
  const remaining = (Number(client.total_contract) || 0) - (Number(client.advance_received) || 0);
  if (remaining > 0 && (Number(client.total_contract) || 0) > 0) return { label: 'Impayé', color: 'bg-destructive/15 text-destructive border-destructive/20' };
  return { label: 'Actif', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' };
}

function EditableAmount({ label, value, clientId, field, onSaved }: { label: string; value: number; clientId: string; field: 'total_contract' | 'advance_received'; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(value));
  const [saving, setSaving] = useState(false);

    const handleSave = async () => {
    setSaving(true);
    const numVal = parseFloat(inputVal) || 0;
    // When updating total_contract, also sync monthly_price so it appears in client row & client dashboard
    const updateData: Record<string, number> = { [field]: numVal };
    if (field === 'total_contract') {
      updateData.monthly_price = numVal;
    }
    const { error } = await supabase
      .from('client_profiles')
      .update(updateData)
      .eq('id', clientId);
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success('Montant mis à jour');
      onSaved();
    }
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="h-8 w-28 text-sm font-bold"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          />
          <span className="text-xs text-muted-foreground">DH</span>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSave} disabled={saving}>
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={(e) => { e.stopPropagation(); setInputVal(String(value)); setEditing(true); }} className="cursor-pointer group">
      <p className="text-xs text-muted-foreground mb-0.5">{label} <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">✏️</span></p>
      <p className={`text-xl font-bold ${field === 'advance_received' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
        {value.toLocaleString('fr-FR')} DH
      </p>
    </div>
  );
}

export default function Clients() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [detailClient, setDetailClient] = useState<any>(null);
  const [editClient, setEditClient] = useState<any>(null);
  const [disableClient, setDisableClient] = useState<any>(null);
  const [disabling, setDisabling] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const { data: clients = [], isLoading } = useClients();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    return clients.filter((c: any) => {
      // Search filter
      const matchesSearch = c.company_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      
      // Month filter: client is active if created before end of month
      // and (no project_end_date OR project_end_date >= month start)
      const createdAt = new Date(c.created_at);
      if (isAfter(createdAt, monthEnd)) return false;
      if (c.project_end_date) {
        const endDate = new Date(c.project_end_date);
        if (isBefore(endDate, monthStart)) return false;
      }
      return true;
    });
  }, [clients, search, selectedMonth]);

  // Global KPIs
  const globalTotalContract = filtered.reduce((s: number, c: any) => s + (Number(c.total_contract) || 0), 0);
  const globalAdvanceReceived = filtered.reduce((s: number, c: any) => s + (Number(c.advance_received) || 0), 0);
  const globalRemaining = globalTotalContract - globalAdvanceReceived;
  const globalMonthlyRevenue = filtered.reduce((s: number, c: any) => s + (Number(c.monthly_price) || 0), 0);

  const handleDisable = async () => {
    if (!disableClient) return;
    setDisabling(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user-completely', {
        body: { user_id: disableClient.user_id, email: disableClient.email },
      });
      if (error) throw error;
      toast.success(`${disableClient.company_name} a été désactivé`);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la désactivation');
    } finally {
      setDisabling(false);
      setDisableClient(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground">CRM & suivi financier</p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="default">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau client
          </Button>
        </div>

        {/* Payment Collection Banner (20th-31st) */}
        <PaymentCollectionBanner clients={clients} />

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-[40px]" />
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total du mois</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{globalTotalContract.toLocaleString('fr-FR')} DH</div>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} client{filtered.length > 1 ? 's' : ''}</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-bl-[40px]" />
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Encaissé</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{globalAdvanceReceived.toLocaleString('fr-FR')} DH</div>
              <Progress value={globalTotalContract > 0 ? (globalAdvanceReceived / globalTotalContract) * 100 : 0} className="h-1 mt-2" />
            </CardContent>
          </Card>

          <Card className={`relative overflow-hidden ${globalRemaining > 0 ? 'border-destructive/30' : ''}`}>
            <div className={`absolute top-0 right-0 w-20 h-20 ${globalRemaining > 0 ? 'bg-destructive/5' : 'bg-muted/30'} rounded-bl-[40px]`} />
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reste à encaisser</CardTitle>
              <AlertTriangle className={`h-4 w-4 ${globalRemaining > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tracking-tight ${globalRemaining > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {globalRemaining.toLocaleString('fr-FR')} DH
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Month Selector */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="relative max-w-sm flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un client..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </div>

        {/* Client Panels */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Aucun client</h3>
            <p className="text-muted-foreground mb-4">{search ? 'Aucun résultat' : 'Créez votre premier client'}</p>
            {!search && <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" />Nouveau client</Button>}
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((client: any) => {
              const totalContract = Number(client.total_contract) || 0;
              const advanceReceived = Number(client.advance_received) || 0;
              const remaining = totalContract - advanceReceived;
              const paymentPercent = totalContract > 0 ? (advanceReceived / totalContract) * 100 : 0;
              const isExpanded = expandedId === client.id;
              const status = getClientStatus(client);
              const duration = getCollaborationDuration(client.created_at);
              const monthlyPrice = Number(client.monthly_price) || 0;
              const contractMonths = Number(client.contract_duration_months) || 1;
              const lifetimeValue = monthlyPrice * contractMonths;

              return (
                <Card
                  key={client.id}
                  className={`overflow-hidden transition-all duration-200 ${isExpanded ? 'shadow-lg ring-1 ring-primary/10' : 'hover:shadow-md'}`}
                >
                  {/* Collapsed row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : client.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-4 p-4 md:p-5">
                      {/* Avatar */}
                      <Avatar className="h-14 w-14 rounded-xl border-2 border-border shadow-sm shrink-0">
                        {client.avatar_url ? (
                          <AvatarImage src={client.avatar_url} alt={client.company_name} className="rounded-xl object-cover" />
                        ) : null}
                        <AvatarFallback className="rounded-xl text-base font-bold" style={{ backgroundColor: `${client.primary_color || 'hsl(var(--primary))'}15`, color: client.primary_color || 'hsl(var(--primary))' }}>
                          {(client.company_name || '').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Identity */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold truncate">{client.company_name}</h3>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${status.color}`}>{status.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          {client.contact_name && <span>{client.contact_name}</span>}
                          {(client.domain_activity || client.industry) && (
                            <>
                              <span>•</span>
                              <span>{client.domain_activity || client.industry}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Quick stats (desktop) */}
                      <div className="hidden md:flex items-center gap-6">
                        <div className="text-right">
                          <Badge className={subscriptionColors[client.subscription_type || 'starter'] || subscriptionColors.starter}>
                            {subscriptionLabels[client.subscription_type || 'starter'] || 'Starter'}
                          </Badge>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-sm font-bold">{monthlyPrice > 0 ? `${monthlyPrice.toLocaleString('fr-FR')} DH` : '—'}</p>
                          <p className="text-[10px] text-muted-foreground">/mois</p>
                        </div>
                        <div className="text-right min-w-[60px]">
                          <p className="text-sm font-semibold text-muted-foreground">{contractMonths} mois</p>
                          <p className="text-[10px] text-muted-foreground">contrat</p>
                        </div>
                        {remaining > 0 ? (
                          <div className="text-right min-w-[90px]">
                            <p className="text-sm font-bold text-destructive">{remaining.toLocaleString('fr-FR')} DH</p>
                            <p className="text-[10px] text-muted-foreground">dû</p>
                          </div>
                        ) : (
                          <div className="text-right min-w-[90px]">
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">À jour</p>
                            <p className="text-[10px] text-muted-foreground">paiement</p>
                          </div>
                        )}
                      </div>

                      {/* Expand icon */}
                      <div className="shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded panel */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <Separator />
                        <div className="p-4 md:p-6 space-y-5 bg-muted/20">
                          {/* Contact Row */}
                          <div className="flex flex-wrap gap-4">
                            {client.email && (
                              <div className="flex items-center gap-2 text-sm bg-background rounded-lg px-3 py-2 border">
                                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{client.email}</span>
                                <CopyButton text={client.email} />
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center gap-2 text-sm bg-background rounded-lg px-3 py-2 border">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{client.phone}</span>
                                <CopyButton text={client.phone} />
                              </div>
                            )}
                            {(client.domain_activity || client.industry) && (
                              <div className="flex items-center gap-2 text-sm bg-background rounded-lg px-3 py-2 border">
                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">{client.domain_activity || client.industry}</span>
                              </div>
                            )}
                          </div>

                          {/* Stats grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-background rounded-lg border p-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-2 mb-1">
                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Durée contrat</span>
                              </div>
                              <Select
                                value={String(client.contract_duration_months || 1)}
                                onValueChange={async (val) => {
                                  await supabase.from('client_profiles').update({ contract_duration_months: parseInt(val) }).eq('id', client.id);
                                  queryClient.invalidateQueries({ queryKey: ['clients'] });
                                  toast.success('Durée mise à jour');
                                }}
                              >
                                <SelectTrigger className="h-8 w-full mt-1 text-sm font-bold">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {[4, 8, 12].map((m) => (
                                    <SelectItem key={m} value={String(m)}>{m} mois</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-[10px] text-muted-foreground mt-1">depuis {format(new Date(client.created_at), 'MMM yyyy', { locale: fr })}</p>
                            </div>
                            <div className="bg-background rounded-lg border p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Zap className="h-3.5 w-3.5 text-primary" />
                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Pack</span>
                              </div>
                              <p className="text-lg font-bold">{subscriptionLabels[client.subscription_type || 'starter']}</p>
                              <p className="text-[10px] text-muted-foreground">{monthlyPrice > 0 ? `${monthlyPrice.toLocaleString('fr-FR')} DH/mois` : 'Non défini'}</p>
                            </div>
                            <div className="bg-background rounded-lg border p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Star className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Lifetime Value</span>
                              </div>
                              <p className="text-lg font-bold">{lifetimeValue.toLocaleString('fr-FR')} DH</p>
                              <p className="text-[10px] text-muted-foreground">{contractMonths} mois × {monthlyPrice.toLocaleString('fr-FR')}</p>
                            </div>
                            <div className="bg-background rounded-lg border p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Livraisons</span>
                              </div>
                              <p className="text-lg font-bold">{client.videos_per_month || 0} <span className="text-xs font-normal text-muted-foreground">vidéos/mois</span></p>
                              {((client.design_posts_per_month || 0) > 0 || (client.design_miniatures_per_month || 0) > 0 || (client.design_logos_per_month || 0) > 0 || (client.design_carousels_per_month || 0) > 0) && (
                                <div className="mt-1.5 border-t border-border/30 pt-1.5">
                                  <p className="text-[10px] text-muted-foreground mb-1">Pack Design</p>
                                  <div className="flex flex-wrap gap-1">
                                    {(client.design_miniatures_per_month || 0) > 0 && (
                                      <span className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5">{client.design_miniatures_per_month}x Miniature</span>
                                    )}
                                    {(client.design_posts_per_month || 0) > 0 && (
                                      <span className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5">{client.design_posts_per_month}x Post</span>
                                    )}
                                    {(client.design_logos_per_month || 0) > 0 && (
                                      <span className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5">{client.design_logos_per_month}x Logo</span>
                                    )}
                                    {(client.design_carousels_per_month || 0) > 0 && (
                                      <span className="text-[10px] bg-muted/50 rounded px-1.5 py-0.5">{client.design_carousels_per_month}x Carrousel</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Financial Block */}
                          <div className="bg-background rounded-xl border p-4 space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                              <CreditCard className="h-4 w-4 text-primary" />
                              <h4 className="text-sm font-semibold">Suivi Financier</h4>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <EditableAmount
                                label="Total du mois"
                                value={totalContract}
                                clientId={client.id}
                                field="total_contract"
                                onSaved={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
                              />
                              <EditableAmount
                                label="Avance reçue"
                                value={advanceReceived}
                                clientId={client.id}
                                field="advance_received"
                                onSaved={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
                              />
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Reste à payer</p>
                                <p className={`text-xl font-bold ${remaining > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                  {remaining.toLocaleString('fr-FR')} DH
                                </p>
                              </div>
                            </div>

                            <div className="pt-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>Progression paiement</span>
                                <span className="font-semibold">{Math.round(paymentPercent)}%</span>
                              </div>
                              <Progress value={paymentPercent} className="h-2" />
                            </div>
                          </div>

                          {/* Contract Section */}
                          <AdminContractSection
                            clientUserId={client.user_id}
                            clientName={client.contact_name || client.company_name}
                            clientEmail={client.email}
                            clientPhone={client.phone}
                            clientActivity={client.domain_activity || client.industry}
                            monthlyPrice={monthlyPrice}
                            contractDurationMonths={contractMonths}
                            videosPerMonth={client.videos_per_month}
                          />

                          {/* Color palette + Actions */}
                          <div className="flex items-center justify-between">
                            {client.primary_color && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground mr-1">Charte :</span>
                                <div className="h-5 w-5 rounded-full border shadow-sm" style={{ backgroundColor: client.primary_color }} />
                                <div className="h-5 w-5 rounded-full border shadow-sm" style={{ backgroundColor: client.secondary_color || '#0f172a' }} />
                                <div className="h-5 w-5 rounded-full border shadow-sm" style={{ backgroundColor: client.accent_color || '#f59e0b' }} />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setDetailClient(client); }}>
                                Voir détails
                              </Button>
                              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setEditClient(client); }}>
                                Modifier
                              </Button>
                              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/projects?client=${encodeURIComponent(client.company_name)}`); }}>
                                Projets
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem className="text-destructive" onClick={() => setDisableClient(client)}>Désactiver</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateClientModal open={showCreate} onOpenChange={setShowCreate} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['clients'] })} />
      <ClientDetailModal open={!!detailClient} onOpenChange={() => setDetailClient(null)} client={detailClient} />
      <EditClientModal open={!!editClient} onOpenChange={() => setEditClient(null)} client={editClient} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['clients'] })} />

      <AlertDialog open={!!disableClient} onOpenChange={() => setDisableClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver {disableClient?.company_name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le compte de ce client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabling}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisable} disabled={disabling} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {disabling ? 'Désactivation...' : 'Désactiver'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
