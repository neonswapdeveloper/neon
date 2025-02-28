"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, ArrowRight, AlertTriangle, Copy, ArrowUpRight } from "lucide-react";
import { 
  getTransaction, 
  updateTransactionStatus, 
  TransactionStatus as TxStatus 
} from "@/lib/transactions";
import { getTransactionStatus } from "@/lib/api";
import { NeonGradientCard } from "@/components/ui/neon-gradient-card";

interface TransactionStatusProps {
  transactionId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  estimatedAmount: string;
  payinAddress: string;
  payoutAddress: string;
  onClose: () => void;
}

export function TransactionStatus({
  transactionId,
  fromCurrency,
  toCurrency,
  amount,
  estimatedAmount,
  payinAddress,
  payoutAddress,
  onClose,
}: TransactionStatusProps) {
  const [status, setStatus] = useState<TxStatus>('waiting');
  const [copied, setCopied] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Poll for transaction status updates
  useEffect(() => {
    // Initial status is always 'waiting'
    setStatus('waiting');
    updateTransactionStatus(transactionId, 'waiting');
    
    // Set up polling interval
    const pollInterval = setInterval(async () => {
      try {
        // Get transaction status from API
        const response = await getTransactionStatus(transactionId);
        
        // Map API status to our status
        let newStatus: TxStatus;
        
        switch (response.status) {
          case 'new':
          case 'waiting':
            newStatus = 'waiting';
            break;
          case 'confirming':
            newStatus = 'confirming';
            break;
          case 'exchanging':
            newStatus = 'exchanging';
            break;
          case 'sending':
            newStatus = 'sending';
            break;
          case 'finished':
            newStatus = 'finished';
            break;
          case 'failed':
          case 'refunded':
            newStatus = 'failed';
            break;
          default:
            newStatus = 'waiting';
        }
        
        // Update status
        setStatus(newStatus);
        updateTransactionStatus(transactionId, newStatus);
        
        // Clear interval if transaction is finished or failed
        if (newStatus === 'finished' || newStatus === 'failed') {
          clearInterval(pollInterval);
        }
        
        // Reset network error if we successfully got a response
        if (networkError) {
          setNetworkError(false);
          setErrorDetails(null);
        }
      } catch (error: any) {
        console.error("Error fetching transaction status:", error);
        setNetworkError(true);
        setErrorDetails(error.message || "Unknown error");
        
        // Don't clear the interval, we'll try again
      }
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(pollInterval);
  }, [transactionId]);

  // Check for existing transaction status
  useEffect(() => {
    try {
      const tx = getTransaction(transactionId);
      if (tx) {
        setStatus(tx.status);
      }
    } catch (error) {
      console.error("Error getting transaction:", error);
      setNetworkError(true);
    }
  }, [transactionId]);

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      alert("Failed to copy to clipboard. Please copy manually.");
    }
  };

  const getStatusIcon = () => {
    if (networkError) {
      return <AlertTriangle className="h-8 w-8 text-orange-500" />;
    }
    
    switch (status) {
      case 'waiting':
      case 'confirming':
      case 'exchanging':
      case 'sending':
        return <Clock className="h-8 w-8 text-cyan-400 animate-pulse" />;
      case 'finished':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (networkError) {
      return 'Network error occurred';
    }
    
    switch (status) {
      case 'waiting':
        return 'Waiting for your deposit';
      case 'confirming':
        return 'Confirming your transaction';
      case 'exchanging':
        return 'Exchanging your tokens';
      case 'sending':
        return 'Sending to your wallet';
      case 'finished':
        return 'Transaction completed';
      case 'failed':
        return 'Transaction failed';
    }
  };

  const getStatusColor = () => {
    if (networkError) {
      return 'from-orange-500 to-orange-600';
    }
    
    switch (status) {
      case 'waiting':
      case 'confirming':
      case 'exchanging':
      case 'sending':
        return 'from-[#005C97] to-[#363795]';
      case 'finished':
        return 'from-green-500 to-green-600';
      case 'failed':
        return 'from-red-500 to-red-600';
    }
  };

  return (
    <NeonGradientCard 
      className="w-full max-w-xl"
      borderSize={0}
      borderRadius={12}
      neonColors={{
        firstColor: "#005C97",
        secondColor: "#363795"
      }}
    >
      <div className="space-y-4 sm:space-y-6 lg:space-y-4 xl:space-y-6 bg-black p-4 sm:p-6 lg:p-6 xl:p-8 rounded-[10px]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl lg:text-lg xl:text-xl font-semibold">Transaction Status</h3>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
          <span>Transaction ID: {transactionId.substring(0, 8)}...{transactionId.substring(transactionId.length - 8)}</span>
        </div>
        
        {networkError && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-md p-3 lg:p-2 xl:p-3 text-sm lg:text-xs xl:text-sm">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 lg:h-4 lg:w-4 xl:h-5 xl:w-5 text-orange-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium text-orange-500">Network Error</p>
                <p className="text-muted-foreground mt-1">
                  A network error occurred while processing your transaction. We'll continue to check the status.
                </p>
                {errorDetails && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Error details: {errorDetails}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-black border border-gray-800 rounded-lg overflow-hidden p-3 sm:p-4 lg:p-3 xl:p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm sm:text-base">
              <p className="text-muted-foreground text-xs sm:text-sm">From</p>
              <p className="font-medium">{amount} {fromCurrency.toUpperCase()}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
            <div className="text-sm sm:text-base text-right">
              <p className="text-muted-foreground text-xs sm:text-sm">To</p>
              <p className="font-medium">{estimatedAmount} {toCurrency.toUpperCase()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Deposit Address</p>
            <div className="flex items-center justify-between rounded-md bg-gray-900/50 border border-gray-800 p-2 text-xs sm:text-sm">
              <span className="font-mono truncate mr-2">{payinAddress}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(payinAddress)}
                className="h-6 text-xs flex items-center gap-1 hover:bg-gray-800"
              >
                {copied ? 'Copied!' : <><Copy className="h-3 w-3 mr-1" /> Copy</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Please send {amount} {fromCurrency.toUpperCase()} to this address to complete the swap
            </p>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3 lg:space-y-2 xl:space-y-3 mt-2 bg-gray-900/30 p-3 sm:p-4 lg:p-3 xl:p-4 rounded-lg">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Status</span>
            <span className="font-medium">{getStatusText()}</span>
          </div>
          
          <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-2 rounded-full relative bg-gradient-to-r ${getStatusColor()}`}
              style={{ 
                width: networkError ? '50%' :
                       status === 'waiting' ? '20%' : 
                       status === 'confirming' ? '40%' : 
                       status === 'exchanging' ? '60%' : 
                       status === 'sending' ? '80%' : 
                       status === 'finished' ? '100%' : '100%',
                boxShadow: status === 'finished' ? '0 0 10px #10b981, 0 0 20px rgba(16, 185, 129, 0.5)' :
                          status === 'failed' ? '0 0 10px #ef4444, 0 0 20px rgba(239, 68, 68, 0.5)' :
                          '0 0 10px #005C97, 0 0 20px rgba(0, 92, 151, 0.5)'
              }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Recipient Address</span>
            <span className="font-mono text-xs truncate max-w-[180px] sm:max-w-[250px]">{payoutAddress}</span>
          </div>
        </div>

        <Button 
          onClick={onClose}
          className="w-full h-10 sm:h-12 lg:h-10 xl:h-12 text-sm sm:text-base lg:text-sm xl:text-base font-normal bg-transparent relative before:absolute before:inset-0 before:rounded-md before:p-[1px] before:bg-gradient-to-r before:from-[#005C97] before:to-[#363795] before:z-[0] after:absolute after:inset-0 after:rounded-[16px] after:p-[1px] after:bg-gradient-to-r after:from-[#005C97] after:to-[#363795] after:blur-[15px] after:z-[-1] after:opacity-90 mt-4 text-white abstract-neon-button"
          style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
        >
          <span className="relative z-[1] text-white font-medium">
            {status === 'finished' ? 'Done' : status === 'failed' ? 'Try Again' : 'Close'}
          </span>
        </Button>
      </div>
    </NeonGradientCard>
  );
} 