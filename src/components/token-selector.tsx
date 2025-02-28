import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Star, StarOff } from "lucide-react";
import Image from "next/image";
import { Currency } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (ticker: string) => void;
  currencies: Currency[];
  selectedToken?: string;
  title?: string;
}

// Local storage key for favorite tokens
const FAVORITE_TOKENS_KEY = "neonswap-favorite-tokens";

// Blockchain mapping for display
const BLOCKCHAIN_MAP: Record<string, { name: string, color: string }> = {
  "arb": { name: "Arbitrum", color: "bg-blue-500" },
  "arbitrum": { name: "Arbitrum", color: "bg-blue-500" },
  "bsc": { name: "BSC", color: "bg-yellow-500" },
  "bnb": { name: "BSC", color: "bg-yellow-500" },
  "erc20": { name: "ERC20", color: "bg-purple-500" },
  "eth": { name: "Ethereum", color: "bg-purple-500" },
  "matic": { name: "Polygon", color: "bg-indigo-500" },
  "polygon": { name: "Polygon", color: "bg-indigo-500" },
  "sol": { name: "Solana", color: "bg-green-500" },
  "avax": { name: "Avalanche", color: "bg-red-500" },
  "c-chain": { name: "Avalanche", color: "bg-red-500" },
  "trx": { name: "Tron", color: "bg-red-400" },
  "one": { name: "Harmony", color: "bg-blue-400" },
  "ftm": { name: "Fantom", color: "bg-blue-300" },
  "op": { name: "Optimism", color: "bg-red-600" },
  "zkevm": { name: "zkEVM", color: "bg-purple-600" },
};

// Popular tokens with images
const POPULAR_TOKENS = [
  { name: "BTC", fullName: "Bitcoin", image: "https://assets.coincap.io/assets/icons/btc@2x.png" },
  { name: "ETH", fullName: "Ethereum", image: "https://assets.coincap.io/assets/icons/eth@2x.png" },
  { name: "SOL", fullName: "Solana", image: "https://assets.coincap.io/assets/icons/sol@2x.png" },
  { name: "USDT", fullName: "Tether", isStablecoin: true, image: "https://assets.coincap.io/assets/icons/usdt@2x.png" },
  { name: "USDC", fullName: "USD Coin", isStablecoin: true, image: "https://assets.coincap.io/assets/icons/usdc@2x.png" },
  { name: "BNB", fullName: "Binance Coin", image: "https://assets.coincap.io/assets/icons/bnb@2x.png" },
  { name: "XRP", fullName: "Ripple", image: "https://assets.coincap.io/assets/icons/xrp@2x.png" },
  { name: "ADA", fullName: "Cardano", image: "https://assets.coincap.io/assets/icons/ada@2x.png" }
];

// Helper function to extract base token and blockchain from ticker
const extractTokenInfo = (ticker: string): { baseToken: string, blockchain: string | null } => {
  // Common base tokens
  const baseTokens = ["BTC", "ETH", "USDT", "USDC", "BNB", "XRP", "ADA", "SOL", "DOGE", "DOT", "AVAX", "MATIC", "LINK", "UNI", "SHIB"];
  
  // Try to match known patterns
  const upperTicker = ticker.toUpperCase();
  
  // Check for common patterns like USDTARB, USDTBSC, etc.
  for (const baseToken of baseTokens) {
    if (upperTicker.startsWith(baseToken)) {
      const remainder = upperTicker.substring(baseToken.length);
      if (remainder) {
        // Try to match the remainder with known blockchains
        for (const [chain, _] of Object.entries(BLOCKCHAIN_MAP)) {
          if (remainder.toLowerCase().includes(chain.toLowerCase())) {
            return { baseToken, blockchain: remainder };
          }
        }
        // If no specific match, but there's a remainder, use it as blockchain
        return { baseToken, blockchain: remainder };
      }
    }
  }
  
  // If no pattern matched, return the ticker as is with no blockchain
  return { baseToken: upperTicker, blockchain: null };
};

// Helper function to get blockchain display info
const getBlockchainDisplay = (blockchain: string): { name: string, color: string } => {
  const lowerChain = blockchain.toLowerCase();
  
  // Try to find a direct match
  for (const [key, value] of Object.entries(BLOCKCHAIN_MAP)) {
    if (lowerChain.includes(key)) {
      return value;
    }
  }
  
  // Default if no match found
  return { name: blockchain, color: "bg-gray-500" };
};

export function TokenSelector({
  isOpen,
  onClose,
  onSelect,
  currencies,
  selectedToken,
  title = "Select a token"
}: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [favoriteTokens, setFavoriteTokens] = useState<string[]>([]);
  const [popularTokenImageErrors, setPopularTokenImageErrors] = useState<Record<string, boolean>>({});

  // Load favorite tokens from local storage
  useEffect(() => {
    const storedFavorites = localStorage.getItem(FAVORITE_TOKENS_KEY);
    if (storedFavorites) {
      try {
        setFavoriteTokens(JSON.parse(storedFavorites));
      } catch (e) {
        console.error("Failed to parse favorite tokens from localStorage", e);
      }
    }
  }, []);

  // Save favorite tokens to local storage
  const saveFavoriteTokens = (tokens: string[]) => {
    localStorage.setItem(FAVORITE_TOKENS_KEY, JSON.stringify(tokens));
    setFavoriteTokens(tokens);
  };

  const handleImageError = (ticker: string) => {
    setImageErrors(prev => ({ ...prev, [ticker]: true }));
  };

  const handlePopularTokenImageError = (tokenName: string) => {
    setPopularTokenImageErrors(prev => ({ ...prev, [tokenName]: true }));
  };

  const toggleFavorite = (ticker: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent selecting the token when clicking the star
    }
    
    if (favoriteTokens.includes(ticker)) {
      saveFavoriteTokens(favoriteTokens.filter(t => t !== ticker));
    } else {
      saveFavoriteTokens([...favoriteTokens, ticker]);
    }
  };

  // Handle popular token selection
  const handlePopularTokenSelect = (tokenName: string) => {
    // Find the first currency that matches the token name (case insensitive)
    const currency = currencies.find(c => 
      c.ticker.toLowerCase().startsWith(tokenName.toLowerCase())
    );
    
    if (currency) {
      handleSelectToken(currency.ticker);
    }
  };

  // Filter currencies based on search query
  const filteredCurrencies = currencies.filter(currency => {
    const query = searchQuery.toLowerCase();
    const { baseToken } = extractTokenInfo(currency.ticker);
    
    return currency.ticker.toLowerCase().includes(query) ||
           currency.name.toLowerCase().includes(query) ||
           baseToken.toLowerCase().includes(query);
  });

  // Sort currencies with favorites first
  const sortedCurrencies = [...filteredCurrencies].sort((a, b) => {
    // First sort by favorites
    const aIsFavorite = favoriteTokens.includes(a.ticker);
    const bIsFavorite = favoriteTokens.includes(b.ticker);
    
    if (aIsFavorite && !bIsFavorite) return -1;
    if (!aIsFavorite && bIsFavorite) return 1;
    
    // Then sort by base token
    const aInfo = extractTokenInfo(a.ticker);
    const bInfo = extractTokenInfo(b.ticker);
    
    if (aInfo.baseToken !== bInfo.baseToken) {
      return aInfo.baseToken.localeCompare(bInfo.baseToken);
    }
    
    // If same base token, sort by blockchain
    if (aInfo.blockchain && bInfo.blockchain) {
      return aInfo.blockchain.localeCompare(bInfo.blockchain);
    }
    
    // Fallback to name
    return a.name.localeCompare(b.name);
  });

  const handleSelectToken = (ticker: string) => {
    onSelect(ticker);
    onClose();
    setSearchQuery(""); // Reset search when closing
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col bg-black border-gray-800 p-0">
        <DialogHeader className="p-4 border-b border-gray-800">
          <DialogTitle className="flex justify-between items-center">
            <span>Select a token</span>
          </DialogTitle>
        </DialogHeader>
        
        {/* Search input */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Token name or ticker"
              className="pl-10 pr-10 bg-gray-900 border-gray-800"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={clearSearch}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Popular tokens */}
          {!searchQuery && (
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-2">Popular tokens</div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TOKENS.map((token) => (
                  <TooltipProvider key={token.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 border-gray-800 flex items-center gap-1.5"
                          onClick={() => handlePopularTokenSelect(token.name)}
                        >
                          {token.image && !popularTokenImageErrors[token.name] ? (
                            <div className="w-5 h-5 relative">
                              <Image
                                src={token.image}
                                alt={token.name}
                                fill
                                className="object-contain rounded-full"
                                onError={() => handlePopularTokenImageError(token.name)}
                              />
                            </div>
                          ) : (
                            <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-700">
                              {token.name.charAt(0)}
                            </div>
                          )}
                          <span>{token.name}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{token.fullName}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Token list */}
        <div className="overflow-y-auto flex-1 px-2">
          <div className="grid grid-cols-1 gap-1">
            {sortedCurrencies.map((currency) => {
              const { baseToken, blockchain } = extractTokenInfo(currency.ticker);
              const blockchainDisplay = blockchain ? getBlockchainDisplay(blockchain) : null;
              
              return (
                <Button
                  key={currency.ticker}
                  variant="ghost"
                  className={`w-full justify-between h-auto py-3 px-4 ${
                    selectedToken === currency.ticker ? "bg-gray-800" : ""
                  }`}
                  onClick={() => handleSelectToken(currency.ticker)}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3">
                      {currency.image && !imageErrors[currency.ticker] ? (
                        <div className="w-8 h-8 relative">
                          <Image
                            src={currency.image}
                            alt={currency.name}
                            width={32}
                            height={32}
                            className="object-contain rounded-full"
                            onError={() => handleImageError(currency.ticker)}
                          />
                        </div>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-700">
                          {baseToken.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-start">
                      <div className="font-medium">{baseToken}</div>
                      <div className="text-sm text-muted-foreground">{currency.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {blockchainDisplay && (
                      <span className={`text-xs px-2 py-1 rounded-full ${blockchainDisplay.color} text-white`}>
                        {blockchainDisplay.name}
                      </span>
                    )}
                    
                    <div
                      role="button"
                      tabIndex={0}
                      className={`h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground ${favoriteTokens.includes(currency.ticker) ? 'text-yellow-500' : 'text-muted-foreground'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(currency.ticker, e);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          toggleFavorite(currency.ticker);
                        }
                      }}
                    >
                      {favoriteTokens.includes(currency.ticker) ? (
                        <Star className="h-4 w-4 fill-current" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </Button>
              );
            })}
            
            {sortedCurrencies.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No tokens found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 