# License Management Platform (QLM-Style)

## Overview
This is a software license management platform inspired by Quick License Manager (QLM), designed to handle license activation, client management, and multi-tier organizational structures. The system provides a comprehensive solution for managing software licenses with support for different license types (permanent, trial, subscription), device binding, and hierarchical user roles (superadmin, resellers, agents, clients). The platform features a React-based frontend with a clean dashboard interface and an Express.js backend with RESTful APIs for license operations, client management, and analytics. The business vision is to provide a robust, scalable license management solution, enabling centralized control over product pricing and consistent license provisioning for companies, with market potential in various software industries.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Modern component-based UI using functional components and hooks.
- **Styling**: Tailwind CSS with shadcn/ui components for a consistent design system.
- **State Management**: TanStack Query for server state management and caching.
- **Routing**: Wouter for lightweight client-side routing.
- **Authentication**: JWT token-based authentication with localStorage persistence.
- **Form Handling**: React Hook Form with Zod validation schemas.

### Backend Architecture
- **Express.js Server**: RESTful API server with middleware for authentication and logging.
- **Authentication**: JWT tokens with bcrypt password hashing.
- **Database Layer**: Custom database abstraction over MySQL with connection pooling.
- **API Structure**: Organized routes for licenses, clients, products, and dashboard analytics.
- **Error Handling**: Centralized error middleware with proper HTTP status codes.

### Database Design
The system uses a relational database structure with key entities including:
- **Users**: Authentication and role management (superadmin, rivenditore, agente, cliente).
- **Companies**: Hierarchical organization structure with parent-child relationships.
- **Products**: Software products with version and license type support, now including product-level pricing (price, discount, license_type, max_users, max_devices, trial_days).
- **Modules**: Product features/modules for granular licensing.
- **Clients**: End-user client management.
- **Licenses**: Core license records with activation keys and device binding, inheriting pricing from products.
- **Transactions**: Financial transaction tracking for renewals and purchases.
- **Logs**: Activity and access logging.
- **Agents**: Company representatives/salespeople.
- **Testa_Reg_Azienda**: Company registration header with license assignment capability.
- **Dett_Reg_Azienda**: Device registration details with individual Computer Key authorization per device.
- **Wallet**: Company wallet system for credit-based license renewals and transactions.

### Key Features
- **Multi-tier Role System**: Supports superadmin, resellers, agents, and end clients with appropriate data visibility, including hierarchical filtering for admin users.
- **License Types**: Permanent, trial/demo, and subscription licenses with comprehensive expiration handling and automatic renewal processing.
- **Device Management**: One-to-many relationship between licenses and devices with individual Computer Key authorization.
- **Centralized Product Pricing**: Pricing configuration is managed at the product level by superadmins, ensuring consistency across all licenses.
- **Wallet System**: Credit-based system for license renewals, integrated with Stripe for recharging, and comprehensive transaction tracking.
- **Automatic Renewal System**: Processes active subscription licenses daily, generating renewal transactions and updating expiry dates.
- **Activation System**: Online and offline license activation with device-specific computer key generation.
- **Hierarchical Company Tree**: Visual tree structure showing parent-child company relationships.
- **Software Registration System**: Anonymous endpoint for automatic software registration from client installations, with an admin interface for viewing, filtering, and classifying registrations and authorizing devices.
- **Payment Management**: Ability to generate payment links, manage payment status, and filter/report payments.

### Security Considerations
- JWT-based authentication with configurable secret.
- Password hashing using bcrypt.
- Role-based access control with middleware protection.
- SQL injection protection through parameterized queries.
- CORS and security headers implementation.

## External Dependencies

### Database
- **MySQL**: Primary database using mysql2 driver with connection pooling.
- **Drizzle ORM**: Used for schema definition and migration management.

### Authentication & Security
- **bcrypt**: Password hashing and verification.
- **jsonwebtoken**: JWT token generation and validation.
- **express-session**: Session management capabilities.

### Payment Gateway
- **Stripe**: Integrated for wallet recharging functionality and payment processing.

### Frontend Libraries
- **@radix-ui/***: Comprehensive set of unstyled, accessible UI primitives.
- **@tanstack/react-query**: Server state management and caching.
- **tailwindcss**: Utility-first CSS framework.
- **wouter**: Lightweight routing library.
- **date-fns**: Date manipulation utilities.

### Development Tools
- **Vite**: Fast build tool and development server.
- **TypeScript**: Type safety across the entire stack.
- **ESBuild**: Fast JavaScript bundler for production builds.
- **@replit/vite-plugin-***: Replit-specific development enhancements.