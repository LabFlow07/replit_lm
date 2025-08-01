# License Management Platform (QLM-Style)

## Overview

This is a software license management platform inspired by Quick License Manager (QLM), designed to handle license activation, client management, and multi-tier organizational structures. The system provides a comprehensive solution for managing software licenses with support for different license types (permanent, trial, subscription), device binding, and hierarchical user roles (superadmin, resellers, agents, clients).

The platform features a React-based frontend with a clean dashboard interface and an Express.js backend with RESTful APIs for license operations, client management, and analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

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

### Key Features
- **Multi-tier Role System**: Supports superadmin, resellers, agents, and end clients with appropriate data visibility
- **License Types**: Permanent, trial/demo, and subscription licenses with expiration handling
- **Device Binding**: Computer-specific license activation with offline/online support
- **Bulk Operations**: Mass license generation and management capabilities
- **Dashboard Analytics**: Real-time statistics and alerts for license expiry, conversions, and revenue
- **Activation System**: Online and offline license activation with computer key generation
- **Hierarchical Company Tree**: Visual tree structure showing parent-child company relationships with expandable nodes
- **Agent Management**: Company-specific agents as sub-entities with roles and territories
- **Cross-Entity Navigation**: Clickable elements throughout UI enabling seamless navigation between related sections
- **Advanced Filtering**: Real-time search and filtering across all entity types (clients, companies, products, licenses)

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