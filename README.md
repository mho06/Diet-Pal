# DietPal 🥙

A Lebanese-focused nutrition and meal-planning app that uses AI to build real, goal-aware diet plans (cut / maintain / bulk), lets users track what they actually eat, and understands local food the way generic Western nutrition apps don't.

## The Problem

Apps like MyFitnessPal and Cronometer are built around Western food databases and generic meal suggestions. They don't understand Lebanese/Levantine dishes, don't reason about local eating habits, and gate genuinely useful features behind paid tiers. DietPal combines real AI-driven coaching with a food culture it actually understands.

## What It Does

- **Onboarding** — quick questionnaire (body stats, goal, allergies, dislikes) that instantly computes a personalized calorie and macro target
- **Plan** — AI-generated daily meal plans built from real Lebanese dishes, with coach-style reasoning for cut/maintain/bulk goals — or build your own manually
- **Ask** — a chatbot scoped to food, nutrition, and cooking that explains Lebanese dishes and gives step-by-step recipes
- **Track** — barcode scanning, manual entry, and a running daily total of calories and macros against personal targets
- **RAG-grounded knowledge** — a real database of Lebanese dishes with embeddings, so the chatbot and meal planner retrieve real dish data instead of guessing from memory

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | HTML / CSS / JS, mobile-first responsive, PWA (manifest + service worker) |
| Auth & Data | Firebase Authentication (email/password) + Firestore |
| AI | Groq (chat) + Gemini (structured plan generation), always called through a serverless proxy |
| RAG | Gemini embeddings + vector search (Firestore vector search or in-memory cosine similarity) |
| Product Data | Open Food Facts API, with manual-entry fallback |
| Hosting | Netlify — static hosting + serverless functions for the AI proxy |

## Project Structure

```
Diet-Pal/
├── public/                 # Static frontend assets, PWA manifest, service worker
├── src/
│   ├── auth/                # Login, signup, session handling
│   ├── onboarding/           # Onboarding wizard
│   ├── plan/                 # Plan tab UI + AI plan generation
│   ├── track/                 # Barcode scanner, manual add, daily tracker
│   ├── ask/                    # Chatbot UI + chat integration
│   ├── rag/                     # Dish knowledge base + embeddings + retrieval
│   └── shared/                   # Nav bar, profile modal, shared components
├── functions/               # Netlify serverless functions (AI proxy, Firebase calls)
├── firestore.rules          # Firestore security rules
├── netlify.toml
└── README.md
```

## Team & Ownership

| Member | Owns |
|---|---|
| **Member 1** (Backend, Deployment & Plan-Generation AI) | Firebase setup, AI serverless proxy, meal-plan generation AI, Netlify deployment |
| **Member 2** (Onboarding & Planning UI + RAG) | Login/signup, onboarding wizard, Plan tab UI, dish knowledge base + embeddings + retrieval |
| **Member 3** (Tracking & Polish + Chat AI) | Track tab, Ask tab UI + chat integration, profile/nav, overall responsive polish, demo materials |

## Getting Started

### Prerequisites
- Node.js (v18+)
- A Firebase project (Auth + Firestore enabled)
- API keys for Groq and Gemini
- Netlify CLI (`npm install -g netlify-cli`)

### Setup

```bash
git clone https://github.com/mho06/Diet-Pal.git
cd Diet-Pal
npm install
```

Create a `.env` file (never commit this) with:

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
GROQ_API_KEY=
GEMINI_API_KEY=
```

Run locally:

```bash
netlify dev
```

## Non-Negotiables

- API keys must never be visible in the browser's page source
- Login/signup must actually validate — no accepting empty or fake credentials
- No flash of the wrong screen (e.g. main app before redirect to login) on page load
- Firestore security rules must restrict each user to their own data before any public sharing of the link

## Milestones

| Day | Goal |
|---|---|
| Day 1 | Auth + onboarding working end-to-end; basic AI plan generation returning real output |
| Day 2 | Chat, barcode scanning, and daily tracking wired up; dish knowledge base populated |
| Day 3 | Bug fixes, visual polish pass, PWA install working, Firestore rules locked down |
| Final Day | Demo script rehearsed, submission materials finalized, full end-to-end test on a real phone |

## License

TBD
