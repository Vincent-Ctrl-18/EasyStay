import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLoading } from 'antd-mobile';
import { Virtuoso } from 'react-virtuoso';
import { hotelAPI } from '../../api';
import useSearchStore from '../../stores/useSearchStore';
import {
  useT, useLanguageStore,
  translateCity, translateTag, formatDate,
  CITIES_DATA, TAGS_DATA,
} from '../../i18n';
import type { Language } from '../../i18n';
import { parseJSON, getFirstImageUrl } from '../../utils';
import CalendarPicker from '../../components/CalendarPicker';
import dayjs from 'dayjs';

export default function ListPage() {
  const navigate = useNavigate();
  const store = useSearchStore();
  const { t, lang } = useT();
  const toggleLang = useLanguageStore((s) => s.toggleLang);

  const [hotels, setHotels] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const pageSize = 10;
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);

  // UI states
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarType, setCalendarType] = useState<'checkIn' | 'checkOut'>('checkIn');
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Temp filter state (for the filter panel)
  const [tempStar, setTempStar] = useState<number | null>(store.star);
  const [tempTag, setTempTag] = useState(store.tag);
  const [tempMinPrice, setTempMinPrice] = useState<number | null>(store.minPrice);
  const [tempMaxPrice, setTempMaxPrice] = useState<number | null>(store.maxPrice);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params: Record<string, any> = { page: pageRef.current, pageSize };
      if (store.city) params.city = store.city;
      if (store.keyword) params.keyword = store.keyword;
      if (store.star) params.star = store.star;
      if (store.minPrice) params.minPrice = store.minPrice;
      if (store.maxPrice) params.maxPrice = store.maxPrice;
      if (store.tag) params.tag = store.tag;

      const res = await hotelAPI.search(params);
      if (controller.signal.aborted) return;

      const newData = res.data.data || [];
      if (pageRef.current === 1) {
        setHotels(newData);
      } else {
        setHotels((prev) => [...prev, ...newData]);
      }
      setHasMore(newData.length >= pageSize);
      pageRef.current += 1;
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      console.error(err);
      setHasMore(false);
    } finally {
      loadingRef.current = false;
    }
  }, [store.city, store.keyword, store.star, store.minPrice, store.maxPrice, store.tag]);

  // Load first page on mount & whenever filters change
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    loadingRef.current = false;
    pageRef.current = 1;
    setHotels([]);
    setHasMore(true);
    loadMore();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [loadMore]);

  const nights = dayjs(store.checkOut).diff(dayjs(store.checkIn), 'day');
  const hasFilters = store.star || store.tag || store.minPrice || store.maxPrice;

  const getFirstImage = (hotel: any): string | null => {
    return getFirstImageUrl(hotel.images);
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

  const openFilterPanel = () => {
    setTempStar(store.star);
    setTempTag(store.tag);
    setTempMinPrice(store.minPrice);
    setTempMaxPrice(store.maxPrice);
    setShowFilterPanel(true);
  };

  const applyFilters = () => {
    store.setStar(tempStar);
    store.setTag(tempTag);
    store.setPriceRange(tempMinPrice, tempMaxPrice);
    setShowFilterPanel(false);
  };

  const resetFilters = () => {
    setTempStar(null);
    setTempTag('');
    setTempMinPrice(null);
    setTempMaxPrice(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-['Plus_Jakarta_Sans']">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3.5 bg-gradient-to-br from-sky-500 to-indigo-500 text-white sticky top-0 z-10 shadow-md">
        <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border-none cursor-pointer flex items-center justify-center text-white transition-transform shrink-0 active:scale-95" onClick={() => navigate('/m')}>
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0 cursor-pointer px-2 py-1 rounded-lg transition-colors active:bg-white/15" onClick={() => setShowSearchPanel(!showSearchPanel)}>
          <span className="text-base font-bold truncate">
            {store.city ? translateCity(store.city, lang) : t('list.allCities')}
          </span>
          <span className="text-[11px] opacity-85 truncate">
            {formatDate(store.checkIn, lang)} - {formatDate(store.checkOut, lang)} · {t('search.nights', { n: nights })}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border-none cursor-pointer text-white flex items-center justify-center transition-transform active:scale-95" onClick={openFilterPanel}>
            <span className="material-symbols-outlined text-[20px]">tune</span>
          </button>
          <button className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border-none cursor-pointer text-white flex items-center justify-center transition-transform active:scale-95 text-[11px] font-bold font-['Plus_Jakarta_Sans']" onClick={toggleLang}>
            {lang === 'zh' ? 'EN' : '中'}
          </button>
        </div>
      </div>

      {/* Expandable Search Panel */}
      {showSearchPanel && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowSearchPanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-2 pb-8 max-h-[85vh] overflow-y-auto animate-[slideUp_0.25s_ease]">
            <div className="flex justify-center py-2 pb-3">
              <div className="w-9 h-1 bg-gray-300 rounded-full" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('list.modifySearch')}</h3>

            {/* City */}
            <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl p-3.5 mb-2.5 cursor-pointer border border-transparent focus-within:border-sky-200" onClick={() => setShowCityPicker(!showCityPicker)}>
              <span className="material-symbols-outlined text-sky-500 text-[20px]">location_on</span>
              <span className="text-xs font-semibold text-gray-400">{t('search.destination')}</span>
              <span className="text-[15px] font-semibold text-gray-900 ml-auto">{store.city ? translateCity(store.city, lang) : t('search.selectCity')}</span>
              <span className="material-symbols-outlined text-[20px] text-gray-400">expand_more</span>
            </div>

            {showCityPicker && (
              <div className="grid grid-cols-5 gap-1.5 mb-3 animate-[fadeIn_0.2s_ease]">
                {CITIES_DATA.map((c) => {
                  const isActive = store.city === c.zh;
                  return (
                    <div
                      key={c.key}
                      className={`px-1 py-2 text-center text-[13px] font-semibold rounded-lg cursor-pointer border transition-all active:scale-95 ${isActive ? 'bg-sky-500 text-white border-sky-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                      onClick={() => { store.setCity(c.zh); setShowCityPicker(false); }}
                    >
                      {c[lang as Language]}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Date */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex-1 flex flex-col gap-0.5 bg-gray-50 rounded-xl p-3 cursor-pointer border border-transparent transition-colors active:bg-sky-50" onClick={() => openCalendar('checkIn')}>
                <span className="text-xs font-semibold text-gray-400">{t('search.checkIn')}</span>
                <span className="text-[15px] font-bold text-gray-900">{formatDate(store.checkIn, lang)}</span>
              </div>
              <div className="text-xs font-semibold text-sky-500 bg-sky-50 px-2.5 py-1.5 rounded-full whitespace-nowrap">{t('search.nights', { n: nights })}</div>
              <div className="flex-1 flex flex-col gap-0.5 bg-gray-50 rounded-xl p-3 cursor-pointer border border-transparent transition-colors active:bg-sky-50" onClick={() => openCalendar('checkOut')}>
                <span className="text-xs font-semibold text-gray-400">{t('search.checkOut')}</span>
                <span className="text-[15px] font-bold text-gray-900">{formatDate(store.checkOut, lang)}</span>
              </div>
            </div>

            {/* Room & Guest */}
            <div className="flex gap-3 mb-2.5">
              <div className="flex-1 bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-400">{t('search.roomCount')}</span>
                <div className="flex items-center gap-2.5">
                  <button className="w-7 h-7 rounded-full border-[1.5px] border-gray-200 bg-white flex items-center justify-center cursor-pointer text-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:bg-sky-50 active:border-sky-500" onClick={() => store.setRoomCount(store.roomCount - 1)} disabled={store.roomCount <= 1}>
                    <span className="material-symbols-outlined text-[16px]">remove</span>
                  </button>
                  <span className="text-lg font-bold text-gray-900 min-w-[20px] text-center">{store.roomCount}</span>
                  <button className="w-7 h-7 rounded-full border-[1.5px] border-gray-200 bg-white flex items-center justify-center cursor-pointer text-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:bg-sky-50 active:border-sky-500" onClick={() => store.setRoomCount(store.roomCount + 1)} disabled={store.roomCount >= 10}>
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-400">{t('search.adultCount')}</span>
                <div className="flex items-center gap-2.5">
                  <button className="w-7 h-7 rounded-full border-[1.5px] border-gray-200 bg-white flex items-center justify-center cursor-pointer text-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:bg-sky-50 active:border-sky-500" onClick={() => store.setAdultCount(store.adultCount - 1)} disabled={store.adultCount <= 1}>
                    <span className="material-symbols-outlined text-[16px]">remove</span>
                  </button>
                  <span className="text-lg font-bold text-gray-900 min-w-[20px] text-center">{store.adultCount}</span>
                  <button className="w-7 h-7 rounded-full border-[1.5px] border-gray-200 bg-white flex items-center justify-center cursor-pointer text-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:bg-sky-50 active:border-sky-500" onClick={() => store.setAdultCount(store.adultCount + 1)} disabled={store.adultCount >= 20}>
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Keyword */}
            <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl p-3.5 mb-2.5 cursor-pointer border border-transparent focus-within:border-sky-200">
              <span className="material-symbols-outlined text-sky-500 text-[20px]">search</span>
              <input
                className="flex-1 border-none outline-none text-[15px] font-semibold text-gray-900 bg-transparent placeholder-gray-400 font-['Plus_Jakarta_Sans']"
                placeholder={t('search.keywordPlaceholder')}
                value={store.keyword}
                onChange={(e) => store.setKeyword(e.target.value)}
              />
            </div>

            <button className="w-full p-3.5 bg-sky-500 text-white border-none rounded-xl text-base font-bold cursor-pointer mt-4 shadow-lg shadow-sky-500/35 transition-transform active:scale-95 font-['Plus_Jakarta_Sans']" onClick={() => setShowSearchPanel(false)}>
              {t('common.confirm')}
            </button>
          </div>
        </div>
      )}

      {/* Filter Panel (Bottom Sheet) */}
      {showFilterPanel && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease]" onClick={() => setShowFilterPanel(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl px-5 pt-2 pb-8 max-h-[85vh] overflow-y-auto animate-[slideUp_0.25s_ease]">
            <div className="flex justify-center py-2 pb-3">
              <div className="w-9 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 m-0">{t('list.filterTitle')}</h3>
              <button className="text-[13px] text-gray-400 bg-transparent border-none cursor-pointer px-2 py-1 rounded-lg active:bg-gray-50 font-['Plus_Jakarta_Sans']" onClick={resetFilters}>{t('list.filterReset')}</button>
            </div>

            {/* Star */}
            <div className="mb-4.5">
              <span className="flex items-center gap-1 text-sm font-semibold text-gray-500 mb-2.5">
                <span className="material-symbols-outlined text-[16px]">star</span>
                {t('search.star')}
              </span>
              <div className="flex flex-wrap gap-2">
                {[null, 3, 4, 5].map((s) => {
                  const isActive = tempStar === s;
                  return (
                    <div
                      key={s ?? 'all'}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer border transition-all select-none active:scale-95 ${isActive ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/30' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                      onClick={() => setTempStar(s)}
                    >
                      {s ? t('search.starN', { n: s }) : t('search.noLimit')}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price */}
            <div className="mb-4.5">
              <span className="flex items-center gap-1 text-sm font-semibold text-gray-500 mb-2.5">
                <span className="material-symbols-outlined text-[16px]">payments</span>
                {t('search.price')}
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: t('search.noLimit'), min: null, max: null },
                  { label: t('search.priceBelow', { n: 500 }), min: null, max: 500 },
                  { label: t('search.priceRange', { min: 500, max: 1000 }), min: 500, max: 1000 },
                  { label: t('search.priceRange', { min: 1000, max: 2000 }), min: 1000, max: 2000 },
                  { label: t('search.priceAbove', { n: 2000 }), min: 2000, max: null },
                ].map((p) => {
                  const isActive = tempMinPrice === p.min && tempMaxPrice === p.max;
                  return (
                    <div
                      key={p.label}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer border transition-all select-none active:scale-95 ${isActive ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/30' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                      onClick={() => { setTempMinPrice(p.min); setTempMaxPrice(p.max); }}
                    >
                      {p.label}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            <div className="mb-4.5">
              <span className="flex items-center gap-1 text-sm font-semibold text-gray-500 mb-2.5">
                <span className="material-symbols-outlined text-[16px]">sell</span>
                {t('search.tags')}
              </span>
              <div className="flex flex-wrap gap-2">
                {TAGS_DATA.map((td) => {
                  const isActive = tempTag === td.zh;
                  return (
                    <div
                      key={td.zh}
                      className={`px-4 py-2 rounded-full text-[13px] font-medium cursor-pointer border transition-all select-none active:scale-95 ${isActive ? 'bg-sky-500 text-white border-sky-500 shadow-md shadow-sky-500/30' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
                      onClick={() => setTempTag(tempTag === td.zh ? '' : td.zh)}
                    >
                      {td[lang as Language]}
                    </div>
                  );
                })}
              </div>
            </div>

            <button className="w-full p-3.5 bg-sky-500 text-white border-none rounded-xl text-base font-bold cursor-pointer mt-4 shadow-lg shadow-sky-500/35 transition-transform active:scale-95 font-['Plus_Jakarta_Sans']" onClick={applyFilters}>
              {t('list.filterApply')}
            </button>
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border-b border-gray-100">
          {store.star && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-sky-50 text-sky-500 rounded-full border border-sky-100">
              <span className="material-symbols-outlined text-[14px]">star</span>
              {t('search.starN', { n: store.star })}
            </span>
          )}
          {store.tag && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-sky-50 text-sky-500 rounded-full border border-sky-100">
              <span className="material-symbols-outlined text-[14px]">sell</span>
              {translateTag(store.tag, lang)}
            </span>
          )}
          {(store.minPrice || store.maxPrice) && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-sky-50 text-sky-500 rounded-full border border-sky-100">
              <span className="material-symbols-outlined text-[14px]">payments</span>
              ¥{store.minPrice || 0}-{store.maxPrice || '∞'}
            </span>
          )}
          <span
            className="inline-flex items-center gap-0.5 text-xs text-gray-400 cursor-pointer ml-auto px-2.5 py-1.5 rounded-full transition-colors active:bg-red-50 active:text-red-500"
            onClick={() => { store.setStar(null); store.setTag(''); store.setPriceRange(null, null); }}
          >
            {t('list.clearFilter')}
            <span className="material-symbols-outlined text-[14px]">close</span>
          </span>
        </div>
      )}

      {/* Hotel List with Virtual Scrolling */}
      {hotels.length > 0 ? (
        <Virtuoso
          useWindowScroll
          data={hotels}
          endReached={() => { if (hasMore && !loadingRef.current) loadMore(); }}
          overscan={200}
          itemContent={(_index, hotel) => {
            const tags: string[] = parseJSON(hotel.tags);
            const hotelName = lang === 'en' && hotel.name_en ? hotel.name_en : hotel.name_cn;
            const imgUrl = getFirstImage(hotel);
            const hasError = imgErrors[hotel.id];

            return (
              <div className="px-4 py-1.5">
                <div className="bg-white rounded-2xl overflow-hidden flex cursor-pointer transition-all border border-gray-200 shadow-sm active:shadow-md active:scale-[0.99]" onClick={() => navigate(`/m/hotel/${hotel.id}`)}>
                  <div className="w-[120px] min-h-[140px] shrink-0 relative">
                    {imgUrl && !hasError ? (
                      <img
                        className="w-full h-full object-cover block"
                        src={imgUrl}
                        alt={hotel.name_cn}
                        onError={() => setImgErrors((prev) => ({ ...prev, [hotel.id]: true }))}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-sky-500 via-indigo-500 to-purple-500 flex items-center justify-center">
                        <span className="text-[32px] font-extrabold text-white/90">{hotel.name_cn.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-black/50 backdrop-blur-md text-yellow-400 text-[11px] font-bold px-2 py-1 rounded-md">
                      <span className="material-symbols-outlined text-[12px]">star</span>
                      {hotel.star}
                    </div>
                  </div>
                  <div className="flex-1 p-3.5 flex flex-col gap-1.5 min-w-0">
                    <div className="text-[15px] font-bold text-gray-900 leading-snug line-clamp-2">{hotelName}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-0.5 truncate">
                      <span className="material-symbols-outlined text-[13px] shrink-0">location_on</span>
                      <span className="truncate">{hotel.address}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {tags.slice(0, 3).map((tg: string) => (
                        <span key={tg} className="text-[10px] font-semibold px-2 py-1 bg-gray-50 text-gray-500 rounded-md border border-gray-100">{translateTag(tg, lang)}</span>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      {hotel.lowestPrice ? (
                        <div className="flex items-baseline">
                          <span className="text-xs text-red-500 font-semibold">¥</span>
                          <span className="text-[22px] font-extrabold text-red-500">{hotel.lowestPrice}</span>
                          <span className="text-xs text-gray-400 ml-1">{t('list.from')}</span>
                        </div>
                      ) : (
                        <span className="text-[13px] text-gray-400">{t('list.noPrice')}</span>
                      )}
                      <span className="material-symbols-outlined text-[20px] text-gray-400">chevron_right</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
          components={{
            Footer: () => (
              <div className="flex justify-center p-5">
                {hasMore ? (
                  <DotLoading color="#0ea5e9" />
                ) : (
                  <span className="text-[13px] text-gray-400">{t('common.noMore')}</span>
                )}
              </div>
            ),
          }}
        />
      ) : (
        <div className="flex justify-center p-5">
          {hasMore ? (
            <div className="px-4 py-1.5 flex flex-col gap-3 w-full">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden flex shadow-sm border border-gray-200">
                  <div className="w-[120px] min-h-[140px] shrink-0 rounded-none animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" />
                  <div className="flex-1 p-3.5 flex flex-col justify-center">
                    <div className="rounded-md animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" style={{ width: '70%', height: 16 }} />
                    <div className="rounded-md animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" style={{ width: '50%', height: 12, marginTop: 8 }} />
                    <div className="flex gap-1.5 mt-2.5">
                      <div className="w-12 h-5 rounded-md animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" />
                      <div className="w-12 h-5 rounded-md animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" />
                    </div>
                    <div className="rounded-md animate-[pulse_1.5s_ease-in-out_infinite] bg-gray-200" style={{ width: '30%', height: 18, marginTop: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400 text-sm py-5">
              <span className="material-symbols-outlined text-[48px]">search_off</span>
              <p>{t('list.noHotels')}</p>
            </div>
          )}
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
