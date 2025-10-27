import { useEffect, useRef, useState } from 'react';
import { Carpark } from '../types';
import { getCarparkMapDisplayName } from '../utils/carpark';

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

    // Create custom blue icon for user location with sleek design
    const userIcon = window.L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="position: relative;">
          <div style="
            width: 24px;
            height: 24px;
            background: linear-gradient(135deg, #4285F4 0%, #3367D6 100%);
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 3px 10px rgba(66, 133, 244, 0.4), 0 1px 3px rgba(0, 0, 0, 0.2);
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 60px;
            height: 60px;
            background-color: rgba(66, 133, 244, 0.25);
            border-radius: 50%;
            animation: pulse 2s infinite;
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 12px;
            height: 12px;
            background-color: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
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
      // Create custom sleek orange/amber icon for search location
      const searchIcon = window.L.divIcon({
        className: 'search-location-marker',
        html: `
          <div style="position: relative;">
            <div style="
              width: 28px;
              height: 28px;
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              border: 4px solid white;
              border-radius: 50%;
              box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5), 0 1px 4px rgba(0, 0, 0, 0.2);
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 70px;
              height: 70px;
              background-color: rgba(245, 158, 11, 0.3);
              border-radius: 50%;
              animation: searchPulse 2s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 14px;
              height: 14px;
              background-color: white;
              border-radius: 50%;
            "></div>
            <div style="
              position: absolute;
              top: -28px;
              left: 50%;
              transform: translateX(-50%);
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white;
              padding: 4px 10px;
              border-radius: 6px;
              font-size: 10px;
              font-weight: 600;
              white-space: nowrap;
              box-shadow: 0 3px 8px rgba(245, 158, 11, 0.4);
              letter-spacing: 0.5px;
            ">📍 SEARCH</div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
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
      // Use the distance and driving time from the carpark data
      // (which may already include real driving times from OSRM)
      // If no user location, these will be undefined
      const actualDistance = carpark.distance !== undefined ? carpark.distance : null;
      const actualDrivingTime = carpark.drivingTime !== undefined ? carpark.drivingTime : null;

      // Determine marker color based on occupancy (filled percentage)
      const occupancyPercentage = carpark.totalLots !== null && carpark.totalLots > 0
        ? ((carpark.totalLots - carpark.availableLots) / carpark.totalLots) * 100
        : 0;

      let markerColor = '#22c55e'; // green (default - less than 60% filled)
      if (carpark.totalLots === null) {
        markerColor = '#9ca3af'; // gray for unknown
      } else if (occupancyPercentage > 80) {
        markerColor = '#ef4444'; // red (more than 80% filled)
      } else if (occupancyPercentage > 60) {
        markerColor = '#eab308'; // yellow (60-80% filled)
      }

      // Create custom marker icon with sleek modern design
      const isSelected = selectedCarparkId === carpark.id;
      const icon = window.L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            position: relative;
            ${isSelected ? 'animation: bounce 1s infinite;' : ''}
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.25));
          ">
            <svg width="36" height="44" viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="gradient-${carpark.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:${markerColor};stop-opacity:1" />
                  <stop offset="100%" style="stop-color:${markerColor};stop-opacity:0.85" />
                </linearGradient>
                <filter id="shadow-${carpark.id}">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/>
                </filter>
              </defs>
              <!-- Main pin body -->
              <path d="M18 2C10.268 2 4 8.268 4 16c0 1.5 0.5 3.5 1.5 6C7.5 26.5 18 42 18 42s10.5-15.5 12.5-20c1-2.5 1.5-4.5 1.5-6 0-7.732-6.268-14-14-14z" 
                    fill="url(#gradient-${carpark.id})" 
                    stroke="white" 
                    stroke-width="2.5"
                    stroke-linejoin="round"/>
              <!-- Inner circle -->
              <circle cx="18" cy="16" r="6" fill="white" opacity="0.95"/>
              <!-- Center dot -->
              <circle cx="18" cy="16" r="3.5" fill="${markerColor}"/>
            </svg>
            ${isSelected ? `
              <div style="
                position: absolute;
                top: -4px;
                left: 50%;
                transform: translateX(-50%);
                width: 44px;
                height: 44px;
                border: 2px solid ${markerColor};
                border-radius: 50%;
                opacity: 0.4;
                animation: ripple 1.5s infinite;
              "></div>
            ` : ''}
          </div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 44],
        popupAnchor: [0, -44],
      });

      const marker = window.L.marker([carpark.latitude, carpark.longitude], {
        icon: icon,
      }).addTo(mapInstanceRef.current);

      // Create tooltip content (shows on hover) with sleek design
      const displayName = getCarparkMapDisplayName(carpark, 28);
      const carparkType = carpark.car_park_type ? carpark.car_park_type.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : '';
      const tooltipContent = `
        <div style="padding: 12px; min-width: 240px; max-width: 300px;">
          <div style="margin-bottom: 8px;">
            <strong style="font-size: 15px; color: #111827; font-weight: 600; word-wrap: break-word; overflow-wrap: break-word; display: block;">${displayName}</strong>
          </div>

          ${carparkType ? `
          <div style="margin-bottom: 10px;">
            <span style="
              display: inline-block;
              font-size: 11px;
              padding: 3px 8px;
              background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
              color: #3730a3;
              border-radius: 4px;
              font-weight: 600;
            ">
              ${carparkType}
            </span>
          </div>
          ` : ''}
          <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px;">
            <span style="
              display: inline-flex;
              align-items: center;
              gap: 5px;
              font-size: 12px;
              padding: 4px 10px;
              background: ${occupancyPercentage <= 60 ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' : occupancyPercentage <= 80 ? 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'};
              color: ${occupancyPercentage <= 60 ? '#166534' : occupancyPercentage <= 80 ? '#854d0e' : '#991b1b'};
              border-radius: 6px;
              font-weight: 600;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            ">
              🚗 ${carpark.totalLots !== null ? carpark.totalLots - carpark.availableLots : 'N/A'}/${carpark.totalLots !== null ? carpark.totalLots : 'N/A'}
            </span>
            ${carpark.evLots > 0 ? `
              <span style="
                display: inline-flex;
                align-items: center;
                gap: 5px;
                font-size: 12px;
                padding: 4px 10px;
                background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                color: #1e40af;
                border-radius: 6px;
                font-weight: 600;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
              ">
                ⚡ ${carpark.evLots} EV
              </span>
            ` : ''}
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding-top: 10px; border-top: 2px solid #f3f4f6;">
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Rate</div>
              <div style="font-size: 13px; font-weight: 600; color: #111827;">S${carpark.rates.hourly.toFixed(2)}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Distance</div>
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${actualDistance !== null ? `${actualDistance}km` : '-'}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 11px; color: #9ca3af; margin-bottom: 2px;">Drive</div>
              <div style="font-size: 13px; font-weight: 600; color: #111827;">${actualDrivingTime !== null ? `${actualDrivingTime} min` : '-'}</div>
            </div>
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
        
        @keyframes ripple {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0.2;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.6;
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
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08);
          padding: 0;
          backdrop-filter: blur(10px);
        }
        
        .custom-leaflet-tooltip::before {
          display: none;
        }
        
        .leaflet-tooltip-top::before {
          border-top-color: white;
        }
        
        .custom-marker {
          transition: transform 0.2s ease-in-out;
        }
        
        .custom-marker:hover {
          transform: scale(1.1);
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
