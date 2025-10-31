# Веб-сервис для туристического агентства

## Overview
This project is a web application for managing group tours across five cities in China: Beijing, Luoyang, Xi'an, Zhangjiajie, and Shanghai. It allows tourists to join or leave a tour at any stage and integrates with Bitrix24 as an embedded tab within a "Smart Process" (specifically, the "Event" smart process), where each item represents a single group tour. The application aims to streamline tour management, track tourists and itineraries, and provide reporting features. Key capabilities include tourist and itinerary management, a dashboard with statistics, a comprehensive summary table, and Excel export.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to folder `Z`.
Do not make changes to file `Y`.

## System Architecture

### UI/UX Decisions
The frontend uses React with TypeScript, Shadcn UI, and Tailwind CSS for a modern, responsive design. It features a statistical dashboard, a wide summary table with sticky headers for comprehensive data, and full mobile adaptation, including compact navigation and responsive cards.

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS, Bitrix24 JS SDK, react-i18next.
- **Backend**: Express.js, TypeScript, In-memory storage (for development), Bitrix24 REST API.
- **Data Structure**: Shared TypeScript types and Zod schemas.
- **Supported Cities**: Beijing, Luoyang, Xi'an, Zhangjiajie, Shanghai.
- **Internationalization**: i18next for Russian, English, Chinese, with language detection and a switcher.

### Feature Specifications
- **Tourist Management**: Create, edit, delete tourists; synchronize with Bitrix24 contacts. Updates to tourist fields in the summary table are synchronized bidirectionally with Bitrix24 Contact and Deal entities.
- **Itinerary Management**: Define city visits, dates, transport details, and hotel information, with validation.
- **Dashboard**: Displays tourist statistics, city distribution, upcoming arrivals, and hotel usage.
- **Summary Table**: Comprehensive overview of tourists, itineraries, and linked Bitrix24 entities. Features sticky headers, responsive design, grouping by Bitrix24 deals with hyperlinks to deal/contact details, and inline editing. City columns always display field labels (Прибытие, Отъезд, Отель, Тип, Транспорт) with "—" shown for empty values.
- **Custom Grouping System**: 
  - Manual group/ungroup functionality via checkboxes and dedicated buttons ("Сгруппировать"/"Разгруппировать")
  - Custom groupings persist in localStorage (survives page reload, independent of Bitrix24)
  - Three-tier grouping priority: manual ungrouped → custom groups → auto-group by dealId
  - When grouping tourists from different deals, all dealIds displayed in group header as clickable links
  - Ungrouped tourists shown individually, not auto-regrouped when dealId changes
  - Group expand/collapse controls with visual city cell merging when collapsed
  - **Smart Field Merging**: When a group contains tourists from a single dealId, "Доплата" (surcharge) and "Ночей" (nights) fields display once in group header instead of individual cards, reducing redundancy
  - Implemented in both production Summary.tsx and dev DevTest.tsx pages
- **Sharing & Export**: 
  - Share dialog with choice between "Copy link" and "Download Excel" for full table export
  - City-specific share buttons in each column header (Link icon) with dialog selection
  - Excel export includes tourist data, itineraries, and Bitrix24 entity IDs
  - Smart Process title in table header links directly to Bitrix24 Event entity
- **DEV Mode** (`/dev`): Standalone testing page that works without Bitrix24 connection. Uses mock data with 6 test tourists, multiple deals, and full itineraries. Features all main functionality: summary table with grouping, dashboard statistics, tourists list, inline editing (local state only), and Excel export. Accessible via DEV navigation button. Perfect for rapid development and testing without requiring Bitrix24 portal access.
- **Bitrix24 Integration**:
  - Embedded tab within "Event" Smart Process.
  - Advanced entity ID detection with multiple fallback methods (pathname, query params, placement.options, referrer) and a retry mechanism.
  - Data synchronization architecture: Event (Smart Process) → deals array → contacts array. Specific Bitrix24 custom fields are used for tourist data (Name, Passport, Birthdate, Phone, Surcharge, Nights).
  - Contact Management Policy: Only updates existing Bitrix24 contacts; does not create new ones. DELETE operations only affect local storage.
  - Placement Registration: One-time installation via `/public/install.html` to bind `CRM_DYNAMIC_176_DETAIL_TAB`. Main application (`/`) does not contain placement binding logic.
  - Auto-Rebind Mechanism: `/rebind.html` endpoint automatically fixes incorrect placement configurations by unbinding and rebinding the placement with the correct application URL.
  - Robust error handling for `entityId` detection with troubleshooting guidance.

### System Design Choices
- **Smart Process Integration**: Each Bitrix24 "Event" Smart Process item represents a group tour.
- **API Endpoints**: REST API for tourist management.
- **Environment Variables**: `BITRIX24_WEBHOOK_URL` for production and optional configuration.
- **Development Workflow**: 
  - Production mode (`/`): Requires Bitrix24 SDK, embedded in Smart Process tab
  - DEV mode (`/dev`): Independent testing environment with mock data, no Bitrix24 required
  - App.tsx conditionally bypasses Bitrix24 initialization when accessing `/dev` route

## External Dependencies
- **Bitrix24**: CRM and Smart Process platform.
- **React**: Frontend library.
- **TypeScript**: Language.
- **Wouter**: Routing library.
- **TanStack Query**: Data fetching.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: CSS framework.
- **Express.js**: Backend framework.
- **xlsx**: Excel export.
- **i18next & react-i18next**: Internationalization.
- **i18next-browser-languagedetector**: Language detection.

## Documentation
Comprehensive technical documentation available in `DOCUMENTATION.md` covering:
- Bitrix24 data architecture and custom fields mapping
- Data sources (automatic vs manual input)
- Grouping system (auto/custom/ungrouped)
- Synchronization logic
- Export and sharing features
- DEV mode for standalone testing
- Internationalization (ru/en/zh)

## Recent Changes (October 31, 2025)
- **Automatic Visit Creation**: All city visits now auto-populate on page load without manual clicks:
  - **DevTest.tsx**: useEffect automatically creates empty visits for all 5 cities on mount, eliminating need for "Click to add visit" buttons
  - **Summary.tsx**: useEffect triggers API calls to auto-create missing visits for all tourists, with silent background creation (no toasts)
  - **UX Improvement**: All city columns (Beijing, Luoyang, Xi'an, Zhangjiajie, Shanghai) display editable fields immediately upon page load
  - **Removed Manual Creation**: Eliminated conditional rendering `{!visit ? ... : ...}` in favor of `{visit && ...}` since visits always exist
  - **Backend**: Existing POST /api/tourists/:touristId/visits endpoint creates visits with default empty fields and "plane" as default transport type
  - **Implementation**: Auto-creation flag (`autoCreationDone`) prevents infinite loops; creates all missing visits in batch with 1s delay before refetching data
- **Complete Internationalization**: All UI strings in Summary.tsx and DevTest.tsx now use i18n with full translations for Russian, English, and Chinese languages (ru.json, en.json, zh.json)
- **Deal Titles Display**: Backend API extended to fetch deal titles via new `getEventDeals()` method; frontend now displays deal names (e.g., "Март 2025 - Группа А") instead of raw IDs in group headers using `getDealTitle()` helper
- **Enhanced Smart Field Merging**: Extended logic to show "Доплата" and "Ночей" in group headers for custom groups with single tourist: `shouldMergeSurchargeNights = (isSingleDealGroup && tourists > 1) || (isCustomGroup && tourists === 1)`
- **Backend Changes**: New `/api/event/:entityId` endpoint returns `{title, deals: [{id, title}][]}` using parallel API calls; `bitrix24.ts` now includes `getEventDeals()` method
- **Compact Header - Variant 4 (Latest)**: Объединение всех элементов над таблицей в одну строку для экономии места в iframe Bitrix24:
  - **Формат заголовка**: "Туристы (N): [Название события]" - всё в одной строке вместо двух
  - **Dropdown меню "Группировка"**: заменили 3 отдельные кнопки на одно dropdown-меню с опциями:
    - Показать/Скрыть группировку (toggle)
    - Сгруппировать (disabled если выбрано < 2 туристов)
    - Разгруппировать (disabled если нет выбранных)
  - **Кнопка "Поделиться"**: осталась отдельно справа от dropdown
  - **Адаптивность**: на мобильных экранах кнопки показывают только иконки (текст скрыт с помощью `hidden sm:inline`)
  - **Размеры**: заголовок `text-base sm:text-lg`, gap между элементами уменьшен до `gap-2`
  - **Консистентность**: идентичная структура применена в Summary.tsx и DevTest.tsx
  - **Тестирование**: E2E тесты подтвердили корректную работу dropdown, группировки, адаптивности на мобильных
- **Vertical Space Optimization**: Comprehensive table height reduction for better Bitrix24 iframe display:
  - **Desktop Tables**: Reduced spacing throughout Summary.tsx and DevTest.tsx
    - Table cell padding: py-3 → py-2
    - Element gaps: gap-1.5 → gap-0.5
    - Font sizes: text-sm → text-xs
  - **Compact Transport Display**: Consolidated 8+ separate transport fields into 2 inline rows with icons
    - Row 1: ✈️ Приб: [Тип] [Рейс] [Аэропорт] • [Трансфер]
    - Row 2: 🛬 Убыт: [Тип] [Рейс] [Аэропорт] • [Трансфер]
    - All fields always visible with "—" placeholders when empty
  - **Border Removal**: Removed border-t separators between Hotel and Transport sections, reduced pt-1 → pt-0.5
  - **Mobile Card Optimization**: Reduced spacing in mobile tourist cards
    - Card padding: p-4 → p-3
    - Vertical spacing: space-y-3 → space-y-2
    - Font sizes: text-sm → text-xs
  - **Code Quality**: Fixed React Fragment import (added Fragment to imports from 'react') to eliminate console warnings
  - **Testing**: E2E tests confirmed full functionality (grouping, share dialogs, Excel export, statistics) working correctly on /dev
- **UI Cleanup**: Hidden "Показать сделки" buttons from Summary.tsx and DevTest.tsx (commented out for potential future restoration)
- **Admin Menu**: Hidden "Административные функции" admin menu from App.tsx navigation (commented out)
- **City Column Display**: Updated field rendering logic in both Summary.tsx and DevTest.tsx to always show field labels (Прибытие, Отъезд, Отель, Тип, Транспорт) in city columns. Empty values now display "—" placeholder instead of hiding the entire field structure. This improves UI consistency across desktop and mobile views.
- **Clipboard Fix**: Fixed "Copy link" functionality that failed in Bitrix24 iframe environment:
  - Created universal `copyToClipboard()` helper in `client/src/lib/clipboard.ts` with fallback mechanism
  - Modern Clipboard API (navigator.clipboard) attempted first, falls back to document.execCommand method for iframe compatibility
  - Updated Summary.tsx copy link functions to use new helper
  - Added share dialog to DevTest.tsx (previously missing) with same "Copy link / Download Excel" options
  - All copy link operations now work reliably in both standalone and Bitrix24 iframe contexts