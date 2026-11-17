"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CertificationItem, EducationItem, ExperienceItem, LanguageItem, ProfileData, PUBLIC_API } from "@/lib/api";
import { send } from "@/lib/client";
import { EducationSection, ExperienceSection, ProfileForm } from "./forms";
import { CertificationsSection, LanguagesSection } from "./languages-certs";

export default function ProfilePage() {
  const [state, setState] = useState<"loading" | "anon" | "ready">("loading");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [education, setEducation] = useState<EducationItem[]>([]);
  const [languages, setLanguages] = useState<LanguageItem[]>([]);
  const [certifications, setCertifications] = useState<CertificationItem[]>([]);

  const load = useCallback(async () => {
    const [p, x, e, l, c] = await Promise.all([
      send<ProfileData>("/api/me/profile"),
      send<ExperienceItem[]>("/api/me/experience"),
      send<EducationItem[]>("/api/me/education"),
      send<LanguageItem[]>("/api/me/languages"),
      send<CertificationItem[]>("/api/me/certifications"),
    ]);
    if ([p, x, e, l, c].some((r) => r.status === 401)) return setState("anon");
    if (!p.data || !x.data || !e.data || !l.data || !c.data) return setState("anon");
    setProfile(p.data);
    setExperience(x.data);
    setEducation(e.data);
    setLanguages(l.data);
    setCertifications(c.data);
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
        <h1 className="text-2xl font-bold">Profile and CV data</h1>
        <Link href="/dashboard" className="text-sm underline">← Back to projects</Link>
      </header>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Profile</h2><ProfileForm initial={profile} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Work experience</h2><ExperienceSection items={experience} onChange={load} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Education</h2><EducationSection items={education} onChange={load} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Languages</h2><LanguagesSection items={languages} onChange={load} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Certifications</h2><CertificationsSection items={certifications} onChange={load} /></section>
    </main>
  );
}
