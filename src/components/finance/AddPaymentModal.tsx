import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ClientFinancial } from '@/hooks/useFinanceData';

interface AddPaymentModalProps {
  client: ClientFinancial;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddPaymentModal({ client, open, onClose, onSuccess }: AddPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Montant invalide');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('client_payments').insert({
      client_user_id: client.userId,
      amount: Number(amount),
      payment_date: date,
      payment_method: method,
      notes: notes || null,
    });
    setLoading(false);
    if (error) {
      toast.error('Erreur lors de l\'enregistrement');
      console.error(error);
    } else {
      toast.success(`Paiement de ${Number(amount).toLocaleString('fr-FR')} DH enregistré`);
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement — {client.companyName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <span className="text-muted-foreground">Restant à payer : </span>
            <span className="font-bold text-destructive">{client.remaining.toLocaleString('fr-FR')} DH</span>
          </div>
          <div className="space-y-2">
            <Label>Montant (DH)</Label>
            <Input
              type="number"
              placeholder="Ex: 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Date du paiement</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Méthode</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="virement">Virement</SelectItem>
                <SelectItem value="cheque">Chèque</SelectItem>
                <SelectItem value="carte">Carte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optionnel)</Label>
            <Input
              placeholder="Ex: Avance sur contrat"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
