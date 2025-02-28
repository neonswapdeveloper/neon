import { Currency } from './api';

interface AISwapInstruction {
  fromToken: string;
  toToken: string;
  amount: string;
  destinationAddress?: string;
  blockchain?: string;
}

export async function processSwapInstruction(
  instruction: string,
  availableCurrencies: Currency[]
): Promise<AISwapInstruction | null> {
  try {
    // Préparer la liste des tokens disponibles pour l'IA
    const availableTokens = availableCurrencies.map(c => c.ticker).join(', ');
    
    // Préparer une liste des blockchains courantes pour aider l'IA
    const commonBlockchains = [
      "ethereum", "eth", "erc20",
      "binance", "bsc", "bnb", "bep20",
      "polygon", "matic",
      "arbitrum", "arb",
      "optimism", "op",
      "avalanche", "avax",
      "solana", "sol",
      "fantom", "ftm",
      "tron", "trx"
    ];
    
    // Construire le prompt pour l'IA
    const prompt = `
Tu es un assistant spécialisé dans l'analyse d'instructions de swap de cryptomonnaies.
Analyse l'instruction suivante et extrait les informations pertinentes.

Instruction: "${instruction}"

Tokens disponibles: ${availableTokens}

Blockchains courantes: ${commonBlockchains.join(', ')}

RÈGLES IMPORTANTES:
1. Par défaut, la blockchain spécifiée s'applique UNIQUEMENT au token de destination (toToken), pas au token source.
2. Le token source (fromToken) doit être considéré dans sa blockchain native par défaut, sauf si explicitement spécifié autrement.
3. Par exemple, dans "swap 1 btc to eth on arbitrum", "btc" est sur sa blockchain native, et "eth" est sur Arbitrum.
4. Si l'instruction précise explicitement une blockchain pour le token source, respecte cette précision.

Réponds UNIQUEMENT avec un objet JSON au format suivant:
{
  "fromToken": "ticker du token source (en minuscules)",
  "toToken": "ticker du token destination (en minuscules)",
  "amount": "montant à échanger (nombre uniquement)",
  "destinationAddress": "adresse de destination si présente",
  "blockchain": "nom de la blockchain mentionnée (ethereum, arbitrum, polygon, etc.)",
  "applyBlockchainToSource": false
}

Le champ "applyBlockchainToSource" doit être true UNIQUEMENT si l'instruction précise explicitement que le token source est aussi sur la blockchain spécifiée.
Si certaines informations sont manquantes, laisse les champs correspondants vides.
Si tu ne peux pas déterminer les tokens, utilise "eth" pour fromToken et "btc" pour toToken par défaut.
`;

    // Appeler l'API Zuki Journey
    const response = await fetch('https://api.zukijourney.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer zu-8de8655b1f6de54c244e6c365094877a'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku', // Vous pouvez changer le modèle selon vos besoins
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.1 // Température basse pour des réponses plus déterministes
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Extraire l'objet JSON de la réponse
    try {
      // Rechercher un objet JSON dans la réponse
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        // Traiter les informations de blockchain pour trouver le bon ticker
        let fromTokenWithChain = parsedResponse.fromToken || '';
        let toTokenWithChain = parsedResponse.toToken || '';
        const blockchain = parsedResponse.blockchain || '';
        const applyBlockchainToSource = parsedResponse.applyBlockchainToSource === true;
        
        // Si une blockchain est spécifiée, chercher le token correspondant
        if (blockchain && blockchain !== '') {
          // Normaliser le nom de la blockchain
          const normalizedBlockchain = normalizeBlockchainName(blockchain);
          
          // Appliquer la blockchain au token source UNIQUEMENT si explicitement demandé
          if (fromTokenWithChain && applyBlockchainToSource) {
            const matchingFromToken = findTokenWithBlockchain(availableCurrencies, fromTokenWithChain, normalizedBlockchain);
            if (matchingFromToken) {
              fromTokenWithChain = matchingFromToken;
            }
          }
          
          // Toujours appliquer la blockchain au token de destination
          if (toTokenWithChain) {
            const matchingToToken = findTokenWithBlockchain(availableCurrencies, toTokenWithChain, normalizedBlockchain);
            if (matchingToToken) {
              toTokenWithChain = matchingToToken;
            }
          }
        }
        
        return {
          fromToken: fromTokenWithChain,
          toToken: toTokenWithChain,
          amount: parsedResponse.amount || '',
          destinationAddress: parsedResponse.destinationAddress || '',
          blockchain: blockchain
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
    }
    
    return null;
  } catch (error) {
    console.error('AI service error:', error);
    return null;
  }
}

// Fonction pour normaliser le nom de la blockchain
function normalizeBlockchainName(blockchain: string): string {
  const normalized = blockchain.toLowerCase();
  
  // Mappings des noms de blockchain
  const mappings: Record<string, string> = {
    'ethereum': 'eth',
    'ether': 'eth',
    'erc20': 'eth',
    'erc-20': 'eth',
    'binance': 'bsc',
    'binance smart chain': 'bsc',
    'bep20': 'bsc',
    'bep-20': 'bsc',
    'polygon': 'matic',
    'arbitrum': 'arb',
    'optimism': 'op',
    'avalanche': 'avax',
    'solana': 'sol',
    'fantom': 'ftm',
    'tron': 'trx'
  };
  
  return mappings[normalized] || normalized;
}

// Fonction pour trouver un token avec la blockchain spécifiée
function findTokenWithBlockchain(currencies: Currency[], baseToken: string, blockchain: string): string {
  // Chercher un token qui contient à la fois le nom du token et le nom de la blockchain
  const possibleMatches = currencies.filter(c => {
    const ticker = c.ticker.toLowerCase();
    return ticker.includes(baseToken.toLowerCase()) && ticker.includes(blockchain.toLowerCase());
  });
  
  if (possibleMatches.length > 0) {
    // Trier par longueur de ticker pour prendre le plus spécifique
    possibleMatches.sort((a, b) => a.ticker.length - b.ticker.length);
    return possibleMatches[0].ticker;
  }
  
  // Si aucune correspondance n'est trouvée, essayer de trouver un token avec un suffixe de blockchain
  const suffixMatches = currencies.filter(c => {
    const ticker = c.ticker.toLowerCase();
    return ticker.startsWith(baseToken.toLowerCase()) && 
           ticker.length > baseToken.length && 
           !ticker.includes('_') && !ticker.includes('-');
  });
  
  if (suffixMatches.length > 0) {
    // Chercher un token avec le suffixe de blockchain
    const blockchainMatch = suffixMatches.find(c => 
      c.ticker.toLowerCase().includes(blockchain.toLowerCase())
    );
    
    if (blockchainMatch) {
      return blockchainMatch.ticker;
    }
    
    // Si aucune correspondance exacte, retourner le premier token avec un suffixe
    return suffixMatches[0].ticker;
  }
  
  // Si aucune correspondance n'est trouvée, retourner le token de base
  return baseToken;
} 