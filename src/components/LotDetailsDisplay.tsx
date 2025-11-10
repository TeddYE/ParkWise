import { Carpark, getCarparkAvailableLots } from '../types';
import { getLotIcon, getLotBgColor } from '../utils/lotTypes';

interface LotDetailsDisplayProps {
  carpark: Carpark;
  size?: 'sm' | 'md';
}

/**
 * Reusable component for displaying lot details with icons and availability
 */
export function LotDetailsDisplay({ carpark, size = 'md' }: LotDetailsDisplayProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {carpark.lotDetails && carpark.lotDetails.length > 0 ? (
        carpark.lotDetails
          .filter(lot => ['C', 'Y', 'H'].includes(lot.lot_type) && lot.total_lots && lot.total_lots > 0)
          .map((lot) => (
            <div 
              key={lot.lot_type} 
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getLotBgColor(lot.lot_type)}`}
            >
              {getLotIcon(lot.lot_type, size)}
              <span>
                {lot.available_lots}/{lot.total_lots || 'N/A'}
              </span>
            </div>
          ))
      ) : (
        <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
          {getLotIcon('C', size)}
          <span>
            {getCarparkAvailableLots(carpark)}/N/A
          </span>
        </div>
      )}
    </div>
  );
}
