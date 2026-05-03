# ClearCase - Transparent Legal Services Platform

ClearCase is a comprehensive legal services platform designed to connect clients directly with verified advocates in India. Built with transparency, security, and user experience in mind, ClearCase revolutionizes how legal services are accessed and managed.

## Features

### For Clients

#### Public Features
- **Landing Page**: Dynamic hero section with rotating statistics, feature highlights, and clear call-to-actions
- **Advocate Directory**: Browse and filter verified advocates by specialization, location, and availability
- **Advocate Profiles**: Detailed profiles with experience, success rates, languages, and notable cases
- **Free Consultation Booking**: 30-minute free consultations with selected advocates
- **User Registration**: Secure account creation with phone verification

#### Client Dashboard
- **Case Management**: Track all active and past matters with real-time status updates
- **Document Vault**: Secure storage and access to all case-related documents
- **Secure Messaging**: Encrypted communication with assigned advocates
- **Hearing Notifications**: Automated alerts for upcoming court dates and deadlines
- **Billing Transparency**: Clear invoices with detailed breakdowns and payment tracking

#### Consultation & Sessions
- **Video/Phone Consultations**: Integrated video calling with session timers
- **Live Session Management**: Real-time collaboration during active consultations
- **Session Recording**: Optional recording for future reference (with consent)
- **Post-Session Notes**: Automatic generation of consultation summaries

#### Retainer Agreements
- **Flexible Retainer Plans**: Essential, Standard, and Premium retainer options
- **Ongoing Support**: Continuous legal support for retained clients
- **Priority Scheduling**: Fast-tracked consultations and hearings
- **Dedicated Communication**: Direct access to retained advocate

### For Advocates

#### Advocate Dashboard
- **Request Management**: Review and accept/reject consultation requests
- **Calendar Integration**: Visual calendar with scheduled sessions and hearings
- **Client Management**: Manage retained clients and their matters
- **Earnings Tracking**: Real-time earnings dashboard with detailed breakdowns

#### Practice Management
- **Profile Management**: Comprehensive profile with specializations, experience, and credentials
- **Availability Settings**: Flexible scheduling and availability management
- **Document Management**: Secure storage of case files and templates
- **Performance Analytics**: Success rates, client satisfaction, and practice insights

#### Session Management
- **Live Sessions**: Professional video interface for client consultations
- **Session Notes**: Private notes and case documentation
- **Follow-up Tasks**: Automated task creation from session discussions
- **Client Feedback**: Post-session feedback collection

### For Internal Staff (CRM)

#### Management Dashboard
- **Firm Overview**: Key metrics, active matters, and financial summaries
- **Team Management**: Advocate assignments, performance tracking, and scheduling
- **Client Relationship Management**: Comprehensive client profiles and history
- **Financial Management**: Invoice generation, payment tracking, and financial reporting

#### Matter Management
- **Case Lifecycle Tracking**: From intake to resolution with detailed status updates
- **Document Management**: Centralized document storage with version control
- **Hearing Management**: Court date tracking, notifications, and outcome recording
- **Conflict Checking**: Automated conflict of interest detection

#### Administrative Features
- **User Management**: Role-based access control for all staff types
- **Audit Logging**: Comprehensive activity logging for compliance
- **Notification System**: Automated alerts for important events
- **Reporting**: Advanced analytics and custom report generation

## Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **React Router**: Client-side routing for single-page application
- **CSS Modules**: Scoped styling with custom design system
- **Responsive Design**: Mobile-first approach with cross-device compatibility

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Express.js**: Web application framework
- **SQLite**: Lightweight database with better-sqlite3
- **JWT Authentication**: Secure token-based authentication
- **bcrypt**: Password hashing for security

### Security & Compliance
- **DPDP Act 2023 Compliance**: Data protection and privacy compliance
- **End-to-end Encryption**: Secure communication channels
- **Role-based Access Control**: Granular permissions system
- **Audit Logging**: Comprehensive activity tracking

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/clearcase-legal-platform.git
   cd clearcase-legal-platform
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Setup database**
   ```bash
   cd ../server
   npm run setup
   ```

5. **Start the development servers**

   Terminal 1 (Server):
   ```bash
   cd server
   npm start
   ```

   Terminal 2 (Client):
   ```bash
   cd client
   npm start
   ```

6. **Access the application**
   - Client app: http://localhost:3000
   - Server API: http://localhost:5000

### Default Users

After setup, the following test accounts are available:

**Management**
- Managing Partner: prashanth@clearcase.in / password123

**Advocates**
- Senior Advocate: meera@clearcase.in / password123
- Junior Advocate: suresh@clearcase.in / password123

**Staff**
- Billing: billing@clearcase.in / password123
- Reception: reception@clearcase.in / password123

**Clients**
- Client: rahul@example.com / password123
- Client: sneha@example.com / password123

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Client Endpoints
- `GET /api/matters` - Get user's matters
- `GET /api/matters/:id` - Get specific matter details
- `GET /api/documents` - Get user's documents
- `POST /api/messages` - Send message

### Advocate Endpoints
- `GET /api/advocate/requests` - Get consultation requests
- `POST /api/advocate/requests/:id/respond` - Respond to request
- `GET /api/advocate/calendar` - Get calendar events

### CRM Endpoints
- `GET /api/crm/matters` - Get all matters
- `GET /api/crm/clients` - Get all clients
- `GET /api/crm/team` - Get team members
- `GET /api/crm/finance` - Get financial data

## Database Schema

The application uses SQLite with the following main tables:
- `users` - User accounts and roles
- `clients` - Client information
- `matters` - Legal matters/cases
- `hearings` - Court hearing records
- `documents` - File storage metadata
- `invoices` - Billing and payment records
- `messages` - Secure messaging
- `consultations` - Consultation bookings

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@clearcase.in
- Phone: +91 40 4567 8900
- Documentation: [Internal Wiki]

## Roadmap

### Phase 1 (Current)
- ✅ Client registration and authentication
- ✅ Advocate directory and profiles
- ✅ Basic consultation booking
- ✅ CRM for internal management

### Phase 2 (Upcoming)
- 🔄 Video consultation integration
- 🔄 Advanced document management
- 🔄 Mobile app development
- 🔄 AI-powered legal research

### Phase 3 (Future)
- 📋 Court integration APIs
- 📋 Multi-language support
- 📋 Advanced analytics
- 📋 Third-party integrations

---

**ClearCase** - Making legal services transparent, accessible, and efficient for everyone in India.