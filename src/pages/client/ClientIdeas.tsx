import { ClientLayout } from '@/components/layout/ClientLayout';
import { useClientProfile } from '@/hooks/useClientProfile';
import { useClientMonth } from '@/hooks/useClientMonth';
import { ContentCard } from '@/components/client/ContentCard';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export default function ClientIdeas() {
  const { selectedMonth } = useClientMonth();
  const { profile, contentByStep } = useClientProfile(selectedMonth);
  const primaryColor = profile?.primary_color || '#22c55e';
  const secondaryColor = profile?.secondary_color || '#0f172a';
  const items = contentByStep.idea;

  return (
    <ClientLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Idées</h1>
          <p className="text-muted-foreground">Brainstorming & concepts pour vos contenus</p>
        </div>
        {items.length === 0 ? (
          <Card className="border-0 shadow-lg" style={{ background: `linear-gradient(145deg, ${secondaryColor}, ${secondaryColor}ee)` }}>
            <CardContent className="p-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto mb-4" style={{ color: primaryColor, opacity: 0.5 }} />
              <h3 className="text-lg font-semibold text-white mb-2">Aucune idée pour le moment</h3>
              <p className="text-white/50">Les idées de contenus apparaîtront ici.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map(item => (
              <ContentCard key={item.id} item={item} primaryColor={primaryColor} />
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
}
