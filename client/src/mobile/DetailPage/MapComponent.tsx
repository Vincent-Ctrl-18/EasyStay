import { useEffect, useRef, useState } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

interface MapComponentProps {
  address: string;
  city: string;
  hotelName: string;
}

export default function MapComponent({ address, city, hotelName }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let isUnmounted = false;
    let AMap: any;

    // AMap security config (optional but recommended for newer versions, using a mock config if none provided by user to avoid some warnings)
    (window as any)._AMapSecurityConfig = {
      securityJsCode: 'YOUR_SECRET_CODE_PLACEHOLDER',
    };
    
    AMapLoader.load({
      key: '700ad2685f70c21499d6a29b96369dae',
      version: '2.0',
      plugins: ['AMap.Geocoder', 'AMap.Marker'],
    })
      .then((loadedAMap) => {
        if (isUnmounted) return;
        AMap = loadedAMap;
        
        if (!mapContainer.current) return;

        // Clean up any existing map in this container (Strict Mode protection)
        if (mapRef.current) {
          mapRef.current.destroy();
        }

        const newMap = new AMap.Map(mapContainer.current, {
          zoom: 15,
          center: [116.397428, 39.90923], // default Beijing
          dragEnable: false,
          zoomEnable: false,
          scrollWheel: false,
          doubleClickZoom: false,
        });

        mapRef.current = newMap;

        const geocoder = new AMap.Geocoder({
          city: city || '全国',
        });

        geocoder.getLocation(address, (status: string, result: any) => {
          if (isUnmounted) return;
          if (status === 'complete' && result.info === 'OK') {
            const lnglat = result.geocodes[0].location;
            newMap.setCenter(lnglat);

            // Create marker element
            const markerContent = document.createElement('div');
            markerContent.className = 'w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white shadow-lg animate-[bounce_2s_infinite] border-2 border-white';
            markerContent.innerHTML = '<span class="material-symbols-outlined text-[20px]">location_on</span>';

            const marker = new AMap.Marker({
              position: lnglat,
              content: markerContent,
              offset: new AMap.Pixel(-20, -40),
            });

            newMap.add(marker);
          } else {
            console.warn('Geocoding failed for address:', address);
            // Some addresses might fail geocoding, we don't necessarily want to show a hard error if the map itself loaded
            // We'll just leave it at the default city center
          }
        });
      })
      .catch((e) => {
        if (isUnmounted) return;
        console.error('AMap loading failed:', e);
        setError(true);
      });

    return () => {
      isUnmounted = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [address, city]);

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-sm border border-gray-200 group cursor-pointer [&_.amap-logo]:!hidden [&_.amap-copyright]:!hidden [&_.amap-layer_img]:!max-w-none [&_.amap-layer_img]:!max-h-none">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Overlay to intercept clicks if we want to open a larger map later */}
      <div className="absolute inset-0 bg-transparent z-10 hover:bg-black/5 transition-colors" />

      {/* Tag */}
      <div className="absolute bottom-2 right-2 z-20 bg-white/90 backdrop-blur-sm text-xs px-2 py-1 rounded shadow-sm text-gray-900 font-medium">
        高德地图
      </div>

      {error && (
        <div className="absolute inset-0 z-30 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
          <span className="material-symbols-outlined text-[32px] mb-1">location_off</span>
          <span className="text-xs">地图加载失败</span>
        </div>
      )}
    </div>
  );
}
