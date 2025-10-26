# Веб-сервис для туристического агентства

## Overview
This project is a web application designed to manage group tours across four cities in China: Beijing, Luoyang, Xi'an, and Zhangjiajie. Tourists can join or leave a tour at any stage of the itinerary. The application integrates with Bitrix24 as an embedded tab within a "Smart Process" (specifically, the "Event" smart process), where each smart process item represents a single group tour. It aims to streamline tour management, provide comprehensive tourist and itinerary tracking, and offer various reporting features.

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
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query (API state management), Shadcn UI, Tailwind CSS, Bitrix24 JS SDK.
- **Backend**: Express.js, TypeScript, In-memory storage (MemStorage for development), Bitrix24 REST API integration (`crm.item.*` methods for smart processes).
- **Data Structure**: Shared TypeScript types and Zod schemas define the data models across frontend and backend.
- **Project Structure**:
    - `client/`: Frontend React application.
    - `server/`: Backend Express server, including Bitrix24 API client and routes.
    - `shared/`: Common types and Zod schemas.
    - `attached_assets/`: City images.

### Feature Specifications
- **Tourist Management**: Create, edit, delete tourists; link tourists to Bitrix24 smart process items and CRM contacts.
- **Itinerary Management**: Select cities, specify arrival/departure dates and times, choose transport types (flight/train), enter flight/train numbers, record hotel information. Includes validation for departure dates (must be after arrival).
- **Dashboard**: Displays tourist statistics, city distribution, upcoming arrivals, and hotel usage.
- **Summary Table**: Comprehensive table showing all tourists, date/time ranges for arrival/departure, flight numbers, hotel lists, and transport icons. Features sticky header, responsive design with horizontal scrolling, and a total tourist count. City information is consolidated within each city column (dates/times, hotel, transport, flight numbers) instead of separate columns.
- **Sharing & Export**: Copy link functionality and export to Excel (including times and flight numbers). Each city column has a Share2 button that exports data only for that specific city, generating an Excel file with columns: №, Tourist, Phone, and the selected city's data.
- **Bitrix24 Integration**: Operates as an embedded tab, synchronizes tourists with CRM contacts, and stores route information in custom fields of the Bitrix24 smart process item.
- **Development Mode**: Supports standalone operation with mock data for development and testing without Bitrix24 integration.

### System Design Choices
- **Smart Process Integration**: The system leverages Bitrix24's smart processes, with each "Event" smart process item representing a unique group tour.
- **API Endpoints**: Dedicated API for managing tourists (GET, POST, PATCH, DELETE) and for seeding/clearing test data.
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