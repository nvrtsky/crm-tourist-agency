# Веб-сервис для туристического агентства

## Overview
This project is a web application designed to manage group tours across five Chinese cities (Beijing, Luoyang, Xi'an, Zhangjiajie, Shanghai). It integrates with Bitrix24 as an embedded tab within "Smart Process" items (specifically, "Event" smart processes), where each item represents a single group tour. The application aims to streamline tour management, track tourists and itineraries, provide a statistical dashboard, a comprehensive summary table, and enable Excel export. The core purpose is to simplify the operational aspects of a tourist agency by offering a centralized platform for tour data.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to folder `Z`.
Do not make changes to file `Y`.

## System Architecture

### UI/UX Decisions
The frontend is built with React, TypeScript, Shadcn UI, and Tailwind CSS, ensuring a modern and responsive user experience. It features a statistical dashboard, a wide summary table with sticky headers for efficient data overview, and full mobile adaptation including compact navigation and responsive cards.

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS, Bitrix24 JS SDK, react-i18next.
- **Backend**: Express.js, TypeScript, In-memory storage (for development), Bitrix24 REST API.
- **Data Structure**: Shared TypeScript types and Zod schemas for data validation.
- **Supported Cities**: Beijing, Luoyang, Xi'an, Zhangjiajie, Shanghai.
- **Internationalization**: i18next provides support for Russian, English, and Chinese, with automatic language detection and a user-facing switcher.

### Feature Specifications
- **Tourist Management**: CRUD operations for tourists, synchronized with Bitrix24 contacts. Updates to tourist fields in the summary table are bidirectionally synchronized with Bitrix24 Contact and Deal entities.
- **Itinerary Management**: Allows defining city visits, dates, transport, and hotel details with validation. All city visits auto-populate on page load.
- **Dashboard**: Provides statistics on tourists, city distribution, upcoming arrivals, and hotel usage.
- **Summary Table**: Offers a comprehensive view of tourists and itineraries, featuring sticky headers, responsive design, grouping by Bitrix24 deals with hyperlinks, and inline editing. It includes a custom grouping system (manual, custom, auto-group by dealId) with persistency, expand/collapse functionality, and smart field merging for "Surcharge" and "Nights" fields. City columns always display field labels with "—" for empty values. Transport-based field labels (e.g., "Airport" vs. "Station") are dynamically adjusted.
- **Transport Selection**: Uses Shadcn ToggleGroup component for single-click transport type selection (plane ✈️ / train 🚂). Both options are visible side-by-side with clear visual indication of selected state, reducing interaction from 2 clicks (dropdown open + select) to 1 click. Properly handles empty states via `value ?? undefined` pattern.
- **Sharing & Export**: Enables sharing via "Copy link" and "Download Excel" options for the full table or city-specific data. Excel exports include tourist data, itineraries, and Bitrix24 entity IDs. The Smart Process title links to the Bitrix24 Event entity.
- **DEV Mode (`/dev`)**: A standalone testing page with mock data, enabling rapid development and testing without a Bitrix24 connection. It mirrors all main functionalities of the production application.
- **Bitrix24 Integration**: The application functions as an embedded tab within the "Event" Smart Process. It includes robust entity ID detection, data synchronization (Event → deals → contacts), and only updates existing Bitrix24 contacts. A rebind mechanism (`/rebind.html`) addresses incorrect placement configurations.

### System Design Choices
- **Smart Process Integration**: Each "Event" Smart Process item in Bitrix24 corresponds to a single group tour.
- **API Endpoints**: A REST API handles tourist management and data retrieval.
- **Environment Variables**: Utilizes `BITRIX24_WEBHOOK_URL` for production and configuration.
- **Development Workflow**: Supports both a production mode requiring Bitrix24 SDK and a `/dev` mode for independent testing with mock data.

## External Dependencies
- **Bitrix24**: CRM and Smart Process platform.
- **React**: Frontend library.
- **TypeScript**: Programming language.
- **Wouter**: Client-side routing.
- **TanStack Query**: Data fetching and caching.
- **Shadcn UI**: UI component library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Express.js**: Backend web application framework.
- **xlsx**: Library for reading and writing Excel files.
- **i18next & react-i18next**: Internationalization framework for React.
- **i18next-browser-languagedetector**: Language detection for i18next.