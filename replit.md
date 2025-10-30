# Веб-сервис для туристического агентства

## Overview
This project is a web application designed to manage group tours across five cities in China: Beijing, Luoyang, Xi'an, Zhangjiajie, and Shanghai. Tourists can join or leave a tour at any stage of the itinerary. The application integrates with Bitrix24 as an embedded tab within a "Smart Process" (specifically, the "Event" smart process), where each smart process item represents a single group tour. It aims to streamline tour management, provide comprehensive tourist and itinerary tracking, and offer various reporting features.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to folder `Z`.
Do not make changes to file `Y`.

## System Architecture

### UI/UX Decisions
The frontend is built with React and TypeScript, utilizing Shadcn UI and Tailwind CSS for a modern and responsive design. The application features a dashboard for statistics, a wide summary table with sticky headers for comprehensive data overview, and full mobile adaptation across all pages, including compact navigation and responsive cards for smaller screens.

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query (API state management), Shadcn UI, Tailwind CSS, Bitrix24 JS SDK, react-i18next (internationalization).
- **Backend**: Express.js, TypeScript, In-memory storage (MemStorage for development), Bitrix24 REST API integration (`crm.item.*` methods for smart processes).
- **Data Structure**: Shared TypeScript types and Zod schemas define the data models across frontend and backend.
- **Supported Cities**: Beijing (北京/Пекин), Luoyang (洛阳/Лоян), Xi'an (西安/Сиань), Zhangjiajie (张家界/Чжанцзяцзе), Shanghai (上海/Шанхай)
- **Internationalization**: i18next with react-i18next for multilingual support (Russian, English, Chinese). Language detection from browser/localStorage, language switcher in header.
- **Project Structure**:
    - `client/`: Frontend React application.
    - `client/src/i18n/`: Internationalization configuration and translation files.
    - `server/`: Backend Express server, including Bitrix24 API client and routes.
    - `shared/`: Common types and Zod schemas.
    - `attached_assets/`: City images.

### Feature Specifications
- **Tourist Management**: Create, edit, delete tourists; link tourists to Bitrix24 smart process items and CRM contacts.
- **Itinerary Management**: Select cities, specify arrival/departure dates and times, choose transport types (flight/train), enter flight/train numbers, record hotel information. Includes validation for departure dates (must be after arrival).
- **Dashboard**: Displays tourist statistics, city distribution, upcoming arrivals, and hotel usage. Fully translated for multilingual support.
- **Summary Table**: Comprehensive table showing all tourists, date/time ranges for arrival/departure, flight numbers, hotel lists, and transport icons. Features sticky header, responsive design with horizontal scrolling, and a total tourist count. City information is consolidated within each city column (dates/times, hotel, transport, flight numbers) instead of separate columns.
- **Sharing & Export**: Copy link functionality and export to Excel (including times and flight numbers). Each city column has a Share2 button that exports data only for that specific city, generating an Excel file with columns: №, Tourist, Phone, and the selected city's data.
- **Multilingual Support**: Full i18n implementation with support for Russian (default), English, and Chinese. Language switcher in application header with persistent language selection via localStorage. Dashboard fully translated.
- **Bitrix24 Integration**: 
  - Operates as an embedded tab within Smart Process "Событие" (Event)
  - Advanced entity ID detection: Primary method extracts from URL pathname, with 7 fallback methods (ID, ITEM_ID, ELEMENT_ID, ENTITY_ID, id, DEAL_ID, root level fields)
  - Detailed error messages with troubleshooting instructions when entity ID cannot be retrieved
  - **Data Synchronization Architecture**:
    - Event (Smart Process #303) → `UF_CRM_9_1711887457` (deals array) → each deal has `UF_CRM_1702460537` (contacts array)
    - Contact fields: `UF_CRM_1700666127661` (ФИО/Name), `UF_CRM_1700667203530` (Passport), standard PHONE/EMAIL fields
    - Auto-loading: First GET request to `/api/tourists/:entityId` loads tourists from Bitrix24 deals/contacts structure
    - **Contact Management Policy**:
      - **Does NOT create** new Bitrix24 contacts (POST endpoint only creates tourists in local storage)
      - **ONLY updates** existing Bitrix24 contacts when `bitrixContactId` is provided (POST and PATCH endpoints)
      - DELETE operations only remove tourists from local storage, Bitrix24 contacts remain untouched
    - Bi-directional sync: PATCH requests update both local storage and Bitrix24 contact custom fields (when bitrixContactId exists)
    - Fallback: Application continues to function if `BITRIX24_WEBHOOK_URL` is not configured
  - **Placement Registration**: One-time installation via static page
    - **Installation file**: `/public/install.html` (separate static page, NOT bundled with main app)
    - **Installation URL**: `https://travel-group-manager-ndt72.replit.app/install.html`
    - **Rebind/Fix URL**: `https://travel-group-manager-ndt72.replit.app/rebind.html` (use if entityId not detected)
    - Installation process:
      1. Open install.html from Bitrix24 admin panel
      2. Page registers `CRM_DYNAMIC_176_DETAIL_TAB` placement using BX24.callMethod('placement.bind')
      3. Calls BX24.installFinish() after successful registration (required by Bitrix24 SDK)
      4. Tab "Управление группой" will appear in all Smart Process "Событие" cards
    - **CRITICAL**: placement.bind is NEVER called from the main application (`/`)
    - Main application (`client/src/`) contains ZERO placement.bind code - only reads placement.info()
    - File `client/src/pages/Install.tsx` was completely removed from project to prevent HTTP 400 errors
    - The main app hook `useBitrix24.ts` only calls BX24.init() and reads placement context (entityId), never attempts to register placement
  - **Auto-Rebind Mechanism** (GET `/install` endpoint):
    - **Purpose**: Automatically fixes placement when HANDLER points to wrong URL (e.g., `/install` instead of `/`)
    - **Technical Implementation**:
      - Endpoint registered in `server/index.ts` BEFORE `setupVite()` call (critical for avoiding Vite middleware interception)
      - Returns standalone HTML page with embedded Bitrix24 SDK and auto-rebind script
      - No frontend routing involved - pure backend endpoint response
    - **How it works**:
      1. When user opens app and placement loads `/install`, endpoint serves HTML page with auto-rebind script
      2. Script calls `BX24.placement.unbind` to remove old placement
      3. Then calls `BX24.placement.bind` with correct HANDLER=`/` (main app)
      4. Shows progress indicators and status messages in Russian
      5. After success, prompts user to reload page
    - **User Experience**:
      - Loading spinner during each step (initialization, unbind, bind)
      - Success message with "Перезагрузить" button
      - Error handling with actionable troubleshooting steps
    - **Benefits**: One-time self-service fix without manual intervention or support team assistance
  - **EntityId Extraction Architecture**:
    - **Multi-method approach with priority-based fallbacks**:
      - **PRIORITY 0** (Most reliable): `window.location.pathname` - extracts first numeric segment (e.g., "/179/" → entityId = "179")
      - **PRIORITY 1**: URL query parameters (`?ENTITY_ID=...`, `?ID=...`, etc.)
      - **PRIORITY 2**: `BX24.placement.info().options` fields (ID, ITEM_ID, ELEMENT_ID, ENTITY_ID, etc.) - **with retry mechanism**
      - **PRIORITY 4**: `document.referrer` pathname parsing via `extractIdFromReferrer()` helper function (fallback method)
        - **PRIORITY 1**: Regex match for `/details/{id}/` pattern (e.g., `/crm/type/176/details/303/` → entityId = "303")
        - **PRIORITY 2**: Fallback - scans pathname segments from end to start, returns first numeric ID found
        - Safely parses referrer URLs like `https://portal.bitrix24.ru/crm/type/176/details/303/?IFRAME=Y`
        - Guards against empty/invalid referrer strings, returns null on parse errors
        - Logs which extraction method succeeded for troubleshooting
      - **NOTE**: `window.name` is logged for diagnostics only (contains Bitrix24 internal iframe ID, not entityId)
      - **NOTE**: `window.parent.location.href` is NOT attempted (always blocked by browser CORS policy)
    - **Retry mechanism**: Makes 3 attempts with 100ms delay if `placementInfo.options` is empty on first call (handles SDK initialization race condition)
    - **Common issue**: If placement HANDLER points to `/install` or wrong URL, Bitrix24 won't provide `options.ID` → use `/rebind.html` to fix
    - **Diagnostic logging**: Console shows `📋 CONTEXT TRY` with attempt number, entityId, entityTypeId, placement, options object, referrer URL, pathname, and window.name - materially improves troubleshooting
    - **Error UX**: When entityId cannot be determined, shows `EntityIdNotFound` component with:
      - Actionable troubleshooting steps
      - Link to `/rebind.html` for placement re-registration
      - Expandable diagnostic panel showing all extraction attempt data
      - "Reload" and "Try Again" buttons for self-service recovery
  - **Troubleshooting EntityId Issues**:
    - **Symptom**: Error "ID элемента Smart Process не найден" and console shows `pathname: '/install'`
    - **Cause**: Placement HANDLER configured with wrong URL (e.g., points to `/install` instead of `/`)
    - **Solution**: Open `https://travel-group-manager-ndt72.replit.app/rebind.html` from Bitrix24 to rebind placement with correct URL
    - **After rebind**: Placement will load main app (`/`) instead of installation page, enabling proper entityId extraction

### System Design Choices
- **Smart Process Integration**: The system leverages Bitrix24's smart processes, with each "Event" smart process item representing a unique group tour.
- **API Endpoints**: Dedicated REST API for managing tourists (GET, POST, PATCH, DELETE).
- **Environment Variables**: Uses `BITRIX24_WEBHOOK_URL` for production and optional `UF_CRM_TOUR_ROUTE`, `SESSION_SECRET`.

## External Dependencies
- **Bitrix24**: CRM and Smart Process platform for tour management and data storage.
- **React**: Frontend library.
- **TypeScript**: Superset of JavaScript for type-safe development.
- **Wouter**: Small routing library for React.
- **TanStack Query**: Data fetching and state management library.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Express.js**: Backend web application framework.
- **xlsx**: Library for Excel export functionality.
- **i18next & react-i18next**: Internationalization framework for multilingual support.
- **i18next-browser-languagedetector**: Browser language detection for i18next.