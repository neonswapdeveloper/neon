"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, ChevronDown, ArrowDown, FileText } from "lucide-react";
import Image from "next/image";
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
import { processSwapInstruction } from "@/lib/ai-service";

export default function MultiSwapPage() {
  // État pour les tokens et montants
  const [initialToken, setInitialToken] = useState("");
  const [intermediateToken, setIntermediateToken] = useState("");
  const [finalToken, setFinalToken] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [estimatedIntermediateAmount, setEstimatedIntermediateAmount] = useState("");
  const [estimatedFinalAmount, setEstimatedFinalAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  
  // État pour l'instruction AI
  const [swapInstruction, setSwapInstruction] = useState("");
  const [isProcessingInstruction, setIsProcessingInstruction] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
  
  // État pour les devises disponibles et les états de chargement
  const [availableCurrencies, setAvailableCurrencies] = useState<Currency[]>([]);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(true);
  const [isLoadingInitialEstimate, setIsLoadingInitialEstimate] = useState(false);
  const [isLoadingFinalEstimate, setIsLoadingFinalEstimate] = useState(false);
  const [minInitialAmount, setMinInitialAmount] = useState("0");
  const [minIntermediateAmount, setMinIntermediateAmount] = useState("0");
  
  // Nouvel état pour le chargement global de la page
  const [isPageLoading, setIsPageLoading] = useState(true);
  
  // État pour la transaction
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [multiSwapTransaction, setMultiSwapTransaction] = useState<{
    firstSwapId: string;
    secondSwapId: string;
    depositAddress: string;
    estimatedFinalAmount: string;
    status: "pending" | "completed" | "failed";
  } | null>(null);
  
  // État d'erreur
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [apiConnectivity, setApiConnectivity] = useState<boolean | null>(null);
  
  // Gestion des erreurs d'image
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // État pour les modaux de sélection de token
  const [isInitialTokenSelectorOpen, setIsInitialTokenSelectorOpen] = useState(false);
  const [isIntermediateTokenSelectorOpen, setIsIntermediateTokenSelectorOpen] = useState(false);
  const [isFinalTokenSelectorOpen, setIsFinalTokenSelectorOpen] = useState(false);
  
  const handleImageError = (ticker: string) => {
    setImageErrors(prev => ({ ...prev, [ticker]: true }));
  };
  
  // Vérifier la connectivité de l'API
  useEffect(() => {
    async function checkConnectivity() {
      try {
        const isConnected = await checkApiConnectivity();
        setApiConnectivity(isConnected);
        if (!isConnected) {
          setError("Cannot connect to ChangeNOW API. Please check your internet connection or try again later.");
          setIsPageLoading(false); // Mettre fin au chargement même en cas d'erreur
        }
      } catch (err) {
        console.error("Failed to check API connectivity:", err);
        setApiConnectivity(false);
        setError("Failed to check API connectivity. Please check your internet connection or try again later.");
        setIsPageLoading(false); // Mettre fin au chargement même en cas d'erreur
      }
    }
    
    checkConnectivity();
  }, []);
  
  // Récupérer les devises disponibles au montage du composant
  useEffect(() => {
    async function fetchCurrencies() {
      try {
        setIsLoadingCurrencies(true);
        setError(null);
        
        const currencies = await getAvailableCurrencies();
        setAvailableCurrencies(currencies);
        
        // Définir les tokens par défaut
        if (currencies.length >= 3) {
          // Trouver BTC, ETH et USDT si disponibles, sinon utiliser les premières devises
          const btcCurrency = currencies.find(c => c.ticker === "btc") || currencies[0];
          const ethCurrency = currencies.find(c => c.ticker === "eth") || currencies[1];
          const usdtCurrency = currencies.find(c => c.ticker === "usdt") || currencies[2];
          
          setInitialToken(btcCurrency.ticker);
          setIntermediateToken(ethCurrency.ticker);
          setFinalToken(usdtCurrency.ticker);
          
          // Obtenir les montants minimums
          await fetchMinAmounts(btcCurrency.ticker, ethCurrency.ticker, usdtCurrency.ticker);
        }
      } catch (err: any) {
        console.error("Failed to fetch currencies:", err);
        setError(`Failed to load available currencies: ${err.message}`);
      } finally {
        setIsLoadingCurrencies(false);
        setIsPageLoading(false); // Fin du chargement global de la page
      }
    }
    
    if (apiConnectivity !== false) {
      fetchCurrencies();
    }
  }, [apiConnectivity]);
  
  // Récupérer les montants minimums lorsque les tokens changent
  useEffect(() => {
    if (initialToken && intermediateToken && finalToken) {
      fetchMinAmounts(initialToken, intermediateToken, finalToken);
    }
  }, [initialToken, intermediateToken, finalToken]);
  
  // Récupérer les montants minimums
  async function fetchMinAmounts(initial: string, intermediate: string, final: string) {
    try {
      setError(null);
      
      // Montant minimum pour le premier swap
      const minInitialData = await getMinimalExchangeAmount(initial, intermediate);
      setMinInitialAmount(minInitialData.minAmount);
      
      // Montant minimum pour le second swap
      const minIntermediateData = await getMinimalExchangeAmount(intermediate, final);
      setMinIntermediateAmount(minIntermediateData.minAmount);
    } catch (err: any) {
      console.error("Failed to fetch minimum amounts:", err);
      setError(`Failed to load minimum exchange amounts: ${err.message}`);
    }
  }
  
  // Gérer le changement de montant initial
  const handleInitialAmountChange = async (value: string) => {
    setInitialAmount(value);
    setEstimatedIntermediateAmount("");
    setEstimatedFinalAmount("");
    
    if (!value || parseFloat(value) <= 0 || !initialToken || !intermediateToken || !finalToken) {
      return;
    }
    
    // Vérifier si le montant est supérieur au minimum
    if (parseFloat(value) < parseFloat(minInitialAmount)) {
      setError(`Minimum amount is ${minInitialAmount} ${initialToken}`);
      return;
    } else {
      setError(null);
    }
    
    try {
      // Estimer le montant intermédiaire
      setIsLoadingInitialEstimate(true);
      const intermediateEstimate = await getEstimatedExchange(initialToken, intermediateToken, value);
      setEstimatedIntermediateAmount(intermediateEstimate.estimatedAmount);
      
      // Estimer le montant final
      setIsLoadingFinalEstimate(true);
      const finalEstimate = await getEstimatedExchange(intermediateToken, finalToken, intermediateEstimate.estimatedAmount);
      setEstimatedFinalAmount(finalEstimate.estimatedAmount);
      
      setError(intermediateEstimate.warningMessage || finalEstimate.warningMessage || null);
    } catch (err: any) {
      console.error("Failed to get estimates:", err);
      setError(`Failed to estimate exchange amounts: ${err.message}`);
    } finally {
      setIsLoadingInitialEstimate(false);
      setIsLoadingFinalEstimate(false);
    }
  };
  
  // Créer la transaction multi-swap
  const handleCreateMultiSwap = async () => {
    if (!initialToken || !intermediateToken || !finalToken || !initialAmount || parseFloat(initialAmount) <= 0 || !destinationAddress) {
      return;
    }
    
    try {
      setIsCreatingTransaction(true);
      setError(null);
      setAddressError(null);
      
      // 1. Créer le second swap (intermédiaire -> final)
      const secondSwap = await createTransaction(
        intermediateToken,
        finalToken,
        estimatedIntermediateAmount,
        destinationAddress
      );
      
      // 2. Créer le premier swap (initial -> intermédiaire)
      const firstSwap = await createTransaction(
        initialToken,
        intermediateToken,
        initialAmount,
        secondSwap.payinAddress // Utiliser l'adresse de dépôt du second swap comme destination
      );
      
      // Enregistrer les transactions dans notre gestion d'état locale
      createTransactionRecord(
        firstSwap.id,
        initialToken,
        intermediateToken,
        initialAmount,
        estimatedIntermediateAmount,
        firstSwap.payinAddress,
        secondSwap.payinAddress
      );
      
      createTransactionRecord(
        secondSwap.id,
        intermediateToken,
        finalToken,
        estimatedIntermediateAmount,
        estimatedFinalAmount,
        secondSwap.payinAddress,
        destinationAddress
      );
      
      // Définir l'état de la transaction multi-swap
      setMultiSwapTransaction({
        firstSwapId: firstSwap.id,
        secondSwapId: secondSwap.id,
        depositAddress: firstSwap.payinAddress,
        estimatedFinalAmount: estimatedFinalAmount,
        status: "pending"
      });
      
    } catch (err: any) {
      console.error("Failed to create multi-swap transaction:", err);
      
      // Vérifier s'il s'agit d'une erreur de validation d'adresse
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
  
  // Fonction d'aide pour extraire des messages d'erreur significatifs des réponses de l'API
  const extractErrorMessage = (errorMessage: string): string => {
    // Vérifier le format d'erreur JSON
    if (errorMessage.includes("{") && errorMessage.includes("}")) {
      try {
        // Extraire la partie JSON
        const jsonMatch = errorMessage.match(/\{.*\}/);
        if (jsonMatch) {
          const errorObj = JSON.parse(jsonMatch[0]);
          if (errorObj.message) {
            return errorObj.message;
          }
        }
      } catch (e) {
        // Si l'analyse JSON échoue, continuer avec d'autres méthodes
      }
    }
    
    // Vérifier l'erreur "not_valid_address"
    if (errorMessage.includes("not_valid_address")) {
      return "Invalid recipient address for this cryptocurrency";
    }
    
    // Supprimer les codes d'erreur de l'API
    const cleanedMessage = errorMessage.replace(/API error: \d+ - /, "");
    
    return cleanedMessage;
  };
  
  // Gérer le changement d'adresse
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setDestinationAddress(newAddress);
    
    // Effacer l'erreur d'adresse lorsque l'utilisateur recommence à taper
    if (addressError) {
      setAddressError(null);
    }
  };
  
  // Obtenir les données du token
  const getTokenData = (ticker: string) => {
    return availableCurrencies.find(c => c.ticker === ticker) || null;
  };
  
  // Traiter les instructions de swap avec l'IA
  const handleProcessInstruction = async () => {
    if (!swapInstruction.trim()) return;
    
    setIsProcessingInstruction(true);
    setError(null);
    setAiSuccess(false);
    setAiSuccessMessage("");
    
    try {
      // Analyser l'instruction pour détecter un multi-swap
      const instruction = swapInstruction.toLowerCase();
      
      // Recherche de patterns comme "swap X from A to B to C" ou "swap X from A through B to C"
      const multiSwapPattern = /swap\s+(\d+(?:\.\d+)?)\s+(?:from\s+)?(\w+)(?:\s+through|\s+via|\s+to\s+then|\s+then\s+to|\s+to)\s+(\w+)(?:\s+to)\s+(\w+)/i;
      const match = instruction.match(multiSwapPattern);
      
      if (match) {
        // Extraire les informations du multi-swap
        const amount = match[1];
        const fromToken = match[2];
        const viaToken = match[3];
        const toToken = match[4];
        
        // Rechercher les tokens correspondants dans les devises disponibles
        const fromTokenMatch = findBestTokenMatch(fromToken);
        const viaTokenMatch = findBestTokenMatch(viaToken);
        const toTokenMatch = findBestTokenMatch(toToken);
        
        if (fromTokenMatch && viaTokenMatch && toTokenMatch) {
          // Mettre à jour les états
          setInitialToken(fromTokenMatch);
          setIntermediateToken(viaTokenMatch);
          setFinalToken(toTokenMatch);
          setInitialAmount(amount);
          
          // Déclencher l'estimation
          await handleInitialAmountChange(amount);
          
          // Recherche d'une adresse
          const addressMatch = instruction.match(/0x[a-fA-F0-9]{40}/);
          if (addressMatch) {
            setDestinationAddress(addressMatch[0]);
          }
          
          // Afficher le message de succès
          setAiSuccess(true);
          setAiSuccessMessage(`Multi-swap ${amount} ${fromTokenMatch.toUpperCase()} → ${viaTokenMatch.toUpperCase()} → ${toTokenMatch.toUpperCase()}`);
          
          // Masquer le message de succès après 5 secondes
          setTimeout(() => setAiSuccess(false), 5000);
        } else {
          // Fallback à l'API d'IA standard si nous ne pouvons pas trouver tous les tokens
          await processWithAIService();
        }
      } else {
        // Si ce n'est pas un pattern de multi-swap clair, utiliser l'API d'IA
        await processWithAIService();
      }
    } catch (error) {
      console.error("Error processing instruction:", error);
      setError("Failed to process your instruction. Please try again or fill the form manually.");
    } finally {
      setIsProcessingInstruction(false);
    }
  };
  
  // Fonction d'aide pour trouver le meilleur token correspondant
  const findBestTokenMatch = (tokenName: string): string | null => {
    // Recherche exacte d'abord
    const exactMatch = availableCurrencies.find(c => 
      c.ticker.toLowerCase() === tokenName.toLowerCase() || 
      c.name.toLowerCase() === tokenName.toLowerCase()
    );
    
    if (exactMatch) return exactMatch.ticker;
    
    // Recherche partielle ensuite
    const partialMatch = availableCurrencies.find(c => 
      c.ticker.toLowerCase().includes(tokenName.toLowerCase()) || 
      c.name.toLowerCase().includes(tokenName.toLowerCase())
    );
    
    return partialMatch ? partialMatch.ticker : null;
  };
  
  // Traiter avec le service d'IA standard
  const processWithAIService = async () => {
    try {
      const result = await processSwapInstruction(swapInstruction, availableCurrencies);
      
      if (result) {
        // Essayer de détecter un multi-swap à partir de la réponse de l'IA
        if (result.fromToken && result.toToken) {
          // Pour l'instant, utiliser ETH comme token intermédiaire par défaut si non spécifié
          const intermediateTokenTicker = "eth";
          
          setInitialToken(result.fromToken);
          setIntermediateToken(intermediateTokenTicker);
          setFinalToken(result.toToken);
          
          if (result.amount) {
            setInitialAmount(result.amount);
            await handleInitialAmountChange(result.amount);
          }
          
          if (result.destinationAddress) {
            setDestinationAddress(result.destinationAddress);
          }
          
          // Afficher le message de succès
          setAiSuccess(true);
          setAiSuccessMessage(`Multi-swap from ${result.fromToken.toUpperCase()} via ${intermediateTokenTicker.toUpperCase()} to ${result.toToken.toUpperCase()}`);
          
          // Masquer le message de succès après 5 secondes
          setTimeout(() => setAiSuccess(false), 5000);
        }
      }
    } catch (error) {
      console.error("Error with AI service:", error);
      throw error; // Propager l'erreur
    }
  };
  
  const initialTokenData = getTokenData(initialToken);
  const intermediateTokenData = getTokenData(intermediateToken);
  const finalTokenData = getTokenData(finalToken);
  
  // Si la page est en cours de chargement, afficher l'état de chargement
  if (isPageLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading available currencies...</p>
      </div>
    );
  }
  
  // Si la vérification de connectivité de l'API a échoué, afficher l'erreur
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
      {/* Contenu principal avec z-index plus élevé */}
      <div className="relative z-10 px-4 sm:px-6 py-4 sm:py-8">
        {multiSwapTransaction ? (
          // Affichage de l'état de la transaction multi-swap lorsqu'une transaction est active
          <div className="flex justify-center items-center h-full">
            <NeonGradientCard 
              className="w-full max-w-xl"
              borderSize={0}
              borderRadius={12}
              neonColors={{
                firstColor: "#005C97",
                secondColor: "#363795"
              }}
            >
              <div className="space-y-4 bg-black p-6 rounded-[10px]">
                <h2 className="text-xl font-bold">Multi-Swap Transaction</h2>
                
                <div className="space-y-2 bg-gray-900/30 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit Address</span>
                    <span className="font-mono text-sm">{multiSwapTransaction.depositAddress.substring(0, 10)}...{multiSwapTransaction.depositAddress.substring(multiSwapTransaction.depositAddress.length - 6)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Final Amount</span>
                    <span className="font-medium">{multiSwapTransaction.estimatedFinalAmount} {finalToken.toUpperCase()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-yellow-400">Pending</span>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Please send {initialAmount} {initialToken.toUpperCase()} to the deposit address above. Your transaction will be processed automatically.
                  </p>
                  
                  <Button 
                    onClick={() => setMultiSwapTransaction(null)}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </NeonGradientCard>
          </div>
        ) : (
          // Mise en page côte à côte lorsqu'aucune transaction n'est active
          <div className="flex flex-col md:flex-row md:items-start md:justify-between max-w-7xl mx-auto w-full gap-6 lg:gap-8">
            {/* Côté gauche - Titre et description - Caché sur les écrans de tablette et plus petits */}
            <div className="hidden lg:block mb-6 md:mb-0 md:w-2/5 lg:w-1/2 md:pt-6 lg:pt-8 lg:pr-8">
              {/* Input pour les instructions de swap */}
              <div className="mb-6 relative">
                <div className="flex items-center mb-2">
                  <div className="flex items-center border border-[#005C97]/40 rounded px-2 py-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 relative">
                      <div className="absolute w-1.5 h-1.5 rounded-full bg-green-400 animate-ping opacity-75"></div>
                    </div>
                    <span className="text-xs font-medium text-white">AI MULTI-SWAP</span>
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={swapInstruction}
                    onChange={(e) => setSwapInstruction(e.target.value)}
                    placeholder="Example: swap 1 btc through eth to avax and send it to 0x..."
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
                  Chain Multiple Transactions Seamlessly
                  <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-[#005C97] to-[#363795] blur-[2px] z-[-1]">Chain Multiple Transactions Seamlessly</span>
                </span>
              </h1>
              <div className="text-muted-foreground text-xs sm:text-sm lg:text-base xl:text-lg leading-relaxed space-y-2 lg:space-y-4">
                <p className="lg:text-sm xl:text-base">
                  Experience the next level of crypto trading with NeonSwap's Multi-Swap feature—a revolutionary solution that allows you to chain multiple token swaps in a single transaction.
                </p>
                <p className="lg:text-sm xl:text-base">
                  Convert from any token to another through an intermediary currency, all in one seamless process. No need to manually execute multiple swaps or worry about timing the market between transactions.
                </p>
                <p className="lg:text-sm xl:text-base">
                  Simply set your starting token, intermediate token, and final destination—then let our advanced system handle the rest, ensuring optimal execution and maximum convenience.
                </p>
              </div>
              
              {/* Boutons Social et Documentation */}
              <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 lg:mt-6">
                <GradientButton 
                  className="flex items-center"
                  onClick={() => window.open('https://docs.neonswap.xyz/multiswap', '_blank')}
                  style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}
                >
                  <FileText className="h-4 w-4 text-white mr-3 relative z-[1]" />
                  <span className="relative z-[1]" style={{ fontFamily: "var(--font-manrope), ui-sans-serif, system-ui, sans-serif" }}>Read Documentation</span>
                </GradientButton>
              </div>
            </div>
            
            {/* Côté droit - Boîte de swap - Pleine largeur sur les écrans de tablette et plus petits */}
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
                    <h3 className="text-lg sm:text-xl lg:text-lg xl:text-xl font-semibold">Multi-Swap</h3>
                  </div>
                  
                  {/* Message d'erreur API */}
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 lg:p-4">
                      {error}
                    </div>
                  )}
                  
                  {/* Premier token (initial) */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-muted-foreground">You Send</label>
                      {minInitialAmount && (
                        <span className="text-xs text-muted-foreground">
                          Min: {minInitialAmount} {initialToken.toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={initialAmount}
                          onChange={(e) => handleInitialAmountChange(e.target.value)}
                          className="pr-20 h-12 bg-black/60 border-gray-800/50 focus:border-[#005C97] focus:ring-2 focus:ring-[#005C97]/30 focus:outline-none"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-full px-3 py-2 flex items-center gap-2"
                            onClick={() => setIsInitialTokenSelectorOpen(true)}
                          >
                            {initialToken && (
                              <div className="w-6 h-6 mr-2 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-r from-[#005C97] to-[#363795]">
                                {initialTokenData && !imageErrors[initialToken] ? (
                                  <img
                                    src={initialTokenData.image}
                                    alt={initialToken}
                                    className="w-6 h-6 object-cover"
                                    onError={() => handleImageError(initialToken)}
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-white">
                                    {initialToken.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            )}
                            <span className="font-medium">{initialToken.toUpperCase()}</span>
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Flèche de direction */}
                  <div className="flex justify-center items-center py-1">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
                        <ArrowDown className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="absolute -left-24 top-1/2 transform -translate-y-1/2 w-20 h-px bg-gray-800"></div>
                      <div className="absolute -right-24 top-1/2 transform -translate-y-1/2 w-20 h-px bg-gray-800"></div>
                    </div>
                  </div>
                  
                  {/* Token intermédiaire */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-muted-foreground">Via</label>
                      {minIntermediateAmount && (
                        <span className="text-xs text-muted-foreground">
                          Min: {minIntermediateAmount} {intermediateToken.toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={estimatedIntermediateAmount}
                          readOnly
                          className="pr-20 h-12 bg-black/60 border-gray-800/50"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-full px-3 py-2 flex items-center gap-2"
                            onClick={() => setIsIntermediateTokenSelectorOpen(true)}
                          >
                            {intermediateToken && (
                              <div className="w-6 h-6 mr-2 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-r from-[#005C97] to-[#363795]">
                                {intermediateTokenData && !imageErrors[intermediateToken] ? (
                                  <img
                                    src={intermediateTokenData.image}
                                    alt={intermediateToken}
                                    className="w-6 h-6 object-cover"
                                    onError={() => handleImageError(intermediateToken)}
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-white">
                                    {intermediateToken.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            )}
                            <span className="font-medium">{intermediateToken.toUpperCase()}</span>
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {isLoadingInitialEstimate && (
                      <div className="flex items-center justify-center py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Flèche de direction */}
                  <div className="flex justify-center items-center py-1">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
                        <ArrowDown className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="absolute -left-24 top-1/2 transform -translate-y-1/2 w-20 h-px bg-gray-800"></div>
                      <div className="absolute -right-24 top-1/2 transform -translate-y-1/2 w-20 h-px bg-gray-800"></div>
                    </div>
                  </div>
                  
                  {/* Token final */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-muted-foreground">You Get</label>
                    </div>
                    
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={estimatedFinalAmount}
                          readOnly
                          className="pr-20 h-12 bg-black/60 border-gray-800/50"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-full px-3 py-2 flex items-center gap-2"
                            onClick={() => setIsFinalTokenSelectorOpen(true)}
                          >
                            {finalToken && (
                              <div className="w-6 h-6 mr-2 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-r from-[#005C97] to-[#363795]">
                                {finalTokenData && !imageErrors[finalToken] ? (
                                  <img
                                    src={finalTokenData.image}
                                    alt={finalToken}
                                    className="w-6 h-6 object-cover"
                                    onError={() => handleImageError(finalToken)}
                                  />
                                ) : (
                                  <span className="text-xs font-bold text-white">
                                    {finalToken.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                            )}
                            <span className="font-medium">{finalToken.toUpperCase()}</span>
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {isLoadingFinalEstimate && (
                      <div className="flex items-center justify-center py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Adresse de destination */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm text-muted-foreground">Recipient Address ({finalToken.toUpperCase()})</label>
                    </div>
                    
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          type="text"
                          placeholder={`Enter your ${finalToken.toUpperCase()} address`}
                          value={destinationAddress}
                          onChange={handleAddressChange}
                          className="h-12 bg-black/60 border-gray-800/50 focus:border-[#005C97] focus:ring-2 focus:ring-[#005C97]/30 focus:outline-none"
                        />
                      </div>
                    </div>
                    
                    {addressError && (
                      <div className="text-sm text-red-500">{addressError}</div>
                    )}
                  </div>
                  
                  {/* Bouton de swap */}
                  <div className="pt-2">
                    <GradientButton
                      onClick={handleCreateMultiSwap}
                      disabled={
                        isCreatingTransaction ||
                        !initialToken ||
                        !intermediateToken ||
                        !finalToken ||
                        !initialAmount ||
                        parseFloat(initialAmount) <= 0 ||
                        !destinationAddress ||
                        !!error ||
                        !!addressError
                      }
                      className="w-full h-12 text-base font-medium"
                    >
                      {isCreatingTransaction ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating Multi-Swap...
                        </>
                      ) : (
                        "Create Multi-Swap"
                      )}
                    </GradientButton>
                  </div>
                  
                  {/* Modaux de sélection de token */}
                  {isInitialTokenSelectorOpen && (
                    <TokenSelector
                      isOpen={isInitialTokenSelectorOpen}
                      onClose={() => setIsInitialTokenSelectorOpen(false)}
                      onSelect={(ticker) => {
                        if (ticker !== initialToken) {
                          setInitialToken(ticker);
                          setInitialAmount("");
                          setEstimatedIntermediateAmount("");
                          setEstimatedFinalAmount("");
                        }
                        setIsInitialTokenSelectorOpen(false);
                      }}
                      currencies={availableCurrencies}
                      title="Select Initial Token"
                    />
                  )}
                  
                  {isIntermediateTokenSelectorOpen && (
                    <TokenSelector
                      isOpen={isIntermediateTokenSelectorOpen}
                      onClose={() => setIsIntermediateTokenSelectorOpen(false)}
                      onSelect={(ticker) => {
                        if (ticker !== intermediateToken) {
                          setIntermediateToken(ticker);
                          setInitialAmount("");
                          setEstimatedIntermediateAmount("");
                          setEstimatedFinalAmount("");
                        }
                        setIsIntermediateTokenSelectorOpen(false);
                      }}
                      currencies={availableCurrencies}
                      title="Select Intermediate Token"
                    />
                  )}
                  
                  {isFinalTokenSelectorOpen && (
                    <TokenSelector
                      isOpen={isFinalTokenSelectorOpen}
                      onClose={() => setIsFinalTokenSelectorOpen(false)}
                      onSelect={(ticker) => {
                        if (ticker !== finalToken) {
                          setFinalToken(ticker);
                          setInitialAmount("");
                          setEstimatedIntermediateAmount("");
                          setEstimatedFinalAmount("");
                        }
                        setIsFinalTokenSelectorOpen(false);
                      }}
                      currencies={availableCurrencies}
                      title="Select Final Token"
                    />
                  )}
                </div>
              </NeonGradientCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
