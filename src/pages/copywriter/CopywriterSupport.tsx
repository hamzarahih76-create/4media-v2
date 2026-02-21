import { CopywriterLayout } from '@/components/layout/CopywriterLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Headphones } from 'lucide-react';

export default function CopywriterSupport() {
  return (
    <CopywriterLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold">Support</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Headphones className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold mb-2">Besoin d'aide ?</h3>
            <p className="text-muted-foreground">Contactez l'administrateur pour toute question ou assistance.</p>
          </CardContent>
        </Card>
      </div>
    </CopywriterLayout>
  );
}
