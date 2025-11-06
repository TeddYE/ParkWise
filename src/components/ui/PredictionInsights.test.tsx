import { PredictionInsights } from './PredictionInsights';
import { EnhancedPrediction, PredictionAnalysis } from '../../types';

// Mock data for testing
const mockPredictions: EnhancedPrediction[] = [
  {
    datetime: '2024-01-01T08:00:00Z',
    predicted_lots_available: 45,
    availability_percentage: 75.0,
    status: 'good',
    is_optimal_time: true,
    is_peak_time: false,
    confidence_level: 'high',
  },
  {
    datetime: '2024-01-01T12:00:00Z',
    predicted_lots_available: 15,
    availability_percentage: 25.0,
    status: 'very_limited',
    is_optimal_time: false,
    is_peak_time: true,
    confidence_level: 'high',
  },
  {
    datetime: '2024-01-01T16:00:00Z',
    predicted_lots_available: 35,
    availability_percentage: 58.3,
    status: 'limited',
    is_optimal_time: false,
    is_peak_time: false,
    confidence_level: 'medium',
  },
];

const mockAnalysis: PredictionAnalysis = {
  best_times: [
    {
      time: '8:00 AM',
      availability: 45,
      reason: 'Above average availability',
    },
  ],
  worst_times: [
    {
      time: '12:00 PM',
      availability: 15,
      reason: 'Peak hour congestion',
    },
  ],
  insights: [
    'Best parking times: 8:00 AM',
    'Expect limited availability during peak hours: 12:00 PM',
  ],
  overall_trend: 'declining',
};

const mockCarparkInfo = {
  name: 'Test Carpark',
  totalLots: 60,
};

// Test component to verify PredictionInsights works
export function TestPredictionInsights() {
  return (
    <div className="p-4 space-y-8">
      <h1 className="text-2xl font-bold">PredictionInsights Component Test</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Full Component</h2>
        <PredictionInsights
          predictions={mockPredictions}
          carparkInfo={mockCarparkInfo}
          analysis={mockAnalysis}
        />
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Compact Version</h2>
        <PredictionInsights
          predictions={mockPredictions}
          carparkInfo={mockCarparkInfo}
          analysis={mockAnalysis}
          compact={true}
        />
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Without Analysis (Auto-generated)</h2>
        <PredictionInsights
          predictions={mockPredictions}
          carparkInfo={mockCarparkInfo}
        />
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Empty State</h2>
        <PredictionInsights
          predictions={[]}
          carparkInfo={mockCarparkInfo}
        />
      </div>
    </div>
  );
}

export default TestPredictionInsights;