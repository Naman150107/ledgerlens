# LedgerLens

LedgerLens is a high-fidelity, AI-powered financial ledger extraction and analytics dashboard. It allows users to upload receipts or ledger sheets, extract structured transactional data using Gemini, and visualize the data in a beautiful dashboard matching the Stripi design language.

## Key Features

- **AI-Powered Extraction**: Extract transaction details (date, description, amount, confidence) from image uploads using Gemini with entry-level calibration.
- **Analytics Dashboard**: View financial trends, daily transaction volume, confidence logs, and category breakdowns using Recharts.
- **Flexible Database Integration**: Synchronize transactions with Supabase or fall back gracefully to browser LocalStorage.
- **Premium Aesthetics**: Built using Tailwind CSS v4 and the Inter typeface, adhering to strict design guidelines for layout, colors, and typography.

---

## Local Setup

### 1. Prerequisites

Since the `.env.local` file contains sensitive API keys, it is ignored by Git. You must create one in the project root to run the application locally.

Create a file named `.env.local` in the `ledgerlens-main` directory with the following content:

```env
# Gemini API Key (required for real AI extraction)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Credentials (optional, falls back to LocalStorage)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 2. Install Dependencies

Install the required npm packages:

```bash
npm install
```

### 3. Run Development Server

Start Vite's local development server with the integrated API proxy:

```bash
npm run dev
```

The application will be accessible at [http://localhost:5173](http://localhost:5173).

---

## Production & Quality Tools

### Build for Production

Compile and optimize the project for production deployment:

```bash
npm run build
```

### Run Linter

Ensure code quality and style standards are met using ESLint:

```bash
npm run lint
```
