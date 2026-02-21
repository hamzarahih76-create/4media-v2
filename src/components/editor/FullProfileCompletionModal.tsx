import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Loader2, User, Briefcase, Building, CreditCard, Camera, FileCheck, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface FullProfileCompletionModalProps {
  open: boolean;
  defaultEmail?: string;
  teamMemberId?: string;
  role?: 'editor' | 'copywriter' | 'designer';
}

const departments = [
  'Production',
];

const positions = [
  'Video Editor',
];

const banks = [
  'CIH Bank',
  'CFG Bank',
  'Attijariwafa Bank',
  'BMCE Bank (Bank of Africa)',
  'Banque Populaire',
  'Crédit du Maroc',
  'BMCI',
  'Société Générale Maroc',
  'Al Barid Bank',
  'Crédit Agricole du Maroc',
  'CDG Capital',
  'Autre',
];

type Step = 'info' | 'banking' | 'photos' | 'review';

export function FullProfileCompletionModal({ open, defaultEmail, teamMemberId, role = 'editor' }: FullProfileCompletionModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Form state
  const [currentStep, setCurrentStep] = useState<Step>('info');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState(role === 'copywriter' ? 'Rédaction' : 'Production');
  const [position, setPosition] = useState(role === 'copywriter' ? 'Copywriter' : 'Video Editor');
  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Informations', icon: <User className="h-4 w-4" /> },
    { key: 'banking', label: 'Paiement', icon: <CreditCard className="h-4 w-4" /> },
    { key: 'photos', label: 'Documents', icon: <Camera className="h-4 w-4" /> },
    { key: 'review', label: 'Validation', icon: <FileCheck className="h-4 w-4" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 5 Mo');
        return;
      }
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    if (!user?.id) throw new Error('User not authenticated');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('editor-documents')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('editor-documents')
      .getPublicUrl(filePath);

    return filePath;
  };

  const submitProfile = useMutation({
    mutationFn: async () => {
      if (!user?.id || !user?.email) throw new Error('User not authenticated');

      setIsSubmitting(true);

      try {
        // Upload files
        let avatarUrl = null;
        let idCardUrl = null;

        if (avatarFile) {
          avatarUrl = await uploadFile(avatarFile, 'avatar');
        }

        if (idCardFile) {
          idCardUrl = await uploadFile(idCardFile, 'id_card');
        }

        // Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (profileError) throw profileError;

        // Update or create team_member record
        const teamMemberData = {
          user_id: user.id,
          full_name: fullName,
          department,
          position,
          iban,
          avatar_url: avatarUrl,
          id_card_url: idCardUrl,
          profile_completed_at: new Date().toISOString(),
          validation_status: 'submitted',
          status: 'pending', // Keep pending until admin validates
          updated_at: new Date().toISOString(),
        };

        // Try to update existing record first
        const { data: existingMember, error: fetchError } = await supabase
          .from('team_members')
          .select('id')
          .eq('email', user.email)
          .single();

        if (existingMember) {
          const { error: updateError } = await supabase
            .from('team_members')
            .update(teamMemberData)
            .eq('email', user.email);

          if (updateError) throw updateError;
        } else {
          // Create new record
          const { error: insertError } = await supabase
            .from('team_members')
            .insert({
              ...teamMemberData,
              email: user.email,
              role: 'editor',
            });

          if (insertError) throw insertError;
        }

        // Notify admin about new signup
        try {
          const { error: notifyError } = await supabase.functions.invoke('notify-admin-new-signup', {
            body: {
              user_name: fullName,
              user_email: user.email,
              signup_date: new Date().toISOString(),
            },
          });
          if (notifyError) {
            console.error('Failed to notify admin:', notifyError);
          } else {
            console.log('Admin notification sent successfully');
          }
        } catch (notifyError) {
          console.error('Failed to notify admin:', notifyError);
          // Don't throw - profile submission was successful
        }

        return true;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editor-profile'] });
      queryClient.invalidateQueries({ queryKey: ['editor-team-member'] });
      toast.success('Profil soumis pour validation ! L\'admin va vérifier vos informations.');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la soumission');
    },
  });

  const canProceed = () => {
    switch (currentStep) {
      case 'info':
        return fullName.trim().length > 0;
      case 'banking':
        return bankName.length > 0 && iban.trim().length >= 10;
      case 'photos':
        return avatarFile !== null && idCardFile !== null;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const stepOrder: Step[] = ['info', 'banking', 'photos', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const stepOrder: Step[] = ['info', 'banking', 'photos', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 'review') {
      submitProfile.mutate();
    } else {
      nextStep();
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Complétez votre profil
          </DialogTitle>
          <DialogDescription>
            Renseignez toutes les informations pour activer votre compte {role === 'copywriter' ? 'copywriter' : 'éditeur'}.
          </DialogDescription>
        </DialogHeader>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            {steps.map((step, index) => (
              <div
                key={step.key}
                className={cn(
                  "flex items-center gap-1",
                  currentStepIndex >= index ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.icon}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Step 1: Personal Info */}
          {currentStep === 'info' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Jean Dupont"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {defaultEmail && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={defaultEmail} disabled className="bg-muted" />
                </div>
              )}

              {role !== 'copywriter' && (
                <>
                  <div className="space-y-2">
                    <Label>Département</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger>
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Poste</Label>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger>
                        <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2: Banking Info */}
          {currentStep === 'banking' && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Ces informations sont nécessaires pour le paiement de vos vidéos. 
                  Elles sont stockées de manière sécurisée.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Banque *</Label>
                <Select value={bankName} onValueChange={setBankName}>
                  <SelectTrigger>
                    <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Sélectionnez votre banque" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="iban">IBAN / RIB *</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="iban"
                    placeholder="MA00 0000 0000 0000 0000 0000 000"
                    value={iban}
                    onChange={(e) => setIban(e.target.value.toUpperCase())}
                    className="pl-10 font-mono"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Entrez votre numéro de compte bancaire complet
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Photos */}
          {currentStep === 'photos' && (
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-3">
                <Label>Photo de profil *</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-2 border-dashed border-border">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} />
                    ) : (
                      <AvatarFallback className="bg-muted">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e, setAvatarFile, setAvatarPreview)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {avatarFile ? 'Changer la photo' : 'Uploader une photo'}
                    </Button>
                    {avatarFile && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {avatarFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ID Card Upload */}
              <div className="space-y-3">
                <Label>Carte d'identité nationale *</Label>
                <p className="text-xs text-muted-foreground">
                  Photo recto de votre CIN pour vérification d'identité
                </p>
                <div 
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    idCardFile ? "border-green-500 bg-green-50" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => idCardInputRef.current?.click()}
                >
                  <input
                    ref={idCardInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e, setIdCardFile, setIdCardPreview)}
                  />
                  {idCardPreview ? (
                    <div className="space-y-2">
                      <img 
                        src={idCardPreview} 
                        alt="ID Card preview" 
                        className="max-h-32 mx-auto rounded-lg object-cover"
                      />
                      <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {idCardFile?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Camera className="h-10 w-10 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour uploader
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  Vérifiez vos informations
                </h4>
                <p className="text-sm text-muted-foreground">
                  Une fois soumises, vos informations seront envoyées à l'administrateur pour validation.
                  Votre compte sera activé après vérification.
                </p>
              </div>

              <div className="space-y-3 divide-y">
                <div className="flex items-center gap-4 py-3">
                  <Avatar className="h-12 w-12">
                    {avatarPreview && <AvatarImage src={avatarPreview} />}
                    <AvatarFallback>{fullName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{fullName}</p>
                    <p className="text-sm text-muted-foreground">{role === 'copywriter' ? 'Copywriter' : `${position} - ${department}`}</p>
                  </div>
                </div>

                <div className="py-3">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{defaultEmail}</p>
                </div>

                <div className="py-3">
                  <p className="text-sm text-muted-foreground">Banque</p>
                  <p className="font-medium">{bankName}</p>
                </div>

                <div className="py-3">
                  <p className="text-sm text-muted-foreground">IBAN / RIB</p>
                  <p className="font-mono">{iban.slice(0, 4)}...{iban.slice(-4)}</p>
                </div>

                <div className="py-3">
                  <p className="text-sm text-muted-foreground">Documents</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Photo de profil
                    </span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Carte d'identité
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4">
            {currentStep !== 'info' && (
              <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                Retour
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={!canProceed() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : currentStep === 'review' ? (
                'Soumettre pour validation'
              ) : (
                'Continuer'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
