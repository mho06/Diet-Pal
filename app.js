
/* Firebase — real accounts and persistent storage.
   Config below is safe to expose client-side; Firebase security
   is enforced through Firestore rules, not by hiding this object. */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKxQz2qJeJK-yRp3Y8hfcUVjGYKTFZPYg",
  authDomain: "dietpal-65.firebaseapp.com",
  projectId: "dietpal-65",
  storageBucket: "dietpal-65.firebasestorage.app",
  messagingSenderId: "426303260735",
  appId: "1:426303260735:web:7a5695b1ec96e55653d08a"
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
function todayKey() { return new Date().toISOString().slice(0, 10); }

/* API calls now go through /netlify/functions/* proxies — no keys live in this file anymore.
   Set GROQ_API_KEY and GEMINI_API_KEY as environment variables in your Netlify site settings. */

/* ---------- Auth (real accounts via Firebase) ---------- */
let currentUser = null; // { name, email, uid } or { name:'Guest', email:null, uid:null }
let pendingUser = null;

document.querySelectorAll('.eye-toggle').forEach(btn => btn.addEventListener('click', () => {
  const input = document.getElementById(btn.dataset.target);
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.innerHTML = showing
    ? '<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.6 21.6 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.6 21.6 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>';
  btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
}));

function showAuthForm(which) {
  document.getElementById('toggleLogin').classList.toggle('active', which === 'login');
  document.getElementById('toggleSignup').classList.toggle('active', which === 'signup');
  document.getElementById('loginForm').classList.toggle('active', which === 'login');
  document.getElementById('signupForm').classList.toggle('active', which === 'signup');
}
document.getElementById('toggleLogin').addEventListener('click', () => showAuthForm('login'));
document.getElementById('toggleSignup').addEventListener('click', () => showAuthForm('signup'));

async function saveProfileToFirestore() {
  if (!currentUser || !currentUser.uid) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      name: currentUser.name,
      email: currentUser.email,
      allergies: userProfile.allergies,
      dislikes: userProfile.dislikes,
      sex: userProfile.sex || null,
      age: userProfile.age || null,
      weightKg: userProfile.weightKg || null,
      heightCm: userProfile.heightCm || null,
      activity: userProfile.activity || null,
      maintenanceCalories,
      goal: selectedGoal,
      dailyTargets
    }, { merge: true });
  } catch (err) { console.error('Failed to save profile:', err); }
}

async function saveLogToFirestore() {
  if (!currentUser || !currentUser.uid) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'logs', todayKey()), { items: logItems });
  } catch (err) { console.error('Failed to save log:', err); }
}

async function loadUserData(uid) {
  try {
    const profileSnap = await getDoc(doc(db, 'users', uid));
    if (profileSnap.exists()) {
      const data = profileSnap.data();
      userProfile = {
        allergies: data.allergies || '', dislikes: data.dislikes || '',
        sex: data.sex || null, age: data.age || null, weightKg: data.weightKg || null,
        heightCm: data.heightCm || null, activity: data.activity || null
      };
      if (typeof data.maintenanceCalories === 'number') maintenanceCalories = data.maintenanceCalories;
      if (data.dailyTargets) {
        dailyTargets = data.dailyTargets;
        document.getElementById('calories').value = dailyTargets.calories;
        document.getElementById('protein').value = dailyTargets.protein;
        document.getElementById('carbs').value = dailyTargets.carbs;
        document.getElementById('fat').value = dailyTargets.fat;
      }
      if (data.goal) {
        selectedGoal = data.goal;
        document.querySelectorAll('#goalSelect button').forEach(b => b.classList.toggle('active', b.dataset.goal === data.goal));
        document.getElementById('goalDesc').textContent = goalCopy[data.goal];
      }
    }
    const logSnap = await getDoc(doc(db, 'users', uid, 'logs', todayKey()));
    if (logSnap.exists()) {
      logItems = logSnap.data().items || [];
      renderLog();
    }
  } catch (err) { console.error('Failed to load user data:', err); }
}

function enterApp(user) {
  currentUser = user;
  document.getElementById('loadingGate').style.display = 'none';
  document.getElementById('authGate').style.display = 'none';
  document.getElementById('appRoot').classList.remove('app-hidden');
  document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
}

// Auto-restore session on page load — Firebase remembers the sign-in across reloads.
// Nothing (app or auth screen) is shown until this resolves, so there's no flash of content.
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadUserData(user.uid);
    enterApp({ name: user.displayName || user.email.split('@')[0], email: user.email, uid: user.uid });
  } else if (!currentUser) {
    document.getElementById('loadingGate').style.display = 'none';
    document.getElementById('authGate').style.display = 'flex';
  }
});

document.getElementById('userPill').addEventListener('click', () => {
  showProfileView();
  document.getElementById('profileAvatarLg').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileEmail').textContent = currentUser.email || 'Guest — not signed in with an account';
  document.getElementById('profileGoal').textContent = selectedGoal.charAt(0).toUpperCase() + selectedGoal.slice(1);
  document.getElementById('profileCalTarget').textContent = `${dailyTargets.calories} kcal`;
  document.getElementById('profileMacros').textContent = `${dailyTargets.protein}g / ${dailyTargets.carbs}g / ${dailyTargets.fat}g`;
  document.getElementById('profileModal').classList.add('open');
});
document.getElementById('profileClose').addEventListener('click', () => document.getElementById('profileModal').classList.remove('open'));
document.getElementById('profileModal').addEventListener('click', (e) => { if (e.target.id === 'profileModal') e.currentTarget.classList.remove('open'); });
document.getElementById('profileLogout').addEventListener('click', async () => {
  document.getElementById('profileModal').classList.remove('open');
  if (currentUser && currentUser.uid) { await signOut(auth); }
  currentUser = null;
  logItems = [];
  document.getElementById('appRoot').classList.add('app-hidden');
  document.getElementById('authGate').style.display = 'flex';
});

/* ---------- Profile: view / edit / delete ---------- */
function showProfileView() {
  document.getElementById('profileViewMode').classList.remove('hidden');
  document.getElementById('profileEditMode').classList.remove('active');
  document.getElementById('deleteConfirmView').style.display = 'none';
}
document.getElementById('profileEditBtn').addEventListener('click', () => {
  document.getElementById('profileViewMode').classList.add('hidden');
  document.getElementById('profileEditMode').classList.add('active');
  document.getElementById('editSex').value = userProfile.sex || 'male';
  document.getElementById('editAge').value = userProfile.age || '';
  document.getElementById('editWeight').value = userProfile.weightKg || '';
  document.getElementById('editHeight').value = userProfile.heightCm || '';
  document.getElementById('editActivity').value = userProfile.activity || '1.55';
  document.getElementById('editAllergies').value = userProfile.allergies || '';
  document.getElementById('editDislikes').value = userProfile.dislikes || '';
  editGoalChoice = selectedGoal;
  document.querySelectorAll('#editGoalSelect button').forEach(b => b.classList.toggle('active', b.dataset.goal === selectedGoal));
});
document.getElementById('editCancel').addEventListener('click', showProfileView);
let editGoalChoice = 'maintain';
document.querySelectorAll('#editGoalSelect button').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('#editGoalSelect button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  editGoalChoice = btn.dataset.goal;
}));
document.getElementById('editSave').addEventListener('click', async () => {
  const sex = document.getElementById('editSex').value;
  const age = parseFloat(document.getElementById('editAge').value) || 22;
  const weightKg = parseFloat(document.getElementById('editWeight').value) || 70;
  const heightCm = parseFloat(document.getElementById('editHeight').value) || 175;
  const activity = document.getElementById('editActivity').value;

  const resting = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const dailyBurn = resting * parseFloat(activity);
  maintenanceCalories = dailyBurn;

  userProfile = {
    sex, age, weightKg, heightCm, activity,
    allergies: document.getElementById('editAllergies').value.trim(),
    dislikes: document.getElementById('editDislikes').value.trim()
  };
  selectedGoal = editGoalChoice;
  document.querySelectorAll('#goalSelect button').forEach(b => b.classList.toggle('active', b.dataset.goal === selectedGoal));
  document.getElementById('goalDesc').textContent = goalCopy[selectedGoal];
  applyGoalMacros(selectedGoal);
  await saveProfileToFirestore();
  showProfileView();
  document.getElementById('profileGoal').textContent = selectedGoal.charAt(0).toUpperCase() + selectedGoal.slice(1);
  document.getElementById('profileCalTarget').textContent = `${dailyTargets.calories} kcal`;
  document.getElementById('profileMacros').textContent = `${dailyTargets.protein}g / ${dailyTargets.carbs}g / ${dailyTargets.fat}g`;
});

document.getElementById('profileDeleteBtn').addEventListener('click', () => {
  document.getElementById('profileViewMode').classList.add('hidden');
  document.getElementById('deleteConfirmView').style.display = 'block';
});
document.getElementById('deleteCancel').addEventListener('click', showProfileView);
document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('deleteError');
  if (!currentUser || !currentUser.uid) { errEl.textContent = 'Guests have nothing to delete.'; return; }
  errEl.textContent = 'Deleting...';
  try {
    await deleteDoc(doc(db, 'users', currentUser.uid));
    await deleteUser(auth.currentUser);
    document.getElementById('profileModal').classList.remove('open');
    currentUser = null;
    logItems = [];
    document.getElementById('appRoot').classList.add('app-hidden');
    document.getElementById('authGate').style.display = 'flex';
  } catch (err) {
    errEl.textContent = err.code === 'auth/requires-recent-login'
      ? 'For security, please log out and log back in, then try deleting again.'
      : 'Something went wrong: ' + err.message;
  }
});

document.getElementById('signupBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('signupError');
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim().toLowerCase();
  const password = document.getElementById('signupPassword').value;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name) { errEl.textContent = 'Enter your name.'; return; }
  if (!emailPattern.test(email)) { errEl.textContent = 'Enter a valid email address.'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }

  errEl.textContent = 'Creating your account...';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    errEl.textContent = '';
    pendingUser = { name, email, uid: cred.user.uid };
    document.getElementById('authGate').style.display = 'none';
    startOnboarding();
  } catch (err) {
    errEl.textContent = err.code === 'auth/email-already-in-use'
      ? 'An account with this email already exists — log in instead.'
      : 'Something went wrong: ' + err.message;
  }
});

document.getElementById('loginBtn').addEventListener('click', async () => {
  const errEl = document.getElementById('loginError');
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  errEl.textContent = 'Logging in...';
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    errEl.textContent = '';
    await loadUserData(cred.user.uid);
    enterApp({ name: cred.user.displayName || email.split('@')[0], email, uid: cred.user.uid });
  } catch (err) {
    errEl.textContent = (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password')
      ? 'Incorrect email or password.'
      : 'Something went wrong: ' + err.message;
  }
});


/* ---------- Onboarding wizard ---------- */
let onboardStep = 1;
const onboardGoalCopy = {
  cut: 'A fat-loss plan: moderate deficit, higher protein to protect muscle, high-volume foods to stay full.',
  maintain: 'A balanced, sustainable plan at your current calorie needs.',
  bulk: 'A muscle-gain plan: calorie surplus, enough carbs to fuel training, protein spread across meals.'
};
let onboardGoal = 'maintain';
let userProfile = { allergies: '', dislikes: '' };

document.querySelectorAll('#obGoalSelect button').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('#obGoalSelect button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  onboardGoal = btn.dataset.goal;
  document.getElementById('obGoalDesc').textContent = onboardGoalCopy[onboardGoal];
}));

function startOnboarding() {
  onboardStep = 1;
  showOnboardStep(1);
  document.getElementById('onboardGate').classList.add('open');
}
function showOnboardStep(n) {
  document.querySelectorAll('.onboard-step').forEach(s => s.classList.remove('active'));
  document.getElementById('obStep' + n).classList.add('active');
  document.querySelectorAll('.onboard-progress .dot').forEach(d => d.classList.toggle('active', parseInt(d.dataset.step) === n));
  document.getElementById('obBack').style.display = n === 1 ? 'none' : 'block';
  document.getElementById('obNext').textContent = n === 3 ? 'Finish' : 'Continue';
}
document.getElementById('obBack').addEventListener('click', () => { onboardStep--; showOnboardStep(onboardStep); });
document.getElementById('obNext').addEventListener('click', () => {
  if (onboardStep < 3) { onboardStep++; showOnboardStep(onboardStep); return; }

  // Finish: compute targets from the answers, same math as the in-app calculator
  const sex = document.getElementById('obSex').value;
  const age = parseFloat(document.getElementById('obAge').value) || 22;
  const weightKg = parseFloat(document.getElementById('obWeight').value) || 70;
  const heightCm = parseFloat(document.getElementById('obHeight').value) || 175;
  const activity = parseFloat(document.getElementById('obActivity').value);
  const resting = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  const dailyBurn = resting * activity;
  maintenanceCalories = dailyBurn;
  const weeklyGoalKg = onboardGoal === 'cut' ? -0.5 : (onboardGoal === 'bulk' ? 0.3 : 0);
  const target = Math.round(dailyBurn + (weeklyGoalKg * 7700) / 7);

  document.getElementById('calories').value = target;
  dailyTargets.calories = target;
  selectedGoal = onboardGoal;
  document.querySelectorAll('#goalSelect button').forEach(b => b.classList.toggle('active', b.dataset.goal === onboardGoal));
  document.getElementById('goalDesc').textContent = goalCopy[onboardGoal];
  applyGoalMacros(onboardGoal);

  userProfile = {
    sex, age, weightKg, heightCm, activity,
    allergies: document.getElementById('obAllergies').value.trim(),
    dislikes: document.getElementById('obDislikes').value.trim()
  };

  document.getElementById('onboardGate').classList.remove('open');
  enterApp(pendingUser);
  saveProfileToFirestore();
});


/* ---------- Tab switching ---------- */
document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  if (btn.dataset.tab === 'track') renderLog();
}));

/* ---------- Plan branch toggle ---------- */
document.getElementById('branchAI').addEventListener('click', () => {
  document.getElementById('branchAI').classList.add('selected');
  document.getElementById('branchManual').classList.remove('selected');
  document.getElementById('aiPlanView').style.display = 'block';
  document.getElementById('manualPlanView').style.display = 'none';
});
document.getElementById('branchManual').addEventListener('click', () => {
  document.getElementById('branchManual').classList.add('selected');
  document.getElementById('branchAI').classList.remove('selected');
  document.getElementById('aiPlanView').style.display = 'none';
  document.getElementById('manualPlanView').style.display = 'block';
});
document.getElementById('usePantry').addEventListener('change', (e) => {
  document.getElementById('pantryFields').style.display = e.target.checked ? 'block' : 'none';
});

/* ---------- Calorie calculator ---------- */
document.getElementById('calcToggle').addEventListener('click', () => {
  document.getElementById('calcBox').classList.toggle('open');
  document.getElementById('calcToggle').classList.toggle('open');
});
let unit = 'metric';
document.querySelectorAll('.unit-badge').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.unit-badge').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  unit = b.dataset.unit;
  document.getElementById('metricInputs').style.display = unit === 'metric' ? 'flex' : 'none';
  document.getElementById('imperialInputs').style.display = unit === 'imperial' ? 'flex' : 'none';
}));
document.getElementById('knowBodyFat').addEventListener('change', (e) => {
  document.getElementById('bodyFatField').style.display = e.target.checked ? 'block' : 'none';
});
function goalText(kgPerWeek) {
  const abs = Math.abs(kgPerWeek).toFixed(1);
  if (kgPerWeek < -0.05) return `Lose weight (~${abs} kg/week)`;
  if (kgPerWeek > 0.05) return `Gain weight (~${abs} kg/week)`;
  return 'Stay at current weight';
}
document.getElementById('goalSlider').addEventListener('input', (e) => {
  document.getElementById('goalLabel').textContent = goalText(parseFloat(e.target.value));
});

let dailyTargets = { calories: 2000, protein: 120, carbs: 220, fat: 65 };
let maintenanceCalories = null; // TDEE before any goal-based adjustment, once known

/* ---------- Goal selection (cut / maintain / bulk) ---------- */
let selectedGoal = 'maintain';
const goalCopy = {
  cut: 'A fat-loss plan: moderate deficit, higher protein to protect muscle, high-volume foods to stay full.',
  maintain: 'A balanced, sustainable plan at your current calorie needs.',
  bulk: 'A muscle-gain plan: calorie surplus, enough carbs to fuel training, protein spread across meals.'
};
function goalCalorieAdjustment(goal) {
  const weeklyGoalKg = goal === 'cut' ? -0.5 : (goal === 'bulk' ? 0.3 : 0);
  return Math.round((weeklyGoalKg * 7700) / 7);
}
function applyGoalMacros(goal) {
  // If we know real maintenance calories (from the calculator or onboarding), switching
  // goals also moves the calorie target itself, not just the macro split at a frozen number.
  let cal = parseFloat(document.getElementById('calories').value) || dailyTargets.calories;
  if (maintenanceCalories !== null) {
    cal = Math.round(maintenanceCalories + goalCalorieAdjustment(goal));
    document.getElementById('calories').value = cal;
    dailyTargets.calories = cal;
  }

  let proteinG, carbG, fatG;
  if (userProfile.weightKg) {
    // Same bodyweight-aware formula as the detailed calculator, so switching goals
    // here and running the calculator never disagree on the numbers.
    const proteinPerKg = goal === 'bulk' ? 2.0 : (goal === 'cut' ? 2.2 : 1.8);
    proteinG = Math.round(userProfile.weightKg * proteinPerKg);
    const fatCals = cal * 0.28;
    fatG = Math.round(fatCals / 9);
    carbG = Math.round(Math.max(cal - proteinG * 4 - fatCals, 0) / 4);
  } else {
    // No known bodyweight yet (e.g. before onboarding) — fall back to a simple percentage split.
    const splits = { cut: [0.35, 0.35, 0.30], maintain: [0.30, 0.40, 0.30], bulk: [0.25, 0.50, 0.25] };
    const [pPct, cPct, fPct] = splits[goal];
    proteinG = Math.round(cal * pPct / 4);
    carbG = Math.round(cal * cPct / 4);
    fatG = Math.round(cal * fPct / 9);
  }
  document.getElementById('protein').value = proteinG;
  document.getElementById('carbs').value = carbG;
  document.getElementById('fat').value = fatG;
  dailyTargets.protein = proteinG; dailyTargets.carbs = carbG; dailyTargets.fat = fatG;
}
document.querySelectorAll('#goalSelect button').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('#goalSelect button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedGoal = btn.dataset.goal;
  document.getElementById('goalDesc').textContent = goalCopy[selectedGoal];
  applyGoalMacros(selectedGoal);
  saveProfileToFirestore();
}));


document.getElementById('calcRun').addEventListener('click', () => {
  const sex = document.getElementById('calcSex').value;
  const age = parseFloat(document.getElementById('calcAge').value);
  let weightKg, heightCm;
  if (unit === 'metric') {
    weightKg = parseFloat(document.getElementById('calcWeightKg').value);
    heightCm = parseFloat(document.getElementById('calcHeightCm').value);
  } else {
    weightKg = parseFloat(document.getElementById('calcWeightLb').value) * 0.453592;
    const ft = parseFloat(document.getElementById('calcHeightFt').value) || 0;
    const inch = parseFloat(document.getElementById('calcHeightIn').value) || 0;
    heightCm = (ft * 12 + inch) * 2.54;
  }
  const activity = parseFloat(document.getElementById('calcActivity').value);
  const knowsBodyFat = document.getElementById('knowBodyFat').checked;
  const bodyFatPct = parseFloat(document.getElementById('calcBodyFat').value);
  const weeklyGoalKg = parseFloat(document.getElementById('goalSlider').value);

  let resting, methodNote;
  if (knowsBodyFat && !isNaN(bodyFatPct) && bodyFatPct > 0) {
    const leanMassKg = weightKg * (1 - bodyFatPct / 100);
    resting = 370 + 21.6 * leanMassKg;
    methodNote = 'Estimated using your body fat % for extra accuracy.';
  } else {
    resting = sex === 'male'
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    methodNote = 'Estimated from your sex, age, height and weight.';
  }
  const dailyBurn = resting * activity;
  maintenanceCalories = dailyBurn;
  const dailyAdjustment = (weeklyGoalKg * 7700) / 7;
  const target = Math.round(dailyBurn + dailyAdjustment);
  const proteinPerKg = weeklyGoalKg > 0.05 ? 2.0 : (weeklyGoalKg < -0.05 ? 2.2 : 1.8);
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatCals = target * 0.28;
  const fatG = Math.round(fatCals / 9);
  const carbG = Math.round(Math.max(target - proteinG * 4 - fatCals, 0) / 4);

  const resultBox = document.getElementById('calcResult');
  resultBox.style.display = 'block';
  resultBox.innerHTML = `Resting calories: ~${Math.round(resting)} kcal/day<br>
    Daily burn with activity: ~${Math.round(dailyBurn)} kcal/day<br>
    <span style="color:var(--ink-soft)">${methodNote}</span><br><br>
    To ${goalText(weeklyGoalKg).toLowerCase()}, aim for <strong>${target} kcal/day</strong><br>
    Suggested split: ${proteinG}g protein, ${carbG}g carbs, ${fatG}g fat`;

  document.getElementById('calories').value = target;
  document.getElementById('protein').value = proteinG;
  document.getElementById('carbs').value = carbG;
  document.getElementById('fat').value = fatG;
  dailyTargets = { calories: target, protein: proteinG, carbs: carbG, fat: fatG };
  const syncedGoal = weeklyGoalKg < -0.05 ? 'cut' : (weeklyGoalKg > 0.05 ? 'bulk' : 'maintain');
  selectedGoal = syncedGoal;
  document.querySelectorAll('#goalSelect button').forEach(b => b.classList.toggle('active', b.dataset.goal === syncedGoal));
  document.getElementById('goalDesc').textContent = goalCopy[syncedGoal];
  saveProfileToFirestore();
});
['calories','protein','carbs','fat'].forEach(id => {
  document.getElementById(id).addEventListener('change', (e) => {
    dailyTargets[id] = parseFloat(e.target.value) || dailyTargets[id];
  });
});

/* ---------- AI Plan generator (structured JSON -> cards) ---------- */
document.getElementById('go').addEventListener('click', async () => {
  const btn = document.getElementById('go');
  const status = document.getElementById('status');
  const output = document.getElementById('output');
  const usePantry = document.getElementById('usePantry').checked;
  btn.disabled = true;
  status.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span> Working on your plan';
  output.innerHTML = '<div class="skeleton-line" style="width:90%"></div><div class="skeleton-line" style="width:75%"></div><div class="skeleton-line" style="width:85%"></div>';

  let userAsk;
  if (usePantry) {
    const pantry = document.getElementById('pantry').value;
    userAsk = `I have these ingredients at home: ${pantry}. Build a day of Lebanese-style meals using these where possible, and mention what else to add.`;
  } else {
    const { calories, protein, carbs, fat } = dailyTargets;
    userAsk = `Build one day of Lebanese meals hitting approximately ${calories} kcal, ${protein}g protein, ${carbs}g carbs, ${fat}g fat.`;
  }

  const goalInstructions = {
    cut: 'The goal is CUTTING (fat loss while preserving muscle). Act like an experienced coach building a real cut-phase day: prioritize high-protein, high-volume, lower-calorie-density foods (lean proteins, vegetables, fiber) so it stays satiating despite the deficit. Spread protein across meals.',
    maintain: 'The goal is MAINTENANCE. Build a balanced, everyday-sustainable day — nothing extreme, good variety, realistic portions.',
    bulk: 'The goal is BULKING (muscle gain). Act like an experienced coach building a real bulk-phase day: calorie-dense but still nutritious, enough carbs to fuel training and recovery, protein spread evenly across meals so it is not one huge dose at dinner.'
  };

  const restrictions = [];
  if (userProfile.allergies) restrictions.push(`Strictly avoid these allergens: ${userProfile.allergies}.`);
  if (userProfile.dislikes) restrictions.push(`Avoid these disliked foods: ${userProfile.dislikes}.`);

  const profileLine = userProfile.weightKg
    ? `User profile: ${userProfile.sex}, age ${userProfile.age}, ${userProfile.weightKg}kg, ${userProfile.heightCm}cm.`
    : '';

  const systemPrompt = `You are a Lebanese meal planning assistant working like a sports nutrition coach. Respond with ONLY valid JSON, no markdown fences, no extra text, matching exactly this shape:
{"coachNote":"one or two sentences, coach tone, explaining how this specific plan supports the stated goal","meals":[{"time":"Breakfast","name":"Dish name","description":"one short sentence","calories":000,"protein":00,"carbs":00,"fat":00}],"totals":{"calories":000,"protein":00,"carbs":00,"fat":00}}
${profileLine}
${goalInstructions[selectedGoal]}
${restrictions.join(' ')}
Use real Lebanese/Levantine dishes. Keep descriptions to one short sentence. Numbers must be realistic and the totals must be the sum of the meals.`;

  try {
    const response = await fetch('/.netlify/functions/gemini-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userAsk }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message);
    const raw = data.candidates[0].content.parts.map(p => p.text).join('');
    const plan = JSON.parse(raw);
    renderMealPlan(plan, output);
    status.textContent = usePantry ? 'Built from your pantry' : 'Built for your target';
  } catch (err) {
    output.innerHTML = `<div class="meta">Something went wrong generating the plan: ${err.message}</div>`;
    status.textContent = '';
  }
  btn.disabled = false;
});

function renderMealPlan(plan, container) {
  container.innerHTML = '';
  if (plan.coachNote) {
    const note = document.createElement('div');
    note.className = 'coach-note';
    note.innerHTML = `<span class="cn-tag">${selectedGoal}</span>${plan.coachNote}`;
    container.appendChild(note);
  }
  plan.meals.forEach((m, idx) => {
    const card = document.createElement('div');
    card.className = 'meal-card';
    card.innerHTML = `
      <div class="m-top"><span class="m-time">${m.time || ''}</span></div>
      <div class="m-name">${m.name}</div>
      <div class="m-desc">${m.description || ''}</div>
      <div class="macro-chips">
        <span class="macro-chip kcal">${m.calories} kcal</span>
        <span class="macro-chip p">${m.protein}g P</span>
        <span class="macro-chip c">${m.carbs}g C</span>
        <span class="macro-chip f">${m.fat}g F</span>
      </div>
      <button class="secondary small" data-logged="false" style="margin-top:10px;width:100%">Mark as eaten</button>`;
    const logBtn = card.querySelector('button');
    let loggedId = null;
    logBtn.addEventListener('click', () => {
      const logged = logBtn.dataset.logged === 'true';
      if (!logged) {
        loggedId = ++logIdCounter;
        logItems.push({ id: loggedId, name: m.name, calories: m.calories, protein: m.protein, carbs: m.carbs, fat: m.fat });
        logBtn.textContent = 'Logged ✓ (tap to undo)';
        logBtn.dataset.logged = 'true';
      } else {
        logItems = logItems.filter(i => i.id !== loggedId);
        logBtn.textContent = 'Mark as eaten';
        logBtn.dataset.logged = 'false';
        loggedId = null;
      }
      renderLog();
    });
    container.appendChild(card);
  });
  if (plan.totals) {
    const t = document.createElement('div');
    t.className = 'plan-totals';
    t.innerHTML = `
      <div><div class="t-num">${plan.totals.calories}</div><div class="t-lbl">kcal</div></div>
      <div><div class="t-num">${plan.totals.protein}g</div><div class="t-lbl">protein</div></div>
      <div><div class="t-num">${plan.totals.carbs}g</div><div class="t-lbl">carbs</div></div>
      <div><div class="t-num">${plan.totals.fat}g</div><div class="t-lbl">fat</div></div>`;
    container.appendChild(t);
  }
}

/* ---------- Manual plan builder ---------- */
let manualPlanItems = [];
document.getElementById('planMealAdd').addEventListener('click', () => {
  const name = document.getElementById('planMealName').value.trim();
  const calories = parseFloat(document.getElementById('planMealCals').value) || 0;
  const protein = parseFloat(document.getElementById('planMealProtein').value) || 0;
  const carbs = parseFloat(document.getElementById('planMealCarbs').value) || 0;
  const fat = parseFloat(document.getElementById('planMealFat').value) || 0;
  if (!name) return;
  manualPlanItems.push({ name, calories, protein, carbs, fat });
  ['planMealName','planMealCals','planMealProtein','planMealCarbs','planMealFat'].forEach(id => document.getElementById(id).value = '');
  renderManualPlan();
});
function renderManualPlan() {
  const list = document.getElementById('manualPlanList');
  if (manualPlanItems.length === 0) { list.innerHTML = '<div class="meta">No meals added yet.</div>'; return; }
  list.innerHTML = '';
  manualPlanItems.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'manual-item';
    row.innerHTML = `<div class="mi-top">
        <div>
          <div class="mi-name">${item.name}</div>
          <div class="macros-inline">${item.calories} kcal · <b>${item.protein}g</b> P · ${item.carbs}g C · ${item.fat}g F</div>
        </div>
        <div class="mi-actions"><button class="secondary" data-i="${idx}">Remove</button></div>
      </div>`;
    row.querySelector('button').addEventListener('click', () => { manualPlanItems.splice(idx, 1); renderManualPlan(); });
    list.appendChild(row);
  });
}

/* ---------- Nutrition chatbot ---------- */
const dishCache = {
  "ful medames|foul mdammas|ful mdammas|foul medames": "Ful medames (also spelled foul mdammas) is a breakfast dish of slow-cooked fava beans, mashed lightly and dressed with olive oil, lemon juice, and garlic. It's typically topped with chopped tomato, parsley, and a sprinkle of cumin, served warm with pita bread.",
  "hummus": "Hummus is a dip made from cooked chickpeas blended with tahini, lemon juice, garlic, and olive oil until smooth. Usually served drizzled with more olive oil, sometimes with whole chickpeas or paprika on top.",
  "fattoush": "Fattoush is a mixed salad of chopped tomatoes, cucumbers, radishes, lettuce, and mint, tossed with fried or toasted pita pieces, dressed with olive oil, lemon juice, and sumac.",
  "tabbouleh|tabouli": "Tabbouleh is a parsley-based salad — mostly finely chopped parsley with a smaller amount of bulgur, tomato, mint, onion, lemon juice, and olive oil.",
  "kibbeh": "Kibbeh is finely ground meat mixed with bulgur wheat and spices — served raw (kibbeh nayyeh), baked in a tray (kibbeh bil sayniyeh), or fried into stuffed shells (kibbeh mekliyeh).",
  "manakish|manoushe|man'ouche": "Manakish is a flatbread topped with either zaatar mixed with olive oil, or cheese, baked until the edges are crisp — often eaten folded for breakfast.",
  "mujaddara|mjadra": "Mujaddara is lentils and rice (or bulgur) cooked together, topped with deeply caramelized fried onions — a simple, filling vegetarian staple.",
  "shish taouk|shish tawook": "Shish taouk is skewered grilled chicken marinated in yogurt, garlic, lemon juice, and spices, usually served with garlic sauce, pickles, and pita or rice.",
  "kafta|kofta": "Kafta is ground meat mixed with parsley, onion, and spices, shaped into logs or patties and grilled or baked.",
  "freekeh": "Freekeh is young green wheat that's been roasted and cracked, giving it a smoky flavor — used like rice or bulgur.",
  "labneh": "Labneh is strained yogurt with a thick, cream-cheese-like texture, eaten as a dip or spread, usually drizzled with olive oil.",
  "toum": "Toum is a garlic sauce made by emulsifying garlic, oil, lemon juice, and salt into a thick, fluffy paste — no egg involved, very pungent.",
  "shawarma": "Shawarma is meat slow-roasted on a vertical rotating spit, shaved into thin slices, and wrapped in pita with garlic sauce or tahini and pickles.",
  "sambousek|sambusak": "Sambousek are small folded pastries filled with spiced meat or cheese, baked or fried until golden.",
  "warak enab|waraq enab|stuffed grape leaves": "Warak enab is grape leaves rolled around rice, sometimes with meat and herbs, then simmered until tender.",
  "baba ghanouj|baba ganoush|mutabbal": "Baba ghanouj is roasted, mashed eggplant mixed with tahini, garlic, lemon juice, and olive oil — the eggplant is charred first for a smoky flavor.",
  "knafeh|kunafa": "Knafeh is shredded phyllo or semolina layered over soft cheese, baked, then soaked in sugar-rosewater syrup and topped with crushed pistachios."
};
function checkCache(question) {
  const q = question.toLowerCase();
  for (const key in dishCache) {
    if (key.split('|').some(v => q.includes(v))) return dishCache[key];
  }
  return null;
}
const chatHistory = [];
function addBubble(text, who) {
  const win = document.getElementById('chatWindow');
  const div = document.createElement('div');
  div.className = 'bubble ' + who;
  div.textContent = text;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}
function addTypingBubble() {
  const win = document.getElementById('chatWindow');
  const div = document.createElement('div');
  div.className = 'bubble bot';
  div.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}
const chatTextarea = document.getElementById('chatInput');
chatTextarea.addEventListener('input', () => {
  chatTextarea.style.height = 'auto';
  chatTextarea.style.height = Math.min(chatTextarea.scrollHeight, 120) + 'px';
});
async function sendChat() {
  const text = chatTextarea.value.trim();
  if (!text) return;
  chatTextarea.value = '';
  chatTextarea.style.height = 'auto';
  addBubble(text, 'user');

  const cached = checkCache(text);
  if (cached) { addBubble(cached, 'bot'); return; }

  chatHistory.push({ role: 'user', content: text });
  const thinking = addTypingBubble();
  try {
    const response = await fetch('/.netlify/functions/groq-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 700,
        messages: [
          { role: 'system', content: 'You are a nutrition and cooking assistant focused only on food, dishes, ingredients, nutrition, and cooking instructions, with an emphasis on Lebanese and Levantine cuisine. Explain unfamiliar dishes clearly, and give detailed step-by-step recipes with quantities and timing when asked how to cook something. If asked about something unrelated to food, nutrition, or cooking, politely redirect back to food topics.' + (userProfile.allergies ? ` The user is allergic to: ${userProfile.allergies} — never suggest these.` : '') + (userProfile.dislikes ? ` The user dislikes: ${userProfile.dislikes} — avoid suggesting these where possible.` : '') },
          ...chatHistory
        ]
      })
    });
    const data = await response.json();
    const reply = data.choices && data.choices[0] ? data.choices[0].message.content : (data.error ? `Groq error: ${typeof data.error === 'string' ? data.error : data.error.message}` : 'Sorry, something went wrong.');
    thinking.textContent = reply;
    chatHistory.push({ role: 'assistant', content: reply });
  } catch (err) {
    thinking.textContent = 'Error: ' + err.message;
  }
}
document.getElementById('chatSend').addEventListener('click', sendChat);
chatTextarea.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } });

/* ---------- Daily log ---------- */
let logItems = [];
let logIdCounter = 0;
function renderLog() {
  saveLogToFirestore();
  const totals = logItems.reduce((s, i) => ({
    calories: s.calories + i.calories, protein: s.protein + i.protein, carbs: s.carbs + i.carbs, fat: s.fat + i.fat
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  document.getElementById('sumKcal').textContent = totals.calories;
  document.getElementById('sumKcalLbl').textContent = `of ${dailyTargets.calories} kcal`;
  document.getElementById('sumP').textContent = totals.protein + 'g';
  document.getElementById('sumC').textContent = totals.carbs + 'g';
  document.getElementById('sumF').textContent = totals.fat + 'g';
  document.getElementById('fillKcal').style.width = Math.min(100, Math.round(totals.calories / dailyTargets.calories * 100)) + '%';
  document.getElementById('fillP').style.width = Math.min(100, Math.round(totals.protein / dailyTargets.protein * 100)) + '%';
  document.getElementById('fillC').style.width = Math.min(100, Math.round(totals.carbs / dailyTargets.carbs * 100)) + '%';
  document.getElementById('fillF').style.width = Math.min(100, Math.round(totals.fat / dailyTargets.fat * 100)) + '%';

  const list = document.getElementById('logList');
  if (logItems.length === 0) { list.innerHTML = '<div class="meta">Nothing logged yet — scan or add something.</div>'; return; }
  list.innerHTML = '';
  logItems.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'log-item';
    row.innerHTML = `
      <div>
        <div class="n">${item.name}</div>
        <div class="macros-inline">${item.calories} kcal · <b>${item.protein}g</b> P · ${item.carbs}g C · ${item.fat}g F</div>
      </div>
      <div class="mi-actions">
        <button class="secondary small" data-act="edit">Edit</button>
        <button class="secondary small" data-act="remove">Remove</button>
      </div>`;
    row.querySelector('[data-act="remove"]').addEventListener('click', () => { logItems.splice(idx, 1); renderLog(); });
    row.querySelector('[data-act="edit"]').addEventListener('click', () => openLogEdit(row, item, idx));
    list.appendChild(row);
  });
}
function openLogEdit(row, item, idx) {
  const existing = row.querySelector('.edit-form');
  if (existing) { existing.remove(); return; }
  const form = document.createElement('div');
  form.className = 'edit-form open';
  form.innerHTML = `
    <label>Name</label><input class="e-name" value="${item.name}">
    <div class="macro-input-grid" style="margin-top:8px">
      <div><label>Kcal</label><input class="e-cal" value="${item.calories}"></div>
      <div><label>Protein</label><input class="e-p" value="${item.protein}"></div>
      <div><label>Carbs</label><input class="e-c" value="${item.carbs}"></div>
      <div><label>Fat</label><input class="e-f" value="${item.fat}"></div>
    </div>
    <button class="small" style="margin-top:10px;width:100%">Save changes</button>`;
  form.querySelector('button').addEventListener('click', () => {
    logItems[idx] = {
      name: form.querySelector('.e-name').value || item.name,
      calories: parseFloat(form.querySelector('.e-cal').value) || 0,
      protein: parseFloat(form.querySelector('.e-p').value) || 0,
      carbs: parseFloat(form.querySelector('.e-c').value) || 0,
      fat: parseFloat(form.querySelector('.e-f').value) || 0
    };
    renderLog();
  });
  row.appendChild(form);
}
document.getElementById('clearLog').addEventListener('click', () => { logItems = []; renderLog(); });
document.getElementById('manualAdd').addEventListener('click', () => {
  const name = document.getElementById('manualName').value.trim();
  const calories = parseFloat(document.getElementById('manualCals').value) || 0;
  const protein = parseFloat(document.getElementById('manualProtein').value) || 0;
  const carbs = parseFloat(document.getElementById('manualCarbs').value) || 0;
  const fat = parseFloat(document.getElementById('manualFat').value) || 0;
  if (!name) return;
  logItems.push({ name, calories, protein, carbs, fat });
  ['manualName','manualCals','manualProtein','manualCarbs','manualFat'].forEach(id => document.getElementById(id).value = '');
  renderLog();
});

/* ---------- Barcode scanner ---------- */
let scanner = null;
document.getElementById('scanStart').addEventListener('click', () => {
  document.getElementById('reader').style.display = 'block';
  document.getElementById('scanStart').style.display = 'none';
  document.getElementById('scanStop').style.display = 'block';
  scanner = new Html5Qrcode('reader');
  scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, onScanSuccess, () => {})
    .catch(err => { document.getElementById('scanResult').innerHTML = `<div class="meta">Couldn't access the camera: ${err}</div>`; });
});
document.getElementById('scanStop').addEventListener('click', stopScanner);
function stopScanner() {
  if (scanner) { scanner.stop().then(() => scanner.clear()).catch(() => {}); }
  document.getElementById('reader').style.display = 'none';
  document.getElementById('scanStart').style.display = 'block';
  document.getElementById('scanStop').style.display = 'none';
}
async function onScanSuccess(barcode) {
  stopScanner();
  const resultBox = document.getElementById('scanResult');
  resultBox.innerHTML = '<div class="meta">Looking up ' + barcode + '...</div>';
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    const data = await res.json();
    if (data.status !== 1) { resultBox.innerHTML = `<div class="meta">No product found for ${barcode}. Try adding it manually below.</div>`; return; }
    const p = data.product;
    const name = p.product_name || p.generic_name || 'Unknown product';
    const n = p.nutriments || {};
    const per100 = {
      calories: n['energy-kcal_100g'] ? Math.round(n['energy-kcal_100g']) : 0,
      protein: n['proteins_100g'] ? Math.round(n['proteins_100g']) : 0,
      carbs: n['carbohydrates_100g'] ? Math.round(n['carbohydrates_100g']) : 0,
      fat: n['fat_100g'] ? Math.round(n['fat_100g']) : 0
    };
    const img = p.image_front_small_url || '';
    resultBox.innerHTML = `
      <div class="product-card">
        ${img ? `<img src="${img}">` : ''}
        <div class="product-info">
          <div class="name">${name}</div>
          <div class="cals">${per100.calories} kcal / 100g</div>
        </div>
      </div>
      <div class="row" style="margin-top:12px"><div style="flex:1"><label>Grams eaten</label><input id="scanGrams" value="100"></div></div>
      <button id="scanAddBtn" type="button">Add to today's log</button>`;
    document.getElementById('scanAddBtn').addEventListener('click', () => {
      const grams = parseFloat(document.getElementById('scanGrams').value) || 100;
      const factor = grams / 100;
      logItems.push({
        name: `${name} (${grams}g)`,
        calories: Math.round(per100.calories * factor),
        protein: Math.round(per100.protein * factor),
        carbs: Math.round(per100.carbs * factor),
        fat: Math.round(per100.fat * factor)
      });
      renderLog();
      resultBox.innerHTML = "<div class=\"meta\">Added to today's log.</div>";
    });
  } catch (err) {
    resultBox.innerHTML = `<div class="meta">Lookup failed: ${err.message}</div>`;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
}
