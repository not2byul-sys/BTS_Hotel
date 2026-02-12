import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ChevronRight, Star, Heart, List, Map as MapIcon, Utensils, Camera, X, TrendingUp, CheckCircle, Users, Timer, Calendar, Ticket } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { translations } from '@/translations';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/app/context/AuthContext';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker, DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/dist/style.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapClickHandler = ({ onMapClick }: { onMapClick: () => void }) => {
  useMapEvents({
    click: () => onMapClick(),
  });
  return null;
};

// Custom Icon Creators
const createPriceIcon = (price: string, isSelected: boolean) => L.divIcon({
  className: '',
  html: `<div class="${
    isSelected 
      ? 'bg-purple-700 text-white scale-110 z-50' 
      : 'bg-white text-gray-900 hover:scale-110 hover:z-40'
  } transition-all duration-200 font-extrabold text-[13px] px-3 py-1.5 rounded-full shadow-md border border-gray-200 whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer">${price}</div>`,
  iconSize: [50, 28],
  iconAnchor: [25, 14]
});

const createCategoryIcon = (color: string, iconHtml: string, isSelected: boolean) => L.divIcon({
  className: '',
  html: `<div class="${color} text-white w-9 h-9 rounded-full shadow-lg border-2 border-white flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">${iconHtml}</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

type SortOption = 'lowest_price' | 'distance' | 'available' | 'popular' | 'army_density' | 'closing_soon';

interface ResultsProps {
  onSelectHotel: (hotelId: string) => void;
  t: typeof translations['en'];
  currentLang?: string;
  initialSort?: SortOption;
  initialCity?: City;
  viewMode: 'list' | 'map';
  setViewMode: (mode: 'list' | 'map') => void;
  items: any[];
  mapData?: any;
  dateRange?: DateRange;
  setDateRange?: (range: DateRange | undefined) => void;
}

type Category = 'all' | 'stay' | 'food' | 'spot';
export type City = 'seoul' | 'goyang' | 'busan' | 'paju' | 'other';

const CITY_COORDS: Record<City, { lat: number; lng: number }> = {
  seoul: { lat: 37.5300, lng: 127.0500 }, 
  goyang: { lat: 37.6584, lng: 126.7640 }, 
  paju: { lat: 37.7590, lng: 126.7750 }, 
  busan: { lat: 35.1900, lng: 129.0700 }, 
  other: { lat: 37.5, lng: 127.0 } 
};

const JAMSIL_COORDS = { lat: 37.5148, lng: 127.0733 };
const GOYANG_COORDS = { lat: 37.6695, lng: 126.7490 };

const SPECIAL_LOCATIONS: Record<string, { venue: any, stations: any[] }> = {
  seoul: {
    venue: { ...JAMSIL_COORDS, name: 'BTS Venue' },
    stations: [
      { lat: 37.5105, lng: 127.0736, name: 'Sports Complex' },
      { lat: 37.5140, lng: 127.0580, name: 'Samseong' }
    ]
  },
  goyang: {
    venue: { ...GOYANG_COORDS, name: 'BTS Venue' },
    stations: [
      { lat: 37.6761, lng: 126.7475, name: 'Daehwa Station' }
    ]
  },
  busan: {
    venue: { lat: 35.1900, lng: 129.0700, name: 'Busan Concert' },
    stations: []
  }
};

const createVenueIcon = () => L.divIcon({
  className: '',
  html: `<div class="bg-red-500 text-white w-10 h-10 rounded-full shadow-xl border-2 border-white flex items-center justify-center animate-bounce z-[100]">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
         </div>
         <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm z-[100]">
           D-Day
         </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const createStationIcon = (name: string, line?: string) => {
  // Line colors
  const lineColors: Record<string, string> = {
    '1': '#0052A4',
    '2': '#00A84D',
    '3': '#EF7C1C',
    '4': '#00A4E3',
    '5': '#996CAC',
    '6': '#CD7C2F',
    '7': '#747F00',
    '8': '#E6186C',
    '9': '#BDB092',
    'Gyeongui-Jungang': '#77C4A3',
    'GTX-A': '#9A6292',
    'Shinbundang': '#D4003B',
    'Arex': '#0090D2'
  };

  let detectedLine = line || '2';
  let displayName = name || '';
  const lowerName = displayName.toLowerCase();
  
  // Robust detection logic
  if (line) {
     detectedLine = line;
  } else {
     const lineMatch = displayName.match(/Line\s*(\w+)/i) || displayName.match(/(\d+)호선/);
     if (lineMatch) {
        detectedLine = lineMatch[1];
        displayName = displayName.replace(/Line\s*\w+/i, '').replace(/\d+호선/, '').trim();
     } else {
        // Line 3 (Orange) - Goyang/Ilsan area
        if (['daehwa', 'juyeop', 'jeongbalsan', 'madu', 'baekseok', 'daegok', 'hwajeong', 'wondang', 'samsong', 'jichuk', 'kupabal', 'yeonsinnae'].some(s => lowerName.includes(s)) ||
            ['대화', '주엽', '정발산', '마두', '백석', '화정', '원당', '삼송', '지축', '구파발', '연신내'].some(s => displayName.includes(s))) {
           detectedLine = '3';
        } 
        // Gyeongui-Jungang (Mint)
        else if (['tanhyeon', 'ilsan', 'pungsan', 'baekma', 'goksan', 'neunggok', 'haengsin', 'dmc', 'digital media city'].some(s => lowerName.includes(s)) ||
                 ['탄현', '일산', '풍산', '백마', '곡산', '능곡', '행신', '수색'].some(s => displayName.includes(s))) {
           detectedLine = 'Gyeongui-Jungang';
        }
        // Line 2 (Green) - Seoul core
        else if (['sports complex', 'samseong', 'gangnam', 'hongik', 'hongdae', 'sinchon', 'ewha', 'city hall', 'jamsil', 'euljiro'].some(s => lowerName.includes(s)) ||
                 ['종합운동장', '삼성', '강남', '홍대', '신촌', '이대', '시청', '잠실', '을지로'].some(s => displayName.includes(s))) {
           detectedLine = '2';
        }
        // Line 5 (Purple)
        else if (['olympic', 'gimpo', 'yeouido', 'gwanghwamun'].some(s => lowerName.includes(s)) ||
                 ['올림픽', '김포', '여의도', '광화문'].some(s => displayName.includes(s))) {
           detectedLine = '5';
        }
        // Arex (Blue)
        else if (['gimpo airport', 'incheon airport', 'seoul station'].some(s => lowerName.includes(s))) {
           detectedLine = 'Arex';
        }
     }
  }

  const color = lineColors[detectedLine] || lineColors['2'];
  const badgeContent = detectedLine === 'Gyeongui-Jungang' ? 'GJ' : (detectedLine.length > 2 ? detectedLine.charAt(0) : detectedLine);

  return L.divIcon({
  className: '',
  html: `<div class="bg-[${color}] text-white w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center z-[90]" style="background-color: ${color}">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
             <rect width="16" height="16" x="4" y="3" rx="2" />
             <path d="M4 11h16" />
             <path d="M12 3v8" />
             <path d="m8 19-2 3" />
             <path d="m16 19 2 3" />
             </svg>
         </div>
         ${displayName ? `<div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm text-gray-900 text-[11px] font-bold px-2 py-1 rounded-full shadow-md border border-gray-200 whitespace-nowrap flex items-center gap-1.5 min-w-max">
           <div class="w-4 h-4 rounded-full text-[8px] flex items-center justify-center text-white" style="background-color: ${color}">${badgeContent}</div>
           ${displayName}
         </div>` : ''}`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});
};

const MapUpdater = ({ center }: { center: { lat: number; lng: number } }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], 13, { duration: 0.5 });
  }, [center, map]);
  return null;
};

export const Results = ({ onSelectHotel, t, currentLang = 'en', initialSort = 'recommended', initialCity = 'goyang', viewMode, setViewMode, items, mapData, dateRange, setDateRange }: ResultsProps) => {
  const [activeCategory, setActiveCategory] = useState<Category>('all');
  const [activeCity, setActiveCity] = useState<City>(initialCity || 'goyang');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [activeSort, setActiveSort] = useState<SortOption>(initialSort || 'recommended');

  useEffect(() => {
    if (initialCity) {
      setActiveCity(initialCity);
    }
  }, [initialCity]);

  const [showAvailableOnly, setShowAvailableOnly] = useState(true);
  
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(dateRange);

  const [isCityOpen, setIsCityOpen] = useState(false);
  const cities: City[] = ['goyang', 'seoul', 'busan', 'paju', 'other'];
  
  const getCityLabel = (city: City) => {
    // @ts-ignore
    return t[`city${city.charAt(0).toUpperCase() + city.slice(1)}`];
  };

  const displayDate = dateRange?.from 
    ? `${format(dateRange.from, 'MMM d')}${dateRange.to ? ` - ${format(dateRange.to, 'MMM d')}` : ''}`
    : 'Select Dates';
  
  const { bookmarks, toggleBookmark } = useAuth();

  useEffect(() => {
    if (initialSort) {
      setActiveSort(initialSort);
    }
  }, [initialSort]);

  const formatPrice = (usdPrice: number) => {
    // @ts-ignore
    const rate = t.currencyRate || 1;
    // @ts-ignore
    const symbol = t.currencySymbol || '$';
    
    const converted = Math.round(usdPrice * rate);
    return `${symbol}${converted.toLocaleString()}`;
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const filteredItems = useMemo(() => {
    let filtered = items.filter(item => {
      const cityMatch = item.city === activeCity;
      const categoryMatch = activeCategory === 'all' || item.type === activeCategory;
      const availabilityMatch = !showAvailableOnly || (item.rooms_left !== undefined && item.rooms_left > 0);
      return cityMatch && categoryMatch && availabilityMatch;
    });

    if (activeCategory === 'stay' || activeCategory === 'all') {
       switch (activeSort) {
         case 'lowest_price':
           filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
           break;
         case 'distance':
           filtered.sort((a, b) => {
             const distA = calculateDistance(a.coords.lat, a.coords.lng, JAMSIL_COORDS.lat, JAMSIL_COORDS.lng);
             const distB = calculateDistance(b.coords.lat, b.coords.lng, JAMSIL_COORDS.lat, JAMSIL_COORDS.lng);
             return distA - distB;
           });
           break;
         case 'popular':
           filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
           break;
         case 'army_density':
           filtered.sort((a, b) => (b.army_density?.value || 0) - (a.army_density?.value || 0));
           break;
         case 'closing_soon':
           filtered.sort((a, b) => {
             const aLeft = a.rooms_left === 0 ? 9999 : (a.rooms_left ?? 9999);
             const bLeft = b.rooms_left === 0 ? 9999 : (b.rooms_left ?? 9999);
             return aLeft - bLeft;
           });
           break;
         case 'available':
           break;
         case 'recommended':
         default:
           break;
       }
    }

    return filtered;
  }, [activeCity, activeCategory, items, activeSort, showAvailableOnly]);

  const hotels = useMemo(() => filteredItems.filter(i => i.type !== 'food' && i.type !== 'spot'), [filteredItems]);
  const selectedItem = useMemo(() => items.find(i => i.id === selectedMarkerId), [selectedMarkerId, items]);

  const sortOptions: { id: SortOption; label: string; icon: React.ReactNode }[] = [
    { id: 'recommended', label: 'All', icon: <List size={12} /> },
    { id: 'distance', label: t.sortDistance, icon: <MapPin size={12} /> },
    { id: 'lowest_price', label: t.sortLowest, icon: <TrendingUp size={12} className="rotate-180" /> },
    { id: 'army_density', label: t.sortArmyDensity, icon: <Users size={12} /> },
    { id: 'closing_soon', label: t.sortClosingSoon, icon: <Timer size={12} /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-[80px] relative pt-[0px] pr-[0px] pl-[0px]">
      {viewMode === 'map' && (
        <div className="absolute top-0 left-0 right-0 z-[500] p-4 flex flex-col gap-3.5 pointer-events-none">
          <div className="flex justify-between items-center pointer-events-auto">
             <div className="flex gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-purple-100 overflow-x-auto hide-scrollbar max-w-[calc(100vw-80px)]">
               {cities.map((city) => (
                 <button
                   key={city}
                   onClick={() => {
                     setActiveCity(city);
                     setSelectedMarkerId(null);
                   }}
                   className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                     activeCity === city
                       ? 'bg-purple-700 text-white shadow-md'
                       : 'bg-transparent text-gray-600 hover:bg-gray-100'
                   }`}
                 >
                   {activeCity === city && <MapPin size={12} className="text-white" />}
                   {getCityLabel(city)}
                 </button>
               ))}
             </div>


          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <div className="w-full bg-gray-20 pt-[20px] pb-[2px]">
            <div className="px-5 mb-0 flex gap-2">
               <Popover.Root 
                  open={isDateOpen} 
                  onOpenChange={(open) => {
                    setIsDateOpen(open);
                    if (open) setTempDateRange(dateRange);
                  }}
                >
                  <Popover.Trigger asChild>
                    <button className="bg-[#fff] px-4 py-2.5 rounded-xl flex items-center justify-center border border-gray-200 shadow-xs gap-2.5 flex-1 active:scale-[0.98] transition-all group hover:bg-gray-100">
                      <Calendar size={18} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                      <span className="text-sm font-bold text-gray-800 truncate">{displayDate}</span>
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content className="z-[70] bg-white p-3 rounded-xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95" sideOffset={8}>
                      <style>{`
                        .rdp { --rdp-accent-color: #7e22ce; margin: 0; }
                        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #f3e8ff; }
                        .rdp-day_selected { background-color: rgba(126, 34, 206, 0.1); color: #7e22ce; font-weight: bold; }
                        .rdp-day_concert:not(.rdp-day_selected) { border: 2px solid #7e22ce; color: #7e22ce; font-weight: bold; }
                      `}</style>
                      <DayPicker 
                        mode="range"
                        selected={tempDateRange}
                        onSelect={(range, selectedDay) => {
                          if (tempDateRange?.from && tempDateRange?.to && selectedDay) {
                            setTempDateRange({ from: selectedDay, to: undefined });
                          } else {
                            setTempDateRange(range);
                          }
                        }}
                        defaultMonth={new Date(2026, 5)}
                        numberOfMonths={1}
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
                      <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-gray-50">
                        <button 
                          onClick={() => setIsDateOpen(false)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            setDateRange?.(tempDateRange);
                            setIsDateOpen(false);
                          }}
                          className="px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg transition-colors shadow-sm"
                        >
                          Confirm
                        </button>
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>

                <Popover.Root open={isCityOpen} onOpenChange={setIsCityOpen}>
                  <Popover.Trigger asChild>
                    <button className="bg-[#fff] px-4 py-3 rounded-xl flex items-center justify-center border border-gray-200 shadow-xs gap-2.5 flex-1 active:scale-[1] transition-all group hover:bg-gray-100">
                      <MapPin size={18} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                      <span className="text-sm font-bold text-gray-800 truncate">{getCityLabel(activeCity)}</span>
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content className="z-[70] bg-white p-3 rounded-xl shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 w-[200px]" sideOffset={8}>
                       <div className="flex flex-col gap-2">
                         <div className="flex justify-between items-center mb-1 px-1">
                           <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                             <MapPin size={16} className="text-purple-600" />
                             Select City
                           </h3>
                           <button onClick={() => setIsCityOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                             <X size={16} className="text-gray-400" />
                           </button>
                         </div>
                         <div className="flex flex-col gap-0">
                           {cities.map((city) => (
                             <button
                               key={city}
                               onClick={() => {
                                 setActiveCity(city);
                                 setIsCityOpen(false);
                               }}
                               className={`flex items-center gap-1 p-2 rounded-lg text-xs font-bold transition-all text-left ${
                                 activeCity === city
                                   ? 'bg-purple-50 text-purple-700'
                                   : 'text-gray-700 hover:bg-gray-50'
                               }`}
                             >
                               {activeCity === city && <CheckCircle size={14} className="text-purple-600" />}
                               <span className={activeCity === city ? "font-bold" : "font-medium"}>{getCityLabel(city)}</span>
                             </button>
                           ))}
                         </div>
                       </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
            </div>
            {/* Removed the old city chips row */}
          </div>

          <div className="pr-[0px] pl-[20px] pt-[16px] pb-[10px] mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
              {sortOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setActiveSort(option.id)}
                  className={`px-[13px] py-[7px] rounded-lg text-[13px] font-medium transition-all whitespace-nowrap border ${
                    activeSort === option.id
                      ? 'bg-[#333] text-[#FFF] border-0'
                      : 'bg-gray-100 text-[#666] border-0 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-4 flex-1 pt-0">
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-lg font-bold text-gray-900">{t.bestMatches}</h2>
                <span className="text-xs font-medium text-gray-500">{filteredItems.length} results in {activeCity}</span>
              </div>

              <div className="flex flex-col gap-5">
                {hotels.map((hotel, index) => {
                  const imageUrl = hotel.image_url || hotel.image || '';
                  const name = hotel.name_en || hotel.name;
                  const price = hotel.price_usd ? `$ ${hotel.price_usd}` : formatPrice(hotel.price);
                  const platform = hotel.booking?.platform;
                  const statusEn = hotel.status_en;
                  const rawTags = hotel.display_tags ? [
                    hotel.display_tags.type?.en,
                    hotel.display_tags.trans?.en,
                    hotel.display_tags.density?.label_en,
                    hotel.display_tags.keywords?.[0]
                  ] : (hotel.tags || []);

                  const tags = rawTags.filter((tag: any): tag is string => typeof tag === 'string' && tag.length > 0);
                  
                  const isLiked = bookmarks.has(hotel.id);

                  return (
                    <div
                      key={hotel.id}
                      className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group flex flex-col transition-opacity duration-200 ${
                        hotel.rooms_left === 0 ? 'opacity-20 pointer-events-none grayscale' : 'opacity-100'
                      }`}
                    >
                    <div className="relative h-48 w-full shrink-0" data-layername="Hotel_Image">
                      <ImageWithFallback 
                        src={imageUrl} 
                        alt={name} 
                        className="w-full h-full object-cover"
                      />
                      
                      {platform && (
                        <div className="absolute top-3 left-3 z-20">
                          <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg uppercase tracking-wider border border-white/10">
                            {platform}
                          </span>
                        </div>
                      )}

                      {!platform && hotel.rooms_left <= 3 && hotel.rooms_left > 0 && (
                        <div className="absolute top-3 left-3 z-20">
                          <span className="text-xs font-bold text-orange-700 bg-white/95 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                            Only {hotel.rooms_left} rooms left!
                          </span>
                        </div>
                      )}

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleBookmark(hotel.id);
                        }}
                        className={`absolute top-3 right-3 p-2 backdrop-blur-sm rounded-full transition-colors z-10 group ${
                          isLiked 
                            ? 'bg-white text-purple-700' 
                            : 'bg-white/90 text-gray-400 hover:text-purple-500'
                        }`}
                      >
                        <div className="relative">
                          <div>
                            <Heart 
                              size={20} 
                              fill={isLiked ? "currentColor" : "none"} 
                              className={isLiked ? "fill-purple-700" : ""}
                            />
                          </div>
                          
                            {isLiked && (
                              <div
                                className="absolute inset-0 rounded-full border-2 border-purple-500 pointer-events-none"
                              />
                            )}
                          
                        </div>
                      </button>
                      
                      <div 
                        className="absolute bottom-3 left-3 bg-gray-900 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm z-10"
                        data-layername="Rating"
                      >
                        <Star size={12} fill="currentColor" className="text-yellow-400" />
                        {hotel.rating}
                      </div>
                    </div>
    
                    <div className="p-4 flex flex-col gap-2 h-full">
                      <div className="flex flex-col gap-1">
                        <h3 
                          className="font-bold text-lg text-gray-900 leading-tight break-words" 
                          data-layername="Hotel_Name"
                        >
                          {name.replace(/\[.*?\]\s*/g, '')}
                        </h3>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-gray-400" />
                            {hotel.location_desc || activeCity.charAt(0).toUpperCase() + activeCity.slice(1)}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapIcon size={12} className="text-gray-400" />
                            {calculateDistance(
                              hotel.coords.lat, 
                              hotel.coords.lng, 
                              SPECIAL_LOCATIONS[activeCity]?.venue?.lat || JAMSIL_COORDS.lat, 
                              SPECIAL_LOCATIONS[activeCity]?.venue?.lng || JAMSIL_COORDS.lng
                            ).toFixed(1)}km to venue
                          </div>
                        </div>

                        <div className="mt-1">
                          {statusEn ? (
                             <span className={`text-xs font-bold flex items-center gap-2 ${statusEn.toLowerCase().includes('sold out') ? 'text-red-500' : 'text-blue-600'}`}>
                               {statusEn.toLowerCase().includes('sold out') ? <X size={12} /> : <CheckCircle size={12} />}
                               {statusEn}
                             </span>
                          ) : hotel.rooms_left === 0 ? (
                            <span className="text-xs font-bold text-red-500 flex items-center gap-1">
                              <X size={12} /> Sold Out
                            </span>
                          ) : null}
                        </div>
                      </div>
    
                      <div className="flex flex-wrap gap-1">
                        {tags?.map((tag: string, i: number) => {
                          const isArmyTag = tag.startsWith('ARMY');
                          return (
                            <span 
                              key={i} 
                              className={`text-[10.6px] px-2 py-1 rounded-md flex items-center gap-1 ${
                                isArmyTag 
                                  ? 'bg-purple-100/80 text-purple-700 font-bold' 
                                  : (hotel.display_tags?.trans?.en === tag)
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'bg-gray-100 text-gray-600 font-medium'
                              }`}
                            >
                              {(hotel.display_tags?.trans?.en === tag) && <MapPin size={10} className="shrink-0" />}
                              {tag}
                            </span>
                          );
                        })}
                      </div>
    
                      <div className="mt-auto flex items-end justify-between border-t border-gray-50 pt-4">
                        <div data-layername="Price">
                          {hotel.cancellation?.type === 'free' && (
                            <span className="text-[10px] font-bold text-green-600 block mb-0">
                              Free Cancellation
                            </span>
                          )}
                          <span className="text-xs text-gray-400 line-through mr-2 block">
                            {hotel.originalPrice && formatPrice(hotel.originalPrice)}
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[22px] font-extrabold text-gray-900">
                              {price}
                            </span>
                            {!hotel.price_usd && <span className="text-xs text-gray-500 font-medium">{t.night}</span>}
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => {
                            if (hotel.rooms_left === 0) return; 
                            onSelectHotel(hotel.id);
                          }}
                          disabled={hotel.rooms_left === 0}
                          className={`px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center gap-2 shrink-0 ${
                            hotel.rooms_left === 0
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                              : 'bg-purple-700 text-white hover:bg-purple-800'
                          }`}
                        >
                          {hotel.rooms_left === 0 ? 'Sold Out' : t.reserveBtn}
                          {hotel.rooms_left !== 0 && <ChevronRight size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
                })}
                {hotels.length === 0 && (
                   <div className="text-center py-10 text-gray-400">
                     <p>No hotels found in this area/category.</p>
                   </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {viewMode === 'map' && (
        <div className="fixed inset-0 top-0 left-0 z-0 h-full w-full bg-gray-100">
          <MapContainer 
            center={[CITY_COORDS.seoul.lat, CITY_COORDS.seoul.lng]} 
            zoom={13} 
            scrollWheelZoom={true}
            zoomControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <MapClickHandler onMapClick={() => setSelectedMarkerId(null)} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            
            <MapUpdater center={CITY_COORDS[activeCity]} />

            {(mapData || SPECIAL_LOCATIONS[activeCity]) && (
              <>
                {(mapData?.venue || SPECIAL_LOCATIONS[activeCity]?.venue) && (
                  <Marker 
                    position={
                      mapData?.venue 
                        ? [mapData.venue.lat, mapData.venue.lng] 
                        : [SPECIAL_LOCATIONS[activeCity].venue.lat, SPECIAL_LOCATIONS[activeCity].venue.lng]
                    }
                    icon={createVenueIcon()}
                    interactive={false}
                  />
                )}
                
                {(mapData?.local_spots || SPECIAL_LOCATIONS[activeCity]?.stations || []).map((spot: any, idx: number) => {
                  const spotName = currentLang === 'en' && spot.name_en ? spot.name_en : spot.name;
                  return (
                    <Marker 
                      key={`spot-${idx}`}
                      position={[spot.lat, spot.lng]}
                      icon={createStationIcon(spotName, spot.line)}
                      interactive={false}
                    />
                  );
                })}
              </>
            )}

            {filteredItems.map((item) => {
              const isSelected = selectedMarkerId === item.id;
              let icon;
              
              if (item.type === 'stay') {
                icon = createPriceIcon(formatPrice(item.price), isSelected);
              } else if (item.type === 'food') {
                icon = createCategoryIcon('bg-orange-500', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>', isSelected);
              } else if (item.type === 'spot') {
                icon = createCategoryIcon('bg-blue-500', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>', isSelected);
              } else {
                icon = createCategoryIcon('bg-gray-500', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>', isSelected);
              }

              return (
                <Marker
                  key={item.id}
                  position={[item.coords.lat, item.coords.lng]}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      setSelectedMarkerId(item.id);
                    },
                  }}
                />
              );
            })}
          </MapContainer>

          
            {selectedItem && (
               <div
                 className="absolute bottom-6 left-5 right-5 z-[1000] bg-white rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex gap-4 items-center cursor-pointer active:scale-[0.98] transition-transform"
                 onClick={() => onSelectHotel(selectedItem.id)}
               >
                 <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100 relative">
                   <ImageWithFallback 
                     src={selectedItem.image_url || selectedItem.image || ''} 
                     alt={selectedItem.name} 
                     className="w-full h-full object-cover"
                   />
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start">
                     <h3 className="font-bold text-gray-900 truncate pr-2 text-[14px]">{selectedItem.name_en || selectedItem.name}</h3>
                     <div className="flex items-center gap-1 shrink-0 bg-gray-50 px-1.5 py-0.5 rounded-md">
                        <Star size={10} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-[10px] font-bold">{selectedItem.rating}</span>
                     </div>
                   </div>
                   <p className="text-xs text-gray-500 mt-1 truncate flex items-center gap-1">
                     <MapPin size={10} />
                     {selectedItem.location_desc || activeCity}
                   </p>
                   <div className="flex items-end justify-between mt-1.5">
                     <div className="flex flex-col leading-none">
                        <span className="text-[10px] text-gray-400 line-through mb-0.5">
                          {selectedItem.originalPrice && formatPrice(selectedItem.originalPrice)}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-extrabold text-lg text-gray-900">
                            {selectedItem.price_usd ? `$ ${selectedItem.price_usd}` : formatPrice(selectedItem.price)}
                          </span>
                          {!selectedItem.price_usd && <span className="text-[10px] text-gray-500 font-medium">/night</span>}
                        </div>
                     </div>
                     <button className="bg-purple-700 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md">
                       <ChevronRight size={16} />
                     </button>
                   </div>
                 </div>
               </div>
            )}
          
        </div>
      )}
    </div>
  );
};