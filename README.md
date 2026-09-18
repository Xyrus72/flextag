# FlexTag — Creator Cashback Marketplace

A full-stack platform that connects creators with brands through verified content and guaranteed cashback. Creators shop, post verified content, and earn payouts. Brands run campaigns with spend control and fraud protection.

## Tech Stack

- **Frontend**: React 19 + Vite + Tailwind CSS 4 + Framer Motion
  - Dark theme with purple/cyan gradient accents
  - Real-time notifications via Socket.IO
  - PWA manifest and service worker
  - Mobile-first responsive design (375px–1920px)
  
- **Backend**: Node.js + Express 5 + MongoDB Atlas + Mongoose
  - RESTful API on port 1643
  - Session-based auth (express-session + connect-mongo)
  - Socket.IO for real-time chat and notifications
  - Automated post verification against Instagram Graph API + HikerAPI

- **Services**:
  - SSLCommerz for checkout payments
  - Nodemailer for transactional email
  - Sentry for error tracking
  - Express rate limiting and fraud scoring

- **Deployment**:
  - Frontend: Vercel
  - Backend: Render
  - Database: MongoDB Atlas

## Key Features

### Creator Experience
- **Account & Audit**: Email OTP sign-up, Instagram account health score, fake-follower detection
- **Catalog & Orders**: Browse filtered product catalog (category, price, cashback rate), instant checkout, track orders
- **Post Verification**: Auto-check Instagram posts for required hashtags, brand mentions, posting account, and retention
- **Wallet**: View earnings, pending escrow, available balance; request payouts to bKash/Nagad/Rocket; top up with card payment
- **Messaging**: Real-time chat with brands and support team
- **Ratings**: Rate brands on product quality, shipping speed, support responsiveness

### Brand Experience
- **Campaign Management**: Publish products with price, cashback %, stock, budget cap, creator eligibility criteria, required hashtags
- **Analytics**: Real-time campaign metrics—reach, engagement, cost per engagement, ROI
- **Order Fulfillment**: Track creator shipping details, move orders through processing → shipped → delivered
- **Brand Wallet**: Fund campaigns via SSLCommerz or bank transfer; view spending and ledger

### Admin Tools
- **Post Review**: Manually audit and approve or reject creator posts
- **Dispute Resolution**: Inspect disputes, approve refunds, reconcile transactions
- **Fraud Review**: Score creator accounts, flag rings, view and block suspicious activity
- **Payout Queue**: Batch-send approved payouts or manually manage individual requests
- **Platform Chat**: Participate in creator-brand conversations
- **Settings**: Configure minimum withdrawal, commission rates, platform announcements

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas cluster with connection string
- Environment variables (see `.env` templates in backend/ and frontend/)

### Installation

```bash
# Clone the repo
git clone https://github.com/Xyrus72/flextag.git
cd flextag

# Backend setup
cd backend
npm install
# Create .env file with MONGO_URI, JWT_SECRET, SSLCOMMERZ credentials, etc.
npm start  # runs on http://localhost:1643

# Frontend setup (new terminal)
cd frontend
npm install
# Create .env with VITE_API_URL=http://localhost:1643
npm run dev  # runs on http://localhost:5173
```

### Environment Variables

**Backend** (`backend/.env`):
```
MONGO_URI=mongodb+srv://...
PORT=1643
SESSION_SECRET=your-session-secret
SSLCOMMERZ_STORE_ID=...
SSLCOMMERZ_STORE_PASSWORD=...
MIN_WITHDRAWAL=500
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
HIKERAPI_KEY=...
GRAPH_API_TOKEN=...
```

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:1643
```

## Folder Structure

```
flextag/
├── backend/
│   ├── routes/       # API endpoints (auth, products, checkout, messages, etc.)
│   ├── models/       # Mongoose schemas
│   ├── services/     # Business logic (fraud, payouts, instagram, ai)
│   ├── middleware/   # Auth, error handling
│   ├── jobs/         # Background tasks (payout queue, retention check)
│   └── index.js      # Express server entry point
├── frontend/
│   ├── src/
│   │   ├── pages/    # Role-based layouts (creator, brand, admin)
│   │   ├── components/
│   │   ├── context/  # Auth, Socket, Theme
│   │   ├── services/ # API client
│   │   └── i18n/     # English + Bangla strings
│   └── vite.config.js
└── README.md
```

## API Overview

### Authentication
- `POST /api/auth/register` — Sign up with email OTP
- `POST /api/auth/login` — Log in
- `GET /api/auth/me` — Current user + balance

### Products & Checkout
- `GET /api/products?category=Beauty&q=lipstick` — Browse catalog with filters
- `POST /api/checkout/init` — Start SSLCommerz session
- `POST /api/checkout/success` — Confirm order after payment

### Creator Wallet
- `GET /api/transactions` — Balances and transaction history
- `POST /api/transactions/withdraw` — Request payout
- `POST /api/transactions/topup` — Add funds to wallet

### Post Verification
- `POST /api/posts` — Submit a post URL
- `GET /api/posts/showcase` — Campaign analytics

### Messaging (Socket.IO)
- `joinConversation` — Enter a conversation room
- `sendMessage` — Send a message
- `receiveMessage` — Listen for incoming messages

## Development

### Code Style
- No ESLint comments or suppressions in submitted code
- Destructured imports, early returns
- Async/await for asynchronous operations
- Consistent naming: camelCase for variables, PascalCase for classes/components

### Testing
```bash
npm run test          # Run test suite
npm run lint          # Check for lint errors
npm run build         # Build for production
```

### Performance
- **Lighthouse**: 67 (performance) / 95 (accessibility) / 96 (best practices) / 100 (SEO)
- **Core Web Vitals**: LCP 1.1s, CLS 0.01, INP 48ms
- **API Response**: Gzip-compressed, average 12KB payloads

## Security

- Session-based authentication with httpOnly cookies
- Fraud detection: shared payout accounts, duplicate handles, referral rings
- Instagram account verification via Graph API + HikerAPI
- Rate limiting on sensitive endpoints (AI calls, login attempts)
- HTTPS in production (Vercel + Render)
- Environment variables for all secrets

## Deployment

**Frontend**:
```bash
# Vercel auto-deploys from feature/instagram-intelligence
# See frontend/vercel.json for config
```

**Backend**:
```bash
# Render auto-deploys from feature/instagram-intelligence
# See render.yaml for config
```

## Known Issues & Roadmap

- Brand wallet and advanced referral features on separate branches
- Deadline reminders and retention violation notifications not yet shipped
- Email notifications use SMTP (not Gmail API)
- Admin can only reply to conversations they're already in

## License

MIT

## Contact

Built for **BRAC University CSE471 System Analysis & Design** project (Group 04, Section 10, Summer 2026).
