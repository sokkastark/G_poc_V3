# Guardian Voice Agent POC - Development Rules and Guidelines

This document outlines the rules, constraints, and architecture guidelines that must be strictly followed during the development of the **Guardian Voice Agent POC**.

---

## 1. Technical Stack Constraints
- **Core Framework**: React (with Vite for build tooling).
- **Styling & Theme**: 
  - **Bootstrap**: Use Bootstrap (version 5) for layout grid and base components.
  - **SCSS**: Write styling in SCSS. Customize Bootstrap variables and add premium healthcare-themed styles (dark mode, glassmorphism elements, clean animations) using SCSS rather than plain CSS.
- **No Hardcoded Data**:
  - All data (appointments, doctor details, available slots, activity logs, transcripts) must be stored and fetched from a simulated database structure (represented by a local `db.json` file or an in-memory JSON state).
  - UI components must **never** reference or manipulate mock data structures directly. They must fetch and update data through an abstracted service layer.

---

## 2. Architectural Abstractions (For Easy Scaling)

### A. Database / Data Access Layer (`DbService`)
- Create a `DbService` interface/class.
- The initial implementation will load and save data from/to a JSON-based store (e.g., using browser `localStorage` seeded with a JSON file or a local mock server).
- **Rule**: Changing the database target from the JSON mock to a real Database / Stored Procedure (SP) API must be done by changing **only one line of code** (e.g., switching the service instantiation or a configuration flag like `USE_MOCK_DB = false`).

### B. Voice Engine Layer (`VoiceService`)
- Create a `VoiceService` abstraction.
- **Phase 1 (Current)**: Implement the voice workflow using the browser's native **Web Speech API** (`SpeechRecognition` for listening, `SpeechSynthesis` for speaking).
- **Phase 2 (Future)**: The architecture must allow seamless swapping of this service with cloud providers like **OpenAI Realtime**, **Vapi AI**, **Retell AI**, or **Twilio** without changing the dashboard UI components.

### C. Notification Layer (`NotificationService`)
- Create a `NotificationService` abstraction for alerts directed to Doctors (simulated WhatsApp, SMS, or email).
- The dashboard should log these events as "sent" with their status, showing that the system is ready to connect to external communication APIs.

---

## 3. UI and Feature Requirements
- **Dashboard**:
  - High-level counters (Pending, Confirmed, Cancelled, Rescheduled).
  - Interactive appointment queue list.
  - Quick action to "Start Browser Call" or "View Call Details/Logs".
- **Voice Agent Console**:
  - Live call states (Idle, Calling, Listening, Speaking, Call Ended).
  - Real-time conversation transcript display.
  - Visual indicator for detected intent (`CONFIRM`, `CANCEL`, `RESCHEDULE`).
  - Interface for slot selection (if patient chooses to reschedule).
- **Doctor Notification Queue**:
  - A dedicated view/log showing notifications dispatched to doctors when patient confirmations, cancellations, or reschedules occur.

---

## 4. Agent Execution Rules
1. **File Integrity**: Do not leave placeholder text or incomplete functions.
2. **Code Quality**: Keep code modular, type-safe (if TypeScript is used) or clean ES6+ JavaScript, and heavily commented for hand-off.
3. **No Direct DOM Manipulation for Voice**: Rely on state-driven React bindings to handle voice events, transcription, and status updates.

---

## 5. ISO-Compliant Folder & Code Structure
To align with strict ISO standards for maintainability, security, and quality, we must follow these guidelines:

### A. Folder Structure (Standard Directory Layout)
```text
src/
├── assets/          # Static assets (images, logos)
├── components/      # Reusable UI components (buttons, badges, cards)
│   ├── common/      # Generic elements (Modal, Spinner, Tooltip)
│   ├── dashboard/   # Dashboard-specific parts (StatsPanel, AppointmentRow)
│   └── voice/       # Voice agent console parts (ConsoleOverlay, TranscriptBubble)
├── hooks/           # Custom React hooks (useSpeech, useLocalDb)
├── pages/           # High-level page views (DashboardPage)
├── services/        # Business logic & services (DbService, VoiceService, NotificationService)
├── styles/          # SCSS stylesheets (main.scss, variables.scss, theme.scss)
├── App.jsx          # Main application entry component
└── main.jsx         # React mounting entrypoint
```

### B. Code Length Limit (Strict 250 Lines)
- **Rule**: No source code file (components, pages, services, styles) may exceed **250 lines of code**.
- **Enforcement**: If a component, page, or service grows close to 250 lines, it must be refactored and split into smaller modular sub-components, custom hooks, helper utilities, or separate service modules.
- **Why**: Ensures high readability, easy unit testing, adherence to Single Responsibility Principle (SRP), and clean code reviews.

### C. Architecture & Separation of Concerns (SoC)
- **Pages** (`pages/`) only coordinate high-level layout and fetch data from Services or Hooks. They must contain minimal UI logic.
- **UI Components** (`components/`) are purely presentational and display state. They accept props and emit events via callbacks.
- **Services** (`services/`) contain core business logic (e.g., API calls, DB emulation) and do not contain React UI code.
- **Custom Hooks** (`hooks/`) encapsulate stateful lifecycle logic (e.g., managing the browser SpeechRecognition status and handlers).
