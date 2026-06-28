# ISSUE IT

An intelligent, hyper-performant local platform to log, track, and coordinate civic action. Designed with a high-contrast Neo-Brutalist aesthetic, it cuts through the bureaucratic noise to deliver results.

## System Architecture

```mermaid
graph TD
    User([User Browser])
    Frontend[React Frontend - Vite]
    Auth[Firebase Auth]
    Database[(Firestore NoSQL)]
    Hosting[Firebase Hosting]

    User <-->|HTTPS| Frontend
    Frontend <-->|OAuth 2.0| Auth
    Frontend <-->|Firebase SDK| Database
    Frontend <-->|CDN| Hosting
```

## Application Flow

```mermaid
sequenceDiagram
    participant U as Citizen
    participant F as Frontend
    participant A as Firebase Auth
    participant DB as Firestore
    
    U->>F: Access ISSUE IT
    F->>A: Trigger Google OAuth
    A-->>F: Return User Session
    U->>F: Submit Civic Issue
    F->>DB: Write to /issues Collection
    DB-->>F: Confirm Submission
    U->>F: Access Dashboard
    F->>DB: Stream Live Issues
    DB-->>F: Real-time Data Sync
    F->>U: Render Status Command Board
```

## Features

### Frictionless Access
- Instant Google OAuth sign-in flow for secure and rapid authentication.
- Seamless user profiling and session management without passwords.

### Precision Tracking
- Hyper-local tracking systems to pinpoint and monitor community disruptions.
- Centralized data aggregation for neighborhood-level issue awareness.

### Interactive Reporting
- High-contrast, rapid-fire issue submission interfaces built for speed.
- Uncompromising Neo-Brutalist design aesthetic that prioritizes function over fluff.

### Command Boards
- Clean, kanban-style status tracking and management boards.
- Real-time updates for issue resolution statuses (Pending, In Progress, Resolved).

## Technology Stack

### Frontend
![React](https://img.shields.io/badge/React-18.0-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.0-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)

### Backend & Infrastructure
![Firebase Auth](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Firestore](https://img.shields.io/badge/Firestore-f5820b?style=flat-square&logo=firebase&logoColor=black)
![Firebase Hosting](https://img.shields.io/badge/Firebase_Hosting-039be5?style=flat-square&logo=firebase&logoColor=white)

## Setup Instructions

**1. Clone the repository**
```bash
git clone https://github.com/yourusername/issue-it.git
cd issue-it
```

**2. Install dependencies**
```bash
npm install
```

**3. Configure Environment**
Create a `.env` file in the root directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**4. Start development server**
```bash
npm run dev
```
