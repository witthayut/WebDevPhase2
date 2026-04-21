# SmartKids – Online Tutoring Platform

ITCS223 Introduction to Web Development — Project Phase II  
Faculty of Information and Communication Technology

---

## Team Members

| Name | Student ID | Role |
|------|-----------|------|
| Nutchada Doungjit | 6788020 | Fullstack Developer |
| Witthayut Phicharanan | 6788086 | Fullstack Developer |
| Jarupat Sakpichaiskul | 6788105 | UI/UX Designer & Frontend Developer |
| Nattanita Engkagul | 6788239 | UI/UX Designer & Frontend Developer |

---

## Project Overview

SmartKids is a web application for an online tutoring platform. Students can browse and search courses, view course details, register/log in, and manage their profiles. Administrators can add, edit, and delete courses through a dedicated management panel.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [MySQL](https://www.mysql.com/) 8.0 or later
- A front-end static file server (e.g. [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) for VS Code, or `npx serve`)

---

## Setup Instructions

### 1. Import the Database

1. Open MySQL Workbench (or any MySQL client).
2. Create a new schema named `webdev`.
3. Import the SQL dump file:
   ```
   source /path/to/secX_grY_database.sql
   ```
   Or use the GUI: **Server → Data Import → Import from Self-Contained File**.

### 2. Configure Environment Variables (optional)

Inside the `Backend/` folder, create a `.env` file if you need to override the defaults:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=WebDev
DB_PASSWORD=WebDev
DB_NAME=webdev
PORT=5000
```

The server defaults to the values above if no `.env` file is present.

### 3. Install Backend Dependencies

```bash
cd Backend
npm install
```

### 4. Start the Backend Server

```bash
node Server.js
```

The API server will be available at `http://localhost:5000`.  
Verify it is running by visiting `http://localhost:5000/` — you should see `Server is running`.  
Test the database connection at `http://localhost:5000/test-db`.

### 5. Serve the Front-end

Open the `Website/` folder with **Live Server** in VS Code (right-click `home.html` → *Open with Live Server*), or run:

```bash
npx serve Website
```

Then open `http://localhost:5500/home.html` (or whichever port Live Server assigns).

> **Important:** The front-end and back-end must run on **separate servers**. Do not open the HTML files directly from the file system (`file://`) — CORS will block API calls.

---

## Default Admin Credentials

Use these to log in to the Admin panel (`admin-login.html`):

| Field | Value |
|-------|-------|
| Email / Admin ID | *(see imported database `adminidinfo` table)* |
| Password | *(see imported database `adminidinfo` table)* |

---

## Pages

| Page | File | Access |
|------|------|--------|
| Home | `home.html` | Public |
| Login / Register | `login.html` | Public |
| Course Search | `search.html` | Public |
| Course Detail | `description.html?id=C00001` | Public |
| Edit Profile | `profile.html` | Logged-in users |
| Admin Login | `admin-login.html` | Admin |
| Course Management | `admin.html` | Admin only |
| Team Members | `members.html` | Public |

---

## API Endpoints (port 5000)

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/admin/login` | Admin authentication |
| POST | `/api/user/login` | User authentication |
| POST | `/api/user/register` | User registration |
| PUT | `/api/user/update` | Update user profile |
| GET | `/api/courses/search` | Search courses (supports `q`, `category`, `rating`, `price`) |
| GET | `/api/courses/categories` | List all categories |
| GET | `/api/courses/:id` | Get single course detail |
| GET | `/api/admin/courses` | List all courses (admin) |
| POST | `/api/admin/courses` | Add new course (admin) |
| PUT | `/api/admin/courses/:id` | Edit course (admin) |
| DELETE | `/api/admin/courses/:id` | Delete course (admin) |

---

## Public Web Service Used

The home page fetches real textbooks and study materials from the **Open Library API** (https://openlibrary.org) — a free, open, no-key-required API maintained by the Internet Archive. It displays a "Study Resources" section where students can browse books by subject (Mathematics, Physics, Chemistry, Biology, English, Computer Science) and click through to the book's full page on Open Library.

---

## Known Issues / Remarks

- Passwords are stored as plain text in the current database schema (as per Phase I design).
- The project must be run on localhost; remote deployment requires updating the `API_BASE` constant in each front-end file.
- Project size is kept under 50 MB; large images are linked by URL rather than stored locally.