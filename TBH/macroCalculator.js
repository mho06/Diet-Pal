import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./config.js";

/**
 * Creates a new account. Firebase itself rejects empty/malformed
 * email or weak passwords, but surface a clear error either way.
 */
export async function signUp(email, password) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logIn(email, password) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logOut() {
  await signOut(auth);
}

/**
 * Resolves once Firebase has checked whether a session already exists.
 * Use this to gate the initial render so the app never flashes the
 * main screen before redirecting to login (or vice versa).
 *
 *   const user = await getInitialAuthState();
 *   renderApp(user ? "main" : "login");
 */
export function getInitialAuthState() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/** Ongoing listener for login/logout events after initial load. */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
