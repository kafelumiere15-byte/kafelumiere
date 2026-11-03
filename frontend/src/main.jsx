import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { GoogleOAuthProvider } from '@react-oauth/google'
// Bootstrap is bundled locally (not loaded from a CDN) so the UI still looks right
// even when the browser/network blocks third-party stylesheet requests.
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.jsx'
import store from './store'

// Google Client ID for the "Continue with Google" button (from Google Cloud Console ->
// APIs & Services -> Credentials -> OAuth 2.0 Client IDs; the same Google Cloud project
// behind your Firebase project already has one, usually named "Web client (auto created
// by Google Service)"). Put it in frontend/.env as VITE_GOOGLE_CLIENT_ID.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <Provider store={store}>
      <App />
    </Provider>
  </GoogleOAuthProvider>
)