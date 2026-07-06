'use client';

import { useEffect, useRef } from 'react';

interface StoreMarker {
  id: number;
  name: string;
  country: string;
  city: string;
  lng: number;
  lat: number;
  batteryCount: number;
  status: string;
}

interface GlobalMapProps {
  markers: StoreMarker[];
  onMarkerClick?: (store: StoreMarker) => void;
  height?: string;
  center?: [number, number];
  zoom?: number;
}

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
  }
}

export default function GlobalMap({ markers, onMarkerClick, height = '500px', center = [104.0, 15.0], zoom = 4 }: GlobalMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_AMAP_KEY;
    if (!key || !containerRef.current) return;

    const initMap = () => {
      if (!window.AMap || mapRef.current) return;

      window._AMapSecurityConfig = { securityJsCode: process.env.NEXT_PUBLIC_AMAP_SECRET || '' };

      const map = new window.AMap.Map(containerRef.current, {
        center,
        zoom,
        mapStyle: 'amap://styles/light',
        features: ['bg', 'road', 'building'],
      });

      // Add markers
      markers.forEach((store) => {
        const content = `
          <div style="
            width: 32px; height: 32px;
            background: ${store.status === 'active' ? '#007AFF' : '#94A3B8'};
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 12px; font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            cursor: pointer;
          ">${store.batteryCount}</div>
        `;

        const marker = new window.AMap.Marker({
          position: [store.lng, store.lat],
          content,
          offset: new window.AMap.Pixel(-16, -16),
        });

        marker.on('click', () => onMarkerClick?.(store));
        map.add(marker);
      });

      mapRef.current = map;
    };

    // Wait for AMap to load
    if (window.AMap) {
      initMap();
    } else {
      const checkInterval = setInterval(() => {
        if (window.AMap) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 200);
      return () => clearInterval(checkInterval);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [markers, center, zoom, onMarkerClick]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height, borderRadius: '12px' }}
      className="bg-gray-100"
    />
  );
}
