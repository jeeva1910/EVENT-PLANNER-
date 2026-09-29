# EventHub – Event Planning & Management Platform (MERN Stack)

EventHub is a production-ready, centralized event management and discovery platform connecting organizers, attendees, and platform administrators. Built on the **MERN** architecture (**MongoDB**, **Express.js**, **React 19**, **Node.js**, and **TypeScript**) with **Mongoose ODM** and **Tailwind CSS**.

---

## 🌟 Architecture & Core Capabilities

### 1. Security & Multi-Role Authorization
- **Public Registration Isolation**: Public signup strictly limits account creation to `attendee` or `organizer`. Admin accounts can never be created via public signups.
- **JWT Protection & Production Failsafe**: Uses dynamic token generation with verification of account status (rejects suspended accounts) and fails safely if `JWT_SECRET` is omitted in production.
- **Role Elevation Defense**: User profile updates (`PUT /api/users/profile`) strictly sanitize fields, preventing privilege escalation.
- **Administrative Guarding**: Admin-only operations (role changes, account suspension, category deletion, live database connection) require verified `admin` role tokens.

### 2. Full MongoDB & Mongoose Integration
- Uses **Mongoose Models** (`UserModel`, `EventModel`, `RegistrationModel`, `CategoryModel`, `NotificationModel`, `FeedbackModel`, `ReportModel`) as the authoritative persistent data source.
- Health endpoint (`/api/health` and `/api/system/db-status`) accurately reports active data source (`MongoDB Atlas` vs `Local Persistent Store`).

### 3. Concurrency-Safe Ticketing, Capacity & FIFO Waitlists
- **Anti-Overbooking**: Capacity is verified upon registration to prevent race conditions.
- **Priority Waitlisting**: When capacity is reached, attendees are automatically queued on a priority waitlist with deterministic position tracking (`#1`, `#2`, etc.).
- **Automatic FIFO Promotion**: When a confirmed attendee cancels their registration, the first eligible waitlisted participant is atomically promoted to confirmed status with instant notification and QR pass generation.
- **Duplicate Check-in Prevention**: QR scanner verifies attendance with duplicate detection and timestamp tracking.

### 4. Cloudinary Image Management
- Secure server-side image upload endpoint (`POST /api/upload`) using backend credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
- Supports direct file selection for event posters and profile avatars.
- Validates file MIME types (JPEG, PNG, WEBP, GIF, SVG) and enforces a 5MB size limit without exposing API secrets to the frontend.

### 5. Smart Multi-Modal Transit & Accessibility Directory
- Step-free access checklists (power entrances, ramps, elevators, accessible restrooms, reserved seating, parking, hearing induction loops, sign language support).
- Multi-modal route guidance (transit, driving, walking) with direct Google Maps deep links and `.ics` / Google Calendar export.

---

## 🔑 Quick Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Attendee** | `attendee@eventhub.com` | `Attendee123!` |
| **Organizer** | `organizer@eventhub.com` | `Organizer123!` |
| **Admin** | `admin@eventhub.com` | `Admin123!` |

---

## 🧪 Automated Testing

Run the automated backend and security test suite:
```bash
npm test
```
The Vitest suite verifies:
1. Role escalation prevention on public signup.
2. Token generation and authorization guards.
3. Event ownership isolation (organizers cannot modify other organizers' events).
4. Draft event hiding from public discovery queries.
5. Capacity enforcement and automatic waitlist queueing.
6. FIFO waitlist auto-promotion upon cancellation.
7. QR ticket verification and duplicate check-in defense.

---

## 🚀 Environment Setup

Copy `.env.example` to `.env`:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key

# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.gecb6ri.mongodb.net/eventhub?retryWrites=true&w=majority&appName=Cluster0

# Cloudinary Storage (Optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the application:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.
