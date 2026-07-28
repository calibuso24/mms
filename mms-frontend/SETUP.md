# Frontend Setup

## Prerequisites
- Node.js 16+ and npm

## Installation Steps

1. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   ```

2. **Configure API endpoint in `.env`:**
   ```
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

   Application will run on `http://localhost:5173`

5. **Build for production:**
   ```bash
   npm run build
   ```

   Output: `dist/` folder

## Development

- The application uses React Router for navigation
- Authentication is handled via JWT tokens stored in localStorage
- API calls are made through the `ApiClient` utility
- Auth context provides `useAuth()` hook for accessing login state and methods

## Test Credentials

Use the accounts seeded in the database:
- Account: `superuser`
- Account: `admin`

**Note:** These accounts don't have passwords by default. You'll need to set a password through the API first.

## Architecture

```
src/
├── pages/           # Page components
│   └── Login.tsx    # Login page
├── shared/
│   ├── api/         # API client and endpoints
│   ├── components/  # Shared components
│   ├── contexts/    # React contexts (auth)
│   └── styles/      # Global styles
├── App.tsx          # Main app component with routing
└── main.tsx         # Entry point
```

## Debugging

To debug API calls:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Perform actions in the app
4. Inspect requests/responses

To check localStorage:
1. Open browser DevTools (F12)
2. Go to Application tab
3. Look for `authToken` in localStorage
