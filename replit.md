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
-   **Leads Module**: Comprehensive lead management, including creation, conversion (with special handling for families), and status tracking.
-   **Notification System**: Automated in-app notifications for bookings, group capacity, upcoming events, and participant birthdays.
-   **Form Builder**: Visual tool for creating web forms to capture leads directly into the CRM.

### UI/UX Design
The frontend uses React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS. It features a consistent design with Shadcn components, color-coded status indicators, responsive layouts, and accessibility attributes.

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