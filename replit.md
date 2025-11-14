# Standalone CRM System for Tourist Agency

## Overview
This project is a standalone CRM web application designed for tourist agencies, aiming to centralize and streamline lead, event, contact, and deal management. It offers a comprehensive platform for managing tourist agency operations, from lead capture and qualification to group organization and itinerary tracking. The core vision is to provide an all-in-one solution that significantly enhances efficiency and customer engagement within the tourism sector.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture

### CRM Workflow
The system utilizes a lead-first, deal-centric, and event-based CRM flow. This progression covers lead capture and qualification, conversion to contacts and deals, event assignment, and detailed event and group management, including participant tracking, payments, and itinerary organization.

### UI/UX Design
The frontend is built with React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS. It emphasizes a consistent design using Shadcn components, color-coded status indicators, responsive layouts, and accessibility features. The application dynamically switches brand logos based on the theme and uses darker text for improved readability.

### Backend Architecture
The backend is developed using Express.js, TypeScript, and Drizzle ORM, interfacing with a PostgreSQL database. It provides RESTful APIs for all core CRM entities, employing Zod for robust data validation and a dedicated storage layer for database abstraction.

### Database Schema
A normalized PostgreSQL database schema forms the foundation, including core CRM tables (`events`, `contacts`, `deals`, `leads`, `groups`), `leadTourists` for detailed individual tourist data, `users` for authentication, and supporting tables for `cityVisits`, `leadStatusHistory`, `notifications`, `forms`, and `formSubmissions`.

### Key Features
-   **Events Module**: Manages tourist events with filtering, sorting, color-coded availability, and participant tracking. It includes a dynamic `EventSummary` page with inline editable itinerary details, Excel export, and displays only confirmed participants. Event editing allows comprehensive updates and guide assignment. Enhanced data validation ensures data integrity, including date format and type coercion.
-   **Participant Tourist Editing**: Allows direct editing of tourist data from the participant table in the `EventSummary` page. It features bidirectional synchronization between `leadTourists` and `contacts` tables, visual indicators for tourist types (adult, child, primary), and data completeness indicators. The participant table implements smart column merging for families and mini-groups, optimizing display based on grouping.
-   **Leads Module**: Offers comprehensive lead management with dual table/Kanban views. It separates lead-to-tourist data, automatically creates initial tourist entries, and features automatic lead conversion upon tour assignment. Manual and automatic color tagging is used for visual prioritization, with advanced filtering options. A lead postponement feature allows for scheduling follow-ups.
-   **Group Management**: Supports two types of groups: Families (shared hotel/transport/invoice) and Mini-groups (shared hotel only), with automatic creation for families and manual creation for mini-groups.
-   **Notification System**: Provides automated in-app notifications for bookings, group capacity, upcoming events, and participant birthdays.
-   **Forms Module**: A lead generation system with a form builder, public form pages, and submission tracking, automatically creating leads from submissions and linking them to events.
-   **Booking Module**: A public-facing tour reservation system allowing customers to view, filter, and book available tours with real-time availability and automatic lead creation.
-   **Color Indication System**: Enables manual tagging of events and leads with five colors (red, blue, green, yellow, purple) for visual organization, alongside automatic status-based highlighting for leads.
-   **Authentication & User Management**: Implements secure session-based authentication using Passport.js and bcrypt for corporate users. It supports role-based access control (admin/manager/viewer), with specific content filtering and access restrictions for 'viewer' roles (guides).

## External Dependencies
-   **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
-   **Backend**: Express.js, TypeScript, Drizzle ORM, Passport.js, bcrypt
-   **Database**: PostgreSQL (Neon-hosted)
-   **Utilities**: xlsx, date-fns, zod
-   **Session Management**: express-session (with MemoryStore for development)