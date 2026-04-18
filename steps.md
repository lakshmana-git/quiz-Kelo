# Quizz Kelo — Build Plan

## Step 1 — Project Scaffolding & Repo Structure ✅
- Monorepo with `client/` (React + Vite) and `server/` (Express)
- `.env` for Mongo URI, JWT secret, ports
- Root `package.json` with dev scripts for both apps

## Step 2 — Database Design & MongoDB Models ✅
- `User`: name, passwordHash, role (admin/player)
- `Quiz`: title, joinCode, createdBy, status, timer
- `Question`: quizId, text, options[], correctIndex, order
- `Session`: quizId, currentQuestionIndex, startedAt
- `Answer`: quizId, userId, questionId, selectedIndex, timeTaken, score

## Step 3 — Auth API ✅
- `POST /api/auth/signup` — bcrypt hash, return JWT
- `POST /api/auth/login` — verify credentials, return JWT
- `authenticate` middleware for protected routes

## Step 4 — Quiz CRUD API ✅
- `POST /api/quiz` — admin creates quiz (title + timer)
- `POST /api/quiz/:id/questions` — add questions
- `GET /api/quiz/:id` — fetch quiz with questions
- `PATCH /api/quiz/:id/submit` — mark quiz ready
- `POST /api/quiz/join` — joinCode lookup, return quiz info

## Step 5 — Socket.IO Real-Time Layer ✅
- Socket.IO with rooms keyed by joinCode
- Events: admin:start-quiz, admin:next-question, player:answer, admin:show-results
- Score calculation: base points + speed bonus
- 150+ concurrent users via efficient room management

## Step 6 — Landing Page & React Routing ✅
- React Router v6 routes: `/`, `/signup`, `/create-quiz`, `/quiz/:id/lobby`, `/quiz/:id/play`, `/quiz/:id/results`, `/join`
- Landing: "Create Quiz" + "Join Quiz" CTAs on purple gradient

## Step 7 — Admin Flow UI ✅
- Signup form → POST /api/auth/signup
- Create Quiz page: title + timer form
- Add Questions page: question + 4 options + correct answer marker
- Lobby: shows joinCode, player list, Start Quiz button

## Step 8 — Player Flow UI ✅
- Join page: enter joinCode + name
- Waiting room: welcome message + animated waiting
- Question screen: options, countdown timer bar, selection highlight

## Step 9 — Results & Leaderboard UI ✅
- Top 3 podium (gold/silver/bronze) with confetti
- Full ranked list: rank, name, score
- Review button for answer walkthrough

## Step 10 — Styling (Plain CSS) ✅
- Purple gradient theme: #7B2FF7 → #F107A3
- Mobile-first, modular CSS files in `src/styles/`
- Card whites, green correct answers, pill buttons
