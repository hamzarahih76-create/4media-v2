import { useNavigate } from 'react-router-dom';
import { CopywriterLayout } from '@/components/layout/CopywriterLayout';
import { useCopywriterClients } from '@/hooks/useCopywriterData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, PenTool, Loader2, Video, Brain, Target } from 'lucide-react';

export default function CopywriterClients() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useCopywriterClients();

  return (
    <CopywriterLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Mes Clients</h1>
          <p className="text-muted-foreground">Gérez le contenu de vos clients assignés</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : clients.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <PenTool className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold mb-2">Aucun client assigné</h3>
              <p className="text-muted-foreground text-sm">Les projets vous seront assignés par l'administrateur.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((client: any) => (
              <Card
                key={client.id}
                onClick={() => navigate(`/copywriter/clients/${client.user_id}`)}
                className="cursor-pointer hover:border-violet-500/30 hover:shadow-lg transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-12 w-12 rounded-lg border-2 border-border shadow-sm flex-shrink-0">
                      {client.avatar_url || client.logo_url ? (
                        <AvatarImage 
                          src={client.avatar_url || client.logo_url} 
                          alt={client.company_name} 
                          className="rounded-lg object-cover w-full h-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      <AvatarFallback className="rounded-lg bg-violet-500/10 text-violet-500 font-bold text-lg w-full h-full flex items-center justify-center">
                        {client.company_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{client.company_name}</h3>
                      <p className="text-sm text-muted-foreground">{client.contact_name || client.email}</p>
                    </div>
                  </div>
                  
                  {/* Pack vidéo */}
                  {client.videos_per_month && (
                    <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-emerald-500/5">
                      <Video className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium">Pack Vidéo</span>
                      <span className="ml-auto text-sm font-bold">{client.videos_per_month} <span className="text-xs font-normal text-muted-foreground">/mois</span></span>
                    </div>
                  )}

                  {/* Description & Objectifs */}
                  {(client.strategic_description || client.client_objectives) && (
                    <div className="space-y-2 mb-3">
                      {client.strategic_description && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Description</p>
                          <p className="text-sm text-foreground line-clamp-2">{client.strategic_description}</p>
                        </div>
                      )}
                      {client.client_objectives && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Objectifs</p>
                          <p className="text-sm text-foreground line-clamp-2">{client.client_objectives}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{client.projectCount} projet{client.projectCount > 1 ? 's' : ''}</Badge>
                    {client.industry && <Badge variant="outline">{client.industry}</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </CopywriterLayout>
  );
}
