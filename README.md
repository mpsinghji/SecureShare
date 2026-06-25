# SecureShare Document Control Platform

SecureShare is a premium, high-security document sharing and control platform. It allows organizations to securely distribute, view, and monitor sensitive documents (PDFs, DOCX, XLSX) across global nodes with granular audit logging.

## Tech Stack

**Frontend:**
- React (Vite)
- Custom Vanilla CSS Design System (Fortress Logic Aesthetics)
- Glassmorphism & High-Contrast Corporate styling

**Backend:**
- Node.js & Express.js
- Neon PostgreSQL (Database)
- Supabase Storage (S3-compatible object storage for encrypted files)
- JWT Authentication & Bcrypt Hashing

## Features

- **Premium Authentication:** Secure Login portal matching corporate security standards.
- **Guardian Dashboard:** Live view of total document views, prints, and active links with a recent activity feed.
- **Encrypted Document Upload:** Securely upload files directly to a cloud storage bucket.
- **Granular Audit Logs:** Tracks IP, location, and action type (View/Print) with unauthorized attempt flagging.

## Getting Started

You will need two terminal windows to run this full-stack application locally.

### 1. Database & Environment Setup
Before starting the backend, make sure you have the following `.env` file present in your `Backend/` directory:

```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>/neondb?sslmode=require
JWT_SECRET=your_jwt_secret

SUPABASE_URL=https://your_project.supabase.co
SUPABASE_KEY=your_supabase_key
SUPABASE_BUCKET=secureshare-docs
```

### 2. Run the Backend
```bash
cd Backend
npm install
node src/db/init.js  # This initializes tables and seeds the admin user
npm run dev          # Starts the Express server on port 5000
```

*Note: The default admin user created by the init script is `admin@secureshare.com` with password `password123`.*

### 3. Run the Frontend
In a new terminal window:
```bash
cd Frontend
npm install
npm run dev          # Starts the Vite frontend on port 5173
```

Navigate to `http://localhost:5173` in your browser. You will be greeted by the SecureShare authentication portal. Log in with the admin credentials to access the Guardian Dashboard.

## Design System
This project utilizes a custom CSS variables architecture (`index.css` & `design-system.css`) mapped explicitly to the *Fortress Logic* brand guidelines. No third-party utility frameworks like Tailwind were used in order to maintain absolute control over the UI components and structural layouts.
