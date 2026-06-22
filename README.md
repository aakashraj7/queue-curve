# Queue Cure 🏥

**Queue Cure** is a real-time patient token and queue management system designed for small clinics and multi-doctor practices. Designed for a fast-paced clinical workflow, it features role-based isolation, a multi-doctor scheduling simulator, real-time sync with Socket.IO, and a television-grade public lobby board.

By combining REST APIs for standard CRUD actions, Socket.IO for instant queue states, and an overlay alert system, Queue Cure coordinates receptionist, doctor, and patient interactions seamlessly.

---

## ✨ Key Hackathon Features

1. **Role Isolation & Access Scoping**: 
   - Interactive credentials setup portal for three roles: **Receptionist**, **Doctor**, and **Patient Display (TV)**.
   - Dashboards are dynamically guarded: Doctors only see their relevant patients and analytics; receptionists control global settings and session resets; the Patient TV hides all headers and navigations for clean presentation.
   - Support for direct-link auto-login via URL parameters (e.g. `?view=patient&session=5DQS` or `?view=doctor&session=5DQS&doctor=D1`).

2. **Multi-Doctor Coordination & Synchronization**:
   - Receptionist can assign patients to a specific doctor or to **"ALL"** doctors.
   - When a patient is assigned to **"ALL"**, they appear in the queue of every doctor. As soon as any doctor calls the patient, they are removed from other rooms, updating wait lists globally and decrementing lobby queues.

3. **Clinic Session Status & Doctor Absence Freeze**:
   - Receptionists can toggle clinic-wide statuses: **Open**, **Lunch Break**, and **Closed**.
   - Setting a lunch break triggers a global queue freeze enforced by server-side controller locks across all progression endpoints. Dashboard controls disable button clicks and display amber alerts.
   - Receptionists can toggle individual doctor availability status: **Available**, **Lunch Break**, and **Not Available**.

4. **Announcements System (Priority Tiers)**:
   - Receptionists can broadcast messages live to the Patient TV screen.
   - **Most Significant Announcements**: Displayed as a highly catchy, pulsing alert banner at the top of the TV screen (e.g., emergencies).
   - **Least Significant Announcements**: Rendered in a tiny, quiet footnote style in the footer, requiring focus to read.

5. **Television-Grade Sizing & Overlay**:
   - Scaled typography overlay for "Lunch Break" and "Clinic Closed" TV display modes.
   - Features bold headings, large legibility descriptions, glowing icons, and a pulsing status badge ("Queue Paused" / "Lobby Offline") indicating the screen is connected and active.
   - All toast messages (pop-up alerts) are suppressed for the display screen to maintain a clean public monitor layout.

6. **Intelligent Blended Wait Time Prediction**:
   - A Bayesian blending algorithm estimates patient wait times when data is scarce (e.g. session start).
   - Blends configured consultation duration (the prior) with actual performance history, transitioning asymptotically to purely data-driven wait times as the history reaches 5 completed appointments.

---

## 🏗️ Folder Structure

```text
queue-curve/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection logic
│   │   ├── models/
│   │   │   ├── Patient.js            # Patient token schema
│   │   │   └── Session.js            # Clinic session config & registered doctors schema
│   │   ├── controllers/
│   │   │   └── queueController.js    # Queue business logic & break freeze checks
│   │   ├── routes/
│   │   │   └── queueRoutes.js        # Express API endpoints
│   │   ├── socket/
│   │   │   └── socketHandler.js      # Socket.IO setup, wait time simulation & event emitters
│   │   └── index.js                  # Express & Socket.IO server startup
│   ├── .env                          # Backend credentials configuration
│   └── package.json
└── frontend/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── Navbar.tsx            # View header & role-based action scope
    │   │   ├── SessionSetup.tsx      # Step-by-step credentials validation & Role Selector
    │   │   ├── ReceptionistDashboard.tsx # Doctor calling system, status settings, announcements
    │   │   ├── DoctorDashboard.tsx   # Doctor calling controls & break status banner
    │   │   ├── PatientWaitingScreen.tsx  # TV lobby screen with custom overlay banners
    │   │   ├── QueueAnalytics.tsx        # Dynamic clinic operational charts
    │   │   ├── StatusBadge.tsx           # Status label colorizer
    │   │   └── Toast.tsx                 # Pop-up event reporter
    │   ├── context/
    │   │   └── QueueContext.tsx          # React Context, REST APIs wrappers & live socket listeners
    │   ├── App.tsx                   # Role router & URL parameter login handler
    │   ├── index.css                 # Styling styles & animation configurations
    │   └── main.tsx
    ├── vite.config.ts                # Vite build config
    ├── .env                          # Frontend environment pointer
    └── package.json
```

---

## 💾 Database Schema

### 1. `Session` Model (`backend/src/models/Session.js`)
Tracks the configuration, status, and doctors registered within a specific active session.

```javascript
{
  sessionId: { type: String, required: true, unique: true },
  averageConsultationTime: { type: Number, required: true, default: 15 },
  sessionStatus: { type: String, enum: ['open', 'lunch-break', 'closed'], default: 'open' },
  mostSignificantMessage: { type: String, default: '' },
  leastSignificantMessage: { type: String, default: '' },
  isInitialized: { type: Boolean, default: false },
  doctors: [
    {
      code: { type: String, required: true },
      name: { type: String, required: true },
      availability: { type: String, enum: ['available', 'lunch-break', 'not-available'], default: 'available' }
    }
  ],
  createdAt: { type: Date, default: Date.now }
}
```

### 2. `Patient` Model (`backend/src/models/Patient.js`)
Tracks the patient token status, room assignments, and chronological operational timestamps.

```javascript
{
  sessionId: { type: String, required: true },
  tokenNumber: { type: Number, required: true },
  patientName: { type: String, required: true, trim: true },
  assignedDoctors: { type: [String], default: ['ALL'] },
  status: { type: String, enum: ['waiting', 'calling', 'serving', 'completed', 'skipped'], default: 'waiting' },
  calledBy: { type: String },
  estimatedWaitTime: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  calledAt: { type: Date },
  completedAt: { type: Date }
}
```

---

## ⚡ Socket.IO Event Architecture

Queue Cure relies on WebSockets for real-time synchronization between Receptionist, Doctor, and Patient TV screens.

| Event Name | Source | Target | Description | Payload Example |
| :--- | :--- | :--- | :--- | :--- |
| `queue-updated` | Server | All Clients | Dispatched when queue state, session status, or wait calculations are updated. | `{ activeQueue: [...], skippedQueue: [...], settings: {...}, analytics: {...} }` |
| `patient-added` | Server | All Clients | Dispatched when a patient joins the queue (triggers a Toast alert for receptionist/doctors). | `{ patientName: "Margaret Carter", tokenNumber: 4 }` |
| `next-patient-called` | Server | All Clients | Dispatched when a doctor calls the next patient (blinks TV card, plays chime audio). | `{ patientName: "John Doe", tokenNumber: 2, doctorCode: "D1" }` |
| `patient-arrived` | Server | All Clients | Dispatched when a patient arrives in the doctor's room. | `{ patientName: "John Doe", tokenNumber: 2, doctorCode: "D1" }` |
| `patient-completed` | Server | All Clients | Dispatched when a doctor completes a consultation. | `{ patientName: "John Doe", tokenNumber: 2 }` |
| `patient-skipped` | Server | All Clients | Dispatched when a doctor skips a no-show patient. | `{ patientName: "Alice Vance", tokenNumber: 3 }` |
| `patient-restored` | Server | All Clients | Dispatched when the receptionist restores a skipped patient back to the queue. | `{ patientName: "Alice Vance", tokenNumber: 3 }` |
| `consultation-time-changed` | Server | All Clients | Dispatched when average consultation settings duration is updated (triggers Toast alert). | `{ averageConsultationTime: 12 }` |
| `session-initialized` | Server | All Clients | Dispatched when a session is first configured and registered. | `{ sessionId: "LMVW", doctors: [...] }` |
| `session-reset` | Server | All Clients | Dispatched when receptionist ends/wipes the session (redirects active dashboards back to portal). | `null` |

---

## ⏱️ Dynamic Wait Time & Prediction Algorithms

### 1. Doctor-Queue Simulation
Wait times are simulated using a greedy multi-doctor scheduler in `backend/src/socket/socketHandler.js`:
- Doctors marked as `'lunch-break'` or `'not-available'` are assigned a simulated queue time of `999999` minutes, effectively freezing new patient routing to their rooms.
- Each waiting patient is scheduled to their assigned doctor (or the eligible doctor with the shortest queue duration if assigned to `'ALL'`).
- The doctor's queue duration is incremented by the configured average consultation duration for each patient scheduled to them.

### 2. Blended Average Wait Time (Scarce Data Prior)
To prevent the analytics dashboards from showing an inaccurate `0 mins` at session initialization, a Bayesian-like blended calculation is applied when fewer than 5 patients have been served:

$$\text{Blended Wait Time} = \frac{(\text{Actual Wait Time} \times \text{waitCount}) + (\text{Configured Duration} \times (5 - \text{waitCount}))}{5}$$

- **0 visits**: Shows 100% configured consultation duration (e.g. `15 mins`).
- **3 visits**: Blends 40% of the configured consultation duration with 60% of the actual average wait time of the 3 visits.
- **5+ visits**: Transitions to 100% actual historical data.
