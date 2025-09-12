
# codenex-images (UI)

AI-powered image generation and editing UI built with React, Vite, Tailwind, and Auth0 — deployed on Vercel.

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Auth0](https://img.shields.io/badge/Auth0-Authentication-orange?logo=auth0&logoColor=white)](https://auth0.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

## Overview

This is the frontend UI for Codenex Images — an app that lets users generate and edit images using Google Gemini models. It provides login with Auth0, a canvas-based editing flow, and a polished Tailwind UI.

This UI is paired with a backend service that proxies Gemini, persists data, and enforces generation limits:

- Backend repository: [(https://github.com/Nikunj2003/codenex-images-api](https://github.com/Nikunj2003/codenex-images-api)

## Tech Stack

- React 18 + TypeScript
- Vite 5 (build and dev server)
- Tailwind CSS 3
- Auth0 (authentication)
- Zustand + TanStack Query
- Vercel (deployment)

## Project Structure

- `src/components` — UI components and dialogs
- `src/services` — API, Auth, Gemini, image processing helpers
- `src/store` — Zustand stores
- `src/hooks` — Hooks for API auth, image generation, shortcuts
- `src/utils` — Utilities (API retry, Auth0 helpers, etc.)

## Prerequisites

- Node.js 18+ (Node 20 recommended)
- A Vercel account (for deployment)
- Auth0 application (SPA) with callback URL configured
- Access to the paired backend (codenex-images-api)

## Getting Started

1) Install dependencies

```bash
npm install
```

2) Configure environment variables

Copy `.env.example` to `.env.local` and fill in values:

```env
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your_auth0_spa_client_id
VITE_AUTH0_AUDIENCE=your_auth0_api_audience
VITE_AUTH0_REDIRECT_URI=http://localhost:5173
VITE_API_URL=http://localhost:3000
```

3) Start the dev server

```bash
npm run dev
```

The app will be available at http://localhost:5173.

## Available Scripts

- `npm run dev` — Start Vite dev server
- `npm run build` — Build for production to `dist/`
- `npm run preview` — Preview the production build locally
- `npm run lint` — Run ESLint

## Deployment (Vercel)

This repo includes a GitHub Actions workflow that deploys to Vercel on pushes to `main`.

Set these GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Also configure the same environment variables in Vercel Project Settings (Build & Runtime > Environment Variables) that you use locally from `.env.example`.

To deploy manually from your machine you can also use:

```bash
npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

## Notes on the Backend

The UI expects the backend at `VITE_API_URL` and uses Auth0 access tokens to call protected endpoints. The backend should:

- Sync user on login
- Enforce daily generation limits
- Proxy calls to Gemini (generation, edit, segmentation)
- Provide generation history endpoints

Backend repo (replace with your own): https://github.com/your-org/codenex-images-api

## Troubleshooting

- Blank screen after login: verify `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, and callback URL.
- 401/403 from API: ensure `VITE_AUTH0_AUDIENCE` matches your API identifier and your backend verifies tokens correctly.
- CORS issues: confirm the frontend origin is allowed by the backend and Auth0 settings.
- Build succeeds but deploy fails: check Vercel env vars and the GitHub Actions logs.

## License

MIT © Nikunj Khitha
