import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Swiper } from 'antd-mobile';
import { hotelAPI } from '../../api';
import useSearchStore from '../../stores/useSearchStore';
import { useT, useLanguageStore, translateTag, getFacilityInfo, getNearbyTypeLabel, formatDate, translateCity } from '../../i18n';
import { parseJSON } from '../../utils';
import CalendarPicker from '../../components/CalendarPicker';
import MapComponent from './MapComponent';
import dayjs from 'dayjs';

export default function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const store = useSearchStore();
  const { t, lang } = useT();
  const toggleLang = useLanguageStore((s) => s.toggleLang);

  const [hotel, setHotel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarType, setCalendarType] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [expanded, setExpanded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [heroImgErrors, setHeroImgErrors] = useState<Record<number, boolean>>({});
  const [roomImgErrors, setRoomImgErrors] = useState<Record<number, boolean>>({});
  const [showNavTitle, setShowNavTitle] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const roomsSectionRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load favorite state from localStorage
  useEffect(() => {
    if (id) {
      const favs: string[] = JSON.parse(localStorage.getItem('favorites') || '[]');
      setFavorited(favs.includes(String(id)));
    }
  }, [id]);

  const toggleFavorite = () => {
    const favs: string[] = JSON.parse(localStorage.getItem('favorites') || '[]');
    const hotelId = String(id);
    if (favs.includes(hotelId)) {
      localStorage.setItem('favorites', JSON.stringify(favs.filter(f => f !== hotelId)));
      setFavorited(false);
    } else {
      localStorage.setItem('favorites', JSON.stringify([...favs, hotelId]));
      setFavorited(true);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: hotel?.name_cn || 'EasyStay Hotel',
      text: hotel ? `${hotel.name_cn} - ${hotel.address}` : '',
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  // Show hotel name in nav when scrolled past hero
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setShowNavTitle(scrollRef.current.scrollTop > 300);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true });
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    hotelAPI
      .detail(id)
      .then((res) => setHotel(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col relative overflow-hidden font-['Plus_Jakarta_Sans']">
        <div className="relative">
          <div className="w-full h-[400px] animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" />
        </div>
        <div className="p-6 -mt-8 bg-white rounded-t-[32px] relative z-10">
          <div className="rounded-md animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" style={{ width: '60%', height: 28, marginBottom: 16 }} />
          <div className="rounded-md animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" style={{ width: '40%', height: 16, marginBottom: 24 }} />
          <div className="flex gap-3 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-[88px] h-[96px] rounded-[20px] animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-100" />
            ))}
          </div>
          <div className="rounded-md animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" style={{ width: '30%', height: 20, marginBottom: 12 }} />
          <div className="w-full h-[120px] rounded-[20px] animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-500 text-[15px] font-['Plus_Jakarta_Sans'] bg-white">
        <span className="material-symbols-outlined text-[48px]">hotel</span>
        <p>{t('detail.hotelNotFound')}</p>
      </div>
    );
  }

  const facilities: string[] = parseJSON(hotel.facilities);
  const images: string[] = parseJSON(hotel.images);
  const rooms = (hotel.RoomTypes || []).sort((a: any, b: any) => a.price - b.price);
  const nearby = hotel.NearbyPlaces || [];
  const nights = dayjs(store.checkOut).diff(dayjs(store.checkIn), 'day');
  const lowestPrice = rooms.length > 0 ? rooms[0].price : null;
  const displayPrice = selectedRoom ? selectedRoom.price : lowestPrice;

  const hotelDisplayName = lang === 'en' && hotel.name_en ? hotel.name_en : hotel.name_cn;

  const openCalendar = (type: 'checkIn' | 'checkOut') => {
    setCalendarType(type);
    setShowCalendar(true);
  };

  const handleDateSelect = (date: string) => {
    if (calendarType === 'checkIn') {
      store.setCheckIn(date);
      if (dayjs(date).isAfter(dayjs(store.checkOut).subtract(1, 'day'))) {
        store.setCheckOut(dayjs(date).add(1, 'day').format('YYYY-MM-DD'));
      }
    } else {
      store.setCheckOut(date);
    }
    setShowCalendar(false);
  };

  const getRoomImage = (room: any): string | null => {
    const imgs: string[] = parseJSON(room.images || '[]');
    return imgs.length > 0 ? imgs[0] : null;
  };

  const scrollToRooms = () => {
    if (roomsSectionRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const target = roomsSectionRef.current;
      const targetTop = target.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top: targetTop - 20, behavior: 'smooth' });
    }
  };

  const scrollToMap = () => {
    const mapEl = document.getElementById('map');
    if (mapEl && scrollRef.current) {
      const container = scrollRef.current;
      const targetTop = mapEl.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
      container.scrollTo({ top: targetTop - 20, behavior: 'smooth' });
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-white flex flex-col relative overflow-hidden font-['Plus_Jakarta_Sans'] selection:bg-sky-100">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto relative pb-[110px] no-scrollbar" ref={scrollRef}>
        
        {/* Floating Nav - Apple Style */}
        <div className={`fixed top-0 left-0 right-0 z-[60] flex justify-between items-center px-5 py-3 pt-[max(16px,env(safe-area-inset-top))] transition-all duration-300 ${showNavTitle ? 'bg-white/80 backdrop-blur-xl border-b border-gray-100' : 'bg-transparent'}`}>
          <button 
            className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 text-[14px] font-bold border-none ${showNavTitle ? 'bg-gray-100 text-gray-900' : 'bg-white/30 backdrop-blur-md text-white border border-white/20'}`} 
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          
          <div className={`flex-1 text-[17px] font-bold text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap px-4 text-center transition-opacity duration-300 ${showNavTitle ? 'opacity-100' : 'opacity-0'}`}>
            {hotelDisplayName}
          </div>
          
          <div className="flex gap-2.5">
            <button 
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 text-[14px] font-bold border-none ${showNavTitle ? 'bg-gray-100 text-gray-900' : 'bg-white/30 backdrop-blur-md text-white border border-white/20'}`} 
              onClick={handleShare}
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
            <button 
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 text-[14px] font-bold border-none ${showNavTitle ? 'bg-gray-100' : 'bg-white/30 backdrop-blur-md border border-white/20'}`} 
              onClick={toggleFavorite}
            >
              <span className={`material-symbols-outlined text-[20px] ${favorited ? 'text-red-500' : (showNavTitle ? 'text-gray-900' : 'text-white')}`} style={favorited ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                favorite
              </span>
            </button>
          </div>
        </div>

        {/* Hero Image */}
        <div className="relative w-full h-[45vh] shrink-0 bg-gray-900">
          {images.length > 0 ? (
            <Swiper loop onIndexChange={setActiveImg} style={{ '--height': '100%' } as React.CSSProperties} indicator={() => null}>
              {images.map((img: string, idx: number) => (
                <Swiper.Item key={idx}>
                  <div className="w-full h-full relative">
                    {!heroImgErrors[idx] ? (
                      <img
                        className="w-full h-full object-cover block"
                        src={img}
                        alt={`${hotel.name_cn} ${idx + 1}`}
                        onError={() => setHeroImgErrors((prev) => ({ ...prev, [idx]: true }))}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <span className="text-white/20 font-bold">Image Failed</span>
                      </div>
                    )}
                  </div>
                </Swiper.Item>
              ))}
            </Swiper>
          ) : (
            <div className="w-full h-full bg-gray-800" />
          )}

          {/* Image Counter Overlay */}
          {images.length > 1 && (
            <div className="absolute bottom-12 right-5 bg-black/40 backdrop-blur-md text-white text-[12px] font-bold px-3 py-1.5 rounded-lg z-10 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">photo_library</span>
              {activeImg + 1}/{images.length}
            </div>
          )}
        </div>

        {/* Main Content Sheet - Overlapping the image */}
        <div className="relative -mt-8 bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-[50] min-h-screen pb-12">
          
          <div className="px-6 pt-8 pb-4">
            
            {/* Title Row */}
            <div className="flex justify-between items-start mb-2 gap-4">
              <h1 className="text-[28px] font-extrabold text-gray-900 leading-tight tracking-tight">
                {hotelDisplayName}
              </h1>
              <div className="bg-sky-50 text-sky-500 px-3 py-1.5 rounded-xl border border-sky-100 shrink-0 flex items-center gap-1 whitespace-nowrap">
                <span className="text-[13px] font-extrabold">{hotel.star} Star</span>
              </div>
            </div>

            {/* Location Row */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mb-4">
              <div className="flex items-center text-sky-500">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
              </div>
              <p className="text-[15px] font-semibold text-gray-500">
                {translateCity(hotel.city, lang)}
              </p>
              <span className="text-gray-300 font-bold mx-0.5">•</span>
              <button onClick={scrollToMap} className="bg-transparent border-none p-0 m-0 text-[15px] font-semibold text-sky-500 underline decoration-sky-500/30 underline-offset-4 cursor-pointer hover:text-sky-600 transition-colors">
                {t('detail.showOnMap')}
              </button>
            </div>

            {/* Rating Row */}
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-sky-500 text-white font-extrabold text-[15px] px-2.5 py-1 rounded-[8px] shadow-sm shadow-sky-500/30">
                4.8
              </div>
              <div className="text-[15px] text-gray-700 font-medium">
                <span className="font-bold text-gray-900">{t('detail.excellent')}</span> {t('detail.reviews', { n: 120 })}
              </div>
            </div>

            <div className="h-px bg-gray-100 my-6" />

            {/* About */}
            {hotel.description && (
              <section className="mb-8">
                <h3 className="text-[20px] font-extrabold text-gray-900 mb-3 tracking-tight">{t('detail.about')}</h3>
                <div className="relative">
                  <p className={`text-[15px] text-gray-500 leading-[1.6] ${expanded ? '' : 'line-clamp-4'}`}>
                    {hotel.description}
                  </p>
                  {!expanded && hotel.description.length > 150 && (
                    <button 
                      className="mt-2 bg-transparent border-none cursor-pointer text-sky-500 text-[15px] font-bold p-0 flex items-center gap-0.5" 
                      onClick={() => setExpanded(true)}
                    >
                      {t('detail.readMore')}
                      <span className="material-symbols-outlined text-[18px]">expand_more</span>
                    </button>
                  )}
                  {expanded && (
                    <button 
                      className="mt-2 bg-transparent border-none cursor-pointer text-sky-500 text-[15px] font-bold p-0 flex items-center gap-0.5" 
                      onClick={() => setExpanded(false)}
                    >
                      {t('detail.showLess')}
                      <span className="material-symbols-outlined text-[18px]">expand_less</span>
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* Amenities */}
            {facilities.length > 0 && (
              <section className="mb-8">
                <h3 className="text-[20px] font-extrabold text-gray-900 mb-4 tracking-tight">{t('detail.amenities')}</h3>
                <div className="flex gap-3 overflow-x-auto -mx-6 px-6 no-scrollbar snap-x pb-2">
                  {facilities.map((f: string) => {
                    const info = getFacilityInfo(f, lang);
                    return (
                      <div key={f} className="flex flex-col items-center justify-center min-w-[88px] h-[96px] rounded-[20px] bg-white border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] shrink-0 snap-start">
                        <div className="text-sky-500 mb-2.5">
                          <span className="material-symbols-outlined text-[28px]">{info.icon}</span>
                        </div>
                        <span className="text-[12px] font-bold text-gray-500">{info.name}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Your Stay - Date + Room/Guest */}
            <section className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[20px] font-extrabold text-gray-900 tracking-tight">{t('detail.yourStay')}</h3>
              </div>
              
              <div className="bg-[#f5f5f7] rounded-[24px] p-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="flex-1 bg-white rounded-[18px] p-4 flex flex-col cursor-pointer active:bg-gray-50 transition-colors shadow-sm" onClick={() => openCalendar('checkIn')}>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('search.checkIn')}</span>
                    <span className="text-[16px] font-extrabold text-gray-900">{formatDate(store.checkIn, lang)}</span>
                  </div>
                  <div className="flex-1 bg-white rounded-[18px] p-4 flex flex-col cursor-pointer active:bg-gray-50 transition-colors shadow-sm" onClick={() => openCalendar('checkOut')}>
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('search.checkOut')}</span>
                    <span className="text-[16px] font-extrabold text-gray-900">{formatDate(store.checkOut, lang)}</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-[18px] p-4 flex items-center justify-between shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">{t('search.roomGuest')}</span>
                    <span className="text-[16px] font-extrabold text-gray-900">
                      {t('search.rooms', { n: store.roomCount })} · {t('search.adults', { n: store.adultCount })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="w-10 h-10 rounded-full border-none bg-[#f5f5f7] flex items-center justify-center cursor-pointer text-gray-900 disabled:opacity-30 active:bg-gray-200 transition-colors" onClick={() => store.setRoomCount(Math.max(1, store.roomCount - 1))}>
                      <span className="material-symbols-outlined text-[20px]">remove</span>
                    </button>
                    <button className="w-10 h-10 rounded-full border-none bg-[#f5f5f7] flex items-center justify-center cursor-pointer text-gray-900 disabled:opacity-30 active:bg-gray-200 transition-colors" onClick={() => store.setRoomCount(Math.min(10, store.roomCount + 1))}>
                      <span className="material-symbols-outlined text-[20px]">add</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Room Types */}
            <section className="mb-8" ref={roomsSectionRef}>
              <h3 className="text-[20px] font-extrabold text-gray-900 mb-4 tracking-tight">{t('detail.rooms')}</h3>
              {rooms.length === 0 ? (
                <p className="text-center text-gray-400 p-5 text-[15px] font-medium">{t('detail.noRooms')}</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {rooms.map((room: any) => {
                    const roomImg = getRoomImage(room);
                    const hasRoomImgError = roomImgErrors[room.id];
                    const isSelected = selectedRoom?.id === room.id;
                    
                    return (
                      <div 
                        key={room.id} 
                        className={`flex gap-4 p-4 rounded-[24px] cursor-pointer transition-all border-2 ${isSelected ? 'bg-sky-50 border-sky-500 shadow-[0_8px_20px_rgba(14,165,233,0.15)]' : 'bg-white border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] active:bg-gray-50'}`} 
                        onClick={() => setSelectedRoom(room)}
                      >
                        {/* Room Image */}
                        <div className="w-[88px] h-[88px] rounded-[16px] overflow-hidden shrink-0">
                          {roomImg && !hasRoomImgError ? (
                            <img className="w-full h-full object-cover block" src={roomImg} alt={room.name} onError={() => setRoomImgErrors((prev) => ({ ...prev, [room.id]: true }))} />
                          ) : (
                            <div className="w-full h-full bg-[#f5f5f7] flex items-center justify-center text-gray-400">
                              <span className="material-symbols-outlined text-[32px]">bed</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <div className="text-[17px] font-extrabold text-gray-900 mb-1 leading-tight">{room.name}</div>
                          <div className="flex flex-wrap gap-2 text-[12px] font-bold text-gray-500 mb-2">
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[14px]">person</span>
                              {t('detail.upTo', { n: room.capacity })}
                            </span>
                            {room.breakfast && (
                              <span className="flex items-center gap-0.5 text-green-600">
                                <span className="material-symbols-outlined text-[14px]">restaurant</span>
                                {t('detail.breakfast')}
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[14px] font-extrabold text-gray-900">¥{room.price}</span>
                            <span className="text-[12px] font-medium text-gray-400">{t('detail.perNight')}</span>
                          </div>
                        </div>
                        <div className="flex items-center shrink-0">
                           <div className={`w-6 h-6 rounded-full border-[2px] flex items-center justify-center transition-colors ${isSelected ? 'border-sky-500 bg-sky-500 text-white' : 'border-gray-300 bg-transparent text-transparent'}`}>
                             <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                           </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Location Map */}
            <section className="mb-4" id="map">
              <h3 className="text-[20px] font-extrabold text-gray-900 mb-4 tracking-tight">Location</h3>
              
              <div className="rounded-[24px] overflow-hidden border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] mb-6">
                <MapComponent address={hotel.address} city={hotel.city} hotelName={hotelDisplayName} />
                <div className="p-4 bg-white flex items-start gap-2">
                  <span className="material-symbols-outlined text-[20px] text-sky-500 shrink-0">location_on</span>
                  <p className="text-[14px] font-semibold text-gray-600 leading-snug m-0">
                    {hotel.address}
                  </p>
                </div>
              </div>

              {/* Nearby Places */}
              {nearby.length > 0 && (
                <div className="bg-[#f5f5f7] rounded-[24px] p-2 flex flex-col gap-2">
                  {nearby.map((place: any) => {
                    const iconMap: any = { attraction: 'photo_camera', transport: 'directions_bus', mall: 'local_mall' };
                    const icon = iconMap[place.type as string] || 'place';
                    return (
                      <div key={place.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-[18px] shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center shrink-0">
                           <span className="material-symbols-outlined text-[16px]">{icon}</span>
                        </div>
                        <span className="text-[15px] font-bold text-gray-900 flex-1">{place.name}</span>
                        <span className="text-[13px] font-bold text-gray-400">{place.distance}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Apple Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] z-[80] shadow-[0_-8px_20px_rgba(0,0,0,0.04)] flex items-center justify-between gap-6">
        <div className="flex flex-col">
          <span className="text-[12px] font-bold text-gray-400 mb-0.5">{t('detail.totalPrice')}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] font-extrabold text-gray-900 tracking-tight">
              {displayPrice ? `¥${displayPrice}` : '--'}
            </span>
            <span className="text-[14px] text-gray-500 font-bold">
              {t('detail.perNight')}
            </span>
          </div>
        </div>
        <button 
          className="flex items-center justify-center px-10 py-4 bg-sky-500 text-white border-none rounded-2xl text-[17px] font-extrabold cursor-pointer shadow-[0_8px_20px_rgba(14,165,233,0.3)] transition-all font-['Plus_Jakarta_Sans'] hover:bg-sky-600 active:scale-95" 
          onClick={() => {
            if (!selectedRoom) scrollToRooms();
            else setBookingSuccess(true);
          }}
        >
          {selectedRoom ? t('detail.bookNow') : t('detail.selectRoom')}
        </button>
      </div>

      {/* Booking Success Overlay */}
      {bookingSuccess && selectedRoom && (
        <div className="fixed inset-0 z-[200] bg-white flex items-center justify-center animate-[fadeIn_0.3s_ease]">
          <div className="text-center p-8 px-6 max-w-[360px] w-full">
            <div className="mb-6 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center text-green-500 animate-[popIn_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_both]">
                 <span className="material-symbols-outlined text-[48px]">check</span>
              </div>
            </div>
            <h2 className="text-[28px] font-extrabold text-gray-900 mb-3 tracking-tight">{t('detail.bookSuccess')}</h2>
            <p className="text-[15px] text-gray-500 font-medium leading-relaxed mb-8">
              {t('detail.bookSuccessMsg', { hotel: hotelDisplayName, room: selectedRoom.name })}
            </p>
            
            <div className="bg-[#f5f5f7] rounded-[24px] p-5 mb-8 text-left">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[14px] font-bold text-gray-500">{t('detail.dateRange')}</span>
                <span className="text-[15px] font-extrabold text-gray-900">{formatDate(store.checkIn, lang)} - {formatDate(store.checkOut, lang)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200/50">
                <span className="text-[14px] font-bold text-gray-500">{t('detail.totalAmount')}</span>
                <span className="text-[20px] font-extrabold text-sky-500">¥{selectedRoom.price * nights * store.roomCount}</span>
              </div>
            </div>
            
            <button 
              className="w-full py-4 rounded-2xl text-[17px] font-extrabold cursor-pointer transition-all font-['Plus_Jakarta_Sans'] bg-gray-900 text-white border-none shadow-lg active:scale-95 hover:bg-black" 
              onClick={() => navigate('/m')}
            >
              {t('detail.backToHome')}
            </button>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      {showCalendar && (
        <CalendarPicker
          value={calendarType === 'checkIn' ? store.checkIn : store.checkOut}
          minDate={calendarType === 'checkOut' ? dayjs(store.checkIn).add(1, 'day').format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')}
          onSelect={handleDateSelect}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
