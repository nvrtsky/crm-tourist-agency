# Standalone CRM System for Tourist Agency

## Overview
This project is a standalone CRM web application designed for tourist agencies. Its primary purpose is to centralize and streamline the management of leads, events, contacts, and deals within a single system. The business vision is to deliver an all-in-one solution that significantly boosts efficiency and enhances customer engagement in the tourism sector. Key capabilities include comprehensive event and group management, robust lead tracking with automated conversions, and a public-facing module for bookings and forms.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture

### CRM Workflow
The system implements a lead-first, deal-centric, and event-based CRM flow. It manages leads from capture and qualification through conversion to contacts and deals, culminating in detailed event and group management.

### UI/UX Design
The frontend is built with React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS. It emphasizes a consistent, responsive, and accessible user experience with color-coded status indicators, adaptive branding, and optimized text readability.

### Backend Architecture
The backend is developed using Express.js and TypeScript, integrated with a PostgreSQL database via Drizzle ORM. It provides RESTful APIs for CRM entities, utilizes Zod for data validation, and includes a dedicated storage layer for database abstraction.

### Database Schema
A normalized PostgreSQL schema underpins the system, supporting core CRM entities such as `events`, `contacts`, `deals`, `leads`, and `groups`. Additional tables manage `leadTourists`, `users`, `cityVisits`, `leadStatusHistory`, `notifications`, `forms`, and `formSubmissions`.

### Key Features
-   **Events Module**: Manages tourist events, offering filtering, sorting, participant tracking, and comprehensive editing capabilities. Includes inline editable itinerary details and Excel export. Participant counting specifically includes only "Подтвержден" (converted) leads. Events can be archived, copied, and deleted (admin only). **Summary Table**: Includes "Remaining Payment" column, "Limited Route" indicator with city tooltip, and footer row with total remaining payments (by currency) and room type counts per city (e.g., "5 Twin, 2 Single, 1 Double").
-   **Participant Tourist Editing**: Enables direct editing of tourist data with bidirectional synchronization between `leadTourists` and `contacts`. Features visual indicators for tourist types and data completeness, smart column merging for families/mini-groups, file uploads for passport scans, and role-based field visibility.
-   **Leads Module**: Provides comprehensive lead management with dual table/Kanban views. Features include automatic conversion upon tour assignment, postponement with follow-up, advanced filtering, and automatic color tagging. Tour cost is dynamically calculated and updated. Automatic participant addition intelligently converts tourists to contacts and deals based on event assignment changes. **City Selection**: When a tour is assigned, city checkboxes appear allowing managers to specify limited routes (not all tour cities).
-   **Group Management**: Supports "Families" (shared services) and "Mini-groups" (shared hotel only), with automated creation for families and manual for mini-groups.
-   **Notification System**: Delivers automated in-app notifications for bookings, group capacity, upcoming events, and participant birthdays.
-   **Forms Module**: A lead generation system with a form builder, public pages, and submission tracking that automatically creates leads.
-   **Booking Module**: A public-facing reservation system allowing customers to view, filter, and book tours, automatically generating leads linked to specific events.
-   **Color Indication System**: Allows manual color tagging for events and leads, with automatic status-based highlighting for leads.
-   **Authentication & User Management**: Implements session-based authentication with Passport.js and bcrypt, featuring role-based access control (admin/manager/viewer) for secure login, route protection, and restricted content access.

### Technical Decisions
The system employs dynamic geography for event city tracking, maintains a standalone design without external CRM integrations, uses a backend-automated notification strategy, and features a refined lead data separation architecture. Initial tourist entries are auto-created, and comprehensive tourist data completeness is indicated.

## External Dependencies
-   **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
-   **Backend**: Express.js, TypeScript, Drizzle ORM, Passport.js, bcrypt
-   **Database**: PostgreSQL (Neon-hosted)
-   **Utilities**: xlsx, date-fns, zod
-   **Session Management**: express-session