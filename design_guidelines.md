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

### CRM Module - Detailed Specifications

**Overview:**
The CRM module is optimized for **speed** over visual flair. It uses tabbed navigation within a single page (like Tours module) and supports dual views (Kanban/Table) for maximum flexibility.

**Status Color System:**
- **Success** (Green #10B981): Won deals, confirmed bookings, active tours
- **Warning** (Gold #F4A725): In progress, negotiation, pending payment
- **Info** (Blue #3B82F6): New leads, initial contact
- **Destructive** (Red #EF4444): Lost deals, cancelled bookings

**Tab Structure:**
```
CRM
├─ Dashboard (stats & funnel visualization)
├─ Leads (dual view: Kanban/Table)
├─ Contacts (table with quick filters)
├─ Deals (table with status filters)
└─ Catalog (grid of tour templates)
```

#### Dashboard Tab

**Layout:**
- Hero section with gold border-left accent (h-16)
- 4-column stat cards grid (responsive: 2 cols on tablet, 1 on mobile)
- Conversion funnel visualization (bar chart with gold gradients)
- Recent activity timeline (last 10 items)

**Stat Cards:**
- White background, border-t-4 border-t-{status-color}, shadow-lg
- Large icon (w-12 h-12) in rounded-full colored background
- Number: text-4xl font-bold
- Label: text-sm text-muted-foreground uppercase tracking-wide
- Metrics: Total Leads, Conversion Rate, Active Deals, Revenue

**Funnel Chart:**
- Horizontal bars showing: New → Contacted → Qualified → Converted
- Gold gradient fill, percentage labels
- Hover: tooltip with exact numbers

#### Leads Tab

**Toggle View (Kanban ↔ Table):**
- Position: Top-right corner next to "+ New Lead" button
- Component: ToggleGroup with LayoutGrid/List icons
- Persists selection in localStorage
- Smooth transition (fade 150ms)

**Kanban View:**
- 5 columns: New | Contacted | Qualified | Converted | Lost
- Column headers: uppercase, text-sm, with count badges
- Card design:
  - White background, rounded-md, p-4, shadow-xs
  - hover-elevate for interactivity
  - Name (font-semibold), email/phone (text-sm muted)
  - Source badge (form/manual/import) - outline variant
  - Assigned user avatar (small, bottom-left)
  - Quick actions: View (Eye icon), Convert (CheckCircle icon for qualified only)
- Drag & drop between columns (updates status)
- Empty state: dashed border, gold accent, "No leads" message

**Table View:**
- Sticky header with gold underline
- Columns: Name | Contact | Status | Source | Assigned To | Created | Actions
- Status badge: colored (info/warning/success/destructive)
- Sortable columns (click header)
- Row hover: subtle background elevation
- Inline filters: Search (name/email), Status dropdown, Source dropdown
- Pagination: 50 rows per page, gold active page indicator
- Quick actions: Eye icon (view details)

**Lead Modal:**
- Trigger: Click on lead card/row
- Size: max-w-2xl, centered overlay
- Header: Name (text-2xl), status badge, close button
- Content sections:
  1. Contact info (email, phone) with copy buttons
  2. Status & Assignment dropdowns (inline edit, autosave)
  3. Notes textarea (auto-expand)
  4. History timeline (status changes, timestamps)
- Footer: "Convert to Deal" button (warning variant), "Save" (primary)

#### Contacts Tab

**Layout:**
- Search bar (top): w-full lg:w-96, gold focus ring
- Filter chips: "All" | "With Active Deals" | "VIP"
- Table design (similar to Leads table view)

**Columns:**
- Name (with avatar) | Email | Phone | Total Deals | Total Revenue | Last Contact | Actions
- Avatar: 32px circle, initials on gold gradient if no photo
- Deals count: Badge with green/gray (active/completed ratio)
- Revenue: formatted currency, font-semibold
- Last Contact: relative time (e.g., "2 days ago")

**Contact Modal:**
- Larger modal (max-w-4xl)
- Header: Large avatar (80px), name, contact info
- Tabs: Overview | Deals | Notes | Files
- Overview tab:
  - Quick stats (total spent, deals count, conversion rate)
  - Recent deals table (last 5)
  - Communication timeline
- Deals tab: Full deals list for this contact
- Notes tab: Rich text editor with timestamps
- Files tab: Uploaded documents, passports, contracts

#### Deals Tab

**Layout:**
- Filter bar: Tour dropdown | Status dropdown | Date range picker
- Table view (no Kanban for deals - too detailed)

**Columns:**
- Client Name | Tour | Amount | Status | Probability | Expected Close | Assigned | Actions
- Client: Link to contact modal
- Tour: Link to tour catalog item, shows event date if selected
- Amount: Large text, gold color for won deals
- Status badges: New (info) | Negotiation (warning) | Payment (warning) | Confirmed (success) | Cancelled (destructive)
- Probability: Progress bar (0-100%), gold fill
- Expected Close: Date, red highlight if overdue

**Deal Modal:**
- max-w-3xl
- Header: Deal title, status badge, amount (large, right-aligned)
- Content:
  1. Client section: Name, contact, link to full profile
  2. Tour details: CRM Event (template) + Tour Event (specific date), shows cities
  3. Pricing: Base price, surcharge, total, payment status
  4. Timeline: Created → Contacted → Proposal → Payment → Confirmed
  5. Notes & attachments
- Footer: Status transition buttons (e.g., "Mark as Paid", "Confirm Booking")

**Auto-sync to Tours:**
- When Deal status → "Confirmed": Shows notification with link to newly created Tourist
- Sync indicator: Small badge "Synced to Tours" with Check icon (success variant)

#### Catalog Tab

**Layout:**
- Grid: 3 columns desktop, 2 tablet, 1 mobile
- Each card: CRM Event template (reusable tour)

**Card Design:**
- Image: aspect-ratio 16/9, h-48, object-cover
- border-t-4 border-t-primary (gold accent)
- shadow-lg, rounded-md
- Content:
  - Title: text-xl font-semibold
  - Description: text-sm muted, line-clamp-2
  - Cities badges: small, outline variant, wrap
  - Duration: "11 days" with calendar icon
  - Base price: Large, gold color, "from ¥2500"
  - Stats row: Number of upcoming departures (info badge)
- Hover: lift effect, shadow-xl
- Click: Opens catalog item modal

**Catalog Item Modal:**
- max-w-4xl
- Large hero image (h-64)
- Title + edit button (admin only)
- Tabs: Overview | Itinerary Template | Departures | Pricing
- Overview:
  - Cities route visualization (connected dots)
  - Base price, duration, max participants
  - Description (rich text)
- Itinerary Template:
  - Day-by-day plan (accordion)
  - Sample: "Day 1: Arrival in Beijing, transfer to hotel"
- Departures tab:
  - Table of Tour Events (specific dates)
  - Columns: Start Date | Status | Sold/Max | Revenue | Actions
  - Actions: "Create Deal" (opens deal modal with pre-filled tour)
- Pricing tab:
  - Base price, optional surcharges, discounts

### Performance Optimizations

**Speed-First Features:**
- Debounced search (300ms delay)
- Virtual scrolling for tables >100 rows
- Skeleton states during loading
- Optimistic UI updates (instant feedback before API)
- Cached data with TanStack Query (5-minute stale time)
- Keyboard shortcuts:
  - `N`: New lead/contact/deal (context-aware)
  - `/`: Focus search
  - `Esc`: Close modal
  - `Ctrl+K`: Command palette (future)

**Client Cards (Legacy - replaced by table view):**
- Profile photo, name, contact, booking history
- Status tags (Active, Completed, Pending)
- Quick actions dropdown
- Notes preview

**Client Detail (Legacy - now Contact Modal):**
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