import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { FinanceSummary } from '@/hooks/useFinanceData';

interface FinanceChartsProps {
  summary: FinanceSummary;
  expenses: Array<{ category: string; amount: number }>;
}

const expenseColors = ['hsl(222, 47%, 11%)', 'hsl(173, 58%, 39%)', 'hsl(38, 92%, 50%)', 'hsl(43, 74%, 66%)', 'hsl(215, 16%, 47%)'];

const categoryLabels: Record<string, string> = {
  salaires: 'Salaires',
  outils: 'Outils',
  publicite: 'Publicité',
  freelancers: 'Freelancers',
  autres: 'Autres',
};

export function FinanceCharts({ summary, expenses }: FinanceChartsProps) {
  const overviewData = [
    { name: 'CA', value: summary.revenueMonth },
    { name: 'Encaissé', value: summary.collectedMonth },
    { name: 'Charges', value: summary.expensesMonth },
    { name: 'Profit', value: Math.max(0, summary.profitMonth) },
  ];

  // Aggregate expenses by category
  const expenseByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const pieData = Object.entries(expenseByCategory).map(([key, value]) => ({
    name: categoryLabels[key] || key,
    value,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Vue d'ensemble du mois</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={overviewData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString('fr-FR')} DH`]}
                contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Répartition des charges</CardTitle>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
              Aucune charge enregistrée
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={expenseColors[index % expenseColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value.toLocaleString('fr-FR')} DH`]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
