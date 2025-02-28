// ChangeNOW API Service
const API_KEY = 'f2ff07ba2116b356f3482c7f206d41b098e3866510bc8d718aa268f45df9eb8b';
const API_URL = 'https://api.changenow.io/v1';
const USE_PROXY = true; // Set to true to use the proxy API route

export interface ExchangeAmount {
  estimatedAmount: string;
  transactionSpeedForecast: string;
  warningMessage?: string;
}

export interface MinimalExchangeAmount {
  minAmount: string;
}

export interface Currency {
  ticker: string;
  name: string;
  image: string;
  hasExternalId: boolean;
  isFiat: boolean;
  featured: boolean;
  isStable: boolean;
  supportsFixedRate: boolean;
  network?: string;
}

export interface ExchangeRange {
  minAmount: string;
  maxAmount: string;
}

export interface CreateTransaction {
  payinAddress: string;
  payoutAddress: string;
  payoutExtraId?: string;
  id: string;
  amount: string;
}

// Helper function to handle API errors
async function handleApiResponse(response: Response) {
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error (${response.status}): ${errorText}`);
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  return response.json();
}

// Get list of available currencies
export async function getAvailableCurrencies(): Promise<Currency[]> {
  console.log('Fetching available currencies...');
  
  if (USE_PROXY) {
    const response = await fetch(`/api/changenow?endpoint=currencies&active=true&fixedRate=true`, {
      cache: 'no-store'
    });
    
    return handleApiResponse(response);
  } else {
    const response = await fetch(`${API_URL}/currencies?active=true&fixedRate=true`, {
      headers: {
        'x-changenow-api-key': API_KEY,
      },
      cache: 'no-store'
    });
    
    return handleApiResponse(response);
  }
}

// Get estimated exchange amount
export async function getEstimatedExchange(
  fromCurrency: string,
  toCurrency: string,
  amount: string
): Promise<ExchangeAmount> {
  console.log(`Estimating exchange: ${amount} ${fromCurrency} to ${toCurrency}`);
  
  if (USE_PROXY) {
    const response = await fetch(
      `/api/changenow?endpoint=exchange-amount/${amount}/${fromCurrency}_${toCurrency}`,
      {
        cache: 'no-store'
      }
    );
    
    return handleApiResponse(response);
  } else {
    const response = await fetch(
      `${API_URL}/exchange-amount/${amount}/${fromCurrency}_${toCurrency}?api_key=${API_KEY}`,
      {
        cache: 'no-store'
      }
    );
    
    return handleApiResponse(response);
  }
}

// Get minimal exchange amount
export async function getMinimalExchangeAmount(
  fromCurrency: string,
  toCurrency: string
): Promise<MinimalExchangeAmount> {
  console.log(`Getting minimal exchange amount for ${fromCurrency} to ${toCurrency}`);
  
  if (USE_PROXY) {
    const response = await fetch(
      `/api/changenow?endpoint=min-amount/${fromCurrency}_${toCurrency}`,
      {
        cache: 'no-store'
      }
    );
    
    return handleApiResponse(response);
  } else {
    const response = await fetch(
      `${API_URL}/min-amount/${fromCurrency}_${toCurrency}?api_key=${API_KEY}`,
      {
        cache: 'no-store'
      }
    );
    
    return handleApiResponse(response);
  }
}

// Get exchange range
export async function getExchangeRange(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRange> {
  console.log(`Getting exchange range for ${fromCurrency} to ${toCurrency}`);
  
  if (USE_PROXY) {
    const response = await fetch(
      `/api/changenow?endpoint=exchange-range/${fromCurrency}_${toCurrency}`,
      {
        cache: 'no-store'
      }
    );
    
    return handleApiResponse(response);
  } else {
    const response = await fetch(
      `${API_URL}/exchange-range/${fromCurrency}_${toCurrency}?api_key=${API_KEY}`,
      {
        cache: 'no-store'
      }
    );
    
    return handleApiResponse(response);
  }
}

// Create transaction
export async function createTransaction(
  fromCurrency: string,
  toCurrency: string,
  amount: string,
  address: string,
  extraId?: string,
  refundAddress?: string
): Promise<CreateTransaction> {
  console.log(`Creating transaction: ${amount} ${fromCurrency} to ${toCurrency}`);
  
  const payload = {
    from: fromCurrency,
    to: toCurrency,
    amount: amount,
    address: address,
    extraId: extraId,
    refundAddress: refundAddress,
  };
  
  if (USE_PROXY) {
    const response = await fetch(`/api/changenow?endpoint=transactions/${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    
    return handleApiResponse(response);
  } else {
    const response = await fetch(`${API_URL}/transactions/${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
    
    return handleApiResponse(response);
  }
}

// Get transaction status
export async function getTransactionStatus(id: string): Promise<any> {
  console.log(`Getting transaction status for ${id}`);
  
  if (USE_PROXY) {
    const response = await fetch(`/api/changenow?endpoint=transactions/${id}/${API_KEY}`, {
      cache: 'no-store'
    });
    
    return handleApiResponse(response);
  } else {
    const response = await fetch(`${API_URL}/transactions/${id}/${API_KEY}`, {
      cache: 'no-store'
    });
    
    return handleApiResponse(response);
  }
}

// Function to check API connectivity
export async function checkApiConnectivity(): Promise<boolean> {
  try {
    if (USE_PROXY) {
      const response = await fetch(`/api/changenow?endpoint=market-info/available-pairs`, {
        method: 'GET',
        cache: 'no-store'
      });
      
      return response.ok;
    } else {
      const response = await fetch(`${API_URL}/market-info/available-pairs?api_key=${API_KEY}`, {
        method: 'GET',
        cache: 'no-store'
      });
      
      return response.ok;
    }
  } catch (error) {
    console.error('API connectivity check failed:', error);
    return false;
  }
} 