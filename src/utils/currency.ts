import { Currency } from '../types';

// Approximate rates to TWD (updated manually, can be replaced with API later)
const RATES_TO_TWD: Record<Currency, number> = {
  TWD: 1,
  JPY: 0.22,
  KRW: 0.024,
  CNY: 4.5,
  USD: 32,
};

export function convertToTWD(amount: number, currency: Currency): number {
  return Math.round(amount * RATES_TO_TWD[currency]);
}

export const CURRENCIES: Currency[] = ['TWD', 'JPY', 'KRW', 'CNY', 'USD'];
