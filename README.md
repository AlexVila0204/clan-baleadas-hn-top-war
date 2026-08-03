# Clan Baleadas HN — War Stats

Clash Royale Clan War Stats dashboard for tracking monthly player rankings and war performance.

Built for **Clan Baleadas** (#LCY8L80V) from Honduras.

## Features

- Monthly war performance tracking with player rankings
- Animated Top 3 podium with metallic rank badges (Gold, Silver, Bronze)
- Full ranking table with fame progress bars
- Expandable per-war detail cards with individual player breakdowns
- Auto-updating data via GitHub Actions (every 6 hours)
- Deployable as a static site on GitHub Pages — no backend required

## Tech Stack

- **Vanilla JS** — no frameworks, fast and lightweight
- **GSAP** — smooth entrance animations and staggers
- **Lucide Icons** — crisp SVG icons, zero emoji
- **Google Fonts** — Unbounded, Plus Jakarta Sans, Space Mono
- **GitHub Actions** — automated data refresh and deployment

## Local Development

```bash
# Install dependencies
pnpm install

# Create a .env file with your Clash Royale API token
echo CR_API_TOKEN=your_token_here > .env

# Start the dev server
node server.js
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

Data auto-updates via the GitHub Actions workflow. Set the following secrets in your repo:

| Secret | Description |
|--------|-------------|
| `SC_EMAIL` | Your Supercell developer portal email |
| `SC_PASSWORD` | Your Supercell developer portal password |

The workflow runs every 6 hours, creates a temporary API key for the runner's IP, fetches fresh data, and deploys to GitHub Pages.

## License

[MIT](LICENSE)
