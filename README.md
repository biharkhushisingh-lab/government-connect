# Government Contractor Anti-Corruption System

A comprehensive, microservices-based platform designed to eliminate corruption in government contracts through transparency, AI-driven fraud detection, and blockchain-backed immutability.

## 🚀 Project Overview

This system bridges the gap between Contractors and the Government by providing a secure portal for bid submissions, project tracking, and automated auditing.

### Key Features
-   **AI Fraud Detection**: Analyzes invoices and claims for anomalies, price inflation, and image tampering.
-   **Blockchain Registry**: Stores critical audit logs and transaction history on an immutable ledger.
-   **Real-time Monitoring**: Tracks project progress with GPS-tagged evidence and performance metrics.
-   **Secure Payments**: Automated milestone-based payments triggered by verified deliverables.

---

## 🏗 System Architecture

The project tracks a microservices architecture:

-   **Frontend** (`/frontend`): Next.js 14 application serving two distinct portals:
    -   **Government Portal**: For reviewing bids, approving milestones, and monitoring risk.
    -   **Contractor Portal**: For submitting bids, uploading evidence, and managing profiles.
-   **Backend** (`/backend`): Node.js/Express API Gateway.
    -   Handles authentication, data aggregation, and orchestration between services.
    -   Manages the PostgreSQL database.
-   **AI Service** (`/ai-service`): Python FastAPI service.
    -   **Fraud Engine**: Detects financial anomalies.
    -   **Visual Forensics**: Validates image metadata and detects Photoshop tampering.
    -   **Risk Scoring**: Calculates real-time vendor risk profiles.
-   **Blockchain** (`/blockchain`): Hardhat/Ethereum environment.
    -   Smart contracts for Project Registry and Payments.
    -   Ensures audit trails cannot be altered.

---

## 🛠 Prerequisites

Ensure you have the following installed before starting:

-   **Node.js**: v18+ (LTS recommended)
-   **Python**: v3.9+
-   **PostgreSQL**: Local or cloud instance (v14+)
-   **MetaMask**: Browser extension for blockchain interactions
-   **Git**: For version control

---

## 📦 Installation & Setup

### 1. Database Setup
Create a PostgreSQL database named `gov_contractor` (or as defined in your .env).

```sql
CREATE DATABASE gov_contractor;
```

### 2. Backend Setup
Configure the core API service.

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```env
# Backend Environment Variables
PORT=5000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=gov_contractor

# Security
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=1d

# AI Service Integration
AI_SERVICE_URL=http://localhost:8000
```
*Note: See `.env.example` in the backend folder for a full list.*

**Start the Backend:**
```bash
npm start
```
*Server will run on `http://localhost:5000`*

### 3. AI Service Setup
Set up the Python environment for fraud detection.

```bash
cd ai-service
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

**Start the AI Service:**
```bash
python main.py
```
*Service will run on `http://localhost:8000`*

### 4. Blockchain Setup (Optional for Dev)
If you need to deploy local smart contracts.

```bash
cd blockchain
npm install
npx hardhat node
```
*Local node runs on `http://127.0.0.1:8545`*

### 5. Frontend Setup
Launch the user interface.

```bash
cd frontend
npm install
npm run dev
```
*App will run on `http://localhost:3000`*

---

## 🚦 Usage

1.  **Register**: Open `http://localhost:3000` and register as a **Contractor** or **Government Official**.
2.  **Submit Bid** (Contractor): Navigate to open tenders and submit a proposal.
3.  **Review System** (Government): Check the dashboard for AI-flagged risk scores on new bids.
4.  **Upload Evidence**: Contractors upload photos of work; AI validates location and consistency.

## 🤝 Contribution

1.  Fork the repository.
2.  Create a feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit changes (`git commit -m 'Add AmazingFeature'`).
4.  Push to branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

Distributed under the MIT License.
