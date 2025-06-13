# JP Morgan Loan Processing Frontend

This is the frontend for the JP Morgan AI Loan Agent, built with React and Material-UI. It provides a delightful, chat-based user experience for loan applications with enhanced UI/UX, real-time monitoring, and robust error handling.

## Features

### Core Functionality
- Conversational AI loan assistant
- Dynamic, API-driven chat flow
- User data and eligibility display with enhanced visualization
- Step-by-step loan application process
- Document management with secure loan agreement download

### Enhanced UI/UX
- JP Morgan branded Material-UI theme
- Responsive and modern UI with mobile-first approach
- Enhanced data cards for user information and eligibility results
- Visual progress tracking with stepper component
- Loading indicators and smooth animations

### Monitoring & Reliability
- Real-time connection status monitoring
- System statistics dashboard
- Error boundary for graceful error handling
- Automatic retry logic with exponential backoff
- Comprehensive request/response logging

## Getting Started

### Prerequisites
- Node.js (v18 or later recommended)
- npm

### Installation
```bash
npm install
```

### Environment Setup
```bash
cp .env.example .env
```
Configure your environment variables as needed.

### Running the App
```bash
npm run dev
```
The app will be available at [http://localhost:5173](http://localhost:5173) by default.

### Production Build
```bash
npm run build
npm run start:prod
```

### Linting
```bash
npm run lint
# Fix linting issues
npm run lint:fix
```

### Bundle Analysis
```bash
npm run analyze
```

## Project Structure
- `src/components/` — Main React components (ChatInterface, EnhancedUserDataCard, EnhancedEligibilityCard, ErrorBoundary, etc.)
- `src/services/` — API service for backend communication with enhanced error handling and retry logic
- `public/` — Static assets

## Environment Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:8000` |
| `REACT_APP_API_TIMEOUT` | Request timeout (ms) | `30000` |
| `REACT_APP_MAX_RETRIES` | Max retry attempts | `3` |
| `REACT_APP_RETRY_DELAY` | Retry delay (ms) | `1000` |
| `REACT_APP_ENABLE_STATS` | Enable system stats | `true` |
| `REACT_APP_ENABLE_CONNECTION_MONITORING` | Monitor connection | `true` |
| `REACT_APP_DEBUG_MODE` | Enable debug logging | `false` |

## Enhanced Components

### EnhancedUserDataCard
- Rich user information display
- OFAC status indicators with visual feedback
- Financial profile visualization
- Debt-to-income ratio charts

### EnhancedEligibilityCard
- Loan eligibility results with status indicators
- Payment breakdown visualization
- Risk assessment indicators
- Interactive loan details

### ErrorBoundary
- Graceful error handling
- User-friendly error messages
- Recovery options
- Development error details

## Monitoring Features

### Connection Status
- Real-time connectivity monitoring
- Visual connection indicators
- Automatic reconnection attempts
- Network error handling

### System Statistics
- Active session count
- Server status monitoring
- Cache statistics (OFAC, Excel)
- Performance metrics

## Customization
- JP Morgan branded theme in `src/App.jsx`
- Enhanced UI components in `src/components/`
- API configuration and error handling in `src/services/api.js`

---

For any issues, please contact the project maintainer.
