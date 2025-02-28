"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, Settings, Loader2, AlertTriangle, ChevronDown, FileText } from "lucide-react";
import Image from "next/image";
import { TransactionStatus } from "@/components/transaction-status";
import { TokenSelector } from "@/components/token-selector";
import { NeonGradientCard } from "@/components/ui/neon-gradient-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { 
  getAvailableCurrencies, 
  getEstimatedExchange, 
  getMinimalExchangeAmount,
  createTransaction,
  checkApiConnectivity,
  Currency
} from "@/lib/api";
import { createTransactionRecord } from "@/lib/transactions";
import XIcon from "@/components/icons/x-icon";
import { processSwapInstruction } from "@/lib/ai-service";

// Fallback image for when currency logos fail to load
const fallbackImageUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v12M6 12h12'/%3E%3C/svg%3E";

export default function HomePage() {
  // State for tokens and amounts
  const [fromToken, setFromToken] = useState("");
  const [toToken, setToToken] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  
  // Nouvel état pour l'input d'instructions
  const [swapInstruction, setSwapInstruction] = useState("");
  const [isProcessingInstruction, setIsProcessingInstruction] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
  
  // State for available currencies and loading states
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState(false);
  const [minAmount, setMinAmount] = useState("0");
  
  // State for transaction
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [transaction, setTransaction] = useState<{
    id: string;
    fromCurrency: string;
    toCurrency: string;
    amount: string;
    estimatedAmount: string;
    payinAddress: string;
    payoutAddress: string;
  } | null>(null);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [apiConnectivity, setApiConnectivity] = useState<boolean | null>(null);
  
  // Image error handling
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // State for token selector modals
  const [isFromTokenSelectorOpen, setIsFromTokenSelectorOpen] = useState(false);
  const [isToTokenSelectorOpen, setIsToTokenSelectorOpen] = useState(false);
  
  const handleImageError = (ticker: string) => {
    setImageErrors(prev => ({ ...prev, [ticker]: true }));
  };
  
  // Check API connectivity
  useEffect(() => {
    async function checkConnectivity() {
      try {
        const isConnected = await checkApiConnectivity();
        setApiConnectivity(isConnected);
        if (!isConnected) {
          setError("Cannot connect to ChangeNOW API. Please check your internet connection or try again later.");
        }
      } catch (err) {
        console.error("Failed to check API connectivity:", err);
        setApiConnectivity(false);
        setError("Failed to check API connectivity. Please check your internet connection or try again later.");
      }
    }
    
    checkConnectivity();
  }, []);
  
  // Fetch available currencies on component mount
  useEffect(() => {
    async function fetchCurrencies() {
      try {
        setIsLoadingCurrencies(true);
        setError(null);
        
        const currencies = await getAvailableCurrencies();
        setAvailableCurrencies(currencies);
        
        // Set default tokens
        if (currencies.length >= 2) {
          // Find ETH and BTC if available, otherwise use first two currencies
          const ethCurrency = currencies.find(c => c.ticker === "eth") || currencies[0];
          const btcCurrency = currencies.find(c => c.ticker === "btc") || currencies[1];
          
          setFromToken(ethCurrency.ticker);
          setToToken(btcCurrency.ticker);
          
          // Get minimum amount
          fetchMinAmount(ethCurrency.ticker, btcCurrency.ticker);
        }
      } catch (err: any) {
        console.error("Failed to fetch currencies:", err);
        setError(`Failed to load available currencies: ${err.message}`);
      } finally {
        setIsLoadingCurrencies(false);
      }
    }
    
    if (apiConnectivity !== false) {
      fetchCurrencies();
    }
  }, [apiConnectivity]);
  
  // Fetch minimum amount when tokens change
  useEffect(() => {
    if (fromToken && toToken) {
      fetchMinAmount(fromToken, toToken);
    }
  }, [fromToken, toToken]);
  
  // Fetch minimum amount
  async function fetchMinAmount(from: string, to: string) {
    try {
      setError(null);
      const minAmountData = await getMinimalExchangeAmount(from, to);
      setMinAmount(minAmountData.minAmount);
    } catch (err: any) {
      console.error("Failed to fetch minimum amount:", err);
      setError(`Failed to load minimum exchange amount: ${err.message}`);
    }
  }
  
  // Handle from amount change
  const handleFromAmountChange = async (value: string) => {
    setFromAmount(value);
    setToAmount("");
    
    if (!value || parseFloat(value) <= 0 || !fromToken || !toToken) {
      return;
    }
    
    // Check if amount is greater than minimum
    if (parseFloat(value) < parseFloat(minAmount)) {
      setError(`Minimum amount is ${minAmount} ${fromToken}`);
      return;
    } else {
      setError(null);
    }
    
    try {
      setIsLoadingEstimate(true);
      const estimate = await getEstimatedExchange(fromToken, toToken, value);
      setToAmount(estimate.estimatedAmount);
      setError(estimate.warningMessage || null);
    } catch (err: any) {
      console.error("Failed to get estimate:", err);
      setError(`Failed to estimate exchange amount: ${err.message}`);
    } finally {
      setIsLoadingEstimate(false);
    }
  };
  
  // Swap the tokens
  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    
    // Reset amounts
    setFromAmount("");
    setToAmount("");
  };
  
  // Create transaction
  const handleCreateTransaction = async () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0 || !destinationAddress) {
      return;
    }
    
    try {
      setIsCreatingTransaction(true);
      setError(null);
      setAddressError(null);
      
      const result = await createTransaction(
        fromToken,
        toToken,
        fromAmount,
        destinationAddress
      );
      
      // Store transaction in our local state management
      createTransactionRecord(
        result.id,
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        result.payinAddress,
        destinationAddress
      );
      
      setTransaction({
        id: result.id,
        fromCurrency: fromToken,
        toCurrency: toToken,
        amount: fromAmount,
        estimatedAmount: toAmount,
        payinAddress: result.payinAddress,
        payoutAddress: destinationAddress
      });
    } catch (err: any) {
      console.error("Failed to create transaction:", err);
      
      // Check if it's an address validation error
      if (err.message && (
          err.message.includes("address") || 
          err.message.includes("not_valid_address") ||
          err.message.toLowerCase().includes("invalid")
        )) {
        setAddressError(extractErrorMessage(err.message));
      } else {
        setError(`Failed to create transaction: ${extractErrorMessage(err.message)}`);
      }
    } finally {
      setIsCreatingTransaction(false);
    }
  };
  
  // Helper function to extract meaningful error messages from API responses
  const extractErrorMessage = (errorMessage: string): string => {
    // Check for JSON error format
    if (errorMessage.includes("{") && errorMessage.includes("}")) {
      try {
        // Extract the JSON part
        const jsonMatch = errorMessage.match(/\{.*\}/);
        if (jsonMatch) {
          const errorObj = JSON.parse(jsonMatch[0]);
          if (errorObj.message) {
            return errorObj.message;
          }
        }
      } catch (e) {
        // If JSON parsing fails, continue with other methods
      }
    }
    
    // Check for "not_valid_address" error
    if (errorMessage.includes("not_valid_address")) {
      return "Invalid recipient address for this cryptocurrency";
    }
    
    // Remove API error codes
    const cleanedMessage = errorMessage.replace(/API error: \d+ - /, "");
    
    return cleanedMessage;
  };
  
  // Handle address change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setDestinationAddress(newAddress);
    
    // Clear address error when user starts typing again
    if (addressError) {
      setAddressError(null);
    }
  };
  
  // Close transaction modal
  const handleCloseTransaction = () => {
    setTransaction(null);
    setFromAmount("");
    setToAmount("");
  };
  
  // Get token data
  const getTokenData = (ticker: string) => {
    return availableCurrencies.find(c => c.ticker === ticker) || null;
  };
  
  // Get USD value for a token amount
  const getUsdValue = (ticker: string, amount: string): string => {
    if (!ticker || !amount || parseFloat(amount) <= 0) return "0.00";
    
    // Current approximate USD values (as of May 2023)
    const usdRates: Record<string, number> = {
      "btc": 65000,
      "eth": 3500,
      "sol": 128,
      "xrp": 0.52,
      "usdt": 1,
      "usdc": 1,
      "bnb": 600,
      "ada": 0.45,
      "doge": 0.15,
      "dot": 7.5,
      "avax": 35,
      "matic": 0.85,
      "link": 15,
      "uni": 10,
      "shib": 0.00002,
    };
    
    // Default to a reasonable value if token not in our list
    const rate = usdRates[ticker.toLowerCase()] || 1;
    return (parseFloat(amount) * rate).toFixed(2);
  };
  
  const fromTokenData = getTokenData(fromToken);
  const toTokenData = getTokenData(toToken);
  
  // Group currencies by base ticker (without network)
  const groupedCurrencies = availableCurrencies.reduce((acc, currency) => {
    // Extract base ticker (e.g., "btc" from "btcbsc")
    const baseTicker = currency.ticker.replace(/[a-z0-9]+$/, '').toLowerCase();
    
    if (!acc[baseTicker]) {
      acc[baseTicker] = [];
    }
    
    acc[baseTicker].push(currency);
    return acc;
  }, {} as Record<string, Currency[]>);
  
  // Get unique base tickers
  const uniqueBaseTickers = Object.keys(groupedCurrencies);
  
  // Fonction pour traiter les instructions de swap avec l'IA
  const handleProcessInstruction = async () => {
    if (!swapInstruction.trim()) return;
    
    setIsProcessingInstruction(true);
    setError(null);
    setAiSuccess(false);
    setAiSuccessMessage("");
    
    try {
      // Utiliser le service d'IA pour analyser l'instruction
      const result = await processSwapInstruction(swapInstruction, availableCurrencies);
      
      if (result) {
        // Mettre à jour les états avec les résultats de l'IA
        let fieldsUpdated = 0;
        let successParts = [];
        
        if (result.fromToken) {
          setFromToken(result.fromToken);
          fieldsUpdated++;
          successParts.push(`from ${result.fromToken.toUpperCase()}`);
        }
        
        if (result.toToken) {
          setToToken(result.toToken);
          fieldsUpdated++;
          successParts.push(`to ${result.toToken.toUpperCase()}`);
        }
        
        if (result.amount) {
          setFromAmount(result.amount);
          // Déclencher l'estimation
          await handleFromAmountChange(result.amount);
          fieldsUpdated++;
        }
        
        if (result.destinationAddress) {
          setDestinationAddress(result.destinationAddress);
          fieldsUpdated++;
          successParts.push(`to address ${result.destinationAddress.substring(0, 6)}...${result.destinationAddress.substring(result.destinationAddress.length - 4)}`);
        }
        
        if (result.blockchain) {
          successParts.push(`on ${result.blockchain}`);
        }
        
        // Afficher le message de succès si au moins un champ a été mis à jour
        if (fieldsUpdated > 0) {
          setAiSuccess(true);
          
          // Construire un message de succès détaillé
          const successMessage = `Swap ${result.amount || ''} ${successParts.join(' ')}`;
          setAiSuccessMessage(successMessage);
          
          // Masquer le message de succès après 5 secondes
          setTimeout(() => setAiSuccess(false), 5000);
        }
      } else {
        // Fallback à la méthode simple si l'IA échoue
        const instruction = swapInstruction.toLowerCase();
        
        // Recherche du montant
        const amountMatch = instruction.match(/\d+(\.\d+)?/);
        if (amountMatch) {
          setFromAmount(amountMatch[0]);
        }
        
        // Recherche des tokens
        if (instruction.includes('eth') && instruction.includes('btc')) {
          if (instruction.indexOf('eth') < instruction.indexOf('btc')) {
            setFromToken('eth');
            setToToken('btc');
          } else {
            setFromToken('btc');
            setToToken('eth');
          }
        } else if (instruction.includes('eth')) {
          setFromToken('eth');
        } else if (instruction.includes('btc')) {
          setFromToken('btc');
        }
        
        // Recherche d'une adresse
        const addressMatch = instruction.match(/0x[a-fA-F0-9]{40}/);
        if (addressMatch) {
          setDestinationAddress(addressMatch[0]);
        }
        
        // Déclencher l'estimation
        if (amountMatch && fromToken && toToken) {
          await handleFromAmountChange(amountMatch[0]);
        }
      }
    } catch (error) {
      console.error("Error processing instruction:", error);
      setError("Failed to process your instruction. Please try again or fill the form manually.");
    } finally {
      setIsProcessingInstruction(false);
    }
  };
  
  // If currencies are loading, show loading state
  if (isLoadingCurrencies) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading available currencies...</p>
      </div>
    );
  }
  
  // If API connectivity check failed, show error
  if (apiConnectivity === false) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">API Connection Error</h2>
        <p className="text-center max-w-md mb-4">
          Cannot connect to the ChangeNOW API. This could be due to:
        </p>
        <ul className="list-disc list-inside text-left max-w-md mb-6">
          <li>Internet connection issues</li>
          <li>CORS restrictions in your browser</li>
          <li>API service being temporarily unavailable</li>
          <li>API key issues or rate limiting</li>
        </ul>
        <p className="text-center max-w-md mb-6">
          Please check your network connection and try again later.
        </p>
        <Button 
          onClick={() => window.location.reload()}
          className="neon-gradient-button"
        >
          Retry Connection
        </Button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col">
      {/* Main content with higher z-index */}
      <div className="relative z-10 px-4 sm:px-6 py-4 sm:py-8">
        {transaction ? (
          // Centered transaction status when a transaction is active
          <div className="flex justify-center items-center h-full">
            <TransactionStatus
              transactionId={transaction.id}
              fromCurrency={transaction.fromCurrency}
              toCurrency={transaction.toCurrency}
              amount={transaction.amount}
              estimatedAmount={transaction.estimatedAmount}
              payinAddress={transaction.payinAddress}
              payoutAddress={transaction.payoutAddress}
              onClose={handleCloseTransaction}
            />
          </div>
        ) : (
          // Side by side layout when no transaction is active
          <div className="flex flex-col md:flex-row md:items-start md:justify-between max-w-7xl mx-auto w-full gap-6 lg:gap-8">
            {/* Left side - Title and description - Hidden on tablet and smaller screens */}
            <div className="hidden lg:block mb-6 md:mb-0 md:w-2/5 lg:w-1/2 md:pt-6 lg:pt-8 lg:pr-8">
              {/* Nouvel input pour les instructions de swap */}
              <div className="mb-6 relative">
                <div className="flex items-center mb-2">
                  <div className="flex items-center border border-[#005C97]/40 rounded px-2 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 relative">
                      <div className="absolute w-1.5 h-1.5 rounded-full bg-green-400 animate-ping opacity-75"></div>
                    </div>
                    <span className="text-xs font-medium text-white">AI SWAP</span>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={swapInstruction}
                    onChange={(e) => setSwapInstruction(e.target.value)}
                    placeholder="Example: swap 1 btc to eth on arbitrum and send it to 0x..."
                    className="w-full h-10 px-4 pr-20 rounded-lg bg-black/60 border border-gray-800/50 focus:border-[#005C97] focus:ring-2 focus:ring-[#005C97]/30 focus:outline-none text-sm text-white placeholder-gray-500 transition-all duration-200"
                    onKeyDown={(e) => e.key === 'Enter' && handleProcessInstruction()}
                    disabled={isProcessingInstruction}
                  />
                  <Button
                    onClick={handleProcessInstruction}
                    className="absolute right-1 h-8 px-3 rounded-md bg-gradient-to-r from-[#005C97] to-[#363795] text-white text-xs font-medium"
                    disabled={isProcessingInstruction}
                  >
                    {isProcessingInstruction ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        <span>AI...</span>
                      </>
                    ) : (
                      "Process"
                    )}
                  </Button>
                </div>
                
                {/* Message de confirmation après traitement réussi */}
                {aiSuccess && (
                  <div className="absolute mt-1 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate">
                      {aiSuccessMessage || "AI processed your instruction successfully"}
                    </span>
                  </div>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tight mb-4 lg:mb-6 text-white leading-tight relative">
                <span className="relative">
                  Your Gateway to Instant AI Token Swaps
                  <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-[#005C97] to-[#363795] blur-[2px] z-[-1]">Your Gateway to Instant AI Token Swaps</span>
                </span>
              </h1>
              <div className="text-muted-foreground text-xs sm:text-sm lg:text-base xl:text-lg leading-relaxed space-y-2 lg:space-y-4">
                <p className="lg:text-sm xl:text-base">
                  Enter the realm of next-generation crypto trading with NeonSwap—a revolutionary platform where over 600 tokens await your instant swap without any wallet connection.
                </p>
                <p className="lg:text-sm xl:text-base">
                  Designed with cutting-edge technology and an intuitive interface, NeonSwap offers lightning-fast, secure transactions that simplify your trading experience while maintaining the highest standards of reliability.
                </p>
                <p className="lg:text-sm xl:text-base">
                  Dive into a world where decentralized finance is reimagined, empowering you to seamlessly diversify your portfolio and harness new opportunities, all in a single, user-friendly environment.
                </p>
              </div>
              
              {/* Social and Documentation buttons */}
              <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 lg:mt-6">
                <GradientButton 
                  className="flex items-center"
                  onClick={() => window.open('https://docs.neonswap.xyz', '_blank')}
                  style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
                >
                  <FileText className="h-4 w-4 text-white mr-3 relative z-[1]" />
                  <span className="relative z-[1]" style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}>Read Documentation</span>
                </GradientButton>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-transparent hover:text-cyan-400 transition-all duration-300 group px-4 sm:px-5 lg:px-5 py-3 lg:py-4 h-auto cursor-pointer"
                  onClick={() => window.open('https://x.com/neonswapxyz', '_blank')}
                  style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
                >
                  <XIcon className="h-5 w-5 lg:h-5 lg:w-5 xl:h-6 xl:w-6 text-white mr-2 group-hover:text-cyan-400" />
                  <span className="font-medium text-sm sm:text-base lg:text-base xl:text-lg" style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}>Twitter</span>
                </Button>
              </div>
            </div>
            
            {/* Right side - Swap box - Full width on tablet and smaller screens */}
            <div className="w-full md:w-full lg:w-1/2 flex justify-center md:justify-center">
              <NeonGradientCard 
                className="w-full max-w-xl md:max-w-2xl lg:max-w-lg xl:max-w-xl"
                borderSize={0}
                borderRadius={12}
                neonColors={{
                  firstColor: "#005C97",
                  secondColor: "#363795"
                }}
              >
                <div className="space-y-4 sm:space-y-6 lg:space-y-4 xl:space-y-6 bg-black p-4 sm:p-6 lg:p-6 xl:p-8 rounded-[10px]">
                  <div className="flex flex-row items-center justify-between">
                    <h3 className="text-lg sm:text-xl lg:text-lg xl:text-xl font-semibold">Transfer</h3>
                  </div>
                  
                  {/* API Error Message */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 lg:p-2 xl:p-3 text-sm lg:text-xs xl:text-sm">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 lg:h-4 lg:w-4 xl:h-5 xl:w-5 text-red-500 mr-2 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-500">Error</p>
                          <p className="text-muted-foreground mt-1">{error}</p>
                        </div>
                      </div>
        </div>
                  )}
                  
                  {/* From Token (Pay) */}
                  <div className="space-y-2">
                    <label className="text-sm lg:text-xs xl:text-sm font-medium text-muted-foreground">Pay</label>
                    <div className="bg-black border border-gray-800 rounded-lg overflow-hidden p-3 sm:p-4 lg:p-3 xl:p-4">
                      <div className="flex justify-between items-center">
                        {/* Token selector on the left */}
                        <Button
                          variant="ghost"
                          className="h-12 sm:h-14 lg:h-12 xl:h-14 px-0 flex items-center gap-1 sm:gap-2 hover:bg-transparent"
                          onClick={() => setIsFromTokenSelectorOpen(true)}
                        >
                          {fromTokenData ? (
                            <>
                              <div className="flex items-center gap-1 sm:gap-2">
                                {fromTokenData.image && !imageErrors[fromToken] ? (
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-6 lg:h-6 xl:w-8 xl:h-8 relative">
          <Image
                                      src={fromTokenData.image}
                                      alt={fromTokenData.name}
                                      width={32}
                                      height={32}
                                      className="object-contain rounded-full"
                                      onError={() => handleImageError(fromToken)}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-6 lg:h-6 xl:w-8 xl:h-8 flex items-center justify-center rounded-full bg-gray-700">
                                    {fromToken.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-medium text-base sm:text-xl lg:text-base xl:text-xl">{fromToken.toUpperCase()}</span>
                                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 lg:h-3 lg:w-3 xl:h-4 xl:w-4 opacity-50" />
                              </div>
                            </>
                          ) : (
                            <>
                              <span>Select token</span>
                              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 lg:h-3 lg:w-3 xl:h-4 xl:w-4 ml-1 opacity-50" />
                            </>
                          )}
                        </Button>
                        
                        {/* Amount input on the right */}
                        <div className="relative h-12 sm:h-14 lg:h-12 xl:h-14 flex items-center justify-end w-1/2">
                          <input
                            type="number"
                            placeholder="0.00"
                            value={fromAmount}
                            onChange={(e) => handleFromAmountChange(e.target.value)}
                            className="w-full text-lg sm:text-2xl lg:text-lg xl:text-2xl font-medium bg-transparent text-right border-0 focus:outline-none focus:ring-0"
                            style={{ color: 'white' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Swap Button */}
                  <div className="flex justify-center -my-1 sm:-my-2 lg:-my-1 xl:-my-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full bg-black border border-gray-800 h-10 w-10 sm:h-12 sm:w-12 lg:h-10 lg:w-10 xl:h-12 xl:w-12 z-10 shadow-lg" 
                      onClick={handleSwapTokens}
                    >
                      <ArrowDown className="h-4 w-4 sm:h-5 sm:w-5 lg:h-4 lg:w-4 xl:h-5 xl:w-5" />
                    </Button>
                  </div>
                  
                  {/* To Token (Receive) */}
                  <div className="space-y-2">
                    <label className="text-sm lg:text-xs xl:text-sm font-medium text-muted-foreground">Receive</label>
                    <div className="bg-black border border-gray-800 rounded-lg overflow-hidden p-3 sm:p-4 lg:p-3 xl:p-4">
                      <div className="flex justify-between items-center">
                        {/* Token selector on the left */}
                        <Button
                          variant="ghost"
                          className="h-12 sm:h-14 lg:h-12 xl:h-14 px-0 flex items-center gap-1 sm:gap-2 hover:bg-transparent"
                          onClick={() => setIsToTokenSelectorOpen(true)}
                        >
                          {toTokenData ? (
                            <>
                              <div className="flex items-center gap-1 sm:gap-2">
                                {toTokenData.image && !imageErrors[toToken] ? (
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-6 lg:h-6 xl:w-8 xl:h-8 relative">
          <Image
                                      src={toTokenData.image}
                                      alt={toTokenData.name}
                                      width={32}
                                      height={32}
                                      className="object-contain rounded-full"
                                      onError={() => handleImageError(toToken)}
                                    />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-6 lg:h-6 xl:w-8 xl:h-8 flex items-center justify-center rounded-full bg-gray-700">
                                    {toToken.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-medium text-base sm:text-xl lg:text-base xl:text-xl">{toToken.toUpperCase()}</span>
                                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 lg:h-3 lg:w-3 xl:h-4 xl:w-4 opacity-50" />
                              </div>
                            </>
                          ) : (
                            <>
                              <span>Select token</span>
                              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 lg:h-3 lg:w-3 xl:h-4 xl:w-4 ml-1 opacity-50" />
                            </>
                          )}
                        </Button>
                        
                        {/* Amount display on the right */}
                        <div className="relative h-12 sm:h-14 lg:h-12 xl:h-14 flex items-center justify-end w-1/2">
                          {isLoadingEstimate ? (
                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-4 lg:w-4 xl:h-5 xl:w-5 animate-spin text-muted-foreground mr-2" />
                          ) : (
                            <span className="text-lg sm:text-2xl lg:text-lg xl:text-2xl font-medium" style={{ color: 'white' }}>{toAmount || "0.00"}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Recipient Address */}
                  <div className="space-y-2 mt-6 sm:mt-8 lg:mt-6 xl:mt-8">
                    <label className="text-sm lg:text-xs xl:text-sm font-medium text-muted-foreground">Recipient Address</label>
                    <div className={`bg-card border ${addressError ? 'border-red-500' : 'border-gray-800'} rounded-lg overflow-hidden`}>
                      <Input
                        type="text"
                        placeholder="Enter your wallet address"
                        value={destinationAddress}
                        onChange={handleAddressChange}
                        className="border-0 h-10 sm:h-12 lg:h-10 xl:h-12 font-mono text-xs sm:text-sm lg:text-xs xl:text-sm bg-transparent w-full px-3 sm:px-4 lg:px-3 xl:px-4"
                      />
                    </div>
                    {addressError && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {addressError}
                      </p>
                    )}
                  </div>
                  
                  {/* Transaction Details */}
                  <div className="space-y-2 sm:space-y-3 lg:space-y-2 xl:space-y-3 text-xs sm:text-sm lg:text-xs xl:text-sm mt-6 sm:mt-8 lg:mt-6 xl:mt-8 bg-gray-900/30 p-3 sm:p-4 lg:p-3 xl:p-4 rounded-lg">
                    {/* Only show minimum amount as it's available from the API */}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Minimum amount</span>
                      <span className="font-medium">{minAmount} {fromToken ? fromToken.toUpperCase() : ''}</span>
                    </div>
                    
                    {/* Show transaction speed forecast if available */}
                    {toAmount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated time for transfer</span>
                        <span className="font-medium">{isLoadingEstimate ? 'Calculating...' : 'Instant'}</span>
                      </div>
                    )}
                    
                    {/* Network fee information - only show if we have an amount */}
                    {toAmount && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Network fee</span>
                        <span className="font-medium">Included</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    className="w-full h-10 sm:h-12 lg:h-10 xl:h-12 text-sm sm:text-base lg:text-sm xl:text-base font-normal bg-transparent relative before:absolute before:inset-0 before:rounded-md before:p-[1px] before:bg-gradient-to-r before:from-[#005C97] before:to-[#363795] before:z-[0] after:absolute after:inset-0 after:rounded-[16px] after:p-[1px] after:bg-gradient-to-r after:from-[#005C97] after:to-[#363795] after:blur-[15px] after:z-[-1] after:opacity-90 mt-4 text-white abstract-neon-button" 
                    disabled={
                      !fromAmount || 
                      parseFloat(fromAmount) <= 0 || 
                      parseFloat(fromAmount) < parseFloat(minAmount) ||
                      !toAmount ||
                      !destinationAddress ||
                      destinationAddress.trim().length < 10 ||
                      isCreatingTransaction
                    }
                    onClick={handleCreateTransaction}
                    style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
                  >
                    {isCreatingTransaction ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-4 lg:w-4 xl:h-5 xl:w-5 animate-spin text-white" />
                        <span className="relative z-[1] text-white font-medium">Creating Transaction...</span>
                      </>
                    ) : (
                      <span className="relative z-[1] text-white font-medium">
                      {!fromAmount || parseFloat(fromAmount) <= 0 ? 
                        "Enter amount" : 
                      parseFloat(fromAmount) < parseFloat(minAmount) ?
                        `Min: ${minAmount} ${fromToken.toUpperCase()}` :
                      !destinationAddress || destinationAddress.trim().length < 10 ?
                        "Enter valid address" :
                        "Swap Now"}
                      </span>
                    )}
                  </Button>
                </div>
              </NeonGradientCard>
            </div>
          </div>
        )}
        
        {/* Token Selector Modals */}
        <TokenSelector
          isOpen={isFromTokenSelectorOpen}
          onClose={() => setIsFromTokenSelectorOpen(false)}
          onSelect={setFromToken}
          currencies={availableCurrencies}
          selectedToken={fromToken}
          title="Select a token"
        />
        
        <TokenSelector
          isOpen={isToTokenSelectorOpen}
          onClose={() => setIsToTokenSelectorOpen(false)}
          onSelect={setToToken}
          currencies={availableCurrencies}
          selectedToken={toToken}
          title="Select a token"
        />
      </div>
    </div>
  );
}
