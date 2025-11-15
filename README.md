# Property Manager Pro

A comprehensive property management SaaS application for real estate investors to manage portfolios, track expenses, monitor cash flow, and analyze performance.

## 🏗️ Built With

- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Express + tRPC 11
- **Database**: MySQL/TiDB with Drizzle ORM
- **Authentication**: Manus OAuth
- **File Storage**: S3
- **UI Components**: shadcn/ui + Radix UI

## ✨ Features

### Property Management
- ✅ Add, edit, and delete properties
- ✅ Track property status (Owned, Sold, Rented, Reserved)
- ✅ Automatic ROI and profit/loss calculations
- ✅ Photo galleries with upload/delete functionality

### Financial Tracking
- ✅ Budget tracking with actual vs budgeted comparison
- ✅ Monthly cash flow management
- ✅ Income and expense categorization
- ✅ Performance metrics and analytics

### Property Detail Views
- **Overview Tab**: Complete property information with edit functionality
- **Photos Tab**: Upload and manage property images
- **Budget Tab**: Track budgets by category with visual progress indicators
- **Cash Flow Tab**: Monthly income/expense tracking with detailed breakdowns
- **Performance Tab**: ROI metrics and cumulative cash flow summaries

### Coming Soon
- 📋 Invoice & expense tracking with file uploads
- 📊 Insights dashboard with portfolio analytics
- 👥 Team management with role-based access control
- 💳 Stripe billing integration
- 🔐 Platform admin dashboard

## 🚀 Getting Started

### Prerequisites
- Node.js 22.x
- pnpm
- MySQL/TiDB database

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
# Copy .env.example to .env and fill in your values

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
property-manager/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── pages/      # Page components
│   │   ├── components/ # Reusable UI components
│   │   ├── lib/        # Utilities and tRPC client
│   │   └── hooks/      # Custom React hooks
├── server/             # Backend Express + tRPC
│   ├── routers.ts      # tRPC API routes
│   ├── db.ts           # Database queries
│   └── _core/          # Framework infrastructure
├── drizzle/            # Database schema and migrations
│   └── schema.ts       # Table definitions
└── shared/             # Shared types and constants
```

## 🗄️ Database Schema

- **users**: User authentication and profiles
- **organizations**: Multi-tenant organization structure
- **team_members**: Team collaboration with roles
- **properties**: Property information and financials
- **property_photos**: Property image galleries
- **invoices**: Expense tracking with file attachments
- **budgets**: Budget planning by category
- **cash_flow**: Monthly income and expense records
- **subscriptions**: Stripe billing integration

## 🔧 Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm db:push` - Push database schema changes
- `pnpm type-check` - Run TypeScript type checking

### Backup to GitHub

After creating checkpoints, run:

```bash
./backup-to-github.sh
```

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Contact the repository owner for contribution guidelines.

---

**Built with ❤️ using Manus AI Development Platform**
