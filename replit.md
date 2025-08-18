# License Management Platform (QLM-Style)

## Overview

This is a software license management platform inspired by Quick License Manager (QLM), designed to handle license activation, client management, and multi-tier organizational structures. The system provides a comprehensive solution for managing software licenses with support for different license types (permanent, trial, subscription), device binding, and hierarchical user roles (superadmin, resellers, agents, clients).

The platform features a React-based frontend with a clean dashboard interface and an Express.js backend with RESTful APIs for license operations, client management, and analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**August 18, 2025 - Company Hierarchy Authorization Filter Implementation**
- **RESOLVED: Admin users now see only their company's registrations**
  - Problem: Admin users (like "cmh") were seeing all system registrations instead of only their company's data
  - Solution: Implemented hierarchical filtering in `/api/software/registrazioni` endpoint
  - Logic: Admin users see registrations from their company and all sub-companies in the hierarchy
  - Results: Admin "cmh" (Cmh company) now sees 3 filtered registrations instead of all 20 system registrations
  - Maintains superadmin access to all data while restricting admin visibility appropriately
- **TECHNICAL IMPLEMENTATION:**
  - Enhanced software registrations endpoint with role-based filtering
  - Integrated existing `getCompanyHierarchy()` function for proper parent-child company relationships
  - Added comprehensive logging with emoji debugging for monitoring filter application
  - Filter logic checks both direct license assignments and company name matching
  - Superadmin retains full system visibility while admin roles are properly restricted

**August 18, 2025 - Complete License Expiry Management System FULLY RESOLVED**
- **FINAL FIX: Corrected API endpoint field mapping issue**
  - Problem: GET `/api/licenses` and `/api/licenses/:id` endpoints were querying wrong database field (`expiration_date` instead of `expiry_date`)
  - Solution: Updated both endpoints to correctly map `row.expiry_date` to response `expiryDate` field
  - Frontend now correctly displays license expiry dates in the "Scadenza" column with color coding
- Implemented comprehensive license expiry calculation and management system
- Fixed automatic expiry date calculation for all license types (trial, monthly, yearly subscriptions)
- Added license activation workflow with automatic expiry calculation during software registration classification
- Created web interface with color-coded expiry display (red=expired, orange=expiring soon, green=ok)
- Implemented admin control buttons: "Aggiorna Scadenze" and "Processa Rinnovi" for manual system management
- **RESOLVED: Fixed MySQL datetime format compatibility issue**
  - Problem: Database rejected ISO datetime strings (2025-08-16T17:45:05.948Z format)
  - Solution: Added automatic conversion to MySQL format (2025-08-16 17:45:05) in updateLicense function
  - Both activation dates and expiry dates now correctly stored and displayed
- Successfully tested with pippo2's monthly license - now shows correct activation and 30-day expiry dates
- License classification workflow fully functional with automatic date assignment
- Automatic renewal processing system active and functional (processes licenses expiring within 7 days)
- Status: COMPLETE - All license expiry functionality working correctly with proper database storage and frontend display

**August 18, 2025 - Automatic License Renewal System Implementation**
- **IMPLEMENTED: Complete automatic renewal system for midnight processing**
  - Added comprehensive automatic renewal logic that processes licenses with `renewal_enabled = true`
  - System activates at 00:00 (Europe/Rome timezone) using node-cron scheduler
  - Only processes active subscription licenses (monthly/yearly) that are expired or expiring today
  - Automatically generates renewal transactions with proper pricing and discount application
  - Updates license expiry dates from current date to avoid gaps in coverage
  - Enhanced logging with emojis for better monitoring and debugging
- **TECHNICAL IMPLEMENTATION:**
  - Added `startAutomaticRenewalScheduler()` function with cron job scheduling
  - Improved `processAutomaticRenewals()` to handle only licenses with auto-renewal enabled
  - Integrated scheduler activation in server startup sequence
  - Manual trigger endpoint available at `/api/licenses/process-renewals` for admin testing
  - System respects license type constraints (no renewal for permanent/trial licenses)
- **BUSINESS LOGIC:**
  - Renewal transactions automatically created with same pricing rules as original license
  - License notes updated with renewal date tracking
  - Status maintained as 'attiva' during renewal process
  - Error handling ensures partial failures don't stop entire renewal batch
- Status: ACTIVE - Automatic renewal system operational and scheduled for daily execution

**August 16, 2025 - Database Authentication Fix**
- Fixed critical authentication issue where login worked but data retrieval failed
- Problem: `DatabaseStorage` class was using mock database instead of real MariaDB connection
- Solution: Corrected database references to use actual database connection
- Fixed MySQL boolean compatibility (`is_active = TRUE` → `is_active = 1`)
- Status: All data retrieval now working correctly (users, companies, clients, products, licenses)
- Default login credentials confirmed working: admin/admin123

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based UI using functional components and hooks
- **Styling**: Tailwind CSS with shadcn/ui components for consistent design system
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: JWT token-based authentication with localStorage persistence
- **Form Handling**: React Hook Form with Zod validation schemas

### Backend Architecture
- **Express.js Server**: RESTful API server with middleware for authentication and logging
- **Authentication**: JWT tokens with bcrypt password hashing
- **Database Layer**: Custom database abstraction over MySQL with connection pooling
- **API Structure**: Organized routes for licenses, clients, products, and dashboard analytics
- **Error Handling**: Centralized error middleware with proper HTTP status codes

### Database Design
The system uses a relational database structure with the following key entities:
- **Users**: Authentication and role management (superadmin, rivenditore, agente, cliente)
- **Companies**: Hierarchical organization structure with parent-child relationships
- **Products**: Software products with version and license type support
- **Modules**: Product features/modules for granular licensing
- **Clients**: End-user client management with multi-site/multi-user support
- **Licenses**: Core license records with activation keys and device binding
- **Transactions**: Financial transaction tracking for renewals and purchases
- **Logs**: Activity and access logging for audit trails
- **Agents**: Company representatives/salespeople with roles, territories, and permissions (sub-entity of companies)
- **Testa_Reg_Azienda**: Company registration header with license assignment capability (replaces old software_registrations)
- **Dett_Reg_Azienda**: Device registration details with individual Computer Key authorization per device

### Key Features
- **Multi-tier Role System**: Supports superadmin, resellers, agents, and end clients with appropriate data visibility
- **License Types**: Permanent, trial/demo, and subscription licenses with expiration handling
- **Device Management**: One-to-many relationship between licenses and devices with individual Computer Key authorization
- **Bulk Operations**: Mass license generation and management capabilities
- **Dashboard Analytics**: Real-time statistics and alerts for license expiry, conversions, and revenue
- **Activation System**: Online and offline license activation with device-specific computer key generation
- **Hierarchical Company Tree**: Visual tree structure showing parent-child company relationships with expandable nodes
- **Agent Management**: Company-specific agents as sub-entities with roles and territories
- **Cross-Entity Navigation**: Clickable elements throughout UI enabling seamless navigation between related sections
- **Advanced Filtering**: Real-time search and filtering across all entity types (clients, companies, products, licenses)
- **Software Registration System**: Anonymous endpoint for automatic software registration from client installations using Testa_Reg_Azienda and Dett_Reg_Azienda tables
- **Registration Management**: Admin interface for viewing, filtering, and classifying software registrations
- **Device Authorization**: Classification workflow with individual device authorization through Computer Key assignment
- **Automatic Transaction Generation**: Transactions are automatically created when licenses are assigned with amount, discount, and final amount calculation
- **Payment Management**: Admin/superadmin can generate payment links, mark payments as completed manually, and manage payment status
- **Payment Filtering and Reports**: Filter payments by company/client with CSV report generation and account statement capabilities

### Security Considerations
- JWT-based authentication with configurable secret
- Password hashing using bcrypt
- Role-based access control with middleware protection
- SQL injection protection through parameterized queries
- CORS and security headers implementation

## External Dependencies

### Database
- **MySQL**: Primary database using mysql2 driver with connection pooling
- **Drizzle ORM**: Schema definition and migration management (PostgreSQL dialect configured but using MySQL)

### Authentication & Security
- **bcrypt**: Password hashing and verification
- **jsonwebtoken**: JWT token generation and validation
- **express-session**: Session management capabilities

### Frontend Libraries
- **@radix-ui/***: Comprehensive set of unstyled, accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing library
- **date-fns**: Date manipulation utilities

### Development Tools
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Fast JavaScript bundler for production builds
- **@replit/vite-plugin-***: Replit-specific development enhancements

### Payment Integration Ready
The system is structured to support e-commerce integrations with platforms like Stripe, PayPal, and FastSpring for automated license generation upon purchase.