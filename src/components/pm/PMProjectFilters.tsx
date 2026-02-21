import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface PMProjectFiltersProps {
  clients: string[];
  editors: { id: string; name: string }[];
  onFiltersChange: (filters: ProjectFilters) => void;
}

export interface ProjectFilters {
  search: string;
  client: string | null;
  status: string | null;
  editor: string | null;
}

export function PMProjectFilters({ clients, editors, onFiltersChange }: PMProjectFiltersProps) {
  const [filters, setFilters] = useState<ProjectFilters>({
    search: '',
    client: null,
    status: null,
    editor: null,
  });

  const updateFilter = <K extends keyof ProjectFilters>(key: K, value: ProjectFilters[K]) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: ProjectFilters = {
      search: '',
      client: null,
      status: null,
      editor: null,
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = filters.search || filters.client || filters.status || filters.editor;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un projet..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Client Filter */}
      <Select
        value={filters.client || 'all'}
        onValueChange={(v) => updateFilter('client', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Client" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les clients</SelectItem>
          {clients.map((client) => (
            <SelectItem key={client} value={client}>
              {client}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(v) => updateFilter('status', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="in_progress">En cours</SelectItem>
          <SelectItem value="in_review">En review</SelectItem>
          <SelectItem value="late">En retard</SelectItem>
          <SelectItem value="completed">Terminé</SelectItem>
        </SelectContent>
      </Select>

      {/* Editor Filter */}
      <Select
        value={filters.editor || 'all'}
        onValueChange={(v) => updateFilter('editor', v === 'all' ? null : v)}
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Éditeur" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les éditeurs</SelectItem>
          {editors.map((editor) => (
            <SelectItem key={editor.id} value={editor.id}>
              {editor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-3"
        >
          <X className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      )}
    </div>
  );
}
