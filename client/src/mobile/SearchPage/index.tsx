import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swiper } from 'antd-mobile';
import { hotelAPI } from '../../api';
import useSearchStore from '../../stores/useSearchStore';
import { getFirstImageUrl, parseJSON } from '../../utils';
import {
  useT, useLanguageStore,
  CITIES_DATA,
  translateCity, formatDate,
} from '../../i18n';
import type { Language } from '../../i18n';
import CalendarPicker from '../../components/CalendarPicker';
import BottomNav from '../../components/BottomNav';
import dayjs from 'dayjs';

const SEARCH_HISTORY_KEY = 'trip-search-history';
const MAX_HISTORY = 6;

function getSearchHistory(): string[] {
  return parseJSON<string[]>(localStorage.getItem(SEARCH_HISTORY_KEY)) ?? [];
}

function addSearchHistory(keyword: string) {
  if (!keyword.trim()) return;
  const history = getSearchHistory().filter((h) => h !== keyword.trim());
  history.unshift(keyword.trim());
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export default function SearchPage() {
  const navigate = useNavigate();
  const store = useSearchStore();
  const { t, lang } = useT();
  const toggleLang = useLanguageStore((s) => s.toggleLang);

  const [banners, setBanners] = useState<any[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarType, setCalendarType] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [searchHistory, setSearchHistory] = useState<string[]>(getSearchHistory);

  useEffect(() => {
    hotelAPI.banner().then((res) => setBanners(res.data)).catch(() => {});
  }, []);

  const handleSearch = () => {
    if (store.keyword.trim()) {
      addSearchHistory(store.keyword);
      setSearchHistory(getSearchHistory());
    }
    navigate('/m/list');
  };

  const clearHistory = useCallback(() => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setSearchHistory([]);
  }, []);

  const handleBannerClick = (id: number) => {
    navigate(`/m/hotel/${id}`);
  };

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

  const nights = dayjs(store.checkOut).diff(dayjs(store.checkIn), 'day');

  const getBannerImg = (h: any): string | null => {
    return getFirstImageUrl(h.images);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-[#f5f5f7] font-['Plus_Jakarta_Sans'] overflow-hidden relative selection:bg-sky-100">
      {/* Floating language switcher */}
      <div className="absolute top-[max(16px,env(safe-area-inset-top))] right-5 z-20">
        <button 
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 cursor-pointer text-[13px] font-bold text-white shadow-sm transition-transform active:scale-95" 
          onClick={toggleLang}
        >
          {lang === 'zh' ? 'EN' : '中'}
        </button>
      </div>

      {/* Hero Banner - Taller, sleek display */}
      <div className="relative flex-1 min-h-[40vh] max-h-[45vh] shrink-0 bg-gray-900">
        {banners.length > 0 ? (
          <Swiper autoplay loop indicator={() => null} style={{ '--height': '100%' } as React.CSSProperties}>
            {banners.map((h: any) => {
              const imgUrl = getBannerImg(h);
              const hasError = imgErrors[h.id];
              return (
                <Swiper.Item key={h.id}>
                  <div className="h-full cursor-pointer relative overflow-hidden" onClick={() => handleBannerClick(h.id)}>
                    {imgUrl && !hasError ? (
                      <img
                        className="w-full h-full object-cover block"
                        src={imgUrl}
                        alt={h.name_cn}
                        onError={() => setImgErrors((prev) => ({ ...prev, [h.id]: true }))}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
                    )}
                    {/* Modern gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70 pointer-events-none" />
                    <div className="absolute bottom-12 left-0 right-0 p-6 text-white z-10">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="px-2 py-0.5 rounded bg-white/20 backdrop-blur-md text-[11px] font-bold uppercase tracking-wider text-white">
                          {t('detail.topChoice')}
                        </div>
                        <div className="flex items-center text-yellow-400 text-[12px]">
                          {'★'.repeat(h.star)}
                        </div>
                      </div>
                      <div className="text-[26px] font-extrabold mb-1 drop-shadow-lg leading-tight line-clamp-2">
                        {lang === 'en' && h.name_en ? h.name_en : h.name_cn}
                      </div>
                      <div className="text-[13px] text-white/80 font-medium flex items-center gap-1 mt-2">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {translateCity(h.city, lang)}
                      </div>
                    </div>
                  </div>
                </Swiper.Item>
              );
            })}
          </Swiper>
        ) : (
          <div className="h-full bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 flex flex-col items-center justify-center gap-2">
            <span className="text-[40px] font-extrabold text-white tracking-tight">{t('app.name')}</span>
            <span className="text-sm text-white/80 font-medium">{t('app.tagline')}</span>
          </div>
        )}
      </div>

      {/* Main Search Area - Apple Style overlapping card */}
      <div className="relative z-10 flex-none bg-transparent flex flex-col justify-start pb-0">
        <div className="-mt-8 bg-white rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] px-6 pt-8 pb-4 flex flex-col flex-1 relative">
          
          {/* Subtle drag handle indicator (visual only) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full" />

          <h2 className="text-[26px] font-extrabold text-gray-900 mb-6 tracking-tight leading-tight">
            {t('search.title').split('·')[0]} <br/>
            <span className="text-sky-500">{t('search.title').split('·')[1]?.trim() || t('app.tagline')}</span>
          </h2>

          {/* Search Inputs Container */}
          <div className="flex flex-col gap-3 mb-6">
            
            {/* Destination */}
            <div 
              className="flex items-center gap-4 bg-[#f5f5f7] rounded-2xl p-4 cursor-pointer transition-colors active:bg-[#ebebeb]" 
              onClick={() => setShowCityPicker(true)}
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-sky-500 shrink-0">
                <span className="material-symbols-outlined text-[22px]">location_on</span>
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <span className="text-[12px] text-gray-500 font-medium mb-0.5">{t('search.destination')}</span>
                <span className="text-[16px] font-bold text-gray-900 truncate">
                  {store.city ? translateCity(store.city, lang) : t('search.selectCity')}
                </span>
              </div>
            </div>

            {/* Date Row */}
            <div className="flex gap-3">
              <div 
                className="flex-1 flex items-center gap-3 bg-[#f5f5f7] rounded-2xl p-4 cursor-pointer transition-colors active:bg-[#ebebeb]" 
                onClick={() => openCalendar('checkIn')}
              >
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <span className="text-[12px] text-gray-500 font-medium mb-0.5">{t('search.checkIn')}</span>
                  <span className="text-[15px] font-bold text-gray-900 truncate">{formatDate(store.checkIn, lang)}</span>
                </div>
              </div>
              <div 
                className="flex-1 flex items-center gap-3 bg-[#f5f5f7] rounded-2xl p-4 cursor-pointer transition-colors active:bg-[#ebebeb]" 
                onClick={() => openCalendar('checkOut')}
              >
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <span className="text-[12px] text-gray-500 font-medium mb-0.5">{t('search.checkOut')}</span>
                  <span className="text-[15px] font-bold text-gray-900 truncate">{formatDate(store.checkOut, lang)}</span>
                </div>
              </div>
            </div>

            {/* Room & Guest + Keyword */}
            <div className="flex gap-3">
              <div 
                className="flex-[1.2] flex items-center gap-3 bg-[#f5f5f7] rounded-2xl p-4 cursor-pointer transition-colors active:bg-[#ebebeb]" 
                onClick={() => setShowRoomPicker(true)}
              >
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <span className="text-[12px] text-gray-500 font-medium mb-0.5">{t('search.roomGuest')}</span>
                  <span className="text-[15px] font-bold text-gray-900 truncate">
                    {t('search.rooms', { n: store.roomCount })} · {t('search.adults', { n: store.adultCount })}
                  </span>
                </div>
              </div>

              <div className="flex-[1.8] flex items-center gap-3 bg-[#f5f5f7] rounded-2xl p-4 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all">
                <span className="material-symbols-outlined text-[20px] text-gray-400 shrink-0">search</span>
                <input
                  className="border-none outline-none text-[15px] font-bold text-gray-900 bg-transparent w-full placeholder-gray-400 font-['Plus_Jakarta_Sans']"
                  placeholder={t('search.keywordPlaceholder')}
                  value={store.keyword}
                  onChange={(e) => store.setKeyword(e.target.value)}
                />
              </div>
            </div>
            
          </div>

          {/* Search Button */}
          <button 
            className="w-full flex items-center justify-center gap-2 py-4 bg-sky-500 text-white border-none rounded-2xl text-[17px] font-bold cursor-pointer transition-all shadow-[0_8px_20px_rgba(14,165,233,0.3)] hover:bg-sky-600 active:scale-[0.98] font-['Plus_Jakarta_Sans']" 
            onClick={handleSearch}
          >
            {t('search.button')}
          </button>
        </div>
      </div>
      
      {/* Bottom padding to fill space and connect to BottomNav nicely */}
      <div className="flex-1 bg-white" />

      {/* Bottom Navigation */}
      <BottomNav />

      {/* City Picker Modal */}
      {showCityPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center font-['Plus_Jakarta_Sans']">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowCityPicker(false)} />
          <div className="relative w-full bg-white rounded-t-[32px] pb-[env(safe-area-inset-bottom)] animate-[slideUp_0.3s_ease_out] flex flex-col max-h-[85vh]">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full" />
            <div className="p-6 pb-4 pt-8 flex items-center justify-between">
              <h3 className="text-[22px] font-extrabold text-gray-900 m-0">{t('search.selectCity')}</h3>
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-none text-gray-600 cursor-pointer" onClick={() => setShowCityPicker(false)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 pt-2 overflow-y-auto grid grid-cols-3 gap-3">
              {CITIES_DATA.map((c) => {
                const isActive = store.city === c.zh;
                return (
                  <div
                    key={c.key}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl cursor-pointer transition-all border ${isActive ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-[#f5f5f7] border-transparent text-gray-700 active:bg-gray-200'}`}
                    onClick={() => { store.setCity(c.zh); setShowCityPicker(false); }}
                  >
                    <span className="text-[15px] font-bold">{c[lang as Language]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Room Picker Modal */}
      {showRoomPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center font-['Plus_Jakarta_Sans']">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowRoomPicker(false)} />
          <div className="relative w-full bg-white rounded-t-[32px] pb-[env(safe-area-inset-bottom)] animate-[slideUp_0.3s_ease_out] flex flex-col">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-200 rounded-full" />
            <div className="p-6 pb-4 pt-8 flex items-center justify-between">
              <h3 className="text-[22px] font-extrabold text-gray-900 m-0">{t('search.roomGuest')}</h3>
              <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center border-none text-gray-600 cursor-pointer" onClick={() => setShowRoomPicker(false)}>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-6 pt-2 flex flex-col gap-6">
              {/* Room Count */}
              <div className="flex items-center justify-between">
                <span className="text-[17px] font-bold text-gray-900">{t('search.roomCount')}</span>
                <div className="flex items-center gap-4">
                  <button 
                    className="w-10 h-10 rounded-full border-none bg-[#f5f5f7] flex items-center justify-center cursor-pointer transition-all text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200" 
                    onClick={() => store.setRoomCount(store.roomCount - 1)} disabled={store.roomCount <= 1}
                  >
                    <span className="material-symbols-outlined text-[22px]">remove</span>
                  </button>
                  <span className="text-xl font-extrabold text-gray-900 w-[30px] text-center">{store.roomCount}</span>
                  <button 
                    className="w-10 h-10 rounded-full border-none bg-[#f5f5f7] flex items-center justify-center cursor-pointer transition-all text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200" 
                    onClick={() => store.setRoomCount(store.roomCount + 1)} disabled={store.roomCount >= 10}
                  >
                    <span className="material-symbols-outlined text-[22px]">add</span>
                  </button>
                </div>
              </div>
              {/* Adult Count */}
              <div className="flex items-center justify-between">
                <span className="text-[17px] font-bold text-gray-900">{t('search.adultCount')}</span>
                <div className="flex items-center gap-4">
                  <button 
                    className="w-10 h-10 rounded-full border-none bg-[#f5f5f7] flex items-center justify-center cursor-pointer transition-all text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200" 
                    onClick={() => store.setAdultCount(store.adultCount - 1)} disabled={store.adultCount <= 1}
                  >
                    <span className="material-symbols-outlined text-[22px]">remove</span>
                  </button>
                  <span className="text-xl font-extrabold text-gray-900 w-[30px] text-center">{store.adultCount}</span>
                  <button 
                    className="w-10 h-10 rounded-full border-none bg-[#f5f5f7] flex items-center justify-center cursor-pointer transition-all text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200" 
                    onClick={() => store.setAdultCount(store.adultCount + 1)} disabled={store.adultCount >= 20}
                  >
                    <span className="material-symbols-outlined text-[22px]">add</span>
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => setShowRoomPicker(false)} 
                className="w-full mt-4 py-4 bg-gray-900 text-white font-bold text-[17px] rounded-2xl shadow-lg hover:bg-black active:scale-[0.98] transition-all border-none cursor-pointer"
              >
                {t('common.confirm')}
              </button>
            </div>
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
