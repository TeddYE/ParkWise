import { useEffect, useRef, useState } from 'react';
import { Carpark } from '../types';
import { getCarparkDisplayName } from '../utils/carpark';

interface LeafletMapProps {
  carparks: Carpark[];
  userLocation: { lat: number; lng: number } | null;
  selectedCarparkId: string | null;
  onCarparkClick: (carpark: Carpark) => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  onZoomChange?: (zoom: number) => void;
  searchLocation?: { lat: number; lng: number; address?: string } | null;
}

declare global {
  interface Window {
    L: any;
  }
}

export function LeafletMap({ carparks, userLocation, selectedCarparkId, onCarparkClick, onBoundsChange, onZoomChange, searchLocation }: LeafletMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const searchMarkerRef = useRef<any>(null);
  const boundsUpdateTimeoutRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);

  // Load Leaflet CSS and JS
  useEffect(() => {
    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // Check if Leaflet is already loaded
    if (window.L) {
      setLeafletReady(true);
      return;
    }

    // Load Leaflet JS if not already loaded
    const existingScript = document.querySelector('script[src*="leaflet.js"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = '';
      document.head.appendChild(script);
      
      script.onload = () => {
        console.log('Leaflet library loaded');
        setLeafletReady(true);
      };
    } else {
      // Script exists, wait for it to load
      const checkInterval = setInterval(() => {
        if (window.L) {
          console.log('Leaflet library ready');
          setLeafletReady(true);
          clearInterval(checkInterval);
        }
      }, 100);
      
      // Clear interval after 5 seconds to prevent memory leak
      setTimeout(() => clearInterval(checkInterval), 5000);
    }
  }, []);

  // Initialize empty map first (before carparks are loaded)
  useEffect(() => {
    if (!leafletReady || !window.L || !mapRef.current || mapInstanceRef.current) return;

    console.log('Initializing empty map...');
    
    // Always start with Singapore city centre (Raffles Place)
    const defaultCenter = { lat: 1.2897, lng: 103.8501 };

    // Create map immediately with default location
    const map = window.L.map(mapRef.current).setView([defaultCenter.lat, defaultCenter.lng], 13);

    // Add OpenStreetMap tiles
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Listen for map movement and zoom events
    const updateBounds = () => {
      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
      }
      
      boundsUpdateTimeoutRef.current = setTimeout(() => {
        if (map) {
          if (onBoundsChange) {
            const bounds = map.getBounds();
            onBoundsChange({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest(),
            });
          }
          if (onZoomChange) {
            onZoomChange(map.getZoom());
          }
        }
      }, 300); // Debounce for 300ms
    };

    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    // Initial bounds and zoom update
    updateBounds();

    mapInstanceRef.current = map;

    // Force map to recalculate its size after initialization
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        console.log('Map size invalidated and recalculated');
      }
    }, 100);

    console.log('Empty map initialized successfully');

    return () => {
      if (boundsUpdateTimeoutRef.current) {
        clearTimeout(boundsUpdateTimeoutRef.current);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletReady, onBoundsChange, onZoomChange]); // Wait for Leaflet to be ready

  // Pan to user location when it becomes available (but don't re-initialize map)
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    
    console.log('User location available, panning to:', userLocation);
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14, {
      animate: true,
      duration: 1
    });
  }, [userLocation]);

  // Update user location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !userLocation) return;

    // Remove old user marker
    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
    }

    // Create custom blue icon for user location
    const userIcon = window.L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="position: relative;">
          <div style="
            width: 20px;
            height: 20px;
            background-color: #4285F4;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50px;
            height: 50px;
            background-color: rgba(66, 133, 244, 0.2);
            border-radius: 50%;
            animation: pulse 2s infinite;
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const marker = window.L.marker([userLocation.lat, userLocation.lng], {
      icon: userIcon,
      zIndexOffset: 1000,
    }).addTo(mapInstanceRef.current);

    marker.bindPopup('<strong>Your Location</strong>');
    userMarkerRef.current = marker;

    // Pan to user location
    mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 14);
  }, [userLocation]);

  // Pan to search location when it becomes available
  useEffect(() => {
    if (!mapInstanceRef.current || !searchLocation) return;
    
    console.log('Search location available, panning to:', searchLocation);
    mapInstanceRef.current.setView([searchLocation.lat, searchLocation.lng], 15, {
      animate: true,
      duration: 1
    });
  }, [searchLocation]);

  // Update search location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Remove old search marker if it exists
    if (searchMarkerRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }

    // Add new search marker if searchLocation is set
    if (searchLocation) {
      // Create custom pulsing orange/amber icon for search location (similar to user location marker)
      const searchIcon = window.L.divIcon({
        className: 'search-location-marker',
        html: `
          <div style="position: relative;">
            <div style="
              width: 24px;
              height: 24px;
              background-color: #f59e0b;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 60px;
              height: 60px;
              background-color: rgba(245, 158, 11, 0.3);
              border-radius: 50%;
              animation: searchPulse 2s infinite;
            "></div>
            <div style="
              position: absolute;
              top: -8px;
              left: 50%;
              transform: translateX(-50%);
              background: #f59e0b;
              color: white;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
              white-space: nowrap;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">📍 SEARCH</div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = window.L.marker([searchLocation.lat, searchLocation.lng], {
        icon: searchIcon,
        zIndexOffset: 999,
      }).addTo(mapInstanceRef.current);

      const popupContent = searchLocation.address 
        ? `<strong>Search Location</strong><br/>${searchLocation.address}`
        : '<strong>Search Location</strong>';
      
      marker.bindPopup(popupContent);
      searchMarkerRef.current = marker;
    }
  }, [searchLocation]);

  // Update carpark markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => mapInstanceRef.current.removeLayer(marker));
    markersRef.current = [];

    // Create new markers
    const newMarkers = carparks.map((carpark) => {
      const availabilityPercentage = (carpark.availableLots / carpark.totalLots) * 100;
      
      // Use the distance and driving time from the carpark data
      // (which may already include real driving times from OSRM)
      // If no user location, these will be undefined
      const actualDistance = carpark.distance !== undefined ? carpark.distance : null;
      const actualDrivingTime = carpark.drivingTime !== undefined ? carpark.drivingTime : null;
      
      // Determine marker color based on availability
      let markerColor = '#22c55e'; // green
      if (availabilityPercentage <= 10) {
        markerColor = '#ef4444'; // red
      } else if (availabilityPercentage <= 30) {
        markerColor = '#eab308'; // yellow
      }

      // Create custom marker icon
      const isSelected = selectedCarparkId === carpark.id;
      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            position: relative;
            ${isSelected ? 'animation: bounce 1s infinite;' : ''}
          ">
            <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C7.16 0 0 7.16 0 16c0 11 16 24 16 24s16-13 16-24c0-8.84-7.16-16-16-16zm0 22c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" 
                    fill="${markerColor}" 
                    stroke="white" 
                    stroke-width="2"/>
            </svg>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
      });

      const marker = window.L.marker([carpark.latitude, carpark.longitude], {
        icon: icon,
      }).addTo(mapInstanceRef.current);

      // Create tooltip content (shows on hover)
      const displayName = getCarparkDisplayName(carpark);
      const tooltipContent = `
        <div style="padding: 8px; min-width: 220px; max-width: 280px;">
          <div style="margin-bottom: 6px;">
            <strong style="font-size: 14px; color: #1f2937;">${displayName}</strong>
          </div>
          ${carpark.name && carpark.name.trim() !== '' ? `
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; line-height: 1.4;">
            ${carpark.address}
          </div>
          ` : ''}
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
            <span style="
              display: inline-flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              padding: 2px 8px;
              background: ${availabilityPercentage > 30 ? '#dcfce7' : availabilityPercentage > 10 ? '#fef9c3' : '#fee2e2'};
              color: ${availabilityPercentage > 30 ? '#166534' : availabilityPercentage > 10 ? '#854d0e' : '#991b1b'};
              border-radius: 4px;
              font-weight: 500;
            ">
              🚗 ${carpark.availableLots}/${carpark.totalLots} lots
            </span>
            ${carpark.evLots > 0 ? `
              <span style="
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                padding: 2px 8px;
                background: #dbeafe;
                color: #1e40af;
                border-radius: 4px;
                font-weight: 500;
              ">
                ⚡ ${carpark.evLots} EV Lots
              </span>
            ` : ''}
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #374151; padding-top: 6px; border-top: 1px solid #e5e7eb;">
            <span style="font-weight: 500;">💵 S${carpark.rates.hourly.toFixed(2)}/hr</span>
            <span style="font-weight: 500;">📍 ${actualDistance !== null ? `${actualDistance}km` : '-'} away</span>
            <span style="font-weight: 500;">🚙 ${actualDrivingTime !== null ? `${actualDrivingTime} min` : '-'}</span>
          </div>
        </div>
      `;

      // Bind tooltip (shows on hover) with permanent option for better visibility
      marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        offset: [0, -40],
        opacity: 0.95,
        className: 'custom-leaflet-tooltip'
      });

      // Click handler
      marker.on('click', () => {
        onCarparkClick(carpark);
      });

      return marker;
    });

    markersRef.current = newMarkers;
  }, [carparks, selectedCarparkId, onCarparkClick]);

  // Pan to selected carpark
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedCarparkId) return;

    const selectedCarpark = carparks.find(cp => cp.id === selectedCarparkId);
    if (selectedCarpark) {
      mapInstanceRef.current.setView([selectedCarpark.latitude, selectedCarpark.longitude], 16);
    }
  }, [selectedCarparkId, carparks]);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
        }
        
        @keyframes searchPulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.4);
            opacity: 0.2;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .leaflet-container {
          width: 100%;
          height: 100%;
        }
        
        .user-location-marker,
        .search-location-marker,
        .custom-marker {
          background: transparent;
          border: none;
        }
        
        .custom-leaflet-tooltip {
          background: white;
          border: none;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 0;
        }
        
        .custom-leaflet-tooltip::before {
          display: none;
        }
        
        .leaflet-tooltip-top::before {
          border-top-color: white;
        }
        
        .leaflet-container,
        .leaflet-pane,
        .leaflet-map-pane {
          z-index: 0 !important;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full relative z-0" />
    </>
  );
}
