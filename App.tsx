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
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';

type Screen = 'landing' | 'results' | 'detail' | 'bookmarks';
export type SortOption = 'recommended' | 'lowest_price' | 'distance' | 'available' | 'popular' | 'near_venue';

const DATA_URL = "https://raw.githubusercontent.com/not2byul-sys/BTS_Hotel/claude/document-project/korean_ota_hotels.json";

// Helper to calculate distance in km (Haversine formula approximation)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Mat
cat > App.tsx << 'EOF'
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
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { AuthProvider, useAuth } from '@/app/context/AuthContext';

type Screen = 'landing' | 'results' | 'detail' | 'bookmarks';
export type SortOption = 'recommended' | 'lowest_price' | 'distance' | 'available' | 'popular' | 'near_venue';

const DATA_URL = "https://raw.githubusercontent.com/not2byul-sys/BTS_Hotel/claude/document-project/korean_ota_hotels.json";

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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedCity, setSelectedCity] = useState<City>('goyang');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allHotels, setAllHotels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth(); // 로그인 상태 사용!

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error('Geolocation error:', error)
      );
    }
  }, []);

  useEffect(() => {
    fetch(DATA_URL)
      .then((res) => res.json())
      .then((data) => {
        setAllHotels(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load hotels:', err);
        setAllHotels(initialItems);
        setIsLoading(false);
      });
  }, []);

  const handleStart = (city: City, sort: SortOption, dates?: DateRange) => {
    setSelectedCity(city);
    setInitialSort(sort);
    setDateRange(dates);
    setCurrentScreen('results');
  };

  const handleSelectHotel = (id: string) => {
    setSelectedHotelId(id);
    setCurrentScreen('detail');
  };

  const handleBack = () => {
    if (currentScreen === 'detail') {
      setCurrentScreen('results');
      setSelectedHotelId(null);
    } else if (currentScreen === 'results' || currentScreen === 'bookmarks') {
      setCurrentScreen('landing');
    }
  };

  const handleViewBookmarks = () => {
    setCurrentScreen('bookmarks');
  };

  const selectedHotel = useMemo(
    () => allHotels.find((h) => h.id === selectedHotelId),
    [allHotels, selectedHotelId]
  );

  const t = translations[language];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <ErrorBoundary>
        {currentScreen === 'landing' && (
          <Landing
            onStart={handleStart}
            language={language}
            onLanguageChange={setLanguage}
          />
        )}
        {currentScreen === 'results' && (
          <>
            <Header
              onBack={handleBack}
              onViewBookmarks={handleViewBookmarks}
              language={language}
              onLanguageChange={setLanguage}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
            <Results
              hotels={allHotels}
              selectedCity={selectedCity}
              onSelectHotel={handleSelectHotel}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              initialSort={initialSort}
              userCoords={userCoords}
              searchQuery={searchQuery}
              isLoading={isLoading}
            />
          </>
        )}
        {currentScreen === 'detail' && selectedHotel && (
          <Detail hotel={selectedHotel} onBack={handleBack} language={language} />
        )}
        {currentScreen === 'bookmarks' && (
          <>
            <Header
              onBack={handleBack}
              onViewBookmarks={handleViewBookmarks}
              language={language}
              onLanguageChange={setLanguage}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
            />
            <Bookmarks
              hotels={allHotels}
              onSelectHotel={handleSelectHotel}
            />
          </>
        )}
      </ErrorBoundary>

      {user && (
        <div className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg">
          💜 {user.email}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ArmyStayApp />
    </AuthProvider>
  );
}
