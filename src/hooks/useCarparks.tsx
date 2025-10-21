import { useState, useEffect } from 'react';
import { Carpark } from '../types';
import { CarparkService } from '../services/carparkService';

export function useCarparks() {
  const [carparks, setCarparks] = useState<Carpark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCarparks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CarparkService.fetchCarparks();
      setCarparks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch carparks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarparks();
  }, []);

  return {
    carparks,
    loading,
    error,
    refetch: fetchCarparks
  };
}
