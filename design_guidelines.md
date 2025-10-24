# Design Guidelines: Tourist Agency Group Tour Management System

## Design Approach

**Selected Approach:** Design System with Custom Adaptation
- **System Foundation:** Material Design principles combined with Linear's clean data presentation
- **Justification:** Data-heavy productivity application requiring clarity, efficiency, and professional polish while maintaining visual appeal for tourism context
- **Key References:** Linear (data tables), Notion (flexible forms), Airbnb (travel aesthetic touches)

## Core Design Principles

1. **Data Clarity First:** Information hierarchy optimized for tour operators to quickly scan tourist rosters, itineraries, and logistics
2. **Spatial Organization:** Clear visual separation between overview dashboards and detailed tourist management
3. **Progressive Disclosure:** Surface critical information immediately, detailed data on demand
4. **Operational Efficiency:** Minimize clicks for common tasks (adding tourists, updating itineraries)

## Typography System

**Font Selection:**
- Primary: Inter via Google Fonts CDN (400, 500, 600, 700)
- Secondary: Noto Sans SC for Chinese text support
- Monospace: JetBrains Mono for dates, flight/train numbers

**Hierarchy:**
- Page Titles: text-4xl font-bold (36px)
- Section Headers: text-2xl font-semibold (24px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base font-normal (16px)
- Labels/Meta: text-sm font-medium (14px)
- Captions: text-xs (12px)

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Tight spacing: gap-2, p-2 (element-level)
- Standard spacing: gap-4, p-4, m-4 (component-level)
- Generous spacing: gap-8, p-8, m-8 (section-level)
- Major divisions: py-12, py-16, py-20 (page sections)

**Container Structure:**
- Max content width: max-w-7xl mx-auto
- Dashboard grid: 12-column system
- Sidebar navigation: Fixed 256px width (w-64)
- Content area: flex-1 with px-6 lg:px-8

**Responsive Breakpoints:**
- Mobile: base (single column)
- Tablet: md: (2-column grids)
- Desktop: lg: (3-4 column grids, full layouts)

## Component Library

### Navigation & Shell

**Top Navigation Bar:**
- Fixed header with shadow-sm
- Height: h-16
- Logo left, user profile/settings right
- Language toggle (RU/CN)
- Breadcrumb trail for context

**Sidebar Navigation (Desktop):**
- Dashboard overview
- Tourist roster
- City-by-city breakdown
- Reports/Analytics
- Settings

### Dashboard Components

**Overview Cards (4-column grid on desktop):**
- Total tourists enrolled
- Active cities count
- Upcoming arrivals (next 7 days)
- Hotel occupancy summary
- Each card: rounded-lg border with p-6

**City Timeline Visualization:**
- Horizontal timeline showing Beijing → Luoyang → Xi'an → Zhangjiajie
- Visual indicators for tourist count at each city
- Interactive segments to drill into city details

**Quick Stats Table:**
- Compact table showing tourist distribution per city
- Columns: City | Tourists | Hotels | Arrivals This Week
- Hover states for row highlighting

### Tourist Management

**Tourist List Table:**
- Sortable columns: Name | Full Itinerary | Arrival Dates | Status
- Action buttons: Edit, Delete, View Details
- Quick filter chips above table (by city, by arrival date)
- Add Tourist button (primary CTA, top-right)
- Pagination at bottom

**Tourist Detail View/Form:**
- Two-column layout on desktop
- Left: Personal information (name, contact, passport)
- Right: Itinerary builder

**Itinerary Builder Component:**
- Card-based interface for each city
- Expandable sections per city:
  - Checkbox: Visiting this city
  - Date picker: Arrival date
  - Radio buttons: Transport (Train/Plane with icons)
  - Dropdown/Autocomplete: Hotel selection
- Visual connection lines between selected cities
- Summary panel showing complete route

### Form Elements

**Input Fields:**
- Label positioning: top-aligned with mb-2
- Input height: h-12
- Border: border rounded-md
- Focus states with ring
- Helper text: text-sm mt-1

**Date Pickers:**
- Calendar dropdown interface
- Format: DD.MM.YYYY
- Quick select options (today, tomorrow, next week)

**Dropdowns/Select:**
- Hotel autocomplete with search
- Recent selections shown first
- Add new hotel option inline

**Buttons:**
- Primary CTA: px-6 py-3 rounded-lg font-medium
- Secondary: outlined variant
- Icon buttons for actions: w-10 h-10 rounded-lg
- Delete actions: outlined with warning treatment

### Data Display

**City Cards:**
- Grid of 4 cards (one per city)
- Card structure:
  - City name with Chinese characters
  - Tourist count badge
  - Hotels list (max 5 shown, +N more)
  - Arrival calendar preview
- Clickable to expand full details

**Hotel Assignment Table:**
- Grouped by hotel within each city
- Columns: Hotel Name | Tourists | Check-in Dates | Actions
- Collapsible groups

**Timeline View:**
- Calendar-style grid showing all arrivals
- Color-coded by transport method
- Quick-add functionality

### Overlays & Modals

**Add/Edit Tourist Modal:**
- Large modal (max-w-4xl)
- Tabbed interface: Personal Info | Itinerary | Documents
- Sticky footer with Cancel/Save buttons

**Confirmation Dialogs:**
- Centered, max-w-md
- Clear action description
- Destructive actions require explicit confirmation

**Notifications/Toasts:**
- Top-right positioning
- Auto-dismiss after 5s
- Success/error/info variants

## Icons

**Icon Library:** Heroicons via CDN
- Navigation: outlined 24px icons
- Actions: outlined 20px icons
- Status indicators: solid 16px icons
- Transport icons: ✈️ plane, 🚂 train (emoji or custom)

## Images

**Strategic Image Use:**

**Hero Section (Dashboard):**
- Subtle panoramic image of Chinese landmarks as background
- Semi-transparent overlay for text legibility
- Height: 40vh on desktop, 30vh on mobile
- Welcome message and quick action buttons overlaid

**City Cards:**
- Small thumbnail images for each city (120x80px)
- Beijing: Forbidden City
- Luoyang: Longmen Grottoes
- Xi'an: Terracotta Warriors
- Zhangjiajie: Avatar Mountains
- Lazy-loaded for performance

**Empty States:**
- Illustrations when no tourists added yet
- Friendly prompt to add first tourist

## Animations

**Minimal Motion:**
- Table row hover: subtle background transition (150ms)
- Modal enter/exit: fade + scale (200ms)
- Notifications: slide-in from right (300ms)
- No scroll-triggered animations
- No complex transitions

## Accessibility

**Consistent Patterns:**
- All form inputs include visible labels
- Error states with descriptive messages
- Keyboard navigation throughout
- Focus indicators on interactive elements
- ARIA labels for icon-only buttons
- Skip-to-content link
- Semantic HTML structure

## Page Structure

**Dashboard Page:**
1. Hero banner with greeting
2. Quick stats cards (4-column grid)
3. City timeline visualization
4. Recent activity feed
5. Quick actions panel

**Tourist Roster Page:**
1. Search and filter bar
2. Action toolbar (Add Tourist, Export)
3. Data table with sorting
4. Pagination controls

**City Detail Page:**
1. City header with image
2. Tourist list for this city
3. Hotel breakdown
4. Arrival schedule calendar
5. Transport statistics

**Tourist Detail Page:**
1. Profile header
2. Two-column layout: Info | Itinerary
3. Itinerary builder with city cards
4. Action buttons footer

This design creates a professional, efficient tour management system with clear information architecture, balanced visual hierarchy, and purposeful use of space to support complex data operations.