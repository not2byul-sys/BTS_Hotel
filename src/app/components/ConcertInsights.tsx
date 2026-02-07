import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp, AlertTriangle, MapPin, Shield, Users, Globe,
  DollarSign, Train, ChevronRight, Star, Lightbulb, X,
  BarChart3, Target, Zap, Heart
} from 'lucide-react';
import { clsx } from 'clsx';

// Types for the concert recommendation data
interface FanInsight {
  category: string;
  label: string;
  priority_score?: number;
  type: string;
  detail?: string;
}

interface StationInfo {
  name: string;
  name_kr?: string;
  line?: number;
  distance_km?: number;
  walk_min?: number;
}

interface RecommendedHotel {
  id: string;
  name: string;
  name_kr?: string;
  fan_match_score: number;
  score_breakdown: Record<string, number>;
  price_usd: number;
  price_krw?: number;
  distance_km?: number;
  area: string;
  hotel_type: string;
  rating: number;
  nearest_station?: StationInfo;
  is_price_gouging: boolean;
  image_url?: string;
  booking_url?: string;
  rooms_left?: number;
}

interface CategoryData {
  label: string;
  label_kr: string;
  hotels: RecommendedHotel[];
}

export interface ConcertRecommendationData {
  meta: {
    concert_name: string;
    concert_dates: string[];
    venue: string;
    venue_coords: { lat: number; lng: number };
  };
  fan_insights: {
    need_priorities: Record<string, number>;
    insights: FanInsight[];
    budget_target_usd: number;
    top_countries: string[];
    fan_tips: string[];
  };
  recommendations: RecommendedHotel[];
  categories: Record<string, CategoryData>;
  price_gouging_alert: {
    count: number;
    warning: string;
  };
}

interface ConcertInsightsProps {
  data: ConcertRecommendationData;
  language: 'en' | 'ko' | 'ja' | 'zh';
  onSelectHotel?: (hotelId: string) => void;
  currencySymbol?: string;
  currencyRate?: number;
}

const NEED_ICONS: Record<string, React.ElementType> = {
  budget: DollarSign,
  location: MapPin,
  safety: Shield,
  cancellation: AlertTriangle,
  concert_logistics: Train,
  language: Globe,
  group_booking: Users,
  amenities: Star,
  booking_platform: TrendingUp,
  demographics: Globe,
};

const NEED_COLORS: Record<string, string> = {
  budget: 'text-green-600 bg-green-50 border-green-200',
  location: 'text-blue-600 bg-blue-50 border-blue-200',
  safety: 'text-purple-600 bg-purple-50 border-purple-200',
  cancellation: 'text-red-600 bg-red-50 border-red-200',
  concert_logistics: 'text-orange-600 bg-orange-50 border-orange-200',
  language: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  group_booking: 'text-pink-600 bg-pink-50 border-pink-200',
  amenities: 'text-teal-600 bg-teal-50 border-teal-200',
  booking_platform: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  demographics: 'text-violet-600 bg-violet-50 border-violet-200',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  best_value: Zap,
  nearest_venue: MapPin,
  safest_return: Shield,
  army_social: Heart,
  budget_friendly: DollarSign,
};

const CATEGORY_COLORS: Record<string, string> = {
  best_value: 'from-purple-500 to-pink-500',
  nearest_venue: 'from-blue-500 to-cyan-500',
  safest_return: 'from-green-500 to-emerald-500',
  army_social: 'from-pink-500 to-rose-500',
  budget_friendly: 'from-amber-500 to-orange-500',
};

export const ConcertInsights = ({
  data,
  language,
  onSelectHotel,
  currencySymbol = '$',
  currencyRate = 1,
}: ConcertInsightsProps) => {
  const [activeCategory, setActiveCategory] = useState<string>('best_value');
  const [showTips, setShowTips] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  const isKo = language === 'ko';
  const isJa = language === 'ja';
  const isZh = language === 'zh';

  const formatPrice = (usd: number) => {
    if (currencyRate === 1) return `$${usd}`;
    const converted = Math.round(usd * currencyRate);
    return `${currencySymbol}${converted.toLocaleString()}`;
  };

  const insights = data.fan_insights.insights || [];
  const categories = data.categories || {};
  const activeHotels = categories[activeCategory]?.hotels || [];
  const tips = data.fan_insights.fan_tips || [];

  // Section title based on language
  const sectionTitle = isKo ? 'ARMY 인사이트' : isJa ? 'ARMY\u30A4\u30F3\u30B5\u30A4\u30C8' : isZh ? 'ARMY\u6D1E\u5BDF' : 'ARMY Insights';
  const recTitle = isKo ? '\uD32C \uB2C8\uC988 \uAE30\uBC18 \uCD94\uCC9C' : isJa ? '\u30D5\u30A1\u30F3\u30CB\u30FC\u30BA\u304A\u3059\u3059\u3081' : isZh ? '\u7C89\u4E1D\u9700\u6C42\u63A8\u8350' : 'Fan-Powered Picks';
  const tipsTitle = isKo ? '\uD574\uC678 \uC544\uBBF8 \uD301' : isJa ? '\u6D77\u5916ARMY\u30C6\u30A3\u30C3\u30D7\u30B9' : isZh ? '\u6D77\u5916ARMY\u8D34\u58EB' : 'ARMY Travel Tips';
  const gougingTitle = isKo ? '\uBC14\uAC00\uC9C0 \uACBD\uBCF4' : isJa ? '\u4FA1\u683C\u3064\u308A\u4E0A\u3052\u8B66\u544A' : isZh ? '\u4EF7\u683C\u6B3A\u8BC8\u8B66\u62A5' : 'Price Gouging Alert';
  const matchLabel = isKo ? '\uB9E4\uCE6D' : isJa ? '\u30DE\u30C3\u30C1' : isZh ? '\u5339\u914D' : 'Match';
  const perNight = isKo ? '/\uBC15' : isJa ? '/\u6CCA' : isZh ? '/\u665A' : '/night';
  const fromVenue = isKo ? '\uACF5\uC5F0\uC7A5\uC5D0\uC11C' : isJa ? '\u4F1A\u5834\u304B\u3089' : isZh ? '\u8DDD\u573A\u9986' : 'from venue';

  return (
    <div className="space-y-5 mt-6">
      {/* Price Gouging Alert Banner */}
      {data.price_gouging_alert?.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-1 p-3 bg-red-50 border border-red-200 rounded-2xl"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-700">{gougingTitle}</p>
              <p className="text-xs text-red-600 mt-0.5">
                {isKo
                  ? `${data.price_gouging_alert.count}\uAC1C \uC219\uC18C\uAC00 \uCF58\uC11C\uD2B8 \uAE30\uAC04 \uBD80\uD480\uB824\uC9C4 \uAC00\uACA9\uC73C\uB85C \uD655\uC778\uB428. fan_match_score 60+ \uC219\uC18C\uB97C \uCD94\uCC9C\uD569\uB2C8\uB2E4.`
                  : `${data.price_gouging_alert.count} hotels detected with inflated concert-period pricing. We recommend hotels with fan match score 60+.`}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Fan Insights Section */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <BarChart3 size={18} className="text-purple-600" />
            {sectionTitle}
          </h3>
          <span className="text-[10px] text-gray-400 font-medium">
            via Reddit / Web Research
          </span>
        </div>

        {/* Top Insights Cards */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {insights.slice(0, 5).map((insight, i) => {
            const Icon = NEED_ICONS[insight.category] || Lightbulb;
            const colorClass = NEED_COLORS[insight.category] || 'text-gray-600 bg-gray-50 border-gray-200';
            const isExpanded = expandedInsight === i;

            return (
              <motion.button
                key={i}
                onClick={() => setExpandedInsight(isExpanded ? null : i)}
                className={clsx(
                  'shrink-0 p-3 rounded-xl border transition-all text-left',
                  colorClass,
                  isExpanded ? 'w-[260px]' : 'w-[180px]'
                )}
                layout
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {insight.category.replace('_', ' ')}
                  </span>
                  {insight.priority_score && (
                    <span className="ml-auto text-[10px] font-bold opacity-70">
                      {insight.priority_score}%
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold leading-snug line-clamp-2">
                  {insight.label}
                </p>
                <AnimatePresence>
                  {isExpanded && insight.detail && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-[11px] mt-2 opacity-80 leading-relaxed"
                    >
                      {insight.detail}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {/* Top Countries Ribbon */}
        {data.fan_insights.top_countries?.length > 0 && (
          <div className="flex items-center gap-2 mt-3 px-1">
            <Globe size={12} className="text-gray-400 shrink-0" />
            <div className="flex gap-1.5 overflow-x-auto">
              {data.fan_insights.top_countries.map((country, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 whitespace-nowrap font-medium">
                  {country}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fan-Powered Hotel Recommendations */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            <Target size={18} className="text-purple-600" />
            {recTitle}
          </h3>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {Object.entries(categories).map(([key, cat]) => {
            const Icon = CATEGORY_ICONS[key] || Star;
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0',
                  isActive
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Icon size={13} />
                {isKo ? cat.label_kr : cat.label}
                {cat.hotels?.length > 0 && (
                  <span className={clsx(
                    'text-[10px] px-1.5 rounded-full',
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  )}>
                    {cat.hotels.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Hotel Cards for Active Category */}
        <div className="space-y-2.5 mt-3">
          {activeHotels.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              {isKo ? '\uD574\uB2F9 \uCE74\uD14C\uACE0\uB9AC\uC5D0 \uB9E4\uCE6D\uB418\uB294 \uC219\uC18C\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.' : 'No matching hotels in this category.'}
            </div>
          )}
          {activeHotels.slice(0, 5).map((hotel, i) => (
            <motion.div
              key={hotel.id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelectHotel?.(hotel.id)}
              className={clsx(
                'p-3 rounded-2xl border transition-all cursor-pointer group',
                hotel.is_price_gouging
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-gray-100 bg-white hover:border-purple-200 hover:shadow-md'
              )}
            >
              <div className="flex items-start gap-3">
                {/* Rank Badge */}
                <div className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0 bg-gradient-to-br',
                  i === 0 ? CATEGORY_COLORS[activeCategory] || 'from-purple-500 to-pink-500' : 'from-gray-400 to-gray-500'
                )}>
                  {i + 1}
                </div>

                {/* Hotel Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                        {hotel.name}
                      </p>
                      {hotel.name_kr && isKo && (
                        <p className="text-[11px] text-gray-500 truncate">{hotel.name_kr}</p>
                      )}
                    </div>

                    {/* Match Score */}
                    <div className={clsx(
                      'shrink-0 px-2 py-1 rounded-lg text-center',
                      hotel.fan_match_score >= 70 ? 'bg-purple-100 text-purple-700'
                        : hotel.fan_match_score >= 50 ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      <p className="text-xs font-bold leading-none">{Math.round(hotel.fan_match_score)}</p>
                      <p className="text-[8px] font-medium opacity-70">{matchLabel}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {hotel.price_usd > 0 && (
                      <span className="text-[11px] font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md">
                        {formatPrice(hotel.price_usd)}{perNight}
                      </span>
                    )}
                    {hotel.distance_km != null && (
                      <span className="text-[11px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                        {hotel.distance_km.toFixed(1)}km {fromVenue}
                      </span>
                    )}
                    {hotel.rating > 0 && (
                      <span className="text-[11px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                        <Star size={10} fill="currentColor" />
                        {hotel.rating.toFixed(1)}
                      </span>
                    )}
                    {hotel.is_price_gouging && (
                      <span className="text-[10px] text-red-600 bg-red-100 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                        <AlertTriangle size={10} />
                        {isKo ? '\uBC14\uAC00\uC9C0 \uC758\uC2EC' : 'Price Alert'}
                      </span>
                    )}
                  </div>

                  {/* Station Info */}
                  {hotel.nearest_station?.name && (
                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-gray-500">
                      <Train size={11} className="text-gray-400" />
                      <span>{hotel.nearest_station.name} Stn</span>
                      {hotel.nearest_station.walk_min && (
                        <span className="text-gray-400">
                          ({isKo ? `\uB3C4\uBCF4 ${hotel.nearest_station.walk_min}\uBD84` : `${hotel.nearest_station.walk_min} min walk`})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-400 transition-colors mt-1 shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ARMY Travel Tips */}
      {tips.length > 0 && (
        <div className="px-1">
          <button
            onClick={() => setShowTips(!showTips)}
            className="w-full flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-100 transition-all hover:bg-purple-100"
          >
            <span className="text-sm font-bold text-purple-700 flex items-center gap-1.5">
              <Lightbulb size={16} />
              {tipsTitle}
            </span>
            <motion.div animate={{ rotate: showTips ? 180 : 0 }}>
              <ChevronRight size={16} className="text-purple-400 rotate-90" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showTips && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-1.5">
                  {tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 px-2 py-1.5">
                      <span className="text-purple-400 text-xs mt-0.5 shrink-0">
                        {i + 1}.
                      </span>
                      <p className="text-xs text-gray-700 leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
