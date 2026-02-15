import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Star, MapPin, Clock, ShieldCheck, Moon, Navigation, ExternalLink, X, Globe } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { translations } from '@/translations';

interface DetailProps {
  onBack: () => void;
  t: typeof translations['en'];
  hotelId: string | null;
  items: any[];
  onSelectHotel: (id: string) => void;
}

export const Detail = ({ onBack, t, hotelId, items, onSelectHotel }: DetailProps) => {
  const [browserUrl, setBrowserUrl] = React.useState<string | null>(null);
  const hotel = items.find(h => h.id === hotelId);

  if (!hotel) {
     return (
       <div className="flex flex-col min-h-screen items-center justify-center p-10 bg-white">
         <p className="text-gray-500">Hotel not found</p>
         <button onClick={onBack} className="mt-4 text-purple-600 font-bold">Go Back</button>
       </div>
     );
  }
  
  // Safe access to new fields
  const safeRoute = (hotel as any).safe_return || (hotel as any).safe_route;
  const localGuide = (hotel as any).army_local_guide || (hotel as any).local_guide;
  const transport = (hotel as any).transport;
  const imageUrl = (hotel as any).image_url || hotel.image;
  const booking = (hotel as any).booking || {};
  const priceUsd = (hotel as any).price_usd; // This might be undefined now, we rely on hotel.price being USD

  // Flatten local guide if it's in the new object format
  const guideItems = React.useMemo(() => {
    if (Array.isArray(localGuide)) return localGuide;
    if (!localGuide) return [];
    
    const items: any[] = [];
    // Prioritize BTS spots, then Food, then Cafe
    ['bts', 'restaurant', 'cafe', 'hotspot'].forEach(cat => {
       if (localGuide[cat]) {
         localGuide[cat].forEach((spot: any) => {
           items.push({
             name: spot.name_en,
             desc: spot.description_en,
             tag: spot.spot_tag,
             image: cat === 'bts' ? "https://images.unsplash.com/photo-1616790876844-97c0c6057364?q=80&w=1080&auto=format&fit=crop" 
                  : cat === 'restaurant' ? "https://images.unsplash.com/photo-1596483584555-520e542ebc9a?q=80&w=1080&auto=format&fit=crop"
                  : cat === 'cafe' ? "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1080&auto=format&fit=crop"
                  : "https://images.unsplash.com/photo-1534270804882-6b5048b1c1fc?q=80&w=1080&auto=format&fit=crop"
           });
         });
       }
    });
    return items.slice(0, 5); // Limit to 5 items
  }, [localGuide]);

  const nearby = (hotel as any).nearby || [];

  return (
    <div className="flex flex-col min-h-screen bg-white pb-24">
       {/* Sticky Header */}
       <div className="sticky top-0 z-50 flex items-center justify-between px-4 h-14 bg-white/80 backdrop-blur-md border-b border-gray-100">
         <button onClick={onBack} className="p-2 -ml-2 text-[#333] hover:bg-gray-100 rounded-full transition-colors">
           <ArrowLeft size={20} strokeWidth={1.8} />
         </button>
         <span className="font-bold text-[15px] text-gray-900 truncate max-w-[200px]">{t.stayDetails}</span>
         <button className="p-2 -mr-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-full transition-colors">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
           </svg>
         </button>
       </div>

       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
         {/* Section 1: The Stay */}
         <div className="relative h-64">
            <ImageWithFallback 
              src={imageUrl || ''} 
              alt={hotel.name} 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-20 z-10">
              <div className="flex flex-col justify-end items-start gap-1">
                <h1 className="text-2xl font-bold text-white drop-shadow-md leading-tight">{hotel.name}</h1>
                <div className="flex items-center flex-wrap gap-3 text-white/90 text-sm font-medium drop-shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} className="shrink-0" /> 
                    <span className="truncate max-w-[200px]">{hotel.location}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <Star size={14} fill="currentColor" className="text-yellow-400" /> 
                    <span className="font-bold text-white">{hotel.rating}</span>
                  </div>

                  {booking.platform && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 backdrop-blur-md rounded border border-white/10">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white">{booking.platform}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
         </div>

         {/* Section 2: Midnight Return Map */}
         {safeRoute && (
         <div className="p-5 border-b border-gray-100">
           <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                <Moon size={18} />
              </div>
              <h2 className="font-bold text-lg text-gray-900">{t.safeReturn}</h2>
           </div>
           
           <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
             {/* Mock Map Visualization */}
             <div className="relative w-full h-40 bg-gray-200 rounded-xl overflow-hidden mb-4 group">
                <ImageWithFallback 
                  src={safeRoute.map_image || "https://images.unsplash.com/photo-1584972191378-d70853fc47fc"} 
                  alt="Map" 
                  className="w-full h-full object-cover opacity-80"
                />
                
                {/* Overlay Route Graphic */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {(safeRoute.route_summary || safeRoute.route_en) ? (
                    <div 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg border border-white/20 text-white"
                      style={{ backgroundColor: safeRoute.line_color || transport?.line_color || '#6B21A8' }}
                    >
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-xs font-bold">{safeRoute.route_summary || safeRoute.route_en}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg border border-purple-100">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-bold text-purple-900">{t.mapRoute}</span>
                    </div>
                  )}
                </div>
             </div>

             <div className="space-y-3">
               <div className="flex items-start gap-3">
                 <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                 <p className="text-sm text-gray-600">
                   Last train at <span className="font-bold text-gray-900">{safeRoute.last_train || '23:50'}</span>
                   {safeRoute.taxi_krw > 0 && <span className="text-xs text-gray-400 ml-2">(Taxi approx. ₩{safeRoute.taxi_krw.toLocaleString()})</span>}
                 </p>
               </div>
               <div className="flex items-start gap-3">
                 <ShieldCheck className="w-4 h-4 text-gray-400 mt-0.5" />
                 <p className="text-sm text-gray-600">
                   Total travel time: <span className="font-bold text-gray-900">{safeRoute.time_min || safeRoute.walking_time || '15'} min</span>
                 </p>
               </div>
             </div>
           </div>
         </div>
         )}

         {/* Section 3: Army's Local Guide */}
         {guideItems && guideItems.length > 0 && (
         <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                <Navigation size={18} />
              </div>
              <h2 className="font-bold text-lg text-gray-900">{t.localGuide}</h2>
           </div>

           <div className="space-y-4">
             {guideItems.map((guide: any, idx: number) => (
               <div key={idx} className="flex gap-4">
                 <div className="flex-1 min-w-0 py-1">
                   <h3 className="font-bold text-gray-900 mb-1">{guide.name}</h3>
                   {guide.tag && (
                      <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded mb-1">
                        {guide.tag}
                      </span>
                   )}
                   <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                     {guide.desc}
                   </p>
                 </div>
               </div>
             ))}
           </div>
         </div>
         )}

         {/* Section 4: Nearby Recommendations */}
         {nearby && nearby.length > 0 && (
           <div className="p-5 border-t border-gray-100">
             <h2 className="font-bold text-lg text-gray-900 mb-4">{(t as any).nearbyStays || 'Nearby Stays'}</h2>
             <div className="relative group">
               <button 
                 onClick={() => document.getElementById('nearby-stays-scroll')?.scrollBy({ left: -200, behavior: 'smooth' })}
                 className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 p-2 rounded-full shadow-lg border border-gray-100 text-gray-800 flex items-center justify-center hover:bg-white hover:scale-110 transition-transform"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
               </button>
               
               <button 
                 onClick={() => document.getElementById('nearby-stays-scroll')?.scrollBy({ left: 200, behavior: 'smooth' })}
                 className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-white/90 p-2 rounded-full shadow-lg border border-gray-100 text-gray-800 flex items-center justify-center hover:bg-white hover:scale-110 transition-transform"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
               </button>

               <div id="nearby-stays-scroll" className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar -mx-5 px-5 scroll-smooth">
                 {nearby.map((item: any, idx: number) => {
                   const isAvailable = item.is_available !== false;
                   return (
                     <div 
                       key={idx} 
                       className={`w-40 flex-shrink-0 flex flex-col gap-2 group cursor-pointer ${!isAvailable ? 'opacity-50' : ''}`}
                       onClick={() => {
                         const target = items.find(h => 
                           (item.name_en && h.name_en === item.name_en) || 
                           (item.name && h.name === item.name)
                         );
                         if (target) {
                           onSelectHotel(target.id);
                           window.scrollTo({ top: 0, behavior: 'smooth' });
                         }
                       }}
                     >
                       <div className="w-40 h-28 rounded-xl overflow-hidden bg-gray-100 relative">
                         <ImageWithFallback 
                           src={item.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945"} 
                           alt={item.name_en}
                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                         />
                         <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-bold">
                           <Star size={8} fill="currentColor" className="text-yellow-400 inline mr-0.5" />
                           {item.rating || '4.5'}
                         </div>
                       </div>
                       <div>
                         <h3 className="font-bold text-sm text-gray-900 truncate">{item.name_en}</h3>
                         <p className="text-xs text-gray-500 flex items-center mb-2">
                           <MapPin size={10} className="mr-0.5" />
                           {item.location?.area_en || "Seoul"}
                         </p>
                         <button className={`w-full py-1.5 rounded-lg text-xs font-bold text-white transition-colors ${isAvailable ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500'}`}>
                           {isAvailable ? t.reserveBtn : t.soldOut}
                         </button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           </div>
         )}
       </motion.div>

       {/* Bottom CTA Bar */}
       <div className="fixed bottom-0 left-0 right-0 w-full max-w-md mx-auto bg-white border-t border-gray-100 p-4 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 p-[16px]">
          <div className="flex items-center justify-between mb-2">
             <div className="flex flex-col">
                <span className="text-xs text-gray-500">{t.totalPrice}</span>
                <span className="text-xl font-bold text-gray-900">
                  {priceUsd ? `$ ${priceUsd}` : `$${hotel.price}`}
                </span>
             </div>
             <button 
                onClick={() => {
                    // Use booking_url if available, otherwise fallback logic
                    const targetUrl = booking.booking_url || hotel.link || `https://www.agoda.com/search?text=${encodeURIComponent(hotel.name)}`;
                    
                    // Logic based on iframe_support: if explicit false, force external
                    // If undefined, default to external for known blockers
                    const forceExternal = booking.iframe_support === false;
                    const isKnownBlocker = targetUrl.includes('agoda.com') || targetUrl.includes('airbnb.com') || targetUrl.includes('booking.com');
                    
                    if (forceExternal || isKnownBlocker) {
                         window.open(targetUrl, '_blank');
                    } else {
                         setBrowserUrl(targetUrl);
                    }
                }}
                className="bg-gray-900 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2"
             >
                <span>{t.reserveNow}{booking.platform ? ` on ${booking.platform}` : ''}</span>
                {/* Show icon if external support is required (iframe_support is false) or defaulted to external */}
                {(booking.iframe_support === false) && <ExternalLink size={18} />}
             </button>
          </div>
       </div>

       {/* In-App Browser Modal */}
       {browserUrl && (
         <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/95 backdrop-blur">
               <div className="flex items-center gap-2">
                  <button onClick={() => setBrowserUrl(null)} className="p-2 -ml-2 text-[#333] hover:bg-gray-100 rounded-full transition-colors">
                     <X size={20} strokeWidth={1.8} />
                  </button>
                  <div className="flex flex-col">
                     <span className="font-bold text-sm text-gray-900">Booking</span>
                     <span className="text-[10px] text-gray-500 truncate max-w-[200px]">{browserUrl}</span>
                  </div>
               </div>
               <button 
                 onClick={() => window.open(browserUrl, '_blank')}
                 className="p-2 text-[#333] hover:bg-gray-100 rounded-full transition-colors"
                 title="Open in Browser"
               >
                 <Globe size={20} strokeWidth={1.8} />
               </button>
            </div>
            <div className="flex-1 bg-gray-50 relative">
               <iframe 
                 src={browserUrl} 
                 className="w-full h-full border-0"
                 title="Booking Page"
                 sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
               />
            </div>
         </div>
       )}
    </div>
  );
};
