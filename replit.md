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
- **Supported Cities**: Beijing (北京/Пекин), Luoyang (洛阳/Лоян), Xi'an (西安/Сиань), Zhangjiajie (张家界/Чжанцзяцзе), Shanghai (上海/Шанхай).
- **Internationalization**: i18next with react-i18next for multilingual support (Russian, English, Chinese). Language detection from browser/localStorage, language switcher in header.
- **Project Structure**: `client/` (Frontend), `server/` (Backend), `shared/` (Common types), `attached_assets/` (City images).

### Feature Specifications
- **Tourist Management**: Create, edit, delete tourists; link tourists to Bitrix24 smart process items and CRM contacts.
- **Itinerary Management**: Select cities, specify arrival/departure dates and times, choose transport types, enter flight/train numbers, record hotel information. Includes validation.
- **Dashboard**: Displays tourist statistics, city distribution, upcoming arrivals, and hotel usage.
- **Summary Table**: Comprehensive table showing all tourists, date/time ranges, flight numbers, hotel lists, and transport icons. Features sticky header, responsive design, horizontal scrolling, and total tourist count.
  - **Grouping by Deals**: Displays deal headers with tourist counts, alternating background colors. Tourists sorted by deal ID.
  - **Selective Operations**: Checkboxes for tourist selection, with a button to display deal information for selected tourists.
  - **Bitrix24 Hyperlinks**: Deal headers link to Bitrix24 deal details; tourist names link to Bitrix24 contact details. Links open in new tabs.
- **Sharing & Export**: Copy link functionality and export to Excel. City-specific data export to Excel (№, Tourist, Phone, City data).
- **Multilingual Support**: Full i18n with Russian, English, Chinese. Language switcher and persistent selection.
- **Bitrix24 Integration**:
  - Operates as an embedded tab within Smart Process "Событие".
  - Advanced entity ID detection: Primary method from URL pathname, with multiple fallbacks including URL query parameters, `BX24.placement.info().options` (with retry), and `document.referrer` parsing. Diagnostic logging for troubleshooting.
  - **Data Synchronization Architecture**: Event (Smart Process) links to deals array, which links to contacts array. Contact fields are synchronized.
  - **Contact Management Policy**: Does NOT create new Bitrix24 contacts. ONLY updates existing Bitrix24 contacts when `bitrixContactId` is provided. DELETE operations only remove tourists from local storage.
  - **Placement Registration**: One-time installation via `/public/install.html`. Uses `BX24.callMethod('placement.bind')` to register `CRM_DYNAMIC_176_DETAIL_TAB`. Main application (`/`) only reads placement info, never registers.
  - **Auto-Rebind Mechanism** (GET `/install` endpoint): Automatically fixes placement when `HANDLER` points to a wrong URL. Unbinds old placement and binds with correct handler (`/`). Provides user feedback and reload option.
  - **Error Handling**: `EntityIdNotFound` component provides troubleshooting steps, link to `/rebind.html`, diagnostic panel, and reload/try again buttons.

### System Design Choices
- **Smart Process Integration**: Each "Event" smart process item represents a unique group tour.
- **API Endpoints**: REST API for managing tourists (GET, POST, PATCH, DELETE).
- **Environment Variables**: `BITRIX24_WEBHOOK_URL`, `UF_CRM_TOUR_ROUTE`, `SESSION_SECRET`.
- **Development Mode**: Activated by `?dev_entity_id=XXX` URL parameter. Bypasses Bitrix24 SDK, hard-codes entityId, and enables "Загрузить из Bitrix24" button on Dashboard to load production data via `POST /api/dev/reload/:entityId`.

## External Dependencies
- **Bitrix24**: CRM and Smart Process platform.
- **React**: Frontend library.
- **TypeScript**: Type-safe development.
- **Wouter**: Routing library.
- **TanStack Query**: Data fetching and state management.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Express.js**: Backend web application framework.
- **xlsx**: Excel export functionality.
- **i18next & react-i18next**: Internationalization framework.
- **i18next-browser-languagedetector**: Browser language detection.