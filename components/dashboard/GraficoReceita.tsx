'use client';

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { getStatusLabel } from '@/lib/labels';

export function GraficoReceita({
  barras,
  pizza
}: {
  barras: Array<{ label: string; total: number }>;
  pizza: Array<{ status: string; total: number }>;
}) {
  const pizzaData = pizza.map((item) => ({ ...item, label: getStatusLabel(item.status as any) }));

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="min-h-[380px]">
        <CardHeader>
          <CardTitle>Receita dos últimos 7 dias</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barras}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="total" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="min-h-[380px]">
        <CardHeader>
          <CardTitle>Distribuição por status</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip formatter={(value, _name, item: any) => [value, item?.payload?.label || 'Status']} />
              <Pie data={pizzaData} dataKey="total" nameKey="label" outerRadius={110} innerRadius={55}>
                {pizzaData.map((entry, index) => (
                  <Cell key={entry.status} fill={['#DC2626', '#2563EB', '#D97706', '#16A34A', '#166534', '#991B1B'][index % 6]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
