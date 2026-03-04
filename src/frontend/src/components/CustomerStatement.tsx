import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { CustomerStatementEntry } from "../backend";
import { useGetCustomerStatement } from "../hooks/useQueries";
import { formatCurrency } from "../lib/currencyUtils";

interface CustomerStatementProps {
  customerId: bigint;
}

export default function CustomerStatement({
  customerId,
}: CustomerStatementProps) {
  const {
    data: statement,
    isLoading,
    error,
  } = useGetCustomerStatement(customerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load customer statement
      </div>
    );
  }

  if (!statement || statement.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions found for this customer
      </div>
    );
  }

  // Sort by date descending (most recent first)
  const sortedStatement = [...statement].sort((a, b) => {
    return Number(b.date - a.date);
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedStatement.map((entry, index) => (
              <TableRow key={`${String(entry.date)}-${index}`}>
                <TableCell>
                  {new Date(Number(entry.date) / 1000000).toLocaleDateString(
                    "en-IN",
                    {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    },
                  )}
                </TableCell>
                <TableCell>
                  {entry.transactionType === "sale" ? (
                    <Badge variant="default">Sale</Badge>
                  ) : (
                    <Badge variant="secondary">Payment</Badge>
                  )}
                </TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell className="text-right">
                  {entry.transactionType === "sale" ? (
                    <span className="text-destructive">
                      +{formatCurrency(entry.amount)}
                    </span>
                  ) : (
                    <span className="text-green-600">
                      -{formatCurrency(entry.amount)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(entry.runningBalance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
