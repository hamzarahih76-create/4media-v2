import { Film, ExternalLink, Loader2 } from 'lucide-react';
import { useClientRushes } from '@/hooks/useClientRushes';

interface ClientRushesPreviewProps {
  clientUserId: string | undefined;
}

const LINK_ICONS: Record<string, string> = {
  drive: '📁',
  dropbox: '📦',
  wetransfer: '📤',
  onedrive: '☁️',
  other: '🔗',
};

export function ClientRushesPreview({ clientUserId }: ClientRushesPreviewProps) {
  const { data: rushes = [], isLoading } = useClientRushes(clientUserId);

  if (!clientUserId) return null;

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-orange-500" />
        <span className="text-xs font-semibold">Rushs du client</span>
        {rushes.length > 0 && (
          <span className="text-xs bg-muted rounded-full px-2 py-0.5">{rushes.length}</span>
        )}
      </div>
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-xs py-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Chargement des rushs...
        </div>
      ) : rushes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-1">Aucun rush uploadé</p>
      ) : (
        <div className="space-y-1">
          {rushes.map((rush: any) => (
            <a
              key={rush.id}
              href={rush.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm hover:bg-muted/50 rounded-md px-2 py-1.5 transition-colors group"
            >
              <span>{LINK_ICONS[rush.link_type] || '🔗'}</span>
              <span className="flex-1 truncate">{rush.title}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
