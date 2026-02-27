This is a Next.js interview IDE with server-side code execution for TypeScript and Python.

## Getting Started

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Python Execution

### Local development

Python execution uses local interpreters in this order:

1. `.venv/bin/python`
2. `python3`
3. `python`

If present, Python dependencies are loaded from:

1. `python-requirements.txt`
2. `requirements.txt`

### Vercel deployment

On Vercel, Python execution runs inside [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) for isolation.

Required setup:

1. Enable Sandbox for your project in Vercel
2. Ensure your deployment has `VERCEL_OIDC_TOKEN` available (automatic on Vercel when configured)
3. Keep Python deps in `python-requirements.txt` (or `requirements.txt`)

Optional env vars:

- `USE_VERCEL_SANDBOX=true` to force sandbox usage outside Vercel
- `VERCEL_PYTHON_SANDBOX_SNAPSHOT_ID=<id>` to run from a prebuilt sandbox snapshot (faster cold starts)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy

Deploy with Vercel and configure Sandbox credentials in project settings.
