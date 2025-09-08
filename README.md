
# MinRisk Starter (Vite + React + TypeScript)

This starter is preconfigured with:
- Vite React + TypeScript
- Tailwind (with `tailwindcss-animate`)
- Path alias `@` → `src`
- Dependencies you'll likely need: `lucide-react`, `react-dropzone`, `papaparse`, `clsx`, `class-variance-authority`

## 1) Install
```bash
npm install
```

## 2) Add shadcn/ui (components your code imports)
Your code imports from `@/components/ui/...`. Generate those with shadcn:

```bash
npx shadcn@latest init
# Choose: TypeScript, Default style, Tailwind, CSS vars (ok), Base color: slate (or your choice)
# This will create the components directory and Tailwind preset adjustments.

# Then add the components you use:
npx shadcn@latest add card button input tabs select dialog label textarea checkbox popover radio-group table
```

> If you use more components, run `npx shadcn@latest add <component>` for each.

## 3) Paste your app code
Replace **everything** in `src/App.tsx` with your existing 900-line code.

## 4) Run locally
```bash
npm run dev
# open the printed URL (e.g., http://localhost:5173)
```

## 5) Deploy to Vercel
1. Create a new GitHub repo and push this folder.
2. In Vercel: "Add New Project" → import the repo.
3. Framework preset: **Vite** (auto-detects).
4. Build command: `npm run build`  
   Output directory: `dist`
5. Deploy → you'll get `https://<your-app>.vercel.app`.

### Environment variables
If your app needs browser env vars, prefix them with `VITE_` and set them in Vercel → Project → Settings → Environment Variables.

### Common fixes
- **Missing styles** → Ensure `src/index.css` is imported in `src/main.tsx`, and `tailwind.config.js` `content` includes `./src/**/*.{ts,tsx}`.
- **Module not found '@/components/ui/...':** Run the `shadcn add ...` commands above (they generate the files).
- **CORS errors** calling APIs → use a Vercel serverless function as a proxy or enable CORS on the API server.
- **Type errors breaking prod build** → fix types; short-term escape hatch: set `"skipLibCheck": true` in `tsconfig.json` (already set).

## 6) Netlify option (Vite)
- Build command: `npm run build`
- Publish directory: `dist`

---

If you need a Next.js starter instead (for SSR or the `/app` router), tell me and I’ll generate that too.
