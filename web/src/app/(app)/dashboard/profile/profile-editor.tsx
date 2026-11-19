"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CertificationItem, EducationItem, ExperienceItem, LanguageItem, ProfileData } from "@/lib/api";
import { send } from "@/lib/client";
import { EducationSection, ExperienceSection, ProfileForm } from "./forms";
import { CertificationsSection, LanguagesSection } from "./languages-certs";

export function ProfileEditor() {
  const [state, setState] = useState<"loading" | "error" | "ready">("loading");
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
    // The (app) layout has checked the login, so a failure here is a server problem.
    if (!p.data || !x.data || !e.data || !l.data || !c.data) return setState("error");
    setProfile(p.data);
    setExperience(x.data);
    setEducation(e.data);
    setLanguages(l.data);
    setCertifications(c.data);
    setState("ready");
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <p>Loading…</p>;
  if (state === "error" || !profile)
    return <p role="alert">Your profile could not be loaded. Reload the page to try again.</p>;

  return (
    <div className="space-y-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Profile and CV data</h1>
        <Link href="/dashboard" className="text-sm underline">← Back to projects</Link>
      </header>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Profile</h2><ProfileForm initial={profile} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Work experience</h2><ExperienceSection items={experience} onChange={load} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Education</h2><EducationSection items={education} onChange={load} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Languages</h2><LanguagesSection items={languages} onChange={load} /></section>
      <section className="space-y-3"><h2 className="text-xl font-semibold">Certifications</h2><CertificationsSection items={certifications} onChange={load} /></section>
    </div>
  );
}
