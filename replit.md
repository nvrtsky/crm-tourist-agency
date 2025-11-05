# Standalone CRM System for Tourist Agency

## Overview
This project is a full-featured standalone CRM web application for a tourist agency with integrated modules for lead management, event management, and customer relationship tracking.

**Key Features:**
1. **CRM Lead Management**: Complete lead tracking with status management, source attribution, and audit history
2. **Event Management**: Create and manage tourist events with participant tracking, availability monitoring, and revenue analytics
3. **Contact & Deal System**: Convert leads to contacts and create deals linked to specific events
4. **Notification System**: Automated notifications for bookings, group capacity alerts, upcoming events, and participant birthdays
5. **Form Builder**: Visual form creator for website lead capture with automatic CRM integration

The application provides a centralized platform for tourist agency operations with a complete CRM workflow: **Lead → Contact + Deal → Event → Summary Table**.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## System Architecture

### CRM Workflow
The system follows a standard CRM flow optimized for tourist agencies:

1. **Lead Capture**: Leads enter the system via web forms or manual entry
2. **Lead Qualification**: Review and qualify leads, track status changes
3. **Conversion**: Convert qualified leads to Contacts with an associated Deal
4. **Event Assignment**: Link deals to specific tourist events
5. **Event Management**: Track participants, availability, payments via EventSummary page

### Database Schema

**PostgreSQL database with 8 normalized tables:**

#### Core CRM Tables
- **events**: Tourist events/tours with dynamic city lists
  - Fields: name, description, country, cities (array), tourType, startDate, endDate, participantLimit, price
  - Purpose: Manages tour offerings with flexible geography
  
- **contacts**: Customer/tourist records (converted from leads)
  - Fields: name, email, phone, passport, birthDate, leadId (source lead), notes
  - Purpose: Stores participant information
  
- **deals**: Contact-Event relationships with transaction details
  - Fields: contactId, eventId, status (pending/confirmed/cancelled), amount
  - Purpose: Tracks bookings and payments
  
- **leads**: Initial customer inquiries
  - Fields: name, email, phone, status (new/contacted/qualified/converted/lost), source (form/referral/direct), formId
  - Purpose: Lead management and qualification

#### Supporting Tables  
- **cityVisits**: Itinerary details for each city in tour route
  - Fields: id, dealId, city, arrivalDate, arrivalTime, transportType, flightNumber, hotelName, roomType, departureDate, departureTime, departureTransportType, departureFlightNumber
  - Purpose: Track detailed travel itinerary per participant per city
  - Auto-created: When deal is created, cityVisits records are automatically generated for all cities in the event route

- **leadStatusHistory**: Audit trail for lead status changes
  - Fields: leadId, fromStatus, toStatus, reason
  - Purpose: Complete audit history

- **notifications**: In-app notification system
  - Fields: type (booking/group_filled/upcoming_event/birthday), message, eventId, contactId, isRead
  - Purpose: Automated alerts for key events

- **forms**: Form builder for lead generation
  - Fields: name, description, fields (JSONB)
  - Purpose: Website integration for lead capture

- **formSubmissions**: Form submission data
  - Fields: formId, leadId, data (JSONB), ipAddress, userAgent
  - Purpose: Capture and track form submissions

### Key Features

#### 1. Events Module (`/events`)
- **Event List**: Grid of event cards with filtering (country, tour type) and sorting (date, price, availability)
- **Color-Coded Status**: Traffic-light system based on availability
  - 🟢 Green: >30% spots available (secondary)
  - 🟡 Yellow: 10-30% spots available (default)
  - 🔴 Red: <10% spots available or full (destructive)
- **Event Details**: Click-through to Summary table for participant management
- **Statistics**: Total events, upcoming events, nearly-full groups

#### 2. EventSummary Module (`/events/:id/summary`)
- **Dynamic City Columns**: Table automatically generates columns for each city in the tour route (e.g., Beijing, Luoyang, Xi'an, Zhangjiajie, Shanghai)
- **Inline Editing**: All city data cells are editable - click to edit, save on blur/Enter
  - Editable fields per city: Arrival (date/time), Transport (type/flight#), Hotel (name/room type), Departure (date/time)
  - Uses EditableCell component with support for text, date, time, and select inputs
  - Auto-creates cityVisit record if it doesn't exist when editing empty cells
  - Auto-updates existing cityVisit records when editing filled cells
- **Participant Table**: Display contacts, deals, and complete itinerary for all participants
- **Statistics Dashboard**: Total participants, confirmed bookings, pending approvals, revenue
- **Excel Export**: Download participant list with all contact information AND city-specific data (arrival, transport, hotel, departure details for each city)
- **Status Tracking**: Visual status badges for deal states
- **API Integration**: Real-time updates via TanStack Query with optimistic cache invalidation

#### 3. Leads Module (`/leads`)
- **Lead List**: Display all leads with status, source, and timestamps
- **Lead Details**: View complete lead information and history
- **Lead Conversion**: Convert qualified leads to contacts with deal creation
- **Status Management**: Track lead progression through the funnel

#### 4. Notification System
Automated notifications triggered by:
- New deal created for an event
- Event group 90%+ full (participantLimit threshold)
- Event starting within 7 days
- Participant birthdays in current month (highlights related events)

### UI/UX Design

**Frontend Stack**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS

**Navigation Structure** (Shadcn Sidebar):
1. **Лиды (Leads)**: Lead management and qualification
2. **Туры (Events)**: Event list and availability tracking  
3. **Forms**: Form builder for lead generation
4. **Settings**: Application configuration

**Design Principles**:
- Consistent Shadcn component usage (Card, Badge, Button, Table)
- Color-coded status indicators with dark mode support
- Responsive grid layouts for cards and tables
- Loading skeletons and empty states
- Data-testid attributes for all interactive elements

### Backend Architecture

**Stack**: Express.js, TypeScript, PostgreSQL, Drizzle ORM

**API Endpoints**:
```
Events:
  GET    /api/events              - List all events with stats
  GET    /api/events/:id          - Get single event details
  GET    /api/events/:id/participants - Get event deals + contacts + cityVisits
  POST   /api/events              - Create new event
  PATCH  /api/events/:id          - Update event
  DELETE /api/events/:id          - Delete event

Contacts:
  GET    /api/contacts            - List all contacts
  GET    /api/contacts/:id        - Get contact details
  POST   /api/contacts            - Create contact
  PATCH  /api/contacts/:id        - Update contact
  DELETE /api/contacts/:id        - Delete contact

Deals:
  GET    /api/deals               - List all deals
  GET    /api/deals/event/:id     - Get deals for event
  POST   /api/deals               - Create deal
  PATCH  /api/deals/:id           - Update deal status/amount
  DELETE /api/deals/:id           - Delete deal

Leads:
  GET    /api/leads               - List all leads
  GET    /api/leads/:id           - Get lead details
  POST   /api/leads               - Create lead
  PATCH  /api/leads/:id           - Update lead
  DELETE /api/leads/:id           - Delete lead
  GET    /api/leads/:id/history   - Get status history

Notifications:
  GET    /api/notifications       - Get all notifications
  PATCH  /api/notifications/:id/read - Mark as read
  POST   /api/notifications       - Create notification

Forms:
  GET    /api/forms               - List all forms
  POST   /api/forms               - Create form
  POST   /api/forms/:id/submit    - Submit form (auto-creates lead)

CityVisits:
  GET    /api/deals/:dealId/visits - Get all city visits for a deal
  POST   /api/deals/:dealId/visits - Create city visit
  PATCH  /api/visits/:id           - Update city visit
  DELETE /api/visits/:id           - Delete city visit
```

**Data Validation**: Zod schemas from drizzle-zod for type-safe request/response validation

**Storage Layer**: IStorage interface with DatabaseStorage implementation
- All database operations abstracted through storage layer
- Proper error handling and logging
- Foreign key constraints enforced at DB level
- Cascading deletes for referential integrity

### Technical Decisions

#### Geography Design
- **Dynamic Cities**: Events store cities as arrays (text[])  in PostgreSQL
- **Expandable**: Easy to add new countries and cities without schema changes
- **Current Focus**: 5 Chinese cities (Beijing, Luoyang, Xi'an, Zhangjiajie, Shanghai)

#### CRM Flow
- **Lead-First**: All contacts originate from leads (leadId foreign key)
- **Deal-Centric**: Relationships tracked via deals table
- **Event-Based**: All activities organized around tourist events

#### Notification Strategy
- **Backend Automation**: Notifications auto-created on deal creation, status changes
- **90% Threshold**: Group capacity alerts when ≤10% spots remain
- **In-App Only (MVP)**: Email notifications prepared for future enhancement

#### Status Management
- **Lead Status**: new → contacted → qualified → converted/lost
- **Deal Status**: pending → confirmed/cancelled
- **Event Availability**: Calculated from participantLimit - bookedCount

### Development Workflow

**Environment Setup**:
- PostgreSQL database (Neon-backed) via `create_postgresql_database_tool`
- Environment variables: `DATABASE_URL`, `NODE_ENV`
- Schema migration: `npm run db:push` (Drizzle Kit)

**Development Server**: `npm run dev`
- Frontend: Vite dev server
- Backend: Express.js with tsx
- Hot reload enabled for both

**Demo Mode**: `/demo/*` routes provide full functionality without authentication

## Standalone CRM (No Bitrix24)

This application is a **fully standalone CRM system** with NO Bitrix24 integration:

**Removed from Project** (Nov 2025):
- ❌ Bitrix24 SDK script removed from index.html
- ❌ useBitrix24 hook removed (no longer used)
- ❌ EntityIdNotFound component removed
- ❌ AppWithBitrix24 wrapper removed - app runs in standalone mode by default
- ❌ All entity ID detection and Smart Process integration removed
- ❌ All Bitrix24 API calls and synchronization logic removed

**Current Implementation**:
- ✅ Complete standalone CRM with events, contacts, deals, cityVisits
- ✅ Lead management system with full history tracking
- ✅ Notification system for automated alerts
- ✅ Independent event management with dynamic city itineraries
- ✅ Inline editing of participant travel details
- ✅ Excel export with complete itinerary data

**Architecture Benefits**:
- No external dependencies (except PostgreSQL database)
- Full control over data model and workflows
- Simpler deployment and maintenance
- Better performance (no external API calls)
- Direct browser access at `/events`, `/leads`, etc. (no Bitrix24 iframe)

## Recent Updates (November 2025)

**✅ Completed**:
1. **EventSummary with Dynamic City Columns**: Full implementation with inline editing
   - Automatically generates columns for each city in tour route
   - Inline editing for all travel details (arrival, transport, hotel, departure)
   - Auto-creation of cityVisits when deal is created
   - Excel export includes complete itinerary data per city
2. **Bitrix24 Integration Removed**: Application now fully standalone
   - Removed SDK script, hooks, and Bitrix24-specific components
   - Direct browser access without iframe restrictions
   - No entity ID detection required

## Future Enhancements

**Planned Features** (not yet implemented):
1. **Lead Conversion UI**: Visual dialog for Lead → Contact + Deal workflow
2. **Email Notifications**: SMTP integration for automated emails
3. **Role-Based Access**: Admin/Manager/Viewer permissions
4. **Advanced Filtering**: Date ranges, multi-select filters for events/leads
5. **Dashboard Analytics**: Revenue charts, conversion funnels, booking trends
6. **Internationalization**: Complete multi-language support (ru/en/zh)
7. **Mobile App**: React Native companion app for on-the-go management

## External Dependencies
- **React** & **TypeScript**: Frontend framework and language
- **Wouter**: Lightweight client-side routing
- **TanStack Query**: Data fetching, caching, and synchronization
- **Shadcn UI**: Component library built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **Express.js**: Backend web framework
- **Drizzle ORM**: TypeScript ORM for PostgreSQL
- **PostgreSQL**: Relational database (Neon-hosted)
- **xlsx**: Excel file generation
- **date-fns**: Date manipulation and formatting
- **zod**: Schema validation
