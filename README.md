# Badminton Scoring App

A comprehensive web application for tracking badminton scores, managing players, and calculating ELO rankings. Designed to help groups organize fair match sessions and track their progress over time.

## Features

- **Match Tracking**: Score tracking for singles and doubles games with support for custom scoring formats (e.g., 21 points, 15 points, win-by-2).
- **Player Management**: Create and manage player profiles including handedness and initial skill levels (Beginner, Intermediate, Advanced).
- **ELO Ranking System**: 
  - Separate rankings for Singles and Doubles.
  - Team-based ELO calculations for accurate pair strength assessment.
- **Statistics & Insights**:
  - Historical match scores.
  - Player stats including win streaks, best partners, and nemesis tracking.
  - Rating history visualization using charts.
- **Match Sessions**: 
  - Group games into sessions.
  - Smart schedule generation to create fair and challenging matches based on player ELOs.
- **Data Persistence**: Uses `localStorage` to save all data directly in the browser.

## Tech Stack

- **[Vite](https://vitejs.dev/)**: Next Generation Frontend Tooling.
- **Vanilla JavaScript**: Core logic and DOM manipulation.
- **[Chart.js](https://www.chartjs.org/)**: For rendering rating history graphs.
- **CSS**: Custom styling for a responsive user interface.

## Getting Started

### Prerequisites

- Node.js (version 16+ recommended)
- npm

### Installation

1. Clone the repository (if applicable) or navigate to the project directory.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

## Usage

- **Home**: Dashboard showing recent activity and quick actions.
- **Players**: Add new players or view existing profiles and stats.
- **New Match**: Start a new game, select players, and track scores in real-time.
- **Sessions**: Create a matchmaking session for a group of players to generate balanced games.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Previews the production build locally.

## License

MIT
