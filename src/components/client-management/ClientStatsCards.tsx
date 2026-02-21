import { Card, CardContent } from '@/components/ui/card';
import { Video, Palette, Clock, CheckCircle2, AlertCircle, Calendar, MapPin, Plus, Trash2, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ClientStatsCardsProps {
  clientId: string;
  videosDelivered: number;
  videosOrdered: number;
  designsDelivered: number;
  designsOrdered: number;
  pendingFeedback: number;
  revisionRequests: number;
  nextShootingDate?: string | null;
  projectEndDate?: string | null;
  studioLocation?: string | null;
}

export function ClientStatsCards({
  clientId,
  videosDelivered, videosOrdered,
  designsDelivered, designsOrdered,
  pendingFeedback, revisionRequests,
  nextShootingDate, projectEndDate, studioLocation,
}: ClientStatsCardsProps) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <StatMini icon={Video} label="Vidéos livrées" value={`${videosDelivered}/${videosOrdered}`} color="text-blue-500" bg="bg-blue-500/10" />
      <StatMini icon={Palette} label="Designs livrés" value={`${designsDelivered}/${designsOrdered}`} color="text-purple-500" bg="bg-purple-500/10" />
      <StatMini icon={CheckCircle2} label="Validés" value={videosDelivered + designsDelivered} color="text-green-500" bg="bg-green-500/10" />
      <StatMini icon={Clock} label="En attente" value={pendingFeedback} color="text-yellow-500" bg="bg-yellow-500/10" />
      <StatMini icon={AlertCircle} label="Révisions" value={revisionRequests} color="text-orange-500" bg="bg-orange-500/10" />
      <ShootingDateCard clientId={clientId} nextShootingDate={nextShootingDate} studioLocation={studioLocation} />
    </div>
  );
}

function ShootingDateCard({ clientId, nextShootingDate, studioLocation }: { clientId: string; nextShootingDate?: string | null; studioLocation?: string | null }) {
  const queryClient = useQueryClient();
  const { data: existingLocations = [] } = useQuery({
    queryKey: ['studio-locations'],
    queryFn: async () => {
      const { data } = await supabase
        .from('studio_locations')
        .select('name')
        .order('name');
      return (data || []).map((d: any) => d.name) as string[];
    },
  });

  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    nextShootingDate ? new Date(nextShootingDate) : undefined
  );
  const [time, setTime] = useState(
    nextShootingDate ? new Date(nextShootingDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '10:00'
  );
  const [location, setLocation] = useState(studioLocation || '');
  const [isNewLocation, setIsNewLocation] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  const handleDeleteLocation = async (name: string) => {
    await supabase.from('studio_locations').delete().eq('name', name);
    queryClient.invalidateQueries({ queryKey: ['studio-locations'] });
    if (location === name) setLocation('');
    toast.success('Lieu supprimé');
  };

  const handleSave = async () => {
    if (!selectedDate) return;
    const [h, m] = time.split(':').map(Number);
    const dt = new Date(selectedDate);
    dt.setHours(h || 10, m || 0, 0, 0);

    // If new location, save to studio_locations table
    if (isNewLocation && location.trim()) {
      await supabase.from('studio_locations').upsert({ name: location.trim() } as any, { onConflict: 'name' });
      queryClient.invalidateQueries({ queryKey: ['studio-locations'] });
    }

    const { error } = await supabase
      .from('client_profiles')
      .update({ next_shooting_date: dt.toISOString(), studio_location: location || null } as any)
      .eq('id', clientId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success('Tournage mis à jour');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
      setIsNewLocation(false);
    }
  };

  const displayValue = nextShootingDate
    ? new Date(nextShootingDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
      ' · ' +
      new Date(nextShootingDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold leading-tight">{displayValue}</p>
              {studioLocation && (
                <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {studioLocation}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground truncate">Prochain tournage</p>
            </div>
          </CardContent>
        </Card>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className={cn("p-3 pointer-events-auto")}
        />
        <div className="px-3 pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Heure :</label>
            <Input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-28 h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">Lieu :</span>
            </div>
            {!isNewLocation ? (
              <Popover open={locationDropdownOpen} onOpenChange={setLocationDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 w-full justify-between text-sm font-normal">
                    {location || 'Sélectionner un lieu'}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-1 pointer-events-auto" align="start">
                  <div className="max-h-48 overflow-y-auto">
                    {existingLocations.map(loc => (
                      <div key={loc} className="flex items-center justify-between group">
                        <button
                          className={cn("flex-1 text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent", location === loc && "bg-accent font-medium")}
                          onClick={() => { setLocation(loc); setLocationDropdownOpen(false); }}
                        >
                          {loc}
                        </button>
                        <button
                          className="px-2 py-1.5 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded-sm transition-opacity"
                          onClick={async (e) => { e.stopPropagation(); await handleDeleteLocation(loc); }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-1 pt-1">
                    <button
                      className="w-full text-left px-3 py-1.5 text-sm rounded-sm hover:bg-accent flex items-center gap-1.5"
                      onClick={() => { setIsNewLocation(true); setLocation(''); setLocationDropdownOpen(false); }}
                    >
                      <Plus className="h-3 w-3" /> Nouveau lieu
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="flex gap-1.5">
                <Input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Adresse du studio..."
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => { setIsNewLocation(false); setLocation(studioLocation || ''); }}>
                  ✕
                </Button>
              </div>
            )}
          </div>
          <Button size="sm" className="w-full" onClick={handleSave} disabled={!selectedDate}>
            Enregistrer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StudioLocationCard({ clientId, studioLocation }: { clientId: string; studioLocation?: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(studioLocation || '');

  const handleSave = async () => {
    const { error } = await supabase
      .from('client_profiles')
      .update({ studio_location: text } as any)
      .eq('id', clientId);
    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success('Localisation studio mise à jour');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setText(studioLocation || ''); }}>
      <PopoverTrigger asChild>
        <Card className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-rose-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight truncate">{studioLocation || '—'}</p>
              <p className="text-[10px] text-muted-foreground truncate">Studio / lieu</p>
            </div>
          </CardContent>
        </Card>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 pointer-events-auto" align="start">
        <div className="space-y-2">
          <Input value={text} onChange={e => setText(e.target.value)} placeholder="Adresse du studio ou lieu..." />
          <Button size="sm" className="w-full" onClick={handleSave}>Enregistrer</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function StatMini({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: string | number; color: string; bg: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
