# License Management Platform (QLM-Style)

A comprehensive enterprise-grade software license management platform built with React, TypeScript, and Node.js. Inspired by Quick License Manager (QLM), this system provides complete license lifecycle management with advanced features for software companies and resellers.

## 🚀 Features

### Core License Management
- **Multi-tier License Types**: Permanent, trial/demo, and subscription licenses
- **Device Binding**: One-to-many device relationships with Computer Key authorization
- **Activation System**: Online and offline license activation support
- **Automatic Renewals**: Intelligent subscription renewal processing
- **Expiration Management**: Comprehensive license expiry handling

### User & Organization Management
- **Role-based Access Control**: Superadmin, resellers, agents, and end clients
- **Hierarchical Organizations**: Parent-child company relationships
- **Company Tree Structure**: Visual organization hierarchy management
- **User Management**: Complete user lifecycle with role assignments

### Financial Management
- **Wallet System**: Credit-based license renewals and transactions
- **Stripe Integration**: Secure payment processing for wallet recharging
- **Transaction Tracking**: Comprehensive financial transaction logging
- **Payment Management**: Generate payment links and manage payment status

### Software Registration
- **Anonymous Registration**: Automatic software registration from client installations
- **Admin Interface**: View, filter, and classify software registrations
- **Device Authorization**: Individual Computer Key authorization per device
- **Registration Analytics**: Track software deployment across organizations

### Dashboard & Analytics
- **Real-time Metrics**: Active licenses, revenue, and usage statistics
- **Advanced Filtering**: Multi-criteria license and client filtering
- **Activity Logging**: Comprehensive audit trails
- **Reporting Tools**: Generate reports for compliance and analysis

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** with shadcn/ui components
- **TanStack Query** for server state management
- **Wouter** for lightweight routing
- **React Hook Form** with Zod validation

### Backend
- **Express.js** with TypeScript
- **MySQL** with connection pooling
- **JWT** authentication with bcrypt
- **Stripe** payment integration
- **Node-cron** for automated tasks

### Development Tools
- **Vite** for fast development and building
- **Drizzle ORM** for database schema management
- **ESBuild** for production optimization

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/license-management-platform.git
   cd license-management-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p
   CREATE DATABASE license_management;
   ```

4. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@localhost:3306/dbname` |
| `JWT_SECRET` | Secret for JWT token signing | `your_secure_random_string` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key for payments | - |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | - |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |

## 🎯 Usage

### Initial Setup

1. **Access the application** at `http://localhost:5000`
2. **Default admin credentials**:
   - Username: `admin`
   - Password: `admin123`
3. **Change default password** immediately after first login

### Basic Workflow

1. **Create Organizations**: Set up company hierarchy
2. **Add Products**: Define software products with pricing
3. **Create Licenses**: Generate licenses for clients
4. **Manage Users**: Add resellers, agents, and clients
5. **Monitor Activity**: Track license usage and renewals

## 🏗️ Architecture

### Database Schema
- **Users**: Authentication and role management
- **Companies**: Hierarchical organization structure
- **Products**: Software products with pricing configuration
- **Licenses**: Core license records with device binding
- **Transactions**: Financial transaction tracking
- **Registrations**: Software installation tracking

### Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- SQL injection protection
- CORS and security headers

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate database migrations
npm run db:migrate   # Run database migrations
```

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Comprehensive error handling

## 📈 Deployment

### Production Checklist
- [ ] Set secure `JWT_SECRET`
- [ ] Configure production database
- [ ] Set up SSL certificates
- [ ] Configure environment variables
- [ ] Set up monitoring and logging
- [ ] Configure backup strategies

### Deployment Options
- **Replit**: Native deployment support
- **Docker**: Container-based deployment
- **VPS**: Traditional server deployment
- **Cloud Platforms**: AWS, Azure, GCP

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Quick License Manager (QLM)
- Built with love for the software licensing community
- Thanks to all contributors and testers

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the FAQ section

---

**Made with ❤️ for software license management**