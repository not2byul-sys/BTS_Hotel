import React from 'react';
import { Heart, ChevronRight, Star } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface HotelCardProps {
  hotel: any;
  walkMins: number;
  t: any;
  onSelect: () => void;
  onBook: (url: string, name: string) => void;
}

export const HotelCard = ({ hotel, walkMins, t, onSelect, onBook }: HotelCardProps) => {
  const formatPrice = (price: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price);

  // Tag Logic
  // Use tags from data (scraper updated to provide 4-step tags)
  const tags = hotel.tags || [];

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group flex flex-col transition-all hover:shadow-md">
      {/* Top-aligned thumbnail image */}
      <div className="relative h-48 w-full shrink-0">
        <ImageWithFallback 
          src={hotel.image || ''} 
          alt={hotel.name} 
          className="w-full h-full object-cover"
        />
        <button className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 transition-colors z-10">
          <Heart size={20} />
        </button>
        {hotel.rooms_left <= 3 && hotel.rooms_left > 0 && (
            <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                Only {hotel.rooms_left} left
            </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-3">
        {/* Hotel Name and Price Row */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-lg text-gray-900 leading-tight">
            {hotel.name.replace(/\[.*?\]\s*/g, '')}
          </h3>
          <div className="flex flex-col items-end shrink-0">
             <span className="text-xl font-bold text-gray-900">{formatPrice(hotel.price)}</span>
             <span className="text-[10px] text-gray-500">/night</span>
          </div>
        </div>

        {/* Tag Section: 4 neutral-colored tags */}
        <div className="flex flex-wrap gap-[6px]">
            {tags.map((tag: string, idx: number) => (
                <span 
                    key={idx} 
                    className="bg-[#F3F4F6] text-[#4B5563] text-[11px] font-medium px-2 py-1 rounded-[4px] whitespace-nowrap"
                >
                    {tag}
                </span>
            ))}
        </div>
        
        {/* Action Button */}
        <button 
            onClick={() => {
                if (hotel.rooms_left === 0) return;
                if (hotel.link) {
                    onBook(hotel.link, hotel.name);
                } else {
                    onSelect();
                }
            }}
            disabled={hotel.rooms_left === 0}
            className={`w-full mt-2 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                hotel.rooms_left === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-black'
            }`}
        >
            {hotel.rooms_left === 0 ? 'Sold Out' : 'Reserve Now'}
            {hotel.rooms_left !== 0 && <ChevronRight size={16} />}
        </button>

      </div>
    </div>
  );
};
