import { useEffect, useState } from 'react';

interface MapComponentProps {
  address: string;
  city: string;
  hotelName: string;
}

export default function MapComponent({ address, city, hotelName }: MapComponentProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setError(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    setMapUrl(null);

    fetch(
      `/api/map/staticmap?address=${encodeURIComponent(address)}&city=${encodeURIComponent(city || '')}`
    )
      .then((res) => {
        if (!res.ok) throw new Error('request failed');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.url) {
          setMapUrl(data.url);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [address, city]);

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-sm border border-gray-200 group cursor-pointer">
      {/* Loading skeleton */}
      {loading && (
        <div className="absolute inset-0 z-20 bg-gray-100 animate-pulse flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px] text-gray-300">map</span>
        </div>
      )}

      {/* Static map image */}
      {mapUrl && (
        <img
          src={mapUrl}
          alt={`${hotelName} 位置地图`}
          className="w-full h-full object-cover"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true);
            setLoading(false);
          }}
        />
      )}

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
