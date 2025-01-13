# Mars Terraforming Game

A browser-based game where you terraform Mars by managing resources and upgrading your colony.

## Features

- Resource management (oxygen, water, temperature, energy)
- Upgrades system
- Random events
- AI agent assistance (requires OpenAI API key)
- Critical resource monitoring

## Deployment

The game is deployed at: https://YOUR_USERNAME.github.io/curmars/

## How to Play

1. Start by generating resources
2. Purchase upgrades to improve resource generation
3. Keep resources above critical levels (5%)
4. Reach 100% oxygen, 100% water, and 15°C to win!

## Setup Instructions

### Prerequisites

- Node.js (version 14 or higher)
- npm (version 6 or higher)

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/YOUR_USERNAME/curmars.git
   cd curmars
   ```

2. Install the dependencies:
   ```sh
   npm install
   ```

## Running the Project Locally

1. Start the development server:
   ```sh
   npm run dev
   ```

2. Open your browser and navigate to `http://localhost:3000` to see the game in action.

## Deploying to GitHub Pages

1. Build the project:
   ```sh
   npm run build
   ```

2. Deploy to GitHub Pages:
   ```sh
   npm run deploy
   ```

3. The game will be available at `https://YOUR_USERNAME.github.io/curmars/`.
