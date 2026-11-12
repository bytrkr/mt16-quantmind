// BIST Matriks Data API Reader & Key Validator
export interface MatriksStatus {
  hasKey: boolean;
  statusText: string;
}

export function checkMatriksKey(): MatriksStatus {
  const apiKey = process.env.MATRIKS_API_KEY;
  const username = process.env.MATRIKS_USERNAME;
  const password = process.env.MATRIKS_PASSWORD;

  const hasKey = Boolean(
    apiKey && 
    apiKey !== 'your_matriks_api_key_here' && 
    apiKey.trim().length > 5
  ) || Boolean(username && password && username !== 'your_matriks_username_here');

  return {
    hasKey,
    statusText: hasKey ? "MATRIKS CANLI VERİ AKIŞI AKTİF" : "MATRIKS ANAHTARI YOK"
  };
}
