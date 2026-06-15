# Queue Cure 🏥

**Queue Cure** is a production-ready, real-time patient token and queue management system designed for small clinics and hospitals. It features an interactive receptionist control dashboard, a large TV-optimized waiting lobby board, and live clinic operational analytics.

By combining REST APIs for standard CRUD actions and Socket.IO for instant queue states, Queue Cure eliminates lobby congestion and manual number tracking.

---

## 🏗️ Folder Structure

```text
queue-curve/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection using Mongoose
│   │   ├── models/
│   │   │   ├── Patient.js            # Patient token, status, and wait times
│   │   │   └── QueueSettings.js      # Global average consultation length
│   │   ├── controllers/
│   │   │   └── queueController.js    # Business logic for queue updates
│   │   ├── routes/
│   │   │   └── queueRoutes.js        # Express REST API endpoints
│   │   ├── socket/
│   │   │   └── socketHandler.js      # Socket.IO initialisation and emitters
│   │   └── index.js                  # Entry point for HTTP/WebSocket Server
│   ├── .env                          # Backend Environment Config
│   └── package.json
└── frontend/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── Navbar.tsx            # View switcher and socket status indicator
    │   │   ├── ReceptionistDashboard.tsx # Queue control actions, registration, settings
    │   │   ├── PatientWaitingScreen.tsx  # TV Lobby view with blinking now serving token
    │   │   ├── QueueAnalytics.tsx        # Dynamic clinic operational assessments
    │   │   ├── StatusBadge.tsx           # Clinical status pill representation
    │   │   └── Toast.tsx                 # Popups for real-time WebSocket activities
    │   ├── context/
    │   │   └── QueueContext.tsx          # State manager & live Socket listener
    │   ├── App.tsx                   # Main layout container
    │   ├── index.css                 # Tailwind CSS imports & animations
    │   └── main.tsx
    ├── vite.config.ts                # Vite config using @tailwindcss/vite compiler
    ├── .env                          # Frontend API Endpoint pointer
    └── package.json
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
Create a `.env` file inside the `backend` folder:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/queue-cure
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
Create a `.env` file inside the `frontend` folder:
```env
VITE_API_URL=http://localhost:5000
```

---

## ⚡ Socket.IO Event Architecture

Queue Cure relies on WebSockets for real-time synchronization. The client joins and gets standard updates via standard server broadcasts.

| Event Name | Source | Target | Description | Payload Example |
| :--- | :--- | :--- | :--- | :--- |
| `queue-updated` | Server | All Clients | Dispatched whenever the queue state, setting parameters, or calculations change. | `{ activeQueue: [...], skippedQueue: [...], settings: {...}, analytics: {...} }` |
| `patient-added` | Server | All Clients | Dispatched when a patient joins the queue (triggers a lobby-wide Toast notification). | `{ patientName: "Margaret Carter", tokenNumber: 4 }` |
| `next-patient-called` | Server | All Clients | Dispatched when the receptionist calls the next patient (blinks TV board, plays beep audio). | `{ patientName: "John Doe", tokenNumber: 2 }` |
| `patient-completed` | Server | All Clients | Dispatched when the active patient finishes their appointment. | `{ patientName: "John Doe", tokenNumber: 2 }` |
| `patient-skipped` | Server | All Clients | Dispatched when a patient is skipped. | `{ patientName: "Alice Vance", tokenNumber: 3 }` |
| `patient-restored` | Server | All Clients | Dispatched when a skipped patient is placed back into the queue chronologically. | `{ patientName: "Alice Vance", tokenNumber: 3 }` |
| `consultation-time-changed` | Server | All Clients | Dispatched when average consultation settings duration is adjusted. | `{ averageConsultationTime: 12 }` |

---

## ⏱️ Dynamic Wait Time Logic

Estimated wait times are computed in the database dynamically to prevent manual calculation errors.

### Formulas
* **Serving Patient**: Wait Time = `0 minutes`
* **Waiting Patients**:
  Let the waiting patients list sorted by creation time be $P_0, P_1, \ldots, P_{n-1}$.
  Let $S$ be the count of patients currently with the doctor (status `serving`, which is `0` or `1`).
  For any waiting patient $P_i$ at index $i$:
  $$\text{Patients Ahead} = i + S$$
  $$\text{Estimated Wait Time} = (i + S) \times \text{Average Consultation Duration}$$

Whenever a patient is added, completed, skipped, restored, or settings duration changes, the database updates all active wait times automatically, emitting the calculated parameters to all connected tabs.

---

## 🚀 Running Locally

### Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher)
* [MongoDB](https://www.mongodb.com/try/download/community) running locally on port `27017`

### Step 1: Run the Backend
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Start the development server (runs with nodemon):
   ```bash
   npm run dev
   ```

### Step 2: Run the Frontend
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser and go to: `http://localhost:5173`

---

## ☁️ Deployment Instructions

### 1. Database (MongoDB Atlas)
1. Register on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free-tier cluster.
3. Whitelist access from all IP addresses (`0.0.0.0/0`) under Network Security (needed for Render/Vercel connections).
4. Get your connection string (e.g., `mongodb+srv://<username>:<password>@cluster.xxxx.mongodb.net/queue-cure`).

### 2. Backend (Render / Railway)
1. Sign in to [Render](https://render.com/).
2. Click **New +** $\to$ **Web Service**.
3. Link your Github Repository and select the `backend` root path (set **Root Directory** as `backend`).
4. Set Build Command: `npm install`
5. Set Start Command: `npm start`
6. Add Environment Variables:
   * `MONGO_URI`: (Your MongoDB Atlas connection URI)
   * `FRONTEND_URL`: (Your Vercel frontend URL, e.g. `https://queue-cure.vercel.app`)
   * `PORT`: `10000` (Render defaults to this, or automatic)

### 3. Frontend (Vercel)
1. Sign in to [Vercel](https://vercel.com/).
2. Import your repository.
3. Configure the framework as **Vite** and set **Root Directory** as `frontend`.
4. Add Environment Variables:
   * `VITE_API_URL`: (Your deployed Render backend URL, e.g. `https://queue-cure-backend.onrender.com`)
5. Click **Deploy**.
