import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFinanceData } from '@/hooks/useFinanceData';
import { FinanceKPICards } from '@/components/finance/FinanceKPICards';
import { DailyReportCard } from '@/components/finance/DailyReportCard';
import { ClientFinanceTable } from '@/components/finance/ClientFinanceTable';
import { TeamFinanceTable } from '@/components/finance/TeamFinanceTable';
import { ExpensesSection } from '@/components/finance/ExpensesSection';
import { FinanceCharts } from '@/components/finance/FinanceCharts';
import { Skeleton } from '@/components/ui/skeleton';

// Finance Operating System - CEO Dashboard
export default function Finance() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [tab, setTab] = useState('overview');

  const { summary, clientFinancials, teamFinancials, expenses, isLoading, refetch } = useFinanceData(selectedMonth);

  const prevMonth = () => setSelectedMonth((m) => subMonths(m, 1));
  const nextMonth = () => setSelectedMonth((m) => addMonths(m, 1));

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Finance
            </h1>
            <p className="text-sm text-muted-foreground">Système financier — Vision CEO</p>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <FinanceKPICards summary={summary} />

        {/* Daily report */}
        <DailyReportCard summary={summary} />

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="clients">Clients ({clientFinancials.length})</TabsTrigger>
            <TabsTrigger value="team">Équipe ({teamFinancials.length})</TabsTrigger>
            <TabsTrigger value="expenses">Charges</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <FinanceCharts summary={summary} expenses={expenses} />
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <ClientFinanceTable clients={clientFinancials} expenses={expenses} onPaymentAdded={refetch} />
          </TabsContent>

          <TabsContent value="team" className="mt-4">
            <TeamFinanceTable members={teamFinancials} clientFinancials={clientFinancials} />
          </TabsContent>

          <TabsContent value="expenses" className="mt-4">
            <ExpensesSection
              expenses={expenses}
              selectedMonth={selectedMonth}
              onExpenseChanged={refetch}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
