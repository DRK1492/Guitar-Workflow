export default function Home() {
  return (
    <div className="page flex items-center justify-center min-h-screen">
      <main className="card p-8 w-full max-w-xl text-center">
        <p className="label mb-3">Gruves</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">
          Build setlists, track songs, and keep your notes in one place.
        </h1>
        <p className="muted mb-6">
          A simple, list-first workflow built for rehearsal and gigs.
        </p>
        <div className="flex items-center justify-center gap-3">
          <a className="button-primary" href="/auth?mode=signup">
            Create account
          </a>
          <a className="button-ghost" href="/auth?mode=signin">
            Sign in
          </a>
        </div>
      </main>
    </div>
  )
}
