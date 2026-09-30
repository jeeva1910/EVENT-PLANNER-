# EventHub – Event Planning & Management Platform (MERN Stack)

EventHub is a production-ready, centralized event management and discovery platform connecting organizers, attendees, and platform administrators. Built on the **MERN** architecture (**MongoDB**, **Express.js**, **React 19**, **Node.js 22**, and **TypeScript**) with **Mongoose ODM**, **Nodemailer**, and **Tailwind CSS**.

---

## 🌟 Core Capabilities & Features

### 1. Security & Multi-Role Authorization
- **Public Registration Isolation**: Public signup strictly limits account creation to `attendee` or `organizer`. Admin accounts cannot be created via public signups.
- **JWT Protection**: Dynamic token generation with account status checking (rejects suspended accounts) and failsafe validation.
- **Role Elevation Defense**: User profile updates (`PUT /api/users/profile`) strictly sanitize fields to prevent privilege escalation.
- **Administrative Guarding**: Admin-only operations (role changes, account suspension, category deletion, live database connection) require verified `admin` role tokens.

### 2. Multi-Collection MongoDB & Mongoose Integration
- Uses **Mongoose Models** (`UserModel`, `EventModel`, `RegistrationModel`, `CategoryModel`, `NotificationModel`, `FeedbackModel`, `ReportModel`, `TeamInvitationModel`) as the authoritative persistent data source.
- Health endpoint (`/api/health` and `/api/system/db-status`) accurately reports active data source (`MongoDB Atlas` vs `Local Resilient Store`).

### 3. Concurrency-Safe Ticketing, Capacity & Waitlists
- **Anti-Overbooking**: Capacity is verified upon registration to prevent race conditions.
- **Priority Waitlisting**: When capacity is reached, attendees are automatically queued on a priority waitlist with position tracking (`#1`, `#2`, etc.).
- **Automatic FIFO Promotion**: When an attendee cancels their ticket, the first eligible waitlisted participant is atomically promoted with instant notification and QR pass generation.
- **Duplicate Check-in Prevention**: QR scanner verifies attendance with duplicate check-in defense.

### 4. Team Registrations & Email Invitations
- Support for team-based events (hackathons, tournaments) with minimum and maximum team size enforcement.
- Generates cryptographically secure invitation tokens with 48-hour expiration.
- Real-time email dispatch via Nodemailer / Gmail SMTP for team invitations, acceptance alerts, decline updates, and registration confirmations.
- Team leaders can resend invitations or manage rosters from the Attendee Dashboard.

### 5. Cloudinary Image Management
- Secure server-side image upload endpoint (`POST /api/upload`) using backend credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
- Validates file MIME types (JPEG, PNG, WEBP, GIF, SVG) and enforces a 5MB size limit without exposing API secrets to the frontend.

---

## 🔑 Quick Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Attendee** | `attendee@eventhub.com` | `Attendee123!` |
| **Organizer** | `organizer@eventhub.com` | `Organizer123!` |
| **Admin** | `admin@eventhub.com` | `Admin123!` |

---

## ⚙️ Environment Configuration

### 1. Create Your Local `.env` File
Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```

Your `.env` file should contain:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=replace_with_a_long_random_secret
ALLOW_LOCAL_FALLBACK=true

# MongoDB Atlas
MONGODB_URI=your_mongodb_atlas_connection_string

# Cloudinary (Optional for custom poster & avatar uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Google Maps (Optional for interactive transit map view)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_16_character_app_password
SMTP_FROM=EventHub <your_gmail_address@gmail.com>

# Application Base URL (for invitation email links)
APP_BASE_URL=http://localhost:5173
```

> **Security Note:** Never commit `.env` or any file containing real passwords or API keys to version control. The `.gitignore` file is configured to exclude `.env*` except `.env.example`.

---

## 📧 How to Configure Gmail SMTP

To enable live email delivery for team invitations and registration tickets:

### Step 1: Generate a Google App Password
1. Go to your **Google Account** settings: [https://myaccount.google.com/security](https://myaccount.google.com/security).
2. Enable **2-Step Verification** on your Google account if not already enabled.
3. Search for **App passwords** (or go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
4. Enter an app name (e.g. `EventHub`) and click **Create**.
5. Google will generate a **16-character password** (e.g. `abcd efgh ijkl mnop`).
6. Copy this 16-character string.

### Step 2: Set the SMTP Environment Variables
In your `.env` file:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=youraccount@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM=EventHub <youraccount@gmail.com>
APP_BASE_URL=http://localhost:5173
```

### Step 3: Test SMTP Connection & Authentication
You can test your SMTP configuration directly through the backend diagnostic endpoint:

1. **Verify Connection & Handshake:**
   ```bash
   curl -s http://localhost:3000/api/system/email-verify
   ```
   A successful connection returns:
   ```json
   {
     "success": true,
     "stage": "authentication",
     "message": "SMTP connection and authentication verified successfully with mail server."
   }
   ```

2. **Send a Diagnostic Test Email (Admin / Authenticated):**
   ```bash
   curl -X POST http://localhost:3000/api/system/email-test \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
     -d '{"to": "your_test_email@gmail.com"}'
   ```
   > *Note:* SMTP acceptance confirms that the mail server accepted the message. Actual delivery into the recipient inbox depends on mail provider routing.

---

## 🍃 How to Obtain a MongoDB Atlas Connection String

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create or log in to your account.
2. Create a free shared cluster (M0).
3. In **Database Access**, create a database user with username and a secure password.
4. In **Network Access**, add an IP Access entry (use `0.0.0.0/0` for cloud dev or your current IP).
5. In **Database** -> **Connect** -> **Drivers**, copy the connection string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/eventhub?retryWrites=true&w=majority
   ```
6. Replace `<username>` and `<password>` with your actual database credentials.
7. Set `MONGODB_URI` in `.env`.

---

## ☁️ How to Configure Cloudinary

1. Create a free account at [Cloudinary](https://cloudinary.com).
2. From the Cloudinary Dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Paste these values into `.env` under `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.

---

## 🚀 Running the Platform

### Prerequisites
- Node.js 20 or Node.js 22
- npm 9+

### Start Development Server
```bash
npm run dev
```
The server runs at `http://localhost:3000` with the API served under `/api` and the React frontend served with full SPA routing.

### Build for Production
```bash
npm run build
npm start
```

---

## 🧪 Testing

Run the full automated test suite:
```bash
npm test
```
The test suite validates:
- Role escalation protection and security isolation.
- Ticket verification and anti-duplicate check-in safeguards.
- Event cancellation and waitlist FIFO auto-promotion.
- Team registration, secure token generation, and member acceptance/decline flow.
- SMTP configuration parsing, whitespace trimming, and error handling.
