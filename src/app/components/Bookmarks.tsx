import React from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { Star, MapPin, ChevronRight, Heart } from 'lucide-react';
import { motion } from 'motion/react';

interface BookmarksProps {
  items: any[];
  onSelectHotel: (id: string) => void;
  t: any;
}

export const Bookmarks = ({ items, onSelectHotel, t }: BookmarksProps) => {
  const { bookmarks, toggleBookmark } = useAuth();
  
  const likedItems = items.filter(item => bookmarks.has(item.id));

  const formatPrice = (price: number) => {
     // @ts-ignore
    const rate = t.currencyRate || 1;
    // @ts-ignore
    const symbol = t.currencySymbol || '$';
    
    const converted = Math.round(price * rate); // Note: Assuming price is already in base unit or handled by passed t
    // Ideally use the same logic as Results.tsx
    // Results.tsx: const converted = Math.round(usdPrice * rate);
    // Here we might receive items with normalized 'price' (USD).
    
    return `${symbol}${converted.toLocaleString()}`;
  };

  if (likedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-5 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
          <Heart size={40} fill="currentColor" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Bookmarks Yet</h2>
        <p className="text-gray-500 max-w-xs">
          Tap the heart icon on any hotel to save it here for later.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-[80px] pt-[24px]">
      <div className="px-5 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Saved Stays</h1>
        <p className="text-sm text-gray-500">{likedItems.length} items</p>
      </div>

      <div className="flex flex-col gap-4 px-5">
        {likedItems.map((hotel, index) => (
          <motion.div
            key={hotel.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectHotel(hotel.id)}
            className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex h-32 cursor-pointer group"
          >
            <div className="w-32 h-32 shrink-0 bg-gray-200 relative">
              <ImageWithFallback 
                src={hotel.image || ''} 
                alt={hotel.name} 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(hotel.id);
                }}
                className="absolute top-2 left-2 p-1.5 bg-white/90 backdrop-blur rounded-full text-purple-700 hover:scale-110 transition-transform shadow-sm"
              >
                <Heart size={14} fill="currentColor" />
              </button>
            </div>
            
            <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">
                    {hotel.name}
                  </h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded shrink-0">
                    <Star size={8} fill="currentColor" />
                    {hotel.rating}
                  </div>
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate">
                  <MapPin size={10} />
                  {hotel.location}
                </p>
              </div>

              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                   <span className="text-xs text-gray-400 line-through">
                      {hotel.originalPrice && formatPrice(hotel.originalPrice)}
                   </span>
                   <span className="text-lg font-extrabold text-gray-900 leading-none">
                      {hotel.price_usd ? `$${hotel.price_usd}` : `$${hotel.price}`}
                   </span>
                </div>
                <button className="bg-purple-100 text-purple-700 p-2 rounded-lg group-hover:bg-purple-700 group-hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
