# Веб-сервис для туристического агентства

## Overview
This project is a full-featured web service for a tourist agency with multiple integrated modules:

1. **Bitrix24 Integration Module**: Embedded tab within "Event" Smart Process items for managing group tours across five Chinese cities (Beijing, Luoyang, Xi'an, Zhangjiajie, Shanghai). Provides tour management, tourist tracking, itinerary planning, statistical dashboard, and Excel export.

2. **CRM System**: Lead management with status tracking, source attribution, and complete audit history.

3. **Form Builder**: Visual form creator that generates embeddable website forms, capturing submissions and automatically creating CRM leads.

4. **Authentication & Authorization**: Role-based access control system with three levels (admin, manager, viewer) protecting all modules.

The application provides a centralized platform for tourist agency operations, combining client acquisition (forms → leads) with tour execution (Bitrix24 integration).

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.
Do not make changes to folder `Z`.
Do not make changes to file `Y`.

## System Architecture

### UI/UX Decisions
The frontend is built with React, TypeScript, Shadcn UI, and Tailwind CSS, ensuring a modern and responsive user experience. The application uses a **modular sidebar navigation architecture** (Shadcn Sidebar primitives) organizing functionality into five main sections:

1. **Dashboard**: Overview statistics and quick access to key metrics
2. **Tours** (Bitrix24): Tour management module with tabs for Dashboard (city statistics), Summary Table (comprehensive itinerary view), and Add Tourist (CRUD operations)
3. **CRM**: Full-featured lead management system with dual-view (Kanban/Table), status tracking, lead-to-deal conversion, and complete audit history. Works in both Bitrix24 iframe mode and standalone demo mode (`/demo/crm`)
4. **Forms**: Visual form builder for lead generation (placeholder - architecture only)
5. **Settings**: User authentication, roles, and preferences (placeholder - architecture only)

The UI features a collapsible sidebar with internationalized navigation (ru/en/zh), responsive design optimized for iframe constraints, sticky headers for data tables, and full mobile adaptation. The Tours section preserves all existing Bitrix24 integration functionality through a tabbed interface.

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS, Bitrix24 JS SDK, react-i18next.
- **Backend**: Express.js, TypeScript, PostgreSQL via Drizzle ORM, Bitrix24 REST API.
- **Database**: PostgreSQL (Neon-backed) with 12 normalized tables:
  - `users`: Authentication and role-based access control (admin/manager/viewer)
  - `forms`: Form builder definitions for lead generation
  - `formFields`: Dynamic form field configurations
  - `leads`: CRM lead management with status tracking (new/contacted/qualified/won/lost)
  - `leadStatusHistory`: Audit trail for lead status changes with user tracking
  - `formSubmissions`: Captured form submission data
  - `contacts`: CRM contacts created from qualified leads
  - `deals`: Sales deals linked to contacts with status tracking
  - `crmEvents`: CRM events (meetings, calls) linked to contacts/deals
  - `tourEvents`: Tour-specific events linked to Bitrix24 Smart Process items
  - `tourists`: Tourist records synchronized with Bitrix24 contacts
  - `cityVisits`: Itinerary details for each city visit
- **Data Integrity**: All foreign key constraints enforced at database level with proper cascade/set null behaviors for referential integrity
- **Data Structure**: Shared TypeScript types and Zod schemas for data validation, consistent varchar UUID primary keys across all tables
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
- **CRM Lead Management**: Comprehensive lead tracking system with two view modes:
  - **Kanban View**: Visual drag-and-drop board with 5 status columns (Новые, В контакте, Квалифицированы, Успех, Проиграны). Includes lead count badges, color-coded status indicators, and real-time status updates via drag-and-drop using @dnd-kit library.
  - **Table View**: Sortable/filterable data table with columns for name, phone, email, source, and status. Features status badge color coding, column sorting (name, source, status, createdAt), and status filter dropdown.
- **Lead Detail Modal**: Inline editing dialog with react-hook-form validation for lead fields (name, phone, email, source, status, notes). Status changes are tracked in `leadStatusHistory` table for complete audit trail.
- **Lead-to-Deal Conversion**: Automated workflow for qualified leads with "Конвертировать в сделку" button. Creates linked Contact and Deal records in a single transaction, automatically updates lead status to "won", records conversion history, and invalidates all relevant caches for instant UI refresh.
- **Standalone Demo Mode (`/demo/crm`)**: Full CRM functionality without Bitrix24 SDK dependency. Uses "system-user" placeholder for FK fields (assignedUserId, createdByUserId, changedByUserId) which are automatically set to NULL to avoid foreign key constraint violations. All CRUD operations and conversion workflows work identically to production mode.

### System Design Choices
- **Modular Architecture**: Four independent but integrated modules (Bitrix24, CRM, Forms, Auth) sharing common database
- **Smart Process Integration**: Each "Event" Smart Process item in Bitrix24 corresponds to a single group tour
- **Database-First Design**: PostgreSQL with Drizzle ORM, all relationships enforced via FK constraints with appropriate cascade behaviors
- **API Endpoints**: RESTful API handles CRUD operations for all entities (tourists, leads, forms, users) with Zod validation
- **Environment Variables**: `BITRIX24_WEBHOOK_URL`, `DATABASE_URL`, `SESSION_SECRET` for production configuration
- **Development Workflow**: Supports both production mode (requires Bitrix24 SDK) and `/dev` mode (independent testing with mock data)
- **Migration Strategy**: Schema changes via `npm run db:push --force` (Drizzle Kit), no manual SQL migrations

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