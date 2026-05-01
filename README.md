cat > README.md <<'EOF'
# ICPS Frontend

Frontend teacher dashboard for the **Integrated Classroom Pulse System (ICPS)**. This dashboard displays real-time classroom feedback collected from Raspberry Pi Pico 2W student pods through the ICPS backend.

## Overview

ICPS allows students to send one of three feedback signals during a lesson:

- `understand`
- `slow_down`
- `help`

The frontend converts backend feedback data into a clear teacher-facing dashboard, helping the teacher monitor class mood, recent feedback, help requests, trends and lesson summaries.

## Main Features

- Live classroom feedback display
- Class mood summary
- Pie chart for feedback distribution
- Trend graph for lesson feedback over time
- Help notifications
- Student feedback overview
- Lesson start/end controls
- Lesson report view
- Responsive teacher dashboard layout

## Technologies

- React
- TypeScript
- Recharts
- Vite
- CSS / Tailwind CSS
- FastAPI backend integration

## System Flow

Pico 2W Student Pods
        ↓
MQTT / Backend
        ↓
FastAPI API Endpoints
        ↓
React Teacher Dashboard

## Dashboard Views

The dashboard is designed to show:

- number of students who understand;
- number of students asking the teacher to slow down;
- number of students needing help;
- overall class mood;
- feedback trends during a lesson;
- recent feedback events;
- lesson summaries and reports.

## Setup

Clone the repository:

git clone PASTE_FRONTEND_REPOSITORY_LINK_HERE
cd icps-frontend

Install dependencies:

npm install

Run the development server:

npm run dev

The dashboard should then be available at the local development address shown in the terminal, usually:

http://localhost:5173

## Backend Connection

The frontend connects to the ICPS backend API.

Backend repository:

https://github.com/Suliman06/ICPS-Backend

If required, update the backend API URL in the frontend configuration file or environment file.

Example:

VITE_API_BASE_URL=http://127.0.0.1:8000

## Privacy Notes

This dashboard is designed for prototype educational use. It should avoid displaying unnecessary personal data and should use pseudonymous student identifiers where possible.

Recommended precautions:

- Do not display real student names unless required and approved.
- Do not commit screenshots containing identifiable student information.
- Do not commit `.env` files containing private URLs or credentials.
- Restrict dashboard access before use in a real classroom.

## Dissertation Context

This frontend forms part of the **Integrated Classroom Pulse System (ICPS)** final year project. The system investigates how low-cost IoT technology can support real-time classroom feedback, teacher awareness and inclusive participation.

## Author

**Suliman Belaid**  
BSc (Hons) Computer Science  
Integrated Classroom Pulse System (ICPS)

## License

MIT License
EOF
