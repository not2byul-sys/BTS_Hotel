/**
 * ARMY Stay Hub - Hotel List App
 * JSON 데이터 바인딩 및 UI 렌더링
 */

// ===== Global State =====
let hotelsData = [];
let currentFilter = 'all';
let favorites = new Set(JSON.parse(localStorage.getItem('favorites') || '[]'));

// ===== DOM Elements =====
const hotelList = document.getElementById('hotel-list');
const resultsCount = document.getElementById('results-count');
const filterTabs = document.querySelectorAll('.filter-tab');
const locationTabs = document.querySelectorAll('.location-tab');

// ===== Utility Functions =====
function formatPrice(krw) {
    const usd = Math.round(krw / 1350); // KRW to USD approximate
    return `$${usd}`;
}

function krwToUsd(krw) {
    return Math.round(krw / 1350);
}

// ===== Icons =====
const icons = {
    star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" stroke-width="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,
    location: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>`,
    car: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.8-4.7c-.3-.5-.8-.8-1.4-.8H10c-.6 0-1.1.3-1.4.8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"></path>
        <circle cx="7" cy="17" r="2"></circle>
        <circle cx="17" cy="17" r="2"></circle>
    </svg>`,
    walk: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="5" r="2"></circle>
        <path d="M10 22V16L7 13l2-4 5 2 3-3"></path>
        <path d="M14 22l-2-6"></path>
    </svg>`,
    heart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>`,
    chevronRight: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>`
};

// ===== Render Functions =====
function renderHotelCard(hotel) {
    const isFavorite = favorites.has(hotel.id);
    const showRoomsLeft = hotel.rooms_left > 0 && hotel.rooms_left <= 5;

    // Determine distance icon
    const distanceIcon = hotel.distance.type === 'walk' ? icons.walk : icons.car;
    const distanceText = hotel.distance.type === 'walk'
        ? `Walking ${hotel.distance.minutes} min from Goyang Stadium`
        : `By Car ${hotel.distance.minutes} min from Goyang Stadium`;

    // Build tags
    const tags = [];

    // Army density tag
    if (hotel.army_density) {
        tags.push(`<span class="tag tag-army">ARMY ${hotel.army_density.value}%</span>`);
    }

    // Hotel type tag
    if (hotel.hotel_type) {
        tags.push(`<span class="tag tag-type">${hotel.hotel_type.label_en}</span>`);
    }

    // Distance tag
    if (hotel.distance) {
        const distLabel = hotel.distance.type === 'walk'
            ? `Walk ${hotel.distance.minutes}min`
            : `Drive ${hotel.distance.minutes}min`;
        tags.push(`<span class="tag tag-distance">${distLabel}</span>`);
    }

    // Transport tag
    if (hotel.transport) {
        tags.push(`<span class="tag tag-transport">${hotel.transport.display_en}</span>`);
    }

    // Cancellation tag
    if (hotel.cancellation && hotel.cancellation.type === 'free') {
        tags.push(`<span class="tag tag-cancel">Free Cancel</span>`);
    }

    return `
        <div class="hotel-card ${!hotel.is_available ? 'unavailable' : ''}" data-id="${hotel.id}">
            <div class="hotel-image-container">
                <img src="${hotel.image_url}" alt="${hotel.name_en}" class="hotel-image"
                     onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'">
                ${showRoomsLeft ? `<div class="rooms-left-badge">Only ${hotel.rooms_left} rooms left!</div>` : ''}
                <div class="rating-badge">
                    ${icons.star}
                    <span>${hotel.rating.toFixed(1)}</span>
                </div>
                <button class="favorite-btn ${isFavorite ? 'active' : ''}" onclick="toggleFavorite('${hotel.id}')">
                    ${icons.heart}
                </button>
            </div>
            <div class="hotel-info">
                <h3 class="hotel-name">${hotel.name_en}</h3>
                <div class="hotel-location">
                    ${icons.location}
                    <span>${hotel.location?.address_en || 'Goyang, South Korea'}</span>
                </div>
                <div class="hotel-distance">
                    ${distanceIcon}
                    <span>${distanceText}</span>
                </div>
                <div class="hotel-tags">
                    ${tags.slice(0, 4).join('')}
                </div>
                <div class="hotel-footer">
                    <div class="hotel-price">
                        <span class="price-amount">${formatPrice(hotel.price_krw)}<span class="price-unit"> /night</span></span>
                    </div>
                    <button class="reserve-btn" onclick="openBooking('${hotel.platform?.booking_url || '#'}')">
                        Reserve ${icons.chevronRight}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderHotels(hotels) {
    if (hotels.length === 0) {
        hotelList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <h3>No hotels found</h3>
                <p>Try adjusting your filters</p>
            </div>
        `;
        return;
    }

    hotelList.innerHTML = hotels.map(renderHotelCard).join('');
    resultsCount.textContent = `${hotels.length} hotels in goyang`;
}

// ===== Filter Functions =====
function filterHotels(filter) {
    let filtered = [...hotelsData];

    switch (filter) {
        case 'near':
            filtered = filtered
                .filter(h => h.is_available)
                .sort((a, b) => a.distance.distance_km - b.distance.distance_km);
            break;
        case 'price':
            filtered = filtered
                .filter(h => h.is_available)
                .sort((a, b) => a.price_krw - b.price_krw);
            break;
        case 'all':
        default:
            // Sort by availability first, then by distance
            filtered = filtered.sort((a, b) => {
                if (a.is_available !== b.is_available) {
                    return b.is_available - a.is_available;
                }
                return a.distance.distance_km - b.distance.distance_km;
            });
    }

    renderHotels(filtered);
}

// ===== Event Handlers =====
function toggleFavorite(hotelId) {
    if (favorites.has(hotelId)) {
        favorites.delete(hotelId);
    } else {
        favorites.add(hotelId);
    }
    localStorage.setItem('favorites', JSON.stringify([...favorites]));

    // Update UI
    const btn = document.querySelector(`[data-id="${hotelId}"] .favorite-btn`);
    if (btn) {
        btn.classList.toggle('active');
    }
}

function openBooking(url) {
    if (url && url !== '#') {
        window.open(url, '_blank');
    } else {
        alert('Booking link not available. Please check the hotel details.');
    }
}

// ===== Initialize =====
async function init() {
    // Show loading
    hotelList.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
        </div>
    `;

    try {
        // Load JSON data
        const response = await fetch('korean_ota_hotels.json');
        const data = await response.json();
        hotelsData = data.hotels || [];

        // Initial render
        filterHotels('all');

        // Setup filter tabs
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                filterHotels(currentFilter);
            });
        });

        // Setup location tabs (placeholder for now)
        locationTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                locationTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // Future: filter by location
            });
        });

    } catch (error) {
        console.error('Failed to load hotel data:', error);
        hotelList.innerHTML = `
            <div class="empty-state">
                <h3>Failed to load hotels</h3>
                <p>Please check your connection and try again</p>
            </div>
        `;
    }
}

// Start app
document.addEventListener('DOMContentLoaded', init);
