# Proman - Property Management Dashboard

A modern, minimalist property management dashboard built with Next.js, featuring a sleek Linear/Vercel-inspired dark mode aesthetic.

![Dashboard Overview](https://github.com/user-attachments/assets/abbb97bb-c0ae-44e4-801d-c9d749b015c9)

## 🚀 Features

### **Dashboard Overview**
- Real-time metrics for properties, tenants, revenue, and occupancy
- Quick glance at recent payments and property status
- Trend indicators with year-over-year comparisons

### **Properties Management**
- High-resolution card-based property grid
- Property details including bedrooms, bathrooms, and rent
- Status tracking (Occupied, Vacant, Maintenance)
- Location and property type information

### **Tenant CRM**
- Comprehensive tenant relationship management
- Payment status badges (Paid, Overdue, Pending)
- Contact information and lease period tracking
- Monthly rent overview

### **Financial Analytics**
- Interactive charts using Recharts
- Revenue vs Expenses trend analysis
- Property performance comparison
- Summary metrics with growth indicators

### **PDF Receipt Generation**
- One-click PDF generation using jsPDF
- Professional receipt layout with all payment details
- Support for different payment types (Rent, Deposit, Maintenance)
- Instant download functionality

### **Collapsible Sidebar**
- Smooth transition animations
- Icon-based navigation when collapsed
- Active state indicators
- Responsive design

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript)
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI (Zinc theme)
- **Icons**: Lucide React
- **Charts**: Recharts
- **PDF Generation**: jsPDF
- **Utilities**: clsx, tailwind-merge, class-variance-authority

## 📦 Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## 🏗️ Build for Production

```bash
# Create a production build
npm run build

# Start the production server
npm start
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🎨 Design

The dashboard features a modern dark mode design inspired by Linear and Vercel, with:
- Zinc color palette for sophisticated dark mode
- High contrast text for excellent readability
- Smooth transitions and animations
- Responsive layout for all screen sizes
- Clean, minimalist interface

## 📁 Project Structure

```
Proman/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles and theme
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main dashboard page
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── separator.tsx
│   ├── sidebar.tsx        # Navigation sidebar
│   ├── overview-view.tsx  # Dashboard overview
│   ├── properties-view.tsx # Properties grid
│   ├── tenants-view.tsx   # Tenant CRM
│   ├── financials-view.tsx # Financial charts
│   └── receipts-view.tsx  # PDF receipts
├── lib/                   # Utility functions
│   └── utils.ts
└── public/               # Static assets
```

## 🌟 Dashboard Views

1. **Overview** - Get a quick snapshot of your property management business
2. **Properties** - Manage your property portfolio with detailed cards
3. **Tenants** - Track tenant information and payment status
4. **Financials** - Visualize revenue, expenses, and property performance
5. **Receipts** - Generate and download professional PDF receipts

## 📸 Screenshots

### Properties Grid
![Properties Grid](https://github.com/user-attachments/assets/59f27046-617b-4a89-9f52-e5dec3ef6882)

### Tenant CRM
![Tenant CRM](https://github.com/user-attachments/assets/8b3f0fa6-7158-4975-9c25-1ec8360cf0d6)

### Financial Analytics
![Financials](https://github.com/user-attachments/assets/0b31c824-2cee-4fa6-ad2c-7873cba6dbcd)

### Receipts & PDF Generation
![Receipts](https://github.com/user-attachments/assets/c8caee98-4ddf-47dc-a326-6b48ee97e499)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
