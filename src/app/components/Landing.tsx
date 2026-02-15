import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Search, Shield, Wallet, Coffee, ChevronRight, X, Sparkles, TrendingDown, Home, Users, MapPin, CheckCircle, Ticket } from 'lucide-react';
import { clsx } from 'clsx';
import { translations, Language } from '@/translations';
import { initialItems } from '@/app/data';
import { DayPicker, DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';
import type { SortOption } from '@/app/App';
import type { City } from '@/app/components/Results';
import { ConcertInsights, ConcertRecommendationData } from '@/app/components/ConcertInsights';

interface LandingProps {
  onSearch: (sortBy?: SortOption, city?: City) => void;
  t: typeof translations['en'];
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  stats?: {
    availableCount: number;
    lowestPrice: number;
  };
  concertData?: ConcertRecommendationData | null;
  language?: Language;
  onSelectHotel?: (hotelId: string) => void;
  items?: any[];
}

export const Landing = ({ onSearch, t, dateRange, setDateRange, stats, concertData, language = 'en', onSelectHotel, items = [] }: LandingProps) => {
  const [preferences, setPreferences] = useState<string[]>(['venue']);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isConcertOpen, setIsConcertOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City>('goyang');
  const [selectedConcert, setSelectedConcert] = useState<string>('Goyang');

  // Statistics Calculation - use props if available, otherwise calculate fallback
  const stayItems = initialItems.filter(item => item.type === 'stay');
  const totalStays = stats?.availableCount ?? stayItems.length;
  const minPrice = stats?.lowestPrice ?? Math.min(...stayItems.map(item => item.price));

  // Currency Conversion
  // @ts-ignore
  const rate = t.currencyRate || 1;
  // @ts-ignore
  const symbol = t.currencySymbol || '$';

  const minPriceConverted = Math.round(minPrice * rate);
  const minPriceFormatted = minPriceConverted.toLocaleString();


  // Toggle preference logic
  const togglePreference = (id: string) => {
    setPreferences(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };


  // Special Dates
  const ticketOpenDate = new Date(2026, 4, 20); // May 20, 2026
  const concertDates = [
    new Date(2026, 5, 10),
    new Date(2026, 5, 11),
    new Date(2026, 5, 12),
    new Date(2026, 5, 13),
    new Date(2026, 5, 14),
    new Date(2026, 5, 15),
  ];

  const modifiers = {
    ticket: ticketOpenDate,
    concert: concertDates,
  };

  const modifiersStyles = {
    ticket: { color: 'white', backgroundColor: '#eab308', fontWeight: 'bold' }, // yellow-500
    concert: { color: 'white', backgroundColor: '#7e22ce', fontWeight: 'bold' }, // purple-700
  };

  const handleDateSelect = (range: DateRange | undefined, selectedDay: Date) => {
    if (dateRange?.from && dateRange?.to) {
      setDateRange({ from: selectedDay, to: undefined });
    } else {
      setDateRange(range);
    }
  };

  const handleConfirmDate = () => {
    setIsCalendarOpen(false);
  };

  const getCityCount = (cityKey: string) => {
    // Determine the city filter key based on the concert id
    const city = cityKey === 'gwanghwamun' ? 'gwanghwamun' :
      cityKey === 'busan' ? 'busan' :
        cityKey === 'goyang' ? 'goyang' : 'seoul';

    if (!items || items.length === 0) return 0;

    return items.filter(item => item.city === city && (item.rooms_left ?? 1) > 0).length;
  };

  // Custom formatting for the display date range
  const displayDate = dateRange?.from
    ? `${format(dateRange.from, 'MMM d')}${dateRange.to ? ` - ${format(dateRange.to, 'MMM d')}` : ''}`
    : t.dateValue;

  // City formatting
  const getCityLabel = (city: City) => {
    // @ts-ignore
    return t[`city${city.charAt(0).toUpperCase() + city.slice(1)}`] || city;
  };

  const concerts = [
    {
      id: 'gwanghwamun',
      title: 'Gwanghwamun',
      date: 'Mar 21, 2026',
      location: 'Gwanghwamun Square',
      city: 'gwanghwamun' as City,
      dateRange: {
        from: new Date(2026, 2, 21),
        to: new Date(2026, 2, 22)
      }
    },
    {
      id: 'seoul',
      title: 'Seoul',
      date: 'Mar 21, 2026',
      location: 'Seoul',
      city: 'seoul' as City,
      dateRange: {
        from: new Date(2026, 2, 21),
        to: new Date(2026, 2, 22)
      }
    },
    {
      id: 'goyang',
      title: 'Goyang',
      date: 'Apr 9, 11-12, 2026',
      location: 'Goyang Stadium',
      city: 'goyang' as City,
      dateRange: {
        from: new Date(2026, 3, 9),
        to: new Date(2026, 3, 12)
      }
    },
    {
      id: 'busan',
      title: 'Busan',
      date: 'Jun 12-13, 2026',
      location: 'Stay Tuned',
      city: 'busan' as City,
      dateRange: {
        from: new Date(2026, 5, 12),
        to: new Date(2026, 5, 13)
      }
    }
  ];

  const handleConcertSelect = (concert: typeof concerts[0]) => {
    setSelectedConcert(concert.title);
    setSelectedCity(concert.city);
    setDateRange(concert.dateRange);
    setIsConcertOpen(false);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] pb-10 relative">
      {/* Hero Section */}
      <section className="relative px-6 pt-[40px] pb-[80px] bg-purple-900 text-white overflow-hidden pr-[24px] pl-[24px]">

        <div
          className="relative z-10"
        >
          <h1 className="font-extrabold leading-tight mb-4 tracking-tight whitespace-pre-wrap text-white text-[32px]">
            {t.heroTitle}
          </h1>
          <p className="text-purple-100 leading-relaxed mb-6 whitespace-pre-wrap text-[15px]">
            {t.heroSubtitle}
          </p>

          {/* Compact Live Stats Board */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl py-2 px-2 border border-white/10 flex items-center justify-between shadow-lg relative z-20">
            <button
              onClick={() => onSearch('available')}
              className="flex-1 text-left px-2 py-1 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
            >
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-wider mb-0.5">Available</p>
              <p className="text-xl font-bold text-white leading-none">{totalStays} <span className="text-xs font-medium opacity-70">hotels</span></p>
            </button>

            <div className="w-px h-8 bg-white/20 mx-1"></div>

            <button
              onClick={() => onSearch('lowest_price')}
              className="flex-1 text-right px-2 py-1 rounded-lg hover:bg-white/10 transition-colors active:scale-95"
            >
              <p className="text-[10px] text-purple-200 font-bold uppercase tracking-wider mb-0.5">Lowest</p>
              <p className="text-xl font-bold text-white leading-none">{symbol}{minPriceFormatted} <span className="text-xs font-medium opacity-70">/night</span></p>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Section - Overlapping the Hero */}
      <div className="px-5 -mt-12 relative z-20">
        <div
          className="bg-white rounded-3xl shadow-xl border border-gray-100 p-[20px] px-[20px] py-[24px]"
        >
          {/* Date and Concert Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">{t.dateLabel} & Concert</label>
            <div className="flex flex-col md:flex-row gap-2">
              <button
                onClick={() => setIsConcertOpen(true)}
                className="flex-1 flex items-center gap-3 p-3 bg-[rgb(249,249,249)] rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors text-left group cursor-pointer px-[12px] py-[14px]"
              >
                <MapPin size={22} className="text-[#333] group-hover:scale-110 transition-transform shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-gray-900 font-medium text-[14px] font-bold truncate block">
                    {selectedConcert}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setIsCalendarOpen(true)}
                className="flex-1 flex items-center gap-3 p-3 bg-[rgb(249,249,249)] rounded-2xl border border-gray-200 hover:bg-gray-100 transition-colors text-left group cursor-pointer px-[12px] py-[14px]"
              >
                <Calendar size={22} className="text-[#333] group-hover:scale-110 transition-transform shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs text-gray-900 font-medium text-[14px] font-bold truncate block">
                    {dateRange ? displayDate : t.dateValue}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">{t.preferLabel}</label>
            <div className="grid grid-cols-4 md:grid-cols-4 gap-2">
              {[
                { id: 'all', icon: Home, label: t.filterAll },
                { id: 'venue', icon: Sparkles, label: t.sortDistance },
                { id: 'budget', icon: Wallet, label: t.prefBudget },
                { id: 'safety', icon: Users, label: t.prefSafety },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'all') {
                      setPreferences(['all']);
                    } else {
                      setPreferences(prev => {
                        const withoutAll = prev.filter(p => p !== 'all');
                        return withoutAll.includes(item.id)
                          ? withoutAll.filter(p => p !== item.id)
                          : [...withoutAll, item.id];
                      });
                    }
                  }}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-200",
                    preferences.includes(item.id)
                      ? "bg-purple-50 border-purple-500 text-purple-700 shadow-sm scale-100"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  <item.icon size={18} />
                  <span className="text-xs font-medium whitespace-nowrap text-[12px]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => {
              let sortOption: SortOption = 'recommended';
              if (preferences.includes('safety')) sortOption = 'army_density';
              else if (preferences.includes('budget')) sortOption = 'lowest_price';
              else if (preferences.includes('venue')) sortOption = 'distance';

              onSearch(sortOption, selectedCity);
            }}
            className="w-full py-[14px] bg-gray-900 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-2 group px-[0px]"
          >
            {t.ctaFind}
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Concert Picker Modal */}

      {isConcertOpen && (
        <>
          <div
            onClick={() => setIsConcertOpen(false)}
            className="fixed inset-0 bg-black/60 z-[100]"
          />
          <div
            className="fixed bottom-0 left-0 right-0 md:top-1/2 md:left-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-[320px] bg-white rounded-t-3xl md:rounded-3xl z-[101] overflow-hidden shadow-2xl"
          >
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Ticket size={20} className="text-purple-600" />
                  Select Concert
                </h3>
                <button
                  onClick={() => setIsConcertOpen(false)}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                {concerts.map((concert) => {
                  const count = getCityCount(concert.id);
                  return (
                    <button
                      key={concert.id}
                      onClick={() => {
                        setSelectedConcert(concert.title);
                        setSelectedCity(concert.id as City);
                        onSearch('recommended', concert.id as City);
                        setIsConcertOpen(false);
                      }}
                      className={clsx(
                        "flex flex-col p-4 rounded-xl border transition-all text-left gap-1",
                        selectedConcert === concert.title
                          ? "bg-purple-50 border-purple-500 shadow-md"
                          : "bg-white border-gray-100 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className={clsx("font-bold text-sm", selectedConcert === concert.title ? "text-purple-700" : "text-gray-900")}>
                          {concert.title}
                        </span>
                        {selectedConcert === concert.title && <CheckCircle size={18} className="text-purple-600" />}
                        {selectedConcert !== concert.title && count > 0 && (
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {count} stays <ChevronRight size={10} />
                          </span>
                        )}
                        {selectedConcert !== concert.title && count === 0 && (
                          <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            0 stays <ChevronRight size={10} />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={12} />
                        {concert.date}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin size={12} />
                        {concert.location}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}


      {/* Concert Insights from Reddit Analysis */}
      {concertData && (
        <div className="px-5 mt-4">
          <ConcertInsights
            data={concertData}
            language={language}
            onSelectHotel={onSelectHotel}
            currencySymbol={(t as any).currencySymbol || '$'}
            currencyRate={(t as any).currencyRate || 1}
          />
        </div>
      )}

      {/* Date Picker Modal */}

      {isCalendarOpen && (
        <>
          <div
            onClick={() => setIsCalendarOpen(false)}
            className="fixed inset-0 bg-black/60 z-[100]"
          />
          <div
            className="fixed bottom-0 left-0 right-0 md:top-1/2 md:left-1/2 md:bottom-auto md:-translate-x-1/2 md:-translate-y-1/2 md:w-[360px] bg-white rounded-t-3xl md:rounded-3xl z-[101] overflow-hidden shadow-2xl"
          >
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Calendar size={20} className="text-purple-600" />
                  {t.dateLabel}
                </h3>
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex justify-center bg-gray-50 rounded-2xl p-2 mb-4">
                <style>{`
                    .rdp { --rdp-accent-color: #7e22ce; margin: 0; }
                    .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f3e8ff; }
                    .rdp-day_selected { background-color: rgba(126, 34, 206, 0.1); color: #7e22ce; font-weight: bold; }
                    .rdp-day_concert:not(.rdp-day_selected) { border: 2px solid #7e22ce; color: #7e22ce; font-weight: bold; }
                  `}</style>
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateSelect}
                  defaultMonth={new Date(2026, 5)} // June 2026
                  modifiers={{
                    concert: [
                      new Date(2026, 5, 10),
                      new Date(2026, 5, 11),
                      new Date(2026, 5, 12),
                      new Date(2026, 5, 13),
                      new Date(2026, 5, 14),
                      new Date(2026, 5, 15),
                    ]
                  }}
                />
              </div>

              <button
                onClick={handleConfirmDate}
                className="w-full py-3 bg-purple-700 text-white rounded-xl font-bold shadow-lg hover:bg-purple-800 active:scale-95 transition-all"
              >
                {/* @ts-ignore */}
                {t.confirmDate || 'Select Date'}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
