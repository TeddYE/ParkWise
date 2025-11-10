import { Car, Motorbike, Truck } from 'lucide-react';

/**
 * Lot type utilities for consistent rendering across components
 */

export type LotType = 'C' | 'Y' | 'H';

export interface LotTypeConfig {
  icon: React.ReactNode;
  emoji: string;
  label: string;
  bgColor: string;
  textColor: string;
  gradient: string;
}

/**
 * Get icon component for a lot type
 */
export function getLotIcon(lotType: string, size: 'sm' | 'md' = 'md') {
  const className = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  switch (lotType) {
    case 'C':
      return <Car className={className} />;
    case 'Y':
      return <Motorbike className={className} />;
    case 'H':
      return <Truck className={className} />;
    default:
      return <Car className={className} />;
  }
}

/**
 * Get emoji icon for a lot type (for map tooltips)
 */
export function getLotEmoji(lotType: string): string {
  switch (lotType) {
    case 'C':
      return '🚗';
    case 'Y':
      return '🏍️';
    case 'H':
      return '🚛';
    default:
      return '🚗';
  }
}

/**
 * Get Tailwind CSS classes for lot type badge background
 */
export function getLotBgColor(lotType: string): string {
  switch (lotType) {
    case 'C':
      return 'bg-blue-100 text-blue-800';
    case 'Y':
      return 'bg-green-100 text-green-800';
    case 'H':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

/**
 * Get CSS gradient for lot type (for map tooltips)
 */
export function getLotGradient(lotType: string): string {
  switch (lotType) {
    case 'C':
      return 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
    case 'Y':
      return 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
    case 'H':
      return 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)';
    default:
      return 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)';
  }
}

/**
 * Get text color for lot type (for map tooltips)
 */
export function getLotTextColor(lotType: string): string {
  switch (lotType) {
    case 'C':
      return '#1e40af';
    case 'Y':
      return '#166534';
    case 'H':
      return '#c2410c';
    default:
      return '#1e40af';
  }
}

/**
 * Get human-readable label for lot type
 */
export function getLotTypeLabel(lotType: string): string {
  switch (lotType) {
    case 'C':
      return 'Car';
    case 'Y':
      return 'Motorcycle';
    case 'H':
      return 'Heavy Vehicle';
    default:
      return lotType;
  }
}

/**
 * Get all lot type configuration
 */
export function getLotTypeConfig(lotType: string, size: 'sm' | 'md' = 'md'): LotTypeConfig {
  return {
    icon: getLotIcon(lotType, size),
    emoji: getLotEmoji(lotType),
    label: getLotTypeLabel(lotType),
    bgColor: getLotBgColor(lotType),
    textColor: getLotTextColor(lotType),
    gradient: getLotGradient(lotType),
  };
}
