import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/app/components/Header';
import { Landing } from '@/app/components/Landing';
import { Results, City } from '@/app/components/Results';
import { Detail } from '@/app/components/Detail';
import { Bookmarks } from '@/app/components/Bookmarks';
import { LoginModal } from '@/app/components/auth/LoginModal';
import { translations, Language } from '@/translations';
import { initialItems } from '@/app/data';
import { DateRange } from 'react-day-picker';
import { ArrowUp } from 'lucide-react';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import type { ConcertRecommendationData } from '@/app/components/ConcertInsights';

type Screen = 'landing' | 'results' | 'detail' | 'bookmarks';
export type SortOption = 'recommended' | 'lowest_price' | 'distance' | 'available' | 'popular' | 'army_density' | 'closing_soon';

// Primary: local bundled data (guaranteed available)
// Fallback: remote GitHub data
const DATA_URL = "/data/hotels.json";
const DATA_URL_FALLBACK = "https://raw.githubusercontent.com/not2byul-sys/BTS_Hotel/main/korean_ota_hotels.json";
const CONCERT_REC_URL = "/data/concert_recommendations.json";

// Helper to calculate distance in km (Haversine formula approximation)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

function ArmyStayApp() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [initialSort, setInitialSort] = useState<SortOption>('recommended');
  const [initialCity, setInitialCity] = useState<City>('goyang');
  const [fetchedData, setFetchedData] = useState<any>(null);
  const [concertData, setConcertData] = useState<ConcertRecommendationData | null>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);
  
  const { isAuthenticated, setShowLoginModal } = useAuth();
  
  // Date Range State (Default to Concert Period: June 13-15, 2026)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2026, 5, 13),
    to: new Date(2026, 5, 15)
  });

  const t = translations[language];
  
  // Script Injection for Ownership Verification
  useEffect(() => {
    // Check if script is already present to prevent duplicates
    if (!document.querySelector('script[src*="tp-em.com"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src = 'https://tp-em.com/NDkyNTk4.js?t=492598';
      document.head.appendChild(script);
    }
  }, []);

  // Fetch Data: local bundled first, GitHub fallback
  useEffect(() => {
    const fetchData = async () => {
      try {
        let response = await fetch(DATA_URL);
        if (!response.ok) {
          console.log("Local data not available, trying GitHub fallback...");
          response = await fetch(DATA_URL_FALLBACK);
        }
        if (!response.ok) throw new Error("Failed to fetch data from all sources");
        const json = await response.json();
        console.log(`Loaded ${json.hotels?.length || 0} hotels`);
        setFetchedData(json);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch Concert Recommendation Data (Reddit fan analysis + hotel matching)
  useEffect(() => {
    const fetchConcertData = async () => {
      try {
        const response = await fetch(`${CONCERT_REC_URL}?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Failed to fetch concert data");
        const json = await response.json();
        setConcertData(json);
      } catch (error) {
        console.log("Concert recommendations not available yet:", error);
      }
    };

    fetchConcertData();
  }, []);

  // Scroll listener for Top Button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowTopBtn(true);
      } else {
        setShowTopBtn(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Combine initial items with fetched data and handle localization
  const items = useMemo(() => {
    const rawHotels = fetchedData?.hotels || (Array.isArray(fetchedData) ? fetchedData : []);
    const sourceData = rawHotels.length > 0 ? rawHotels : initialItems;
    const lang = language; 
    const btsSpots = fetchedData?.map?.local_spots?.filter((s: any) => s.category === 'bts') || [];
    
    const hotelItems = sourceData.map((item: any, index: number) => {
      // New Structure Handling
      const name = item.hotel_name || item[`name_${lang}`] || item.name_en || item.name;
      const images = item.images || [];
      let image = (images.length > 0 ? images[0] : null) || item.image_url || item.image || '';
      
      // Filter out invalid/expired Figma URLs and fallback to Unsplash
      if (image && (image.includes('figma.com') || image.includes('s3-figma-foundry'))) {
         image = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1080';
      }

      const priceObj = item.price || {};
      const priceVal = typeof priceObj === 'number' ? priceObj : (priceObj.discounted_price || item.price_krw || 0);
      const priceKrw = typeof priceObj === 'number' ? null : (priceObj.discounted_price || item.price_krw);

      const ratingObj = item.rating || {};
      const ratingVal = typeof ratingObj === 'number' ? ratingObj : (ratingObj.score || 0);
      
      const locObj = item.location || {};
      const areaEn = locObj.area_en;
      const addressEn = locObj.address_en;
      
      const coords = (item.lat && item.lng) ? { lat: item.lat, lng: item.lng } : (item.coords || { lat: 37.5300, lng: 127.0500 });
      
      let armyScore = 30;

      const dist = calculateDistance(coords.lat, coords.lng, 37.6695, 126.7490);
      if (dist <= 1) armyScore += 30;
      else if (dist <= 3) armyScore += 25;
      else if (dist <= 5) armyScore += 20;
      else if (dist <= 10) armyScore += 10;

      const rawType = item.hotel_type?.label_en || item.type || '';
      const typeStr = (typeof rawType === 'string' ? rawType : '').toLowerCase();
      
      let displayType = rawType;
      if (typeStr.includes('airbnb')) {
        displayType = "Private Stay";
      }

      if (typeStr.includes('guesthouse')) armyScore += 20;
      else if (typeStr.includes('hostel')) armyScore += 18;
      else if (typeStr.includes('airbnb') || typeStr.includes('bnb')) armyScore += 10;
      else if (typeStr.includes('residence')) armyScore += 8;

      if (btsSpots.length > 0) {
         const minDist = Math.min(...btsSpots.map((s: any) => calculateDistance(coords.lat, coords.lng, s.lat, s.lng)));
         if (minDist <= 2) armyScore += 15;
         else if (minDist <= 5) armyScore += 10;
         else if (minDist <= 10) armyScore += 5;
      }

      const rawAddress = [
          addressEn,
          item.address_en, 
          item.address, 
          typeof item.location === 'string' ? item.location : '',
          item.location_kr,
          item.address_kr
      ].filter(s => typeof s === 'string').join(' ');
      
      const address = rawAddress.toLowerCase();
      
      if (address.includes('ilsan') || address.includes('일산') || address.includes('goyang') || address.includes('고양') || item.city === 'goyang' || item.city_key === 'goyang') armyScore += 10;
      else if (address.includes('hongdae') || address.includes('홍대') || address.includes('mapo') || address.includes('마포')) armyScore += 8;
      else if (address.includes('sangam') || address.includes('상암')) armyScore += 5;

      const finalScore = Math.min(armyScore, 99);
      const densityLabel = `ARMY ${finalScore}%`;
      const densityLevel = finalScore >= 80 ? 'Very High' : finalScore >= 60 ? 'High' : 'Normal';

      const resolveLocation = () => {
        if (areaEn && addressEn) return `${areaEn}, ${addressEn}`;
        if (areaEn) return areaEn;
        
        if (item.area && typeof item.area === 'object') {
           const areaVal = item.area[`area_${lang}`] || (lang === 'ko' ? item.area.area_kr : undefined);
           return areaVal || item.area.area_en || item.area.area_kr;
        }
        if (typeof item.area === 'string') return item.area;
        
        const suffix = lang === 'ko' ? 'kr' : lang;
        
        if (typeof item[`location_${suffix}`] === 'string') return item[`location_${suffix}`];
        if (typeof item[`address_${suffix}`] === 'string') return item[`address_${suffix}`];
        
        if (typeof item.address_kr === 'string' && lang === 'ko') return item.address_kr; 
        if (typeof item.location_kr === 'string' && lang === 'ko') return item.location_kr;
        
        if (typeof item.address_en === 'string') return item.address_en;
        if (typeof item.location_en === 'string') return item.location_en;
        
        if (typeof item.address === 'string') return item.address;
        if (typeof item.location === 'string') return item.location;
        if (typeof item.addr === 'string') return item.addr; 
        
        if (typeof item.city === 'string') {
            return item.city.charAt(0).toUpperCase() + item.city.slice(1);
        }
        
        return t.unknownLocation;
      };
      
      const safeLocation = resolveLocation();

      const detectCity = () => {
        if (item.city_key) {
           const ck = item.city_key.toLowerCase();
           if (['seongsu', 'hongdae', 'gwanghwamun', 'insadong', 'jongno', 'myeongdong', 'gangnam', 'mapo', 'yongsan'].includes(ck)) return 'seoul';
           if (['seoul', 'busan', 'paju', 'goyang'].includes(ck)) return ck;
        }
        if (item.city) return item.city.toLowerCase();
        
        const searchStr = [
          safeLocation,
          item.address, 
          item.address_en, 
          item.address_kr,
          typeof item.location === 'string' ? item.location : '',
          item.location_en, 
          item.location_kr,
          item.area?.area_en,
          item.area?.area_kr
        ].filter(s => typeof s === 'string').join(' ').toLowerCase();
        
        if (searchStr.includes('seoul') || searchStr.includes('gangnam') || searchStr.includes('hongdae') || searchStr.includes('mapo') || searchStr.includes('yongsan') ||
            searchStr.includes('서울') || searchStr.includes('강남') || searchStr.includes('홍대') || searchStr.includes('마포') || searchStr.includes('용산')) return 'seoul';
            
        if (searchStr.includes('busan') || searchStr.includes('haeundae') || searchStr.includes('seomyeon') ||
            searchStr.includes('부산') || searchStr.includes('해운대') || searchStr.includes('서면')) return 'busan';
            
        if (searchStr.includes('paju') || searchStr.includes('파주')) return 'paju';
        
        if (searchStr.includes('goyang') || searchStr.includes('ilsan') || searchStr.includes('kintex') ||
            searchStr.includes('고양') || searchStr.includes('일산') || searchStr.includes('킨텍스')) return 'goyang';
        
        return 'goyang'; 
      };

      const detectedCity = detectCity();
      const coords2 = (item.lat && item.lng) ? { lat: item.lat, lng: item.lng } : (item.coords || { lat: 37.5300, lng: 127.0500 });

      return {
        ...item,
        address_en: typeof item.address_en === 'string' ? item.address_en : addressEn,
        area: typeof item.area === 'string' ? item.area : areaEn,
        id: item.id || `item-${index}`,
        name: name, 
        location: safeLocation,
        price: priceKrw ? Math.round(priceKrw / 1350) : (typeof priceVal === 'number' ? priceVal : 0),
        price_krw: priceKrw, 
        type: 'stay',
        city: detectedCity, 
        coords: coords2,
        rating: ratingVal,
        army_density: {
          value: finalScore,
          label: densityLabel,
          level: densityLevel
        },
        tags: [
             densityLabel, 
             displayType,
             item.distance?.display_en,
             item.transport?.display_en
        ].filter((tag): tag is string => typeof tag === 'string' && tag.length > 0),
        image: image,
        link: item.platform?.booking_url || item.link || item.url || item.booking_url || '',
        safe_return: item.safe_return,
        army_local_guide: item.army_local_guide,
        booking: item.platform,
        rooms_left: item.rooms_left ?? 99
      };
    });

    // Add local_spots (food, BTS spots, cafes, hotspots) as filterable items
    const localSpots = (fetchedData?.map?.local_spots || []).map((spot: any, idx: number) => {
      const cat = (spot.category || '').toLowerCase();
      let itemType = 'spot';
      if (cat === 'restaurant' || cat === 'cafe') itemType = 'food';

      const sLat = spot.lat || 0;
      const sLng = spot.lng || 0;
      let spotCity = 'goyang';
      if (sLat > 37.4 && sLat < 37.6 && sLng > 126.85 && sLng < 127.15) spotCity = 'seoul';
      else if (sLat < 36) spotCity = 'busan';
      else if (sLat > 37.7) spotCity = 'paju';

      const defaultImages: Record<string, string> = {
        bts: 'https://images.unsplash.com/photo-1583037189850-1921ae7c6c22?auto=format&fit=crop&q=80&w=1080',
        restaurant: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1080',
        cafe: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=1080',
        hotspot: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&q=80&w=1080',
      };

      const dist = calculateDistance(sLat, sLng, 37.6695, 126.7490);

      return {
        id: `local-${idx}`,
        name: spot.name_en || spot.name || 'Local Spot',
        location: spot.spot_tag || (itemType === 'food' ? 'Restaurant' : 'BTS Spot'),
        price: 0,
        type: itemType,
        city: spotCity,
        coords: { lat: sLat, lng: sLng },
        rating: cat === 'bts' ? 4.8 : 4.5,
        tags: [
          spot.spot_tag,
          cat === 'bts' ? 'BTS' : cat === 'cafe' ? 'Cafe' : cat === 'restaurant' ? 'Restaurant' : 'Hotspot',
        ].filter(Boolean),
        image: defaultImages[cat] || defaultImages.hotspot,
        link: '',
        rooms_left: 99,
        army_density: {
          value: cat === 'bts' ? 95 : 50,
          label: cat === 'bts' ? 'ARMY 95%' : 'ARMY 50%',
          level: cat === 'bts' ? 'Very High' : 'Normal'
        },
        _distToVenue: dist,
      };
    });

    return [...hotelItems, ...localSpots];
  }, [fetchedData, language, t]);

  const homeStats = useMemo(() => {
    if (fetchedData?.home) {
      return {
        availableCount: fetchedData.home.total_count || fetchedData.home.available_count,
        lowestPrice: Math.round(fetchedData.home.lowest_price_krw / 1350)
      };
    }
    return undefined;
  }, [fetchedData]);

  const mapData = useMemo(() => {
    // Add default color to stations if not present
    const data = fetchedData?.map;
    if (data && Array.isArray(data.local_spots)) {
      // Create a shallow copy of data to avoid direct mutation if possible, 
      // though deep cloning fetchedData is expensive. 
      // We will just map local_spots to a new array.
      return {
        ...data,
        local_spots: data.local_spots.map((spot: any) => ({
          ...spot,
          // Detect line color based on station name or add a default property
          lineColor: spot.lineColor || (spot.name?.includes('Line 3') || spot.name?.includes('3호선') ? '#EF7C1C' : '#00A84D') 
        }))
      };
    }
    return data;
  }, [fetchedData]);

  const navigateTo = (screen: Screen) => {
    window.scrollTo(0, 0);
    setCurrentScreen(screen);
  };

  const handleSearch = (sortBy: SortOption = 'recommended', city: City = 'goyang') => {
    setInitialSort(sortBy);
    setInitialCity(city);
    setViewMode('list');
    navigateTo('results');
  };

  const handleSelectHotel = (hotelId: string) => {
    setSelectedHotelId(hotelId);
    navigateTo('detail');
  };

  const handleBack = () => {
    if (currentScreen === 'detail') {
      navigateTo('results');
    } else if (currentScreen === 'results' || currentScreen === 'bookmarks') {
      navigateTo('landing');
    }
  };

  const handleBookmarksClick = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    } else {
      navigateTo('bookmarks');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 selection:bg-purple-100 relative">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl overflow-hidden relative border-x border-gray-100">
        <LoginModal />

        {currentScreen !== 'detail' && (
          <Header 
            currentLang={language} 
            onLanguageChange={setLanguage}
            onHome={() => navigateTo('landing')}
            onSearch={currentScreen === 'results' ? () => navigateTo('landing') : undefined}
            onBookmarks={handleBookmarksClick}
            viewMode={currentScreen === 'results' ? viewMode : undefined}
            setViewMode={currentScreen === 'results' ? setViewMode : undefined}
          />
        )}
        
        <main className={currentScreen !== 'detail' ? 'pt-14' : ''}>
          {currentScreen === 'landing' && (
            <Landing
              onSearch={handleSearch}
              t={t}
              dateRange={dateRange}
              setDateRange={setDateRange}
              stats={homeStats}
              concertData={concertData}
              language={language}
              onSelectHotel={handleSelectHotel}
            />
          )}
          
          {currentScreen === 'results' && (
            <Results 
              onSelectHotel={handleSelectHotel} 
              t={t} 
              currentLang={language}
              initialSort={initialSort}
              initialCity={initialCity}
              viewMode={viewMode}
              setViewMode={setViewMode}
              items={items}
              mapData={mapData}
              dateRange={dateRange}
              setDateRange={setDateRange}
            />
          )}
          
          {currentScreen === 'detail' && (
            <Detail onBack={handleBack} t={t} hotelId={selectedHotelId} items={items} onSelectHotel={handleSelectHotel} />
          )}

          {currentScreen === 'bookmarks' && (
             <Bookmarks items={items} onSelectHotel={handleSelectHotel} t={t} />
          )}
        </main>
        
        {/* Scroll To Top Button */}
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md px-5 z-[90] pointer-events-none transition-opacity duration-300 ${showTopBtn ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex justify-end">
            <button 
              onClick={scrollToTop}
              className="pointer-events-auto bg-gray-900/90 text-white p-3 rounded-full shadow-xl backdrop-blur hover:bg-black transition-transform hover:scale-110 active:scale-90 flex items-center justify-center"
            >
              <ArrowUp size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ArmyStayApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
