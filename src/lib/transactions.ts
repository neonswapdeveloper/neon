// Transaction storage and management

// Transaction status types
export type TransactionStatus = 'waiting' | 'confirming' | 'exchanging' | 'sending' | 'finished' | 'failed';

// Transaction interface
export interface Transaction {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  estimatedAmount: string;
  payinAddress: string;
  payoutAddress: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for transactions (in a real app, this would be a database)
const transactions: Record<string, Transaction> = {};

// Create a new transaction
export function createTransactionRecord(
  id: string,
  fromCurrency: string,
  toCurrency: string,
  amount: string,
  estimatedAmount: string,
  payinAddress: string,
  payoutAddress: string
): Transaction {
  const now = new Date();
  const transaction: Transaction = {
    id,
    fromCurrency,
    toCurrency,
    amount,
    estimatedAmount,
    payinAddress,
    payoutAddress,
    status: 'waiting',
    createdAt: now,
    updatedAt: now,
  };
  
  transactions[id] = transaction;
  return transaction;
}

// Get a transaction by ID
export function getTransaction(id: string): Transaction | null {
  return transactions[id] || null;
}

// Update transaction status
export function updateTransactionStatus(id: string, status: TransactionStatus): Transaction | null {
  const transaction = transactions[id];
  if (!transaction) return null;
  
  transaction.status = status;
  transaction.updatedAt = new Date();
  return transaction;
}

// Get all transactions
export function getAllTransactions(): Transaction[] {
  return Object.values(transactions);
}

// Get transactions by status
export function getTransactionsByStatus(status: TransactionStatus): Transaction[] {
  return Object.values(transactions).filter(t => t.status === status);
}

// Get transactions for a specific currency
export function getTransactionsByCurrency(currency: string): Transaction[] {
  return Object.values(transactions).filter(
    t => t.fromCurrency === currency || t.toCurrency === currency
  );
}

// Delete a transaction
export function deleteTransaction(id: string): boolean {
  if (!transactions[id]) return false;
  delete transactions[id];
  return true;
} 