import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight, User, Building2 } from 'lucide-react';

export interface ClientIdentificationData {
  fullName: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  activity: string;
  legalStatus: 'personne_physique' | 'societe';
  cin: string;
  raisonSociale: string;
  ice: string;
  siegeAddress: string;
  representantLegal: string;
  termsAccepted: boolean;
}

interface Props {
  initialData?: Partial<ClientIdentificationData>;
  onSubmit: (data: ClientIdentificationData) => void;
}

export function ClientIdentificationForm({ initialData, onSubmit }: Props) {
  const [form, setForm] = useState<ClientIdentificationData>({
    fullName: initialData?.fullName || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',
    activity: initialData?.activity || '',
    legalStatus: initialData?.legalStatus || 'personne_physique',
    cin: initialData?.cin || '',
    raisonSociale: initialData?.raisonSociale || '',
    ice: initialData?.ice || '',
    siegeAddress: initialData?.siegeAddress || '',
    representantLegal: initialData?.representantLegal || '',
    termsAccepted: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof ClientIdentificationData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Nom complet obligatoire';
    if (!form.address.trim()) e.address = 'Adresse obligatoire';
    if (!form.city.trim()) e.city = 'Ville obligatoire';
    if (!form.phone.trim()) e.phone = 'Téléphone obligatoire';
    if (!form.email.trim()) e.email = 'Email obligatoire';
    if (!form.activity.trim()) e.activity = 'Activité obligatoire';

    if (form.legalStatus === 'personne_physique') {
      if (!form.cin.trim()) e.cin = 'Numéro CIN obligatoire';
    } else {
      if (!form.raisonSociale.trim()) e.raisonSociale = 'Raison sociale obligatoire';
      if (!form.ice.trim()) e.ice = 'ICE obligatoire';
      if (!form.siegeAddress.trim()) e.siegeAddress = 'Adresse du siège obligatoire';
      if (!form.representantLegal.trim()) e.representantLegal = 'Représentant légal obligatoire';
    }

    if (!form.termsAccepted) e.termsAccepted = 'Vous devez accepter les conditions';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSubmit(form);
  };

  const isSociete = form.legalStatus === 'societe';

  return (
    <div className="space-y-5">
      {/* Section identification */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Identification du client
        </h4>

        <Field label="Nom complet *" error={errors.fullName}>
          <Input value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Votre nom complet" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Ville *" error={errors.city}>
            <Input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Ex: Casablanca" />
          </Field>
          <Field label="Téléphone *" error={errors.phone}>
            <Input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="06XXXXXXXX" />
          </Field>
        </div>

        <Field label="Adresse complète *" error={errors.address}>
          <Input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Adresse précise" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Email *" error={errors.email}>
            <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="email@exemple.com" />
          </Field>
          <Field label="Activité professionnelle *" error={errors.activity}>
            <Input value={form.activity} onChange={e => update('activity', e.target.value)} placeholder="Ex: Médecin, Coach..." />
          </Field>
        </div>
      </div>

      {/* Section statut juridique */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Statut juridique
        </h4>

        <RadioGroup
          value={form.legalStatus}
          onValueChange={(v) => update('legalStatus', v)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="personne_physique" id="pp" />
            <Label htmlFor="pp" className="cursor-pointer">Personne physique</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="societe" id="soc" />
            <Label htmlFor="soc" className="cursor-pointer">Société</Label>
          </div>
        </RadioGroup>

        {!isSociete ? (
          <Field label="Numéro CIN *" error={errors.cin}>
            <Input value={form.cin} onChange={e => update('cin', e.target.value)} placeholder="Ex: AB123456" />
          </Field>
        ) : (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50">
            <Field label="Raison sociale *" error={errors.raisonSociale}>
              <Input value={form.raisonSociale} onChange={e => update('raisonSociale', e.target.value)} placeholder="Nom de la société" />
            </Field>
            <Field label="ICE *" error={errors.ice}>
              <Input value={form.ice} onChange={e => update('ice', e.target.value)} placeholder="Numéro ICE" />
            </Field>
            <Field label="Adresse du siège *" error={errors.siegeAddress}>
              <Input value={form.siegeAddress} onChange={e => update('siegeAddress', e.target.value)} placeholder="Adresse du siège social" />
            </Field>
            <Field label="Représentant légal *" error={errors.representantLegal}>
              <Input value={form.representantLegal} onChange={e => update('representantLegal', e.target.value)} placeholder="Nom du représentant légal" />
            </Field>
          </div>
        )}
      </div>

      {/* Terms checkbox */}
      <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={form.termsAccepted}
            onCheckedChange={(checked) => update('termsAccepted', !!checked)}
            className="mt-0.5"
          />
          <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
            Je reconnais avoir lu et accepté l'intégralité des conditions du contrat.
          </Label>
        </div>
        {errors.termsAccepted && <p className="text-xs text-destructive mt-1 ml-7">{errors.termsAccepted}</p>}
      </div>

      <Button className="w-full gap-2" onClick={handleSubmit}>
        <ArrowRight className="h-4 w-4" />
        Continuer vers la signature
      </Button>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
