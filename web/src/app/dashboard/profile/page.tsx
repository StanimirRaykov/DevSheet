"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EducationItem, ExperienceItem, ProfileData, PUBLIC_API } from "@/lib/api";
import { send } from "@/lib/client";
import { EducationSection, ExperienceSection, ProfileForm } from "./forms";

export default function ProfilePage() {
  const [state, setState] = useState<"loading" | "anon" | "ready">("loading");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);

  const load = useCallback(async () => {
    const [p, x, e] = await Promise.all([
      send<ProfileData>("/api/me/profile"),
      send<ExperienceItem[]>("/api/me/experience"),
      send<EducationItem[]>("/api/me/education"),
    ]);
    if (p.status === 401 || x.status === 401 || e.status === 401) return setState("anon");
    if (!p.data || !x.data || !e.data) return setState("anon");
    setProfile(p.data);
    setExperience(x.data);
    setEducation(e.data);
    setState("ready");
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <main className="p-8">Loading…</main>;
  if (state === "anon" || !profile)
    return <main className="p-8"><a className="underline" href={`${PUBLIC_API}/auth/github`}>Sign in with GitHub</a></main>;

  return (
    <main className="mx-auto max-w-3xl space-y-10 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile, experience and education</h1>
        <Link href="/dashboard" className="text-sm underline">← Back to projects</Link>
      </header>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Profile</h2><ProfileForm initial={profile} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Work experience</h2><ExperienceSection items={experience} onChange={load} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Education</h2><EducationSection items={education} onChange={load} /></section>
    </main>
  );
}
