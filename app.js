/**
 * ARMY Stay Hub - BTS FESTA 2026
 * Hotel booking integration with Agoda
 */

// Global state
let allHotels = [];
let currentLocation = 'all';
let currentFilter = 'all';
let selectedHotel = null;

// Venue location (Goyang Stadium)
const VENUE = {
    lat: 37.6556,
    lng: 126.7714
};

// Load hotel data from JSON
async function loadHotels() {
    try {
        const response = await fetch('korean_ota_hotels.json');
        const data = await response.json();
        allHotels = data.hotels || [];
        renderHotels();
        updateResultsCount();
    } catch (error) {
        console.error('Failed to load hotels:', error);
    }
}

// Calculate distance from venue
function calculateDistance(lat, lng) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat - VENUE.lat) * Math.PI / 180;
    const dLng = (lng - VENUE.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(VENUE.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Format price
function formatPrice(price) {
    return new Intl.NumberFormat('ko-KR').format(price);
}

// Filter hotels by location and filter criteria
function getFilteredHotels() {
    let hotels = [...allHotels];

    // Location filter
    if (currentLocation !== 'all') {
        hotels = hotels.filter(h => {
            const loc = (h.location || '').toLowerCase();
            return loc.includes(currentLocation.toLowerCase());
        });
    }

    // Apply sorting filter
    if (currentFilter === 'near') {
        hotels.sort((a, b) => {
            const distA = calculateDistance(a.lat, a.lng);
            const distB = calculateDistance(b.lat, b.lng);
            return distA - distB;
        });
    } else if (currentFilter === 'price') {
        hotels.sort((a, b) => (a.price_krw || 0) - (b.price_krw || 0));
    }

    return hotels;
}

// Render hotel cards
function renderHotels() {
    const hotelList = document.getElementById('hotel-list');
    if (!hotelList) return;

    const hotels = getFilteredHotels();
    hotelList.innerHTML = '';

    if (hotels.length === 0) {
        hotelList.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3>No hotels found</h3>
                <p>Try adjusting your filters</p>
            </div>
        `;
        return;
    }

    hotels.forEach(hotel => {
        const distance = calculateDistance(hotel.lat, hotel.lng);
        const card = document.createElement('div');
        card.className = 'hotel-card';
        card.onclick = () => openDetailModal(hotel);

        card.innerHTML = `
            <div class="hotel-image-container">
                <div class="hotel-image" style="background-image: url('${hotel.image_url || 'https://via.placeholder.com/400x300?text=BTS+FESTA+2026'}'); background-size: cover; background-position: center;"></div>
                <div class="rating-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    ${hotel.rating || '4.5'}
                </div>
                <button class="favorite-btn" onclick="event.stopPropagation();">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>
            <div class="hotel-info">
                <h3 class="hotel-name">${hotel.name_en || hotel.name_kr || 'Hotel'}</h3>
                <div class="hotel-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    ${hotel.location || 'Seoul'}
                </div>
                <div class="hotel-distance">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    ${distance.toFixed(1)}km from venue
                </div>
                <div class="hotel-tags">
                    <span class="tag tag-army">ARMY Friendly</span>
                    ${distance < 3 ? '<span class="tag tag-distance">Near Venue</span>' : ''}
                </div>
                <div class="hotel-footer">
                    <div class="hotel-price">
                        <span class="price-amount">${formatPrice(hotel.price_krw || 100000)}</span>
                        <span class="price-unit">KRW / night</span>
                    </div>
                    <button class="reserve-btn" onclick="event.stopPropagation(); openAgodaBookingDirect('${hotel.booking_url}')">
                        Book Now
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        hotelList.appendChild(card);
    });
}

// Update results count
function updateResultsCount() {
    const countEl = document.getElementById('results-count');
    if (countEl) {
        const hotels = getFilteredHotels();
        const locationText = currentLocation === 'all' ? 'all areas' : currentLocation;
        countEl.textContent = `${hotels.length} hotels in ${locationText}`;
    }
}

// Open hotel detail modal
function openDetailModal(hotel) {
    selectedHotel = hotel;
    const modal = document.getElementById('hotel-detail-modal');

    // Set image
    const imageEl = document.getElementById('detail-image');
    imageEl.style.backgroundImage = `url('${hotel.image_url || 'https://via.placeholder.com/400x300?text=BTS+FESTA+2026'}')`;

    // Set hotel info
    document.getElementById('detail-name').textContent = hotel.name_en || hotel.name_kr || 'Hotel';
    document.getElementById('detail-location').textContent = hotel.location || 'Seoul, South Korea';

    // Set distance
    const distance = calculateDistance(hotel.lat, hotel.lng);
    document.getElementById('detail-distance').textContent = `${distance.toFixed(1)}km from Goyang Stadium (approx. ${Math.ceil(distance * 3)} min by car)`;

    // Set price
    document.getElementById('detail-price').textContent = `${formatPrice(hotel.price_krw || 100000)} KRW`;

    // Set tags
    const tagsEl = document.getElementById('detail-tags');
    tagsEl.innerHTML = `
        <span class="tag tag-army">ARMY Friendly</span>
        ${distance < 3 ? '<span class="tag tag-distance">Near Venue</span>' : ''}
        <span class="tag tag-type">Hotel</span>
    `;

    // Show modal
    modal.classList.add('active');
}

// Close detail modal
function closeDetailModal() {
    const modal = document.getElementById('hotel-detail-modal');
    modal.classList.remove('active');
    selectedHotel = null;
}

// Open Agoda booking page (from modal)
function openAgodaBooking() {
    if (selectedHotel && selectedHotel.booking_url) {
        window.open(selectedHotel.booking_url, '_blank');
    }
}

// Open Agoda booking page directly (from card button)
function openAgodaBookingDirect(url) {
    if (url) {
        window.open(url, '_blank');
    }
}

// Location tab click handler
function setupLocationTabs() {
    const tabs = document.querySelectorAll('.location-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentLocation = tab.dataset.location;
            renderHotels();
            updateResultsCount();
        });
    });
}

// Filter tab click handler
function setupFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderHotels();
        });
    });
}

// Notification modal functions (existing)
function openNotifyModal(hotelName) {
    document.getElementById('notify-hotel-name').textContent = hotelName;
    document.getElementById('notify-modal').classList.add('active');
}

function closeNotifyModal() {
    document.getElementById('notify-modal').classList.remove('active');
}

function toggleDiscordInput() {
    const checkbox = document.getElementById('notify-discord');
    const input = document.getElementById('discord-user-id');
    input.classList.toggle('hidden', !checkbox.checked);
}

function toggleTelegramInput() {
    const checkbox = document.getElementById('notify-telegram');
    const input = document.getElementById('telegram-chat-id');
    input.classList.toggle('hidden', !checkbox.checked);
}

function submitNotification() {
    const email = document.getElementById('notify-email').value;
    if (!email) {
        alert('Please enter your email address.');
        return;
    }
    alert('You will be notified when this hotel becomes available!');
    closeNotifyModal();
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadHotels();
    setupLocationTabs();
    setupFilterTabs();
});
