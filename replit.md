# Standalone CRM System for Tourist Agency

## Overview
This project is a standalone CRM web application designed for tourist agencies. It provides a centralized platform for managing leads, events, contacts, and deals, streamlining the entire CRM workflow from lead capture to group management and itinerary tracking. The system aims to be a comprehensive tool for managing tourist agency operations, offering modules for lead management, event scheduling, customer relationship tracking, and group organization.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture

### CRM Workflow
The system follows a lead-first, deal-centric, and event-based CRM flow:
1.  **Lead Capture & Qualification**: Leads are entered manually or via web forms and undergo qualification.
2.  **Conversion**: Qualified leads are converted into Contacts with associated Deals.
3.  **Event Assignment**: Deals are linked to specific tourist events.
4.  **Event & Group Management**: Tracks participants, availability, payments, and organizes tourists into families or mini-groups with detailed itinerary management.

### Database Schema
A PostgreSQL database with 9 normalized tables:
-   **Core CRM Tables**: `events`, `contacts`, `deals`, `leads`, `groups`
-   **Supporting Tables**: `cityVisits`, `leadStatusHistory`, `notifications`, `forms`, `formSubmissions`

### Key Features
-   **Events Module**: Manages tourist events with filtering, sorting, color-coded availability, and detailed participant tracking. Includes a dynamic `EventSummary` page with inline editable city-specific itinerary details and Excel export.
-   **Leads Module**: Comprehensive lead management with dual-view interface:
    - **Table View**: Traditional tabular display with sorting and filtering
    - **Kanban View**: Visual drag-and-drop board with 5 columns (New, Contacted, Qualified, Converted, Lost)
    - **Filters**: Status, source, date range, and family toggle with localStorage persistence
    - **View Toggle**: Seamless switching between table and kanban modes
    - **Drag & Drop**: HTML5 drag-and-drop API for status updates in kanban view
    - **Lead Conversion**: Special handling for families via `familyMembersCount` field
-   **Group Management**: 
    - Two group types: **Families** (shared hotel/transport/invoice, separate passports) and **Mini-groups** (shared hotel only, individual transport/invoices)
    - Family creation: automatic during lead-to-contact conversion when `familyMembersCount > 1`
    - Mini-group creation: manual via dialog in EventSummary for existing ungrouped participants
    - Visual representation: merged cells in participant table with lucide-react icons (Users for families, UsersRound for mini-groups)
    - Rollback mechanism: ensures data consistency during group creation
-   **Notification System**: Automated in-app notifications for bookings, group capacity, upcoming events, and participant birthdays.
-   **Forms Module**: Comprehensive lead generation system (November 2025):
    - **Forms List**: CRUD operations for forms with embed code generation
    - **Form Builder**: Visual drag-and-drop constructor with live preview for configuring form fields
    - **Public Form**: Standalone pages for form submissions with dynamic validation based on field configuration
    - **Form Submissions**: View all form submissions with detailed information and automatic lead creation
    - **Field Types**: text, email, phone, textarea, select, checkbox, number, date
    - **Auto-Lead Creation**: Submissions automatically create leads with source="form"
    - **Demo User**: Hard-coded userId="demo-user-001" for testing (auth not implemented)
-   **Booking Module**: Public-facing tour reservation system (November 2025):
    - **Public Booking Page** (/booking): Customer-facing interface for tour reservations
    - **Event Filtering**: Dynamic filters for country, tour type, and date range; automatically excludes fully-booked events (isFull=true)
    - **Availability Indicator**: Real-time color-coded availability display:
      - Green (>30% available): "Много мест"
      - Yellow (10-30% available): "Мало мест"
      - Red (0-10% available): "Нет мест"
    - **Booking Form**: Collects customer details (name*, phone*, email, participant count, notes) with validation
    - **Auto-Lead Creation**: Submissions create leads with source="booking" and enriched notes containing full event details
    - **Smart Availability Tracking**: events.isFull field auto-syncs when confirmed deals created/updated/deleted
    - **API Endpoints**:
      - GET /api/events/availability/:eventId - Returns available spots calculation
      - POST /api/public/bookings - Creates lead from booking submission

### UI/UX Design
The frontend uses React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS. It features a consistent design with Shadcn components, color-coded status indicators, responsive layouts, and accessibility attributes. The application displays the "Unique Travel" brand logo in the header and uses darker text colors (5% lightness) for improved readability.

### Backend Architecture
Built with Express.js, TypeScript, and Drizzle ORM, interacting with PostgreSQL. It provides RESTful APIs for all core CRM entities (Events, Contacts, Deals, Leads, Notifications, Forms, CityVisits) with Zod for data validation and a storage layer for database abstraction.

### Technical Decisions
-   **Dynamic Geography**: Events store cities as arrays, allowing flexible tour routing.
-   **Standalone System**: The application is designed as a fully independent CRM, with no external integrations like Bitrix24.
-   **Notification Strategy**: Backend-automated notifications based on predefined triggers (e.g., group capacity thresholds).

## External Dependencies
-   **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
-   **Backend**: Express.js, TypeScript, Drizzle ORM
-   **Database**: PostgreSQL (Neon-hosted)
-   **Utilities**: xlsx (Excel generation), date-fns (date manipulation), zod (schema validation)