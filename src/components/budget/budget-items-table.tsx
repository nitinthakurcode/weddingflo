'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BudgetItem, BUDGET_CATEGORIES, PAYMENT_STATUS_LABELS } from '@/types/budget';
import { formatCurrency } from '@/lib/budget-calculations';
import { Pencil, Trash2 } from 'lucide-react';

interface BudgetItemsTableProps {
  items: BudgetItem[];
  isLoading?: boolean;
  onEdit: (item: BudgetItem) => void;
  onDelete: (item: BudgetItem) => void;
}

export function BudgetItemsTable({ items, isLoading, onEdit, onDelete }: BudgetItemsTableProps) {
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'overdue':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Items</CardTitle>
          <CardDescription>Detailed list of all budget items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-pulse text-muted-foreground">Loading budget items...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Items</CardTitle>
          <CardDescription>Detailed list of all budget items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            No budget items yet. Click &quot;Add Item&quot; to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Items</CardTitle>
        <CardDescription>Detailed list of all budget items</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const variance = item.budget - item.actual_cost;
                return (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">
                      {BUDGET_CATEGORIES[item.category]}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.item_name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.budget)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.actual_cost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.paid_amount)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${getVarianceColor(variance)}`}>
                      {variance >= 0 ? '+' : ''}
                      {formatCurrency(variance)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getPaymentStatusColor(item.payment_status)}>
                        {PAYMENT_STATUS_LABELS[item.payment_status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.due_date ? new Date(item.due_date).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(item)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
