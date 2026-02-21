import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  CreditCard,
  Building2,
  MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Mock data
const payments = [
  { 
    id: 1, 
    client: 'TechStartup',
    invoice_number: 'INV-2025-001',
    amount: 2500,
    status: 'paid',
    due_date: '2025-01-05',
    paid_date: '2025-01-03'
  },
  { 
    id: 2, 
    client: 'FashionBrand',
    invoice_number: 'INV-2025-002',
    amount: 1500,
    status: 'pending',
    due_date: '2025-01-15',
    paid_date: null
  },
  { 
    id: 3, 
    client: 'FitCoach',
    invoice_number: 'INV-2025-003',
    amount: 800,
    status: 'overdue',
    due_date: '2024-12-28',
    paid_date: null
  },
  { 
    id: 4, 
    client: 'TechStartup',
    invoice_number: 'INV-2024-045',
    amount: 2500,
    status: 'paid',
    due_date: '2024-12-05',
    paid_date: '2024-12-04'
  },
];

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-warning/20 text-warning' },
  paid: { label: 'Payé', color: 'bg-success/20 text-success' },
  overdue: { label: 'En retard', color: 'bg-destructive/20 text-destructive' },
  cancelled: { label: 'Annulé', color: 'bg-muted text-muted-foreground' },
};

export default function Payments() {
  const totalPending = payments
    .filter(p => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);
    
  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Paiements</h1>
            <p className="text-muted-foreground">Suivi des factures et paiements</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle facture
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paiements en attente
              </CardTitle>
              <CreditCard className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{totalPending.toLocaleString()}€</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paiements reçus ce mois
              </CardTitle>
              <CreditCard className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{totalPaid.toLocaleString()}€</div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher une facture..." 
            className="pl-10"
          />
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Facture</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const status = statusConfig[payment.status as keyof typeof statusConfig];
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {payment.client}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.invoice_number}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {payment.amount.toLocaleString()}€
                      </TableCell>
                      <TableCell>
                        {new Date(payment.due_date).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Voir facture</DropdownMenuItem>
                            <DropdownMenuItem>Marquer payé</DropdownMenuItem>
                            <DropdownMenuItem>Envoyer rappel</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Annuler</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
