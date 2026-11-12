// BIST Price Limits (Ceiling %10, Floor %10, Circuit Breaker %6)
export interface BistLimits {
  basePrice: number;
  ceilingPrice: number;
  floorPrice: number;
  circuitBreakerPrice: number;
}

export function calculateBistLimits(basePrice: number): BistLimits {
  return {
    basePrice,
    ceilingPrice: Math.round(basePrice * 1.10 * 100) / 100,
    floorPrice: Math.round(basePrice * 0.90 * 100) / 100,
    circuitBreakerPrice: Math.round(basePrice * 0.94 * 100) / 100
  };
}
