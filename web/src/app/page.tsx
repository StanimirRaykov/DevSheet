import { PUBLIC_API } from "@/lib/api";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight">DevSheet</h1>
      <p className="text-lg text-neutral-600">
        Your GitHub activity, skills and CV in one place — always in sync.
      </p>
      <a
        href={`${PUBLIC_API}/auth/github`}
        className="rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-neutral-800"
      >
        Continue with GitHub
      </a>
    </main>
  );
}
