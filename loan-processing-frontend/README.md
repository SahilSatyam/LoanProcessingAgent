# Loan Processing Frontend

This is the frontend for the AI Loan Agent, built with React and Material-UI. It provides a delightful, chat-based user experience for loan applications.

## Features
- Conversational AI loan assistant
- Dynamic, API-driven chat flow
- User data and eligibility display
- Responsive and modern UI (Material-UI)
- Multi-line chat input with Shift+Enter for new lines

## Getting Started

### Prerequisites
- Node.js (v18 or later recommended)
- npm

### Installation
```bash
npm install
```

### Running the App
```bash
npm run dev
```
The app will be available at [http://localhost:5173](http://localhost:5173) by default.

### Linting
```bash
npm run lint
```

## Project Structure
- `src/components/` — Main React components (ChatInterface, UserDataCard, etc.)
- `src/services/` — API service for backend communication
- `public/` — Static assets

## Environment
- The frontend expects the backend API to be running at `http://localhost:8000` (see `src/services/api.js`).

## Customization
- Update theme and UI in `src/App.jsx` and `src/components/`
- API endpoints can be configured in `src/services/api.js`

---

For any issues, please contact the project maintainer.
