# Standalone CRM System for Tourist Agency

## Overview
This project is a standalone CRM web application for tourist agencies, centralizing lead, event, contact, and deal management. Its purpose is to streamline the CRM workflow from lead capture to group organization and itinerary tracking. The business vision is to provide a robust, all-in-one solution that enhances efficiency and customer engagement in the tourism sector. Key capabilities include comprehensive event management, lead tracking with automated conversions, group management for families and mini-groups, and a public-facing booking and forms module.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture

### CRM Workflow
The system uses a lead-first, deal-centric, and event-based CRM flow, managing leads through capture, qualification, conversion to contacts and deals, event assignment, and detailed event/group management.

### UI/UX Design
The frontend utilizes React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS, ensuring a consistent, responsive, and accessible design. It features color-coded status indicators, adaptive branding, and optimized text readability.

### Backend Architecture
The backend is built with Express.js, TypeScript, and Drizzle ORM, interfacing with a PostgreSQL database. It provides RESTful APIs for CRM entities, uses Zod for data validation, and includes a storage layer for database abstraction.

### Database Schema
A normalized PostgreSQL schema supports core CRM entities (`events`, `contacts`, `deals`, `leads`, `groups`), `leadTourists` for detailed tourist data, `users` for authentication, and supporting tables for `cityVisits`, `leadStatusHistory`, `notifications`, `forms`, and `formSubmissions`.

### Key Features
-   **Events Module**: Manages tourist events with filtering, sorting, and participant tracking. It includes comprehensive editing with country and tour type selections, guide assignment, and enhanced data validation. The `EventSummary` page offers inline editable itinerary details and Excel export. Participant counting logic specifically includes only tourists from "Подтвержден" (converted) leads. Events can be archived (manual/automatic), copied, and deleted (admin only).
-   **Participant Tourist Editing**: Allows direct editing of tourist data with bidirectional sync between `leadTourists` and `contacts`. Features visual tourist type indicators (adult, child, primary), data completeness indicators, and smart column merging for families/mini-groups. Includes file upload for passport scans to Replit Object Storage, guide comments, and role-based field visibility. Birthday indicators highlight tourists with birthdays during the tour.
-   **Leads Module**: Offers comprehensive lead management with dual table/Kanban views, automatic conversion upon tour assignment, postponement with follow-up, and advanced filtering with search functionality. Supports manual and automatic color tagging. Tour cost is automatically calculated as `event.price × tourist_count` and recalibrates on event price changes. Currency input fields use focus-based formatting. **Automatic participant addition**: Features intelligent auto-conversion in three scenarios: (1) creating lead with eventId → tourist automatically converted to contact + deal; (2) adding new tourist to lead with eventId → new contact and deal created without affecting existing participants; (3) changing lead's eventId → existing deals updated to new event via precise previousEventId matching, preventing duplicates. System uses `getContactByLeadTourist` to detect existing contacts and either creates new deals or migrates existing ones based on context.
-   **Group Management**: Supports "Families" (shared hotel/transport/invoice) and "Mini-groups" (shared hotel only), with automatic creation for families and manual for mini-groups. Family members are consolidated into single cards on mobile, with popovers for individual details.
-   **Notification System**: Provides automated in-app notifications for bookings, group capacity, upcoming events, and participant birthdays.
-   **Forms Module**: A lead generation system with a form builder, public pages, and submission tracking that automatically creates leads.
-   **Booking Module**: A public-facing tour reservation system for customers to view, filter, and book tours, automatically creating leads linked to specific events.
-   **Color Indication System**: Allows manual color tagging for events and leads, with automatic status-based highlighting for leads.
-   **Authentication & User Management**: Implements session-based authentication using Passport.js with bcrypt and role-based access control (admin/manager/viewer). Features include secure login, protected routes, user management UI, and role-specific content restrictions for navigation, lead access, event management, and tourist editing. All delete operations are restricted to the admin role.

### Technical Decisions
The system employs dynamic geography for event city tracking, a standalone design (no external CRM integrations), backend-automated notification strategy, and a refined lead data separation architecture. Initial tourist entries are auto-created, and comprehensive tourist data completeness is indicated.

### Recent Changes
-   **Sticky Column Fix for EventSummary (Nov 2025)**: Fixed visual cut-off issue where sticky columns (№ and ФИО) appeared to blend with scrolling content during horizontal scroll. Implemented precise width calculation (w-[56px] for № column), exact positioning (left-[57px] for ФИО column accounting for 1px border), and added subtle box-shadow to create clear visual separation between sticky and scrolling regions. Eliminated gap between sticky columns by accounting for border width. Works in both light and dark themes.
-   **Statistics Counting Fix in EventSummary (Nov 2025)**: Corrected statistics cards to use lead.status instead of deal.status. "Подтверждено" now counts participants with lead.status === "converted", "В ожидании" counts non-converted/non-lost leads, and "Выручка" calculates revenue only from confirmed participants. Added sorting to display confirmed participants at the top of the participant table while maintaining family/mini-group relationships.
-   **Real-Time Event Status Badges (Nov 2025)**: Added status breakdown badges to EventCard displaying participant counts by lead status in real-time. Backend (server/storage.ts) calculates `statusCounts` (pending/confirmed/cancelled) via SQL joins on deals→contacts→leads, supporting both English and Russian status values for backward compatibility. Frontend displays color-coded badges (yellow/green/red) that auto-update without page refresh when lead status or eventId changes via TanStack Query refetchQueries in Leads.tsx mutations. All consumers (Leads.tsx, Events.tsx) consistently use EventWithStats type for enriched event data.
-   **EventSummary Cache Invalidation Fix (Nov 2025)**: Fixed frontend cache synchronization for event participants. All tourist mutations (create, update, toggle primary, delete) in Leads.tsx now properly invalidate `/api/events/:eventId/participants` query cache when the lead has an assigned event, ensuring EventSummary participant list updates in real-time without requiring manual page refresh.
-   **Timezone Fix for Date Selection (Nov 2025)**: Replaced `toISOString().split('T')[0]` with `format(date, 'yyyy-MM-dd')` from date-fns across EditableCell.tsx and EventSummary.tsx to prevent timezone conversion issues where selecting a date (e.g., 20th) would save the previous day (19th) due to UTC conversion.
-   **Individual Status Badges for Mini-Groups (Nov 2025)**: Modified EventSummary participant table to show individual lead status badges for each mini-group member instead of merging them. Families (same leadId) still share a single status badge via rowSpan, but mini-group participants now display their own status since they may belong to different leads with different statuses. This improves clarity as mini-groups only share hotel accommodations, not lead statuses.
-   **Single Room Type Addition (Nov 2025)**: Expanded hotel room type options from Twin/Double to include Single across all room type selectors. EventSummary.tsx uses hardcoded labels consistent with its Russian-only design, while DevTest.tsx uses i18n translations. Added translations to all locales (ru/en/zh) in both `roomTypes` and dashboard sections. Updated seed.ts to generate test data with variety of room types (single/twin/double).

## External Dependencies
-   **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
-   **Backend**: Express.js, TypeScript, Drizzle ORM, Passport.js, bcrypt
-   **Database**: PostgreSQL (Neon-hosted)
-   **Utilities**: xlsx (Excel generation), date-fns (date manipulation), zod (schema validation)
-   **Session Management**: express-session (with MemoryStore for development)