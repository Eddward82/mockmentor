# MockMentor — AI Interview Coaching App

MockMentor is an AI-powered interview coaching platform that helps job seekers practice and improve their interview skills through real-time feedback, performance analytics, and personalized coaching.

## Features

- **AI Interview Simulation** — Practice with a realistic AI interviewer powered by Google Gemini
- **Real-time Feedback** — Get instant feedback on your answers, tone, and delivery
- **Performance Dashboard** — Track your progress over time with detailed analytics and charts
- **Video Capture** — Record yourself during practice sessions for self-review
- **Multiple Interview Types** — Behavioral, technical, and role-specific interview prep
- **Subscription Plans** — Free, Professional, and Premium tiers via Lemon Squeezy
- **Dark Mode** — Full light/dark theme support

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **AI**: Google Gemini API
- **Auth & Database**: Firebase (Authentication + Firestore)
- **Hosting**: Firebase Hosting
- **Payments**: Lemon Squeezy
- **Backend**: Firebase Cloud Functions (webhook handler)

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Google Gemini API key

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Eddward82/mockmentor.git
   cd mockmentor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173` in your browser.

### Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key (required).
- `GEMINI_MODEL`: Gemini model name to use for all Gemini calls (optional, defaults to `gemini-2.5-flash`).

Example `.env.local`:

```env
GEMINI_API_KEY=your_api_key
GEMINI_MODEL=gemini-2.5-flash
```

### Deploy

**Frontend:**
```bash
npm run build
firebase deploy --only hosting
```

**Cloud Functions:**
```bash
firebase deploy --only functions
```

## Project Structure

```
mockmentor/
├── components/         # React components
├── services/           # Firebase, Gemini, Lemon Squeezy services
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── tests/              # Unit tests
├── functions/          # Firebase Cloud Functions (webhook)
├── public/             # Static assets
├── App.tsx             # Root component with routing
└── types.ts            # TypeScript types
```

## Live App

Visit [mockmentor.app](https://mockmentor.app)

## License

© 2025 MockMentor. All rights reserved.
