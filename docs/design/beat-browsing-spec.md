# Beat Browsing Page - Design Specification

## Overview
Based on BeatStars analysis, the beat browsing page is the core discovery experience. This document outlines the design and implementation plan.

## Page Layout

### Header Section
```
┌─────────────────────────────────────────────────────────┐
│  Logo    Browse Beats   Producers   [Search Bar]  Login │
└─────────────────────────────────────────────────────────┘
```

### Main Content Area
```
┌────────────┬────────────────────────────────────────────┐
│            │                                            │
│  Filters   │         Beat Grid (3-4 columns)           │
│            │                                            │
│  Genre     │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  ☐ Afrobeat│  │ Beat │  │ Beat │  │ Beat │  │ Beat │  │
│  ☐ Amapiano│  │ Card │  │ Card │  │ Card │  │ Card │  │
│  ☐ Afro    │  └──────┘  └──────┘  └──────┘  └──────┘  │
│            │                                            │
│  Mood      │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  │
│  ☐ Dark    │  │ Beat │  │ Beat │  │ Beat │  │ Beat │  │
│  ☐ Upbeat  │  │ Card │  │ Card │  │ Card │  │ Card │  │
│            │  └──────┘  └──────┘  └──────┘  └──────┘  │
│  BPM Range │                                            │
│  [120-140] │         [Load More / Pagination]          │
│            │                                            │
│  Price     │                                            │
│  [$0-$50]  │                                            │
└────────────┴────────────────────────────────────────────┘
```

### Persistent Audio Player (Bottom)
```
┌─────────────────────────────────────────────────────────┐
│ ▶️  Beat Name - Producer  [━━━━━━━━━━] 1:23/3:45  🔊   │
└─────────────────────────────────────────────────────────┘
```

## Beat Card Component

### Design
```
┌─────────────────────────┐
│  ┌─────────────────────┐│
│  │   Cover Art/Image   ││  ← Artwork (400x400px)
│  │                     ││
│  │      ▶️ Play        ││  ← Hover overlay with play button
│  │                     ││
│  └─────────────────────┘│
│  Beat Title             │  ← Clear, readable
│  by Producer Name  ♥️ 42 │  ← Link to producer + likes
│  🎵 Afrobeat | 128 BPM  │  ← Genre & tempo
│  ⏱️ 3:12 | 🔑 C Minor   │  ← Duration & key
│  💰 From $29.99         │  ← Starting price
│  [🛒 Add to Cart]       │  ← Quick action button
└─────────────────────────┘
```

### Card Information
- **Cover Art**: Beat artwork/thumbnail
- **Play Button**: Overlay on hover, loads into persistent player
- **Beat Title**: Main identifier
- **Producer**: Clickable link to producer profile
- **Engagement**: Likes/favorites count
- **Genre Tags**: Primary genre badge
- **BPM**: Tempo indicator
- **Duration**: Track length
- **Key**: Musical key (for artists)
- **Price**: Starting license price (e.g., "From $29.99")
- **Actions**: Add to cart, favorite/like

## Filter Sidebar

### Filter Categories

#### 1. Genre Filter
```jsx
Genre
☑️ Afrobeat (234)
☐ Amapiano (156)
☐ Afro-House (89)
☐ Afro-Trap (67)
☐ Alte (45)
[Clear All]
```

#### 2. Mood/Vibe Filter
```jsx
Mood
☐ Dark/Aggressive
☐ Upbeat/Happy
☐ Chill/Laid-back
☐ Emotional/Sad
☐ Energetic
```

#### 3. BPM Range Slider
```jsx
BPM Range
[━━━━━◉━━━━━◉━━━━━]
90          140         180
```

#### 4. Key Filter
```jsx
Musical Key
☐ C Major
☐ C Minor
☐ D Major
... (all keys)
```

#### 5. Price Range
```jsx
Price Range
[━━━━━◉━━━━━◉━━━━━]
$0          $50         $100+
```

#### 6. Sort Options
```jsx
Sort By: [Recently Added ▼]
- Recently Added
- Most Popular
- Price: Low to High
- Price: High to Low
- BPM: Low to High
- BPM: High to Low
```

## Persistent Audio Player Component

### Features
- Stays fixed at bottom while browsing
- Shows currently playing beat info
- Waveform visualization (optional for MVP)
- Standard controls: play/pause, seek, volume
- Add to cart / favorite from player
- Next/previous (if multiple beats queued)

### Design
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🎵 Cover  Beat Title by Producer   ▶️ [━━━━━━━━━━] 1:23/3:45  🔊 ♥️ │
└─────────────────────────────────────────────────────────────────────┘
```

## Search Bar Component

### Features
- Global search (always accessible)
- Instant results dropdown
- Search by: beat name, producer, genre, tags
- Recent searches
- Popular searches

### Design
```
┌──────────────────────────────────────┐
│ 🔍 Search beats, producers...        │
└──────────────────────────────────────┘
  ↓
┌──────────────────────────────────────┐
│ Beats                                │
│ ▶️ Afro Vibes - DJ Producer         │
│ ▶️ Lagos Nights - BeatzMaker        │
│                                      │
│ Producers                            │
│ 👤 DJ Producer (45 beats)            │
│ 👤 BeatzMaker (32 beats)             │
└──────────────────────────────────────┘
```

## Responsive Breakpoints

### Desktop (1024px+)
- 4 columns beat grid
- Full sidebar filters
- Large beat cards

### Tablet (768px - 1023px)
- 3 columns beat grid
- Collapsible filter sidebar
- Medium beat cards

### Mobile (< 768px)
- 1-2 columns beat grid
- Filter button → opens modal
- Smaller beat cards
- Simplified player controls

## Technical Implementation Plan

### Components to Build
1. **BeatCard.jsx** - Individual beat display
2. **BeatGrid.jsx** - Grid layout container
3. **FilterSidebar.jsx** - Filter controls
4. **AudioPlayer.jsx** - Persistent bottom player
5. **SearchBar.jsx** - Global search component
6. **BrowseBeatsPage.jsx** - Main page component

### State Management
```javascript
// Page state
- beats: [] // Array of beat objects
- filters: {
    genres: [],
    moods: [],
    bpmRange: [90, 180],
    keySignature: null,
    priceRange: [0, 100],
    sortBy: 'recent'
  }
- currentlyPlaying: null // Beat object
- isPlaying: boolean
- searchQuery: ''
- pagination: { page: 1, limit: 20, total: 0 }
```

### API Integration
```javascript
// Endpoints to use
GET /api/beats
  ?genre=afrobeat
  &mood=dark
  &bpm_min=120
  &bpm_max=140
  &price_min=0
  &price_max=50
  &sort=recent
  &page=1
  &limit=20
```

### Libraries Needed
1. **Audio Player**: 
   - Option A: `react-h5-audio-player` (simpler)
   - Option B: `howler.js` (more control)
   
2. **Range Sliders**: 
   - `rc-slider` (customizable)
   
3. **Icons**: 
   - Already have: Lucide React or Heroicons

4. **Infinite Scroll** (optional):
   - `react-infinite-scroll-component`

## Color Scheme (Afro-centric)

### Primary Colors
- **Primary**: `#FF6B35` (Vibrant Orange - energy)
- **Secondary**: `#F7931E` (Golden Yellow - warmth)
- **Accent**: `#2EC4B6` (Turquoise - modern)

### Neutral Colors
- **Dark**: `#1A1A1A` (Almost black)
- **Medium**: `#4A4A4A` (Charcoal)
- **Light**: `#F5F5F5` (Off-white)
- **White**: `#FFFFFF`

### Usage
```css
/* Beat cards */
background: white
border: light gray
hover: subtle primary tint

/* Player */
background: dark gradient
controls: primary color
waveform: secondary color

/* Buttons */
primary: primary color
secondary: outlined with primary
```

## Typography

### Font Stack
```css
/* Headings */
font-family: 'Inter', 'Helvetica Neue', sans-serif;
font-weight: 700;

/* Body */
font-family: 'Inter', 'Helvetica Neue', sans-serif;
font-weight: 400;

/* Beat titles */
font-weight: 600;
font-size: 1.125rem;
```

## Animations & Interactions

### Beat Card Hover
- Scale: 1.02
- Shadow: elevated
- Play button: fade in overlay

### Play Button
- Ripple effect on click
- Smooth transition to pause icon

### Filter Application
- Debounced search (300ms)
- Loading skeleton while fetching
- Smooth fade-in of results

## Accessibility

### Requirements
- Keyboard navigation (tab through beats)
- ARIA labels for all interactive elements
- Focus indicators
- Screen reader friendly
- Alt text for images
- Semantic HTML

### Player Controls
- Space bar: play/pause
- Arrow keys: seek forward/back
- M: mute/unmute
- Escape: close/stop

## Performance Optimizations

### Image Optimization
- Lazy load beat artwork
- Use WebP format with fallback
- Responsive images (srcset)
- Placeholder while loading

### Audio Optimization
- Stream audio (don't download fully)
- Preload next beat in queue
- Cancel requests on component unmount

### Pagination
- Load 20 beats initially
- Infinite scroll or "Load More"
- Virtual scrolling for 100+ beats

## Implementation Phases

### Phase 1: Basic Structure (This session)
- [ ] Create BrowseBeatsPage component
- [ ] Build BeatCard component
- [ ] Implement BeatGrid layout
- [ ] Connect to existing beats API
- [ ] Basic styling with Tailwind

### Phase 2: Filtering & Search
- [ ] FilterSidebar component
- [ ] Filter state management
- [ ] API integration with filters
- [ ] SearchBar component
- [ ] Search functionality

### Phase 3: Audio Player
- [ ] AudioPlayer component
- [ ] Player state management
- [ ] Play/pause/seek controls
- [ ] Volume control
- [ ] Integration with beat cards

### Phase 4: Polish & UX
- [ ] Loading states
- [ ] Empty states
- [ ] Error handling
- [ ] Animations
- [ ] Mobile responsive
- [ ] Accessibility audit

## Testing Checklist

### Functional Testing
- [ ] Beats load correctly
- [ ] Filters apply properly
- [ ] Search returns relevant results
- [ ] Audio plays/pauses
- [ ] Add to cart works
- [ ] Like/favorite functionality
- [ ] Pagination works

### Responsive Testing
- [ ] Desktop (1920px)
- [ ] Laptop (1366px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

### Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Performance Testing
- [ ] Page load time < 3s
- [ ] Audio starts within 1s
- [ ] Filter results < 500ms
- [ ] No jank while scrolling

## Next Steps

1. **Create feature branch**: `feature/beat-browsing`
2. **Start with BeatCard**: Most reusable component
3. **Then BeatGrid**: Layout wrapper
4. **Then BrowseBeatsPage**: Main page
5. **Test with existing backend data**
6. **Iterate on design based on feedback**

Ready to start implementation when you return from your break! 🎵
