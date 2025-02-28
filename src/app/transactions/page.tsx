"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { getAllTransactions, Transaction, TransactionStatus } from "@/lib/transactions";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Load transactions on component mount and every 5 seconds
  useEffect(() => {
    const loadTransactions = () => {
      const allTransactions = getAllTransactions();
      setTransactions(allTransactions);
    };
    
    // Load immediately
    loadTransactions();
    
    // Then load every 5 seconds
    const interval = setInterval(loadTransactions, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Get status badge
  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Waiting</Badge>;
      case 'confirming':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Confirming</Badge>;
      case 'exchanging':
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Exchanging</Badge>;
      case 'sending':
        return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20">Sending</Badge>;
      case 'finished':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'waiting':
      case 'confirming':
      case 'exchanging':
      case 'sending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'finished':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };
  
  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          View your transaction history
        </p>
      </div>
      
      <div className="space-y-4">
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No transactions yet</p>
            </CardContent>
          </Card>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(tx.status)}
                    <span>Transaction</span>
                  </CardTitle>
                  {getStatusBadge(tx.status)}
                </div>
                <CardDescription>
                  ID: {tx.id}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="text-muted-foreground">From</p>
                      <p className="font-medium">{tx.amount} {tx.fromCurrency.toUpperCase()}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-right">
                      <p className="text-muted-foreground">To</p>
                      <p className="font-medium">{tx.estimatedAmount} {tx.toCurrency.toUpperCase()}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p>{formatDate(tx.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Updated</p>
                      <p>{formatDate(tx.updatedAt)}</p>
                    </div>
                  </div>
                  
                  <div className="text-sm">
                    <p className="text-muted-foreground">Deposit Address</p>
                    <p className="font-mono text-xs truncate">{tx.payinAddress}</p>
                  </div>
                  
                  <div className="text-sm">
                    <p className="text-muted-foreground">Recipient Address</p>
                    <p className="font-mono text-xs truncate">{tx.payoutAddress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 