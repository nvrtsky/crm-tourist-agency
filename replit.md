# Standalone CRM System for Tourist Agency

## Overview
This project is a standalone CRM web application designed for tourist agencies, centralizing lead, event, contact, and deal management. Its primary purpose is to streamline the CRM workflow from lead capture to group organization and itinerary tracking, serving as a comprehensive platform for managing tourist agency operations. The business vision is to provide a robust, all-in-one solution that enhances efficiency and customer engagement in the tourism sector.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture

### CRM Workflow
The system employs a lead-first, deal-centric, and event-based CRM flow, progressing from lead capture and qualification, conversion to contacts and deals, event assignment, to detailed event and group management.

### UI/UX Design
The frontend uses React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS. It features a consistent design with Shadcn components, color-coded status indicators, responsive layouts, and accessibility. Brand logos adapt to theme changes, and text colors are optimized for readability.

### Backend Architecture
The backend is built with Express.js, TypeScript, and Drizzle ORM, interacting with a PostgreSQL database. It exposes RESTful APIs for core CRM entities, uses Zod for data validation, and includes a storage layer for database abstraction.

### Database Schema
A normalized PostgreSQL database schema includes core CRM tables (`events`, `contacts`, `deals`, `leads`, `groups`), `leadTourists` for detailed tourist data, `users` for authentication, and supporting tables for `cityVisits`, `leadStatusHistory`, `notifications`, `forms`, and `formSubmissions`.

### Key Features
-   **Events Module**: Manages tourist events with filtering, sorting, color-coded availability, and participant tracking. Features comprehensive event editing, guide assignment, and enhanced data validation. The `EventSummary` page offers inline editable itinerary details and Excel export. The participant table uses optimized column layout: № (sticky) | ФИО (sticky) | Данные туриста | Лид | City columns, with only the first two columns remaining sticky for better horizontal scrolling. The ФИО column displays Latin passport names (`foreignPassportName`) with fallback to Russian names (`contact.name`) when Latin names are unavailable. City visit columns include comprehensive arrival/departure details: dates, times, transfer information, and airport/station fields with dynamic placeholders that automatically display "Аэропорт" for plane transport and "Вокзал" for train transport.
-   **Participant Tourist Editing**: Allows direct editing of tourist data from the EventSummary page, with bidirectional sync between `leadTourists` and `contacts` tables. Includes visual tourist type indicators (adult, child, primary) and data completeness indicators. The participant table implements smart column merging for families and mini-groups, with lead status column positioned after tourist data for improved visual organization. Excel export mirrors the UI column structure and uses the same Latin/Russian name display logic.
-   **Leads Module**: Offers comprehensive lead management with dual table/Kanban views. Features automatic lead conversion upon tour assignment, lead postponement with automated follow-up, and advanced filtering. Supports manual and automatic color tagging based on lead status. The tourist list within lead dialogs displays Latin passport names (`foreignPassportName`) with fallback to Russian names for consistent naming across the system.
-   **Group Management**: Supports both "Families" (shared hotel/transport/invoice) and "Mini-groups" (shared hotel only), with automatic creation for families and manual creation for mini-groups.
-   **Notification System**: Provides automated in-app notifications for bookings, group capacity, upcoming events, and participant birthdays.
-   **Forms Module**: A lead generation system with a form builder, public form pages, and submission tracking, automatically creating leads from submissions.
-   **Booking Module**: A public-facing tour reservation system allowing customers to view, filter, and book tours, automatically creating leads linked to specific events.
-   **Color Indication System**: Allows manual color tagging (red, blue, green, yellow, purple) for events and leads for visual organization, with automatic status-based highlighting for leads that defers to manual tags.
-   **Authentication & User Management**: Implements session-based authentication using Passport.js with bcrypt hashing and role-based access control (admin/manager/viewer). Features include a secure login, protected routes, user management UI, and role-specific content restrictions for viewer roles.

### Technical Decisions
Key decisions include dynamic geography for event city tracking, a standalone system design (no external CRM integrations), backend-automated notification strategy, and a refined lead data separation architecture. Includes robust features for auto-creating initial tourist entries and comprehensive tourist data completeness indicators.

## External Dependencies
-   **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
-   **Backend**: Express.js, TypeScript, Drizzle ORM, Passport.js, bcrypt
-   **Database**: PostgreSQL (Neon-hosted)
-   **Utilities**: xlsx (Excel generation), date-fns (date manipulation), zod (schema validation)
-   **Session Management**: express-session with MemoryStore (development), rate limiting