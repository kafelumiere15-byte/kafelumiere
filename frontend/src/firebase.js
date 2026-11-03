import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithCredential } from 'firebase/auth'

// Firebase is used for "Continue with Google" on the login page.
// It is set up the first time someone clicks the button (not when the site loads),
// so the rest of the site still works when the VITE_FIREBASE_* settings are missing.
const getFirebaseApp = () => {
    const config = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }
    if (!config.apiKey || !config.appId) {
        throw Object.assign(new Error('Social sign-in is not set up yet (missing VITE_FIREBASE_* settings in frontend/.env)'), { code: 'auth/not-configured' })
    }
    return getApps().length ? getApp() : initializeApp(config)
}

// Classic popup flow (kept as a fallback / for anywhere that doesn't use the
// @react-oauth/google button, e.g. if VITE_GOOGLE_CLIENT_ID is not set).
export const signInWithGoogle = async () => {
    const app = getFirebaseApp()
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    return signInWithPopup(getAuth(app), provider)
}

// The login page's "Continue with Google" button is rendered by @react-oauth/google
// (GoogleLogin), which hands back a Google ID token credential. We feed that credential
// into Firebase so Firebase still does the actual sign-in/verification exactly like before -
// the rest of the app (backend /auth/firebase, etc.) is unchanged.
export const signInWithGoogleCredential = async (googleIdToken) => {
    const app = getFirebaseApp()
    const credential = GoogleAuthProvider.credential(googleIdToken)
    return signInWithCredential(getAuth(app), credential)
}