# Drug Intake Organizer — MVP Specification (Day 1 Build)

## Overview
**Drug Intake Organizer** is a wellness web application that helps users plan, visualize, and track the intake of medications, supplements, and recreational substances.  
It provides **official reference information**, **interaction warnings**, and **schedule proposals** based strictly on authoritative sources.  
All recommendations are informational only — users remain fully in control of their intake schedule.

This document defines the **Day‑1 MVP**: the minimum functional version of the application that satisfies the Full Stack Engineer certification requirements.

---

# 1. MVP Goals
The MVP must:

- Allow users to enter medications, supplements, and recreational substances.
- Generate a **proposed intake schedule** based on:
  - user‑defined frequency and timing  
  - official guidelines (timing windows, food interactions, alcohol/cannabis warnings, etc.)
- Display **interaction warnings** with links to official sources.
- Provide a **calendar view** and **agenda view** of intake events.
- Track **remaining stock** and predict run‑out dates.
- Allow users to **freely override** any proposed schedule.
- Integrate with **official reference APIs** (NIH, DailyMed, FDA SRS, NIH Supplement DB).
- Store all user data in PostgreSQL.
- Run on a Node.js/Express backend.
- Use React + Vite + Tailwind for the frontend.
- Deploy on Render.

---

# 2. Core MVP Features

## 2.1 User Authentication
- Register / Login / Logout  
- Email + password  
- JWT or secure cookie sessions  
- User profile fields:
  - name  
  - timezone  
  - optional: age range (for guideline filtering)

---

## 2.2 Substance Catalog (User‑Defined Items)
Users can add any intake item:

- Prescription drugs  
- OTC medications  
- Supplements  
- Vitamins  
- Alcohol  
- Nicotine products  
- Cannabis products  
- Other recreational substances  

**Fields:**
- `name`
- `category` (drug, supplement, alcohol, nicotine, cannabis, other)
- `dosage_per_intake` (e.g., “10 mg”, “1 tablet”, “2 drinks”)
- `frequency` (daily, weekly, custom)
- `times_of_day` (morning, noon, evening, bedtime)
- `container_quantity` (e.g., 60 tablets)
- optional: `notes`

---

## 2.3 Official Reference Information (Informational Only)

### Sources
- **NIH DailyMed API**  
  - drug monographs  
  - dosing guidelines  
  - warnings  
  - interactions  
  - food/alcohol interactions  
- **FDA Substance Registration System (SRS)**  
  - ingredient-level data  
- **NIH Dietary Supplement Label Database**  
  - supplement facts  
  - usage guidelines  
- **NIH / CDC / NIDA**  
  - alcohol interaction notes  
  - nicotine interaction notes  
  - cannabis interaction notes  

### Displayed Information
- Official description  
- Recommended timing windows  
- Food interactions  
- Alcohol/cannabis/nicotine interactions  
- Contraindications  
- Known drug–drug interactions  
- Links to the official source pages

### Safety Language
> “This information is provided directly from official sources. It is for informational purposes only and is not medical advice.”

---

## 2.4 Interaction Engine (Day‑1 MVP Version)

The Interaction Engine performs **three tasks**:

### 1. Interaction Detection
Given the user’s list of substances, the engine:

- Fetches official interaction data for each item.
- Compares items against each other.
- Produces a list of **known interactions**, each with:
  - description  
  - severity (if provided by the source)  
  - link to the official source  

### 2. Schedule Proposal Generation
The engine generates a **proposed intake schedule** based on:

- user-defined frequency  
- user-defined times of day  
- official timing guidelines (e.g., “take with food”, “avoid alcohol within 4 hours”, “do not combine with sedatives”)  
- interaction constraints (e.g., “avoid combining X and Y within the same time window”)  

**Important:**  
The engine **does not** make clinical decisions.  
It only arranges intake times to **respect official timing guidelines**.

### 3. User Override
Users can freely:

- modify times  
- change frequency  
- ignore warnings  
- override the proposed schedule entirely  

The UI must clearly state:

> “This schedule is a proposal based on official guidelines. You may freely adjust it. Consult with your healthcare provider for official recommendations or to address any concerns.”

---

## 2.5 Calendar & Agenda Views

### Agenda View (Daily)
Shows:
- time  
- item name  
- dosage  
- official timing notes (e.g., “take with food”)  
- interaction warnings (if applicable)

### Calendar View (7–30 days)
Shows:
- scheduled intake events  
- color-coded interaction warnings  
- projected run-out dates  

---

## 2.6 Stock Tracking
For each item:

- initial quantity  
- auto-decrement based on scheduled doses  
- projected run-out date  
- “low stock” warnings  
- (future) email/text reminders

---

# 3. Backend Requirements (Node.js + Express)

## 3.1 API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Substances
- `GET /api/items`
- `POST /api/items`
- `GET /api/items/:id`
- `PUT /api/items/:id`
- `DELETE /api/items/:id`

### Schedule
- `GET /api/schedule?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - returns proposed schedule + user overrides

### Interactions
- `GET /api/interactions`
  - returns interaction warnings + official source links

### Reference Info
- `GET /api/reference/:itemId`
  - proxy to official APIs  
  - returns structured reference data + source URLs

### Stock
- `GET /api/stock`
  - returns remaining quantity + run-out date

---

## 3.2 Database Schema (PostgreSQL)

### users
- id  
- email  
- password_hash  
- timezone  
- created_at  
- updated_at  

### items
- id  
- user_id  
- name  
- category  
- dosage_per_intake  
- frequency  
- times_of_day (array)  
- container_quantity  
- created_at  
- updated_at  

### schedule_overrides
- id  
- item_id  
- user_id  
- date  
- time  
- dosage  
- notes  

---

# 4. Frontend Requirements (React + Vite + Tailwind)

## 4.1 Pages
- Login  
- Register  
- Dashboard  
- Calendar  
- Item List  
- Item Details  
- Interaction Overview  
- Reference Info Panel  

## 4.2 Components
- `TodayAgenda`  
- `CalendarStrip`  
- `LowStockAlerts`  
- `ItemList`  
- `ItemForm`  
- `ItemDetails`  
- `InteractionWarnings`  
- `ReferencePanel`  
- `ScheduleProposal`  

---

# 5. Security Requirements
- JWT or secure cookies  
- bcrypt password hashing  
- Helmet for HTTP headers  
- Rate limiting on auth routes  
- Input validation (Zod/Joi)  
- Authorization middleware ensuring users only access their own items  

---

# 6. Testing Requirements

## Backend (Jest + Supertest)
- Auth flow  
- CRUD for items  
- Schedule generation logic  
- Interaction engine (mock official API responses)

## Frontend (React Testing Library)
- ItemForm validation  
- Dashboard rendering  
- Interaction warnings display  
- Schedule proposal rendering  

---

# 7. Deployment Requirements
- Deploy backend as Render Web Service  
- Deploy frontend as Render Static Site  
- Configure environment variables:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - official API keys (if required)  
- Run migrations on startup  

---

# 8. Day‑1 Build Checklist

### Backend
- [ ] Initialize Express project  
- [ ] Connect PostgreSQL  
- [ ] Create `users`, `items`, `schedule_overrides` tables  
- [ ] Implement auth routes  
- [ ] Implement item CRUD  
- [ ] Implement schedule proposal endpoint  
- [ ] Implement interaction engine (MVP version)  
- [ ] Implement reference info proxy  
- [ ] Add security middleware  
- [ ] Add basic tests  

### Frontend
- [ ] Initialize Vite + React + Tailwind  
- [ ] Build Login/Register pages  
- [ ] Build Dashboard (agenda + low stock)  
- [ ] Build Item List + Item Form  
- [ ] Build Item Details + Reference Panel  
- [ ] Build Interaction Overview  
- [ ] Build Calendar View  
- [ ] Add basic tests  

### Deployment
- [ ] Deploy backend to Render  
- [ ] Deploy frontend to Render  
- [ ] Connect environment variables  
- [ ] Verify API connectivity  
- [ ] Verify schedule + interactions work end-to-end  