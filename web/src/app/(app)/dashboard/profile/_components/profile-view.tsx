"use client";

import { useCallback, useEffect, useState } from "react";
import { useMe } from "@/components/me-provider";
import { Button, Select, Skeleton, Tabs } from "@/components/ui";
import type { CertificationItem, EducationItem, ExperienceItem, LanguageItem, ProfileData } from "@/lib/api";
import { send } from "@/lib/client";
import { refreshPublicPages } from "../../../settings/actions";
import { AboutForm, sameProfile } from "./about-form";
import { CareerSection } from "./career-section";
import type { ProfileTab } from "./profile-tab-names";
import { certificationConfig, educationConfig, experienceConfig, languageConfig } from "./sections";

interface Data {
  profile: ProfileData;
  experience: ExperienceItem[];
  education: EducationItem[];
  languages: LanguageItem[];
  certifications: CertificationItem[];
}
type ListKey = Exclude<keyof Data, "profile">;

const LABELS: Record<ProfileTab, string> = {
  about: "About", experience: "Experience", education: "Education", languages: "Languages", certifications: "Certifications",
};

/**
 * Everything the CV is made of, one tab per part. The open tab is kept in the address (?tab=), so a link or a
 * reload lands on it. Phones get a select instead of the tab row.
 */
export function ProfileView({ initialTab }: { initialTab: ProfileTab }) {
  const me = useMe();
  const [tab, setTab] = useState<ProfileTab>(initialTab);
  const [data, setData] = useState<Data | null | "error">(null);
  const [draft, setDraft] = useState<ProfileData | null>(null);

  const load = useCallback(async () => {
    const [p, x, e, l, c] = await Promise.all([
      send<ProfileData>("/api/me/profile"),
      send<ExperienceItem[]>("/api/me/experience"),
      send<EducationItem[]>("/api/me/education"),
      send<LanguageItem[]>("/api/me/languages"),
      send<CertificationItem[]>("/api/me/certifications"),
    ]).catch(() => [] as never[]);
    if (!p?.data || !x?.data || !e?.data || !l?.data || !c?.data) return setData("error");
    setData({ profile: p.data, experience: x.data, education: e.data, languages: l.data, certifications: c.data });
    setDraft(p.data);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the first load
  useEffect(() => { load(); }, [load]);

  // Unsaved About changes survive tab switches, but not leaving the page: ask first.
  const unsaved = data !== null && data !== "error" && draft !== null && !sameProfile(data.profile, draft);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  function open(next: ProfileTab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "about") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  const afterChange = () => { if (me.isPublished) refreshPublicPages([me.slug]); };
  const update = <K extends ListKey>(key: K) => (fn: (items: Data[K]) => Data[K]) =>
    setData((d) => (d && d !== "error" ? { ...d, [key]: fn(d[key]) } : d));

  const header = (
    <header className="flex max-w-prose flex-col gap-1">
      <h1 className="font-serif text-title font-semibold text-ink">Profile</h1>
      <p className="text-sm text-graphite">What your CV and public page say about you, besides your projects and skills.</p>
    </header>
  );

  if (data === null || draft === null && data !== "error") {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div role="status" aria-busy aria-label="Loading your profile" className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-10 w-full max-w-2xl" />
          <Skeleton className="h-32 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  if (data === "error") {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <div role="alert" className="flex max-w-xl flex-col items-start gap-3 rounded-panel border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-ink">
          Your profile could not be loaded.
          <Button size="sm" variant="secondary" onClick={() => { setData(null); load(); }}>Try again</Button>
        </div>
      </div>
    );
  }

  const counts: Partial<Record<ProfileTab, number>> = {
    experience: data.experience.length, education: data.education.length,
    languages: data.languages.length, certifications: data.certifications.length,
  };
  const panels: Record<ProfileTab, React.ReactNode> = {
    about: (
      <AboutForm
        saved={data.profile}
        draft={draft!}
        onDraft={setDraft}
        onSaved={(profile) => { setData({ ...data, profile }); setDraft(profile); afterChange(); }}
      />
    ),
    experience: <CareerSection config={experienceConfig} items={data.experience} onItems={update("experience")} onChanged={afterChange} />,
    education: <CareerSection config={educationConfig} items={data.education} onItems={update("education")} onChanged={afterChange} />,
    languages: <CareerSection config={languageConfig} items={data.languages} onItems={update("languages")} onChanged={afterChange} />,
    certifications: <CareerSection config={certificationConfig} items={data.certifications} onItems={update("certifications")} onChanged={afterChange} />,
  };
  const tabs = (Object.keys(LABELS) as ProfileTab[]);

  return (
    <div className="flex flex-col gap-8">
      {header}
      <div className="flex flex-col gap-0">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink sm:hidden">
          Section
          <Select value={tab} onChange={(e) => open(e.target.value as ProfileTab)}>
            {tabs.map((t) => (
              <option key={t} value={t}>{LABELS[t]}{counts[t] !== undefined ? ` (${counts[t]})` : ""}</option>
            ))}
          </Select>
        </label>
        <Tabs
          label="Profile sections"
          listClassName="max-sm:hidden"
          value={tab}
          onValueChange={(v) => open(v as ProfileTab)}
          items={tabs.map((t) => ({ value: t, label: LABELS[t], count: counts[t], content: panels[t] }))}
        />
      </div>
    </div>
  );
}
