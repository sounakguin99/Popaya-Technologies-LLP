# Real Estate Lead Profiling and Management System

[![Deployed on Render](https://img.shields.io/badge/Deployed%20on-Render-success?logo=render)](https://popaya-technologies-llp.onrender.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](#)
[![InversifyJS](https://img.shields.io/badge/InversifyJS-Dependency%20Injection-blue)](#)

A backend REST API built to import, clean, deduplicate, and analyze real estate lead data. Built with **Node.js, Express, TypeScript, and InversifyJS** for robust dependency injection.

---

## 🚀 Live Demo (Render)
The application is deployed and accessible via Render:
* **Base URL:** `https://popaya-technologies-llp.onrender.com`
* **Health Check:** [https://popaya-technologies-llp.onrender.com/](https://popaya-technologies-llp.onrender.com/)
* *(Note: Render spins down inactive free instances, so the first request may take ~30 seconds to wake up).*

---

## 🏗️ Architectural & Implementation Notes

### 1. Dependency Injection (InversifyJS)
The application strictly follows SOLID principles. I utilized InversifyJS for Dependency Injection (`@injectable`, `@controller`), which decouples the `LeadController` from the `LeadService`. This ensures the codebase is highly testable and scalable (e.g., swapping the file-based storage for a MongoDB repository in the future).

### 2. Data Validation & Cleaning
Raw data is notoriously messy. I implemented a strict validation utility (`src/utils/validators.ts`) that standardizes the data before it enters the system:
* **Phone Numbers:** Standardized to `E.164` format (stripping spaces/dashes and adding `+`). This is critical because the phone number acts as our unique identifier.
* **Budgets:** Handled strings like `"$300,000"`, `"1.5M"` or `"500K"` parsing them into pure integers.
* **Property Types:** Enforced strict literal unions (`"sale" | "rental"`).
* Invalid records are not blindly discarded; they are flagged with `is_valid: false` and a `validation_errors` array so the frontend can display exact issues to the user.

### 3. Smart Deduplication Strategy
The prompt required identifying and managing duplicates via phone number. Rather than simply *deleting* duplicates (which results in lost business intelligence), I chose to **group** them.
If a user (e.g., John Doe) inquires about renting an apartment in January and buying a house in February, both inquiries share the same phone number. The `GET /lead/:phone` endpoint combines these into a single unified `LeadProfile`, separating his `sale_leads` and `rental_leads`.

---

## 💻 Local Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sounakguin99/Popaya-Technologies-LLP.git
   cd Popaya-Technologies-LLP
   ```
2. **Install Dependencies**
   ```bash
   npm install
   ```
3. **Run the Development Server**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:8000`.