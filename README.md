# Nozzle Game

Educational web app for rocket nozzle design (quasi-1D toy model + placeholder modules).

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- React Router

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Deploy (GitHub Pages)

Live site: **https://gjwjdansnu-del.github.io/nozzle-game/**

Pushes to `main` trigger `.github/workflows/deploy.yml`. In the repo **Settings → Pages**, set **Source** to **GitHub Actions** (first deploy may prompt this).

## Routes

| Path | Module |
|------|--------|
| `/` | Home — mode selection |
| `/quasi-1d` | Quasi-1D nozzle design (implemented) |
| `/moc` | 2D minimum-length MOC nozzle design (implemented) |
| `/moc-bl-correction` | Coming soon |
| `/cfd` | Coming soon |
