This is a [NextJS](https://nextjs.org) project bootstrapped with [`create-NextJS-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localHost:3000](http://localhost:3000) with your browser to see the result.

If you get a permissions error binding to `0.0.0.0:3000`, run:

```bash
npm run dev -- -H 127.0.0.1 -p 3001
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for vercel.

## Learn More

To learn more about NextJS, take a look at the following resources:

- [NextJS Documentation](https://nextjs.org/docs) - learn about NextJS features and API.
- [Learn NextJS](https://nextjs.org/learn) - an interactive NextJS tutorial.

You can check out [the NextJS Github repository](https://github.com/vercel/next.js) - your feedback, and contributions are welcome!

## Deploy on vercel

The easiest way to deploy your NextJS app is to use the [vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of NextJS.

Check out our [NextJS deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production Checklist

### Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### SupaBase
- RLS policies verified for: `songs`, `song_notes`, `song_links`, `song_files`, `genres`, `setlists`, `setlist_songs`
- Storage bucket exists (name matches code): `song-pdfs`
- Storage policies set on `storage.objects` for `song-pdfs`
- Auth settings: Site URL and Redirect URLs updated for production domain

### App QA
- Create/edit/delete song
- Create/edit/delete notes and links
- Upload/preview/delete PDF's
- Add/remove song from set lists

## vercel + SupaBase Deployment (step-by-step)

1) Create a vercel project and connect this repo.
2) In vercel Project Settings → Environment Variables:
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (Set values for Production + Preview as needed)
3) Deploy.
4) In SupaBase Dashboard → Authentication → URL Configuration:
   - Set **Site URL** to your vercel production domain.
   - Add Redirect URLs for auth flows (e.g. `/auth/confirm`, `/auth/reset`).
5) Validate RLS + Storage policies.
6) Smoke test the flows above on your production domain.
