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
A normalized PostgreSQL schema underpins the system, supporting core CRM entities such as `events`, `contacts`, `deals`, `leads`, and `groups`. Additional tables manage `leadTourists`, `users`, `cityVisits`, `leadStatusHistory`, `notifications`, `forms`, `formSubmissions`, and `systemDictionaries`.

### Key Features
-   **Events Module**: Manages tourist events, offering filtering, sorting, participant tracking, and comprehensive editing capabilities. Includes inline editable itinerary details and Excel export. Participant counting specifically includes only "Подтвержден" (converted) leads. Events can be archived, copied, and deleted (admin only). **Summary Table**: Includes "Remaining Payment" column, "Limited Route" indicator with city tooltip, and footer row with total remaining payments (by currency) and room type counts per city (e.g., "5 Twin, 2 Single, 1 Double").
-   **Participant Tourist Editing**: Enables direct editing of tourist data with bidirectional synchronization between `leadTourists` and `contacts`. Features visual indicators for tourist types and data completeness, smart column merging for families/mini-groups, file uploads for passport scans, and role-based field visibility.
-   **Leads Module**: Provides comprehensive lead management with dual table/Kanban views. Features include automatic conversion upon tour assignment, postponement with follow-up, advanced filtering, and automatic color tagging. Tour cost is dynamically calculated and updated. Automatic participant addition intelligently converts tourists to contacts and deals based on event assignment changes. **City Selection**: When a tour is assigned, city checkboxes appear allowing managers to specify limited routes (not all tour cities).
-   **Group Management**: Supports "Families" (shared services) and "Mini-groups" (shared hotel only), with automated creation for families and manual for mini-groups.
-   **Notification System**: Delivers automated in-app notifications for bookings, group capacity, upcoming events, and participant birthdays.
-   **Forms Module**: A lead generation system with a form builder, public pages, and submission tracking that automatically creates leads. **Admin-Configurable Fields**: Administrators can configure select field options and enable multi-select functionality. Multi-select fields render as checkboxes and submit as arrays.
-   **Booking Module**: A public-facing reservation system allowing customers to view, filter, and book tours, automatically generating leads linked to specific events.
-   **Color Indication System**: Allows manual color tagging for events and leads, with automatic status-based highlighting for leads.
-   **Authentication & User Management**: Implements session-based authentication with Passport.js and bcrypt, featuring role-based access control (admin/manager/viewer) for secure login, route protection, and restricted content access.
-   **System Dictionaries**: Centralized management of lookup tables (lead sources, statuses, countries, accommodation types, currencies) via Settings page. Admin-only CRUD operations for maintaining system-wide configuration values. **Multi-Select Support**: Dictionary types can be configured with `isMultiple` toggle - when enabled, form fields render as checkbox groups instead of dropdowns. Values are stored as comma-separated strings for backward compatibility. Affected fields: clientCategory, source, roomType, hotelCategory.

### Tourist Personal Cabinet (Личный кабинет туриста)
A public-facing portal for tourists to manage their trip information and interact with the agency.

#### Portal Features
-   **My Tours**: View upcoming and past trips with detailed information
-   **Trip Program**: Day-by-day itinerary with cities and activities
-   **Payment Tracking**: View total cost, advance payment, and remaining balance
-   **Documents**: Access to important travel documents
-   **Personal Data**: View/update personal information
-   **Companions**: See other travelers in the group
-   **Checklists**: Interactive to-do lists for before, during, and after the trip
-   **Reviews**: Submit ratings and feedback after completing trips
-   **Tour Recommendations**: Browse upcoming tours for future bookings
-   **Chat with Manager**: Real-time messaging with agency managers

#### Tourist Portal Authentication
-   **Login Flow**: Email/phone → Verification code → Access portal
-   **Session Management**: Token-based authentication stored in localStorage
-   **Security**: Code expires in 10 minutes, session expires in 24 hours

#### Portal API Endpoints
-   `POST /api/portal/auth/request-code` - Request verification code via email/phone
-   `POST /api/portal/auth/verify-code` - Verify code and get session token
-   `GET /api/portal/me` - Get all tourist data (requires Bearer token)
-   `POST /api/portal/checklist/toggle` - Toggle checklist item completion
-   `POST /api/portal/reviews` - Submit trip review
-   `GET /api/portal/messages` - Get chat message history
-   `POST /api/portal/messages` - Send message to manager

#### Admin Portal Management
Accessible at `/portal-admin` for CRM admins:
-   **Checklist Templates**: Create/edit/delete checklist templates by country, tour type, and phase (before/during/after)
-   **Reviews Dashboard**: View all tourist reviews with ratings
-   **NPS Analytics**: Track Net Promoter Score and customer satisfaction

#### Admin API Endpoints (requireAdmin)
-   `GET /api/checklist-templates` - List all templates with items
-   `POST /api/checklist-templates` - Create new template
-   `DELETE /api/checklist-templates/:id` - Delete template
-   `GET /api/reviews` - List all reviews with contact/event details

#### Database Tables
-   `tourist_sessions` - Portal login sessions with verification codes
-   `checklist_templates` - Template definitions (name, country, tourType, phase)
-   `checklist_template_items` - Individual checklist items
-   `tourist_checklist_progress` - Tourist's progress on checklists
-   `reviews` - NPS ratings and comments from tourists
-   `tourist_notifications` - Portal notifications for tourists
-   `portal_messages` - Chat messages between tourists and managers

#### Frontend Routes
-   `/portal` - Tourist login page (public)
-   `/portal/dashboard` - Tourist dashboard (requires tourist token)
-   `/portal-admin` - Admin management (requires CRM admin auth)

### WordPress Integration
The system provides API endpoints for WordPress integration:
-   **WordPress API Endpoints** (secured with API key `WORDPRESS_API_KEY`):
    -   `POST /api/wordpress/leads` - Creates leads from WordPress (requires API key)
    -   `PATCH /api/wordpress/leads/:id/payment-status` - Updates lead payment status (requires API key)
    -   `POST /api/public/events/sync` - Syncs tours from WordPress to CRM events

### Booking Widget Integration
Public API endpoints for booking widget (no authentication required):
-   `POST /api/booking/leads` - Creates lead from booking widget
    -   Required: `firstName`, `lastName`
    -   Optional: `phone`, `email`, `tourName`, `tourDate`, `tourUrl`, `tourCost`, `participants`, `bookingId`, `paymentMethod`
    -   Auto-matches event by `tourUrl` → `event.websiteUrl`
-   `PATCH /api/booking/leads/:id/payment-status` - Updates payment status after T-Bank callback
    -   `paymentStatus`: "paid" → lead status becomes "qualified"
    -   `paymentStatus`: "failed" → lead status becomes "contacted"
    -   Optional: `paymentId`, `amountPaid`, `transactionDate`
-   **Sync Logs**: Admin-only view in Settings > Синхронизация to monitor all sync operations
-   **Database Tables**: `syncLogs` (operation history), `syncSettings` (automatic sync configuration), `events.externalId` (WordPress post ID tracking)
-   **Automatic Sync**: Configurable interval (1h to 48h) for automatic tour synchronization

### Импорт туров с сайта (Website Scraper)
Система автоматического импорта туров с сайта chinaunique.ru.

#### Источник данных
-   **URL**: `https://chinaunique.ru/tours/` - страница со списком туров
-   **Пагинация**: Автоматически обрабатывает все страницы каталога
-   **Scraper**: `server/websiteScraper.ts`

#### Извлекаемые данные
Для каждого тура извлекается:
-   Название тура (из `<h1 class="h1-alt">`)
-   Цена в CNY (из атрибута `data-base-price`)
-   Тип тура: групповой/индивидуальный/экскурсия (из `<div class="tour-tag">`)
-   Продолжительность в днях (из названия, например "7 дней")
-   Города маршрута (из блоков "Проживание:")
-   Даты проведения (из секции "Даты ближайших туров")
-   Описание тура
-   URL страницы тура

#### Парсинг дат
Поддерживаемые форматы русских дат:
-   `16-22 марта 2026` — диапазон в одном месяце
-   `26 мая-1 июня 2026` — диапазон через месяцы
-   `с 5 по 12 мая 2026` — формат "с X по Y"
-   `16 марта – 22 марта 2026` — полные даты
-   `5 апреля 2026` — однодневное событие

#### Логика синхронизации
Каждая комбинация тур + дата создаёт отдельное событие в CRM:
1.  **ExternalId**: Формат `wp_{slug}_{startDate}` для уникальной идентификации
2.  **Создание**: Новые туры/даты создаются как события
3.  **Обновление**: Существующие события обновляются (отслеживаются изменения цен)
4.  **Архивация**: Туры, удалённые с сайта, автоматически архивируются

#### Система предупреждений
При парсинге генерируются предупреждения:
-   `no_dates` — Тур без запланированных дат
-   `no_description` — Отсутствует описание тура
-   `no_cities` — Города маршрута не определены

Предупреждения отображаются в журнале с кликабельными ссылками на сайт.

#### Настройки автоимпорта
-   **Переключатель**: Вкл/выкл автоматического импорта
-   **Интервал**: 1ч, 6ч, 12ч, 24ч, 48ч
-   **Хранение**: Таблица `syncSettings`, ключ `tour_sync`

#### API и UI
-   **Endpoint**: `POST /api/sync/scrape-website` (только админ)
-   **UI**: Настройки > Синхронизация > кнопка "Импорт с сайта"
-   **Журнал**: Раскрываемые записи с детализацией по турам, ценам, предупреждениям

### Technical Decisions
The system employs dynamic geography for event city tracking, maintains a standalone design without external CRM integrations, uses a backend-automated notification strategy, and features a refined lead data separation architecture. Initial tourist entries are auto-created, and comprehensive tourist data completeness is indicated.

## External Dependencies
-   **Frontend**: React, TypeScript, Wouter, TanStack Query, Shadcn UI, Tailwind CSS
-   **Backend**: Express.js, TypeScript, Drizzle ORM, Passport.js, bcrypt
-   **Database**: PostgreSQL (Neon-hosted)
-   **Utilities**: xlsx, date-fns, zod
-   **Session Management**: express-session