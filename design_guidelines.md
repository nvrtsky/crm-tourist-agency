# Design Guidelines: Premium Chinese Tour Management System

## Design Approach

**Selected Approach:** Reference-Based with Luxury Travel Focus
- **Primary Inspiration:** Chinaunique.ru's premium aesthetic + Airbnb's sophisticated layouts
- **Secondary References:** Booking.com (trust elements), Notion (CRM/data views)
- **Justification:** Customer-facing platform requiring emotional engagement, trust-building, and visual appeal for luxury travel market while maintaining operational efficiency

**Design Principles:**
1. **Premium First Impression:** Sophisticated visual language conveying luxury travel expertise
2. **Cultural Bridge:** Blend Russian elegance with Chinese cultural imagery
3. **Trust Through Polish:** Refined details, generous spacing, professional imagery
4. **Efficient Luxury:** Beautiful interfaces that don't sacrifice usability

## Color System

**Primary Palette:**
- Gold Accent: #F4A725 (CTAs, highlights, active states)
- Warm Complement: #D4871F (hover states, secondary actions)
- Background: #FFFFFF (clean base)
- Neutral Gray: #F8F9FA (subtle backgrounds)
- Text Primary: #1A1A1A
- Text Secondary: #666666

**Semantic Colors:**
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Info: #3B82F6

## Typography System

**Font Selection:**
- Primary: Montserrat (400, 500, 600, 700) - premium, geometric elegance
- Body: Open Sans (400, 600) - excellent Cyrillic support
- Accent: Playfair Display (for luxury headlines)

**Hierarchy:**
- Hero Headlines: text-5xl/text-6xl font-bold (Playfair Display)
- Page Titles: text-3xl font-semibold (Montserrat)
- Section Headers: text-2xl font-semibold
- Card Titles: text-xl font-medium
- Body: text-base (Open Sans)
- Labels: text-sm font-medium
- Captions: text-xs

## Layout System

**Spacing Primitives:** Tailwind units 3, 4, 6, 8, 12, 16, 24
- Compact: gap-3, p-3
- Standard: gap-6, p-6
- Generous: gap-8, p-8
- Luxury spacing: py-16, py-24 (major sections)

**Structure:**
- Sidebar: Fixed 280px (w-70) with luxury styling
- Content: max-w-7xl with px-8 lg:px-12
- Cards: Elevated with shadow-lg, rounded-xl

## Component Library

### Navigation Shell

**Sidebar (Left, Fixed):**
- Premium treatment: subtle gradient background (white to warm gray)
- Gold accent bar on active items
- Section dividers with decorative lines
- Icons: Heroicons (24px) with gold tint on active
- Sections: Dashboard, Tours, CRM, Forms, Settings
- Company logo top with tagline
- User profile card at bottom

**Top Bar:**
- Height: h-20 (generous)
- Language switcher (RU/CN) with flag icons
- Notifications bell
- Search with gold focus ring
- User avatar with dropdown

### Dashboard Components

**Hero Banner:**
- Full-width panoramic Chinese landmark imagery (Great Wall/Forbidden City)
- Height: 50vh on desktop, 40vh mobile
- Dark gradient overlay (bottom to top)
- Headline + subheadline in white (Playfair + Open Sans)
- Primary CTA buttons with backdrop-blur-md background, gold borders
- Subtle parallax on scroll

**Stats Cards (4-column grid):**
- White cards with shadow-lg
- Gold accent border-t-4
- Large numbers (text-4xl font-bold)
- Icon in gold circle background
- Metrics: Active Tours, Total Clients, Cities, Revenue

**Featured Tours Section:**
- 3-column grid of tour cards
- Each card: Image (16:9), gradient overlay, tour name, duration badge, price in gold, quick view button
- Hover: subtle lift with increased shadow

**Activity Feed:**
- Timeline design with gold connector line
- Recent bookings, client updates, tour changes
- Avatar + action description + timestamp

### Tours Management

**Tours List:**
- Masonry grid layout (3 columns desktop, 2 tablet, 1 mobile)
- Large tour cards with hero images
- Card elements: Image, city badges, dates, capacity bar, edit/delete actions
- Filter sidebar: By city, date range, status
- Add Tour button: prominent, gold background

**Tour Detail View:**
- Hero image with breadcrumb overlay
- Two-column layout: Itinerary timeline (left) + Logistics (right)
- City stops as connected timeline with images
- Hotel assignments with property photos
- Participant list with avatars
- Document attachments section

### CRM Components

**Client Cards:**
- Profile photo, name, contact, booking history
- Status tags (Active, Completed, Pending)
- Quick actions dropdown
- Notes preview

**Client Detail:**
- Header with large profile section
- Tabbed interface: Overview, Tours, Documents, Communication
- Booking history timeline
- Payment status indicators

### Form Elements

**Inputs:**
- Height: h-14 (luxury sizing)
- Gold focus rings
- Floating labels
- Icon prefixes where relevant

**Date Pickers:**
- Calendar with gold accents for selected dates
- Quick ranges (This Month, Next Quarter)

**Buttons:**
- Primary: Gold background, white text, px-8 py-4, rounded-lg
- Secondary: White background, gold border/text
- Ghost: Transparent with gold text
- Icon buttons: rounded-full with hover gold background

**File Uploads:**
- Drag-drop zones with dashed gold borders
- Preview thumbnails
- Progress bars in gold

### Data Display

**Tables:**
- Alternating row backgrounds (white/neutral)
- Gold header underline
- Hover row highlight
- Sortable columns with gold indicators

**City Showcase Cards:**
- Large imagery (Beijing, Xi'an, Luoyang, Zhangjiajie)
- Overlay with city name in Cyrillic + Chinese
- Stats overlay: tours, hotels, capacity
- Click to filter tours by city

## Images Strategy

**Hero Sections:**
- Dashboard: Panoramic Great Wall at sunset (1920x1080)
- Tours page: Terracotta Warriors wide shot
- CRM: Elegant Chinese garden/architecture
- Use high-quality, professionally shot imagery

**Tour Cards:**
- City landmarks (16:9 ratio, 600x400 minimum)
- Hotel exteriors/interiors for accommodations
- Cultural highlights (temples, markets, landscapes)

**Empty States:**
- Custom illustrations with Chinese motifs
- Warm color palette matching brand

**Profile Images:**
- Circular avatars (80px default)
- Placeholder with initials on gold gradient

## Animations

**Subtle Luxury Motion:**
- Card hover: translateY(-4px) + shadow increase (200ms)
- Button hover: subtle scale(1.02)
- Modal: fade + scale from center (250ms)
- Page transitions: smooth fade (150ms)
- NO aggressive or distracting animations

## Accessibility

- High contrast ratios (4.5:1 minimum)
- Keyboard navigation with visible gold focus rings
- Screen reader labels in Russian
- Form validation with clear error messages
- ARIA landmarks throughout
- Semantic HTML5 structure

## Page Layouts

**Dashboard:** Hero + Stats + Featured Tours + Recent Activity + Quick Actions

**Tours:** Filter sidebar + Masonry tour grid + Pagination

**CRM:** Client search + Filterable card grid + Quick add client

**Forms:** Wizard-style multi-step forms with progress indicator

**Settings:** Tabbed sections for account, preferences, integrations

This design creates a premium, trustworthy platform balancing luxury aesthetics with operational efficiency for Russian clients booking Chinese tours.