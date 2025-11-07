# Standalone CRM System for Tourist Agency

## Overview
This project is a standalone CRM web application for tourist agencies, centralizing lead, event, contact, and deal management. It streamlines the CRM workflow from lead capture to group organization and itinerary tracking, serving as a comprehensive platform for managing tourist agency operations with modules for lead management, event scheduling, customer relationship tracking, and group organization. The business vision is to provide a robust, all-in-one solution that enhances efficiency and customer engagement in the tourism sector.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture

### CRM Workflow
The system employs a lead-first, deal-centric, and event-based CRM flow, progressing from lead capture and qualification, conversion to contacts and deals, event assignment, to detailed event and group management including participant tracking, payments, and itinerary organization.

### UI/UX Design
The frontend utilizes React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS. It features a consistent design with Shadcn components, color-coded status indicators, responsive layouts, and accessibility. The application displays a brand logo that switches based on the theme (dark for light theme, white for dark theme) and uses darker text colors for readability.

### Backend Architecture
The backend is built with Express.js, TypeScript, and Drizzle ORM, interacting with a PostgreSQL database. It exposes RESTful APIs for all core CRM entities and uses Zod for data validation and a storage layer for database abstraction.

### Database Schema
A normalized PostgreSQL database schema underpins the system, featuring core CRM tables (`events`, `contacts`, `deals`, `leads`, `groups`), `leadTourists` for detailed individual tourist data within leads, and supporting tables for `cityVisits`, `leadStatusHistory`, `notifications`, `forms`, and `formSubmissions`.

### Key Features
-   **Events Module**: Manages tourist events with filtering, sorting, color-coded availability, and participant tracking, including a dynamic `EventSummary` page with inline editable itinerary details and Excel export.
-   **Leads Module**: Offers comprehensive lead management with dual table/Kanban views, lead-to-tourist data separation, detailed passport data for individual tourists via `leadTourists` table, enhanced lead conversion processes, and automatic creation of initial tourist entries.
-   **Group Management**: Supports two types of groups: Families (shared hotel/transport/invoice) and Mini-groups (shared hotel only), with automatic family creation during lead conversion and manual mini-group creation.
-   **Notification System**: Provides automated in-app notifications for bookings, group capacity, upcoming events, and participant birthdays.
-   **Forms Module**: A comprehensive lead generation system with a form builder, public form pages, and submission tracking. It supports various field types, including a dynamic 'tour' field that links to available events, and automatically creates leads from submissions.
-   **Booking Module**: A public-facing tour reservation system allowing customers to view, filter, and book available tours. It includes real-time availability indicators, a booking form for customer details, and automatically creates leads from submissions, linking them to specific events.
-   **Technical Decisions**: Includes dynamic geography for event city tracking, a standalone system design (no external CRM integrations), backend-automated notification strategy, and a refined lead data separation architecture to distinguish contact information from individual tourist passport data. It also features a robust system for auto-creating initial tourist entries with transactional safety and comprehensive tourist data completeness indicators for visual data quality tracking.

## External Dependencies
-   **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
-   **Backend**: Express.js, TypeScript, Drizzle ORM
-   **Database**: PostgreSQL (Neon-hosted)
-   **Utilities**: xlsx (Excel generation), date-fns (date manipulation), zod (schema validation)