import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Pencil, Megaphone, CalendarDays, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Expense {
  id: string;
  category: string;
  label: string;
  amount: number;
  notes: string | null;
  month: string;
  expense_type?: string;
  expense_date?: string | null;
}

interface ExpensesSectionProps {
  expenses: Expense[];
  selectedMonth: Date;
  onExpenseChanged: () => void;
}

const fixedCategories = [
  { value: 'salaires', label: 'Salaires', color: 'bg-primary/15 text-primary' },
  { value: 'outils', label: 'Outils & SaaS', color: 'bg-chart-2/15 text-chart-2' },
  { value: 'abonnements', label: 'Abonnements', color: 'bg-chart-3/15 text-chart-3' },
  { value: 'autres', label: 'Autres', color: 'bg-muted text-muted-foreground' },
];

export function ExpensesSection({ expenses, selectedMonth, onExpenseChanged }: ExpensesSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<'ads' | 'daily' | 'fixed'>('fixed');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form fields
  const [category, setCategory] = useState('outils');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  // Separate expenses by type
  const adsExpenses = expenses.filter(e => (e as any).expense_type === 'ads');
  const dailyExpenses = expenses.filter(e => (e as any).expense_type === 'daily');
  const fixedExpenses = expenses.filter(e => !((e as any).expense_type) || (e as any).expense_type === 'fixed');

  const totalAds = adsExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalDaily = dailyExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalFixed = fixedExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalAll = totalAds + totalDaily + totalFixed;

  // Group daily expenses by date
  const dailyByDate = dailyExpenses.reduce((acc, e) => {
    const d = (e as any).expense_date || 'sans-date';
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {} as Record<string, Expense[]>);
  const sortedDailyDates = Object.keys(dailyByDate).sort((a, b) => b.localeCompare(a));

  // Group fixed by category
  const fixedGrouped = fixedCategories.map(cat => ({
    ...cat,
    total: fixedExpenses.filter(e => e.category === cat.value).reduce((s, e) => s + Number(e.amount), 0),
    items: fixedExpenses.filter(e => e.category === cat.value),
  }));

  const openAdd = (type: 'ads' | 'daily' | 'fixed') => {
    setAddType(type);
    setLabel('');
    setAmount('');
    setNotes('');
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
    setCategory(type === 'fixed' ? 'outils' : type === 'ads' ? 'publicite' : 'quotidien');
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!label || !amount || Number(amount) <= 0) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    if (addType === 'daily' && !expenseDate) {
      toast.error('La date est obligatoire pour les charges quotidiennes');
      return;
    }
    setLoading(true);
    const monthStr = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
    const { error } = await supabase.from('monthly_expenses').insert({
      month: monthStr,
      category: addType === 'ads' ? 'publicite' : addType === 'daily' ? 'quotidien' : category,
      label,
      amount: Number(amount),
      notes: notes || null,
      expense_type: addType,
      expense_date: (addType === 'daily' || addType === 'ads') ? expenseDate : null,
    } as any);
    setLoading(false);
    if (error) {
      toast.error('Erreur lors de l\'ajout');
      console.error(error);
    } else {
      toast.success('Charge ajoutée');
      setShowAdd(false);
      onExpenseChanged();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('monthly_expenses').delete().eq('id', id);
    if (error) toast.error('Erreur de suppression');
    else { toast.success('Charge supprimée'); onExpenseChanged(); }
  };

  const openEdit = (item: Expense) => {
    setEditingExpense(item);
    setAddType(((item as any).expense_type || 'fixed') as 'ads' | 'daily' | 'fixed');
    setLabel(item.label);
    setAmount(String(item.amount));
    setNotes(item.notes || '');
    setCategory(item.category);
    setExpenseDate((item as any).expense_date || format(new Date(), 'yyyy-MM-dd'));
  };

  const handleEdit = async () => {
    if (!editingExpense || !label || !amount || Number(amount) <= 0) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('monthly_expenses').update({
      label,
      amount: Number(amount),
      notes: notes || null,
      category: addType === 'ads' ? 'publicite' : addType === 'daily' ? 'quotidien' : category,
      expense_date: (addType === 'daily' || addType === 'ads') ? expenseDate : null,
    } as any).eq('id', editingExpense.id);
    setLoading(false);
    if (error) {
      toast.error('Erreur de modification');
      console.error(error);
    } else {
      toast.success('Charge modifiée');
      setEditingExpense(null);
      onExpenseChanged();
    }
  };

  const monthLabel = format(selectedMonth, 'MMMM yyyy', { locale: fr });

  return (
    <>
      {/* Summary card full width */}
      <Card className="mb-4 border-border/50">
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Charges — {monthLabel}</p>
              <p className="text-2xl font-bold">{totalAll.toLocaleString('fr-FR')} DH</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">ADS</p>
                <p className="text-base font-bold text-warning">{totalAds.toLocaleString('fr-FR')} DH</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Quotidiennes</p>
                <p className="text-base font-bold text-chart-2">{totalDaily.toLocaleString('fr-FR')} DH</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Fixes</p>
                <p className="text-base font-bold text-primary">{totalFixed.toLocaleString('fr-FR')} DH</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ===== 1. ADS ===== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-warning/10">
                  <Megaphone className="h-4 w-4 text-warning" />
                </div>
                ADS (Publicité) — {monthLabel}
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-warning">{totalAds.toLocaleString('fr-FR')} DH</span>
                <Button size="sm" variant="outline" onClick={() => openAdd('ads')}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {adsExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune dépense publicitaire ce mois</p>
            ) : (
              <div className="space-y-1.5">
                {adsExpenses.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground min-w-[70px]">
                        {(item as any).expense_date ? format(parseISO((item as any).expense_date), 'dd MMM', { locale: fr }) : '—'}
                      </span>
                      <span>{item.label}</span>
                      {item.notes && <span className="text-xs text-muted-foreground">({item.notes})</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">{Number(item.amount).toLocaleString('fr-FR')} DH</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-chart-2" onClick={() => openEdit(item)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== 2. CHARGES QUOTIDIENNES ===== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-chart-2/10">
                  <CalendarDays className="h-4 w-4 text-chart-2" />
                </div>
                Charges quotidiennes — {monthLabel}
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-chart-2">{totalDaily.toLocaleString('fr-FR')} DH</span>
                <Button size="sm" variant="outline" onClick={() => openAdd('daily')}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sortedDailyDates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune charge quotidienne ce mois</p>
            ) : (
              <div className="space-y-3">
                {sortedDailyDates.map(dateKey => {
                  const items = dailyByDate[dateKey];
                  const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0);
                  return (
                    <div key={dateKey} className="p-3 rounded-lg border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">
                          {dateKey !== 'sans-date' ? format(parseISO(dateKey), 'EEEE dd MMMM', { locale: fr }) : 'Sans date'}
                        </span>
                        <span className="text-sm font-bold">{dayTotal.toLocaleString('fr-FR')} DH</span>
                      </div>
                      <div className="space-y-1">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{item.label}</span>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{Number(item.amount).toLocaleString('fr-FR')} DH</span>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-chart-2" onClick={() => openEdit(item)}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ===== 3. CHARGES MENSUELLES FIXES ===== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Charges mensuelles fixes — {monthLabel}
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-primary">{totalFixed.toLocaleString('fr-FR')} DH</span>
                <Button size="sm" variant="outline" onClick={() => openAdd('fixed')}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fixedGrouped.map(cat => (
                <div key={cat.value} className="p-3 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={cat.color}>{cat.label}</Badge>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{cat.total.toLocaleString('fr-FR')} DH</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => { setCategory(cat.value); openAdd('fixed'); }}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {cat.items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucune charge</p>
                  ) : (
                    <div className="space-y-1">
                      {cat.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{item.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{Number(item.amount).toLocaleString('fr-FR')} DH</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-chart-2" onClick={() => openEdit(item)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== ADD DIALOG ===== */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addType === 'ads' && '📢 Ajouter une dépense ADS'}
              {addType === 'daily' && '📅 Ajouter une charge quotidienne'}
              {addType === 'fixed' && '🏢 Ajouter une charge fixe'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {addType === 'fixed' && (
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fixedCategories.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(addType === 'ads' || addType === 'daily') && (
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>
                {addType === 'ads' ? 'Plateforme / Description' : 'Libellé'}
              </Label>
              <Input 
                placeholder={addType === 'ads' ? 'Ex: Meta Ads - Campagne Janvier' : addType === 'daily' ? 'Ex: Transport bureau' : 'Ex: Abonnement Make'}
                value={label} 
                onChange={e => setLabel(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Montant (DH)</Label>
              <Input type="number" placeholder="Ex: 500" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea placeholder="Détails supplémentaires..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={loading}>
              {loading ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EDIT DIALOG ===== */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => { if (!open) setEditingExpense(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>✏️ Modifier la charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {addType === 'fixed' && (
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {fixedCategories.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(addType === 'ads' || addType === 'daily') && (
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Libellé</Label>
              <Input value={label} onChange={e => setLabel(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Montant (DH)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optionnel)</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExpense(null)}>Annuler</Button>
            <Button onClick={handleEdit} disabled={loading}>
              {loading ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
