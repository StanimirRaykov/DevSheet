"use client";

import { AnimatePresence, motion } from "motion/react";
import { FolderGit2, LogOut, Plus, Settings, Sparkles, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useMotionPresets } from "@/components/motion-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Avatar,
  Badge,
  Button,
  Dialog,
  DialogClose,
  EmptyState,
  Field,
  Input,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Panel,
  Select,
  Sheet,
  Skeleton,
  Tabs,
  Textarea,
  ToastProvider,
  useToast,
} from "@/components/ui";

export function Showcase() {
  return (
    <ToastProvider>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-14 px-4 py-10 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-display text-ink">Components</h1>
            <p className="mt-2 max-w-prose text-graphite">Every building block of the DevSheet interface, in each state. Switch the theme to check both.</p>
          </div>
          <ThemeToggle />
        </header>

        <Section title="Colour">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Paper", "bg-paper"],
              ["Sheet", "bg-sheet"],
              ["Ink", "bg-ink"],
              ["Graphite", "bg-graphite"],
              ["Rule", "bg-rule"],
              ["Accent", "bg-accent"],
              ["Success", "bg-success"],
              ["Danger", "bg-danger"],
            ].map(([name, cls]) => (
              <div key={name} className="flex items-center gap-3">
                <span className={`size-9 rounded-control border border-rule ${cls}`} />
                <span className="text-sm text-graphite">{name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type">
          <div className="flex flex-col gap-3">
            <p className="font-serif text-display">Maria Petrova</p>
            <p className="font-serif text-title">Backend engineer, Sofia</p>
            <p className="max-w-prose">
              Builds payment APIs in C# and keeps them boring in production. Six years of .NET, three of them leading a team of four.
            </p>
            <p className="text-sm text-graphite">Last synced 12 minutes ago</p>
            <p className="font-mono text-sm">devsheet.app/maria-petrova</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Publish page</Button>
            <Button variant="secondary">Sync now</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="danger">Delete account</Button>
            <Button loading>Syncing</Button>
            <Button disabled>Publish page</Button>
            <Button size="sm" variant="secondary" icon={<Plus aria-hidden size={14} />}>
              Add experience
            </Button>
          </div>
        </Section>

        <Section title="Fields">
          <Panel className="grid gap-5 p-6 sm:grid-cols-2">
            <Field label="Headline" hint="One line under your name.">
              <Input placeholder="Backend engineer" defaultValue="Backend engineer" />
            </Field>
            <Field label="Email" error="Enter a valid email address, like name@example.com.">
              <Input defaultValue="maria@" />
            </Field>
            <Field label="Spoken interaction">
              <Select defaultValue="B2">
                {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="Public page address" hint="Lowercase letters, digits and hyphens.">
              <Input className="font-mono" defaultValue="maria-petrova" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Summary">
                <Textarea defaultValue="Builds payment APIs in C# and keeps them boring in production." />
              </Field>
            </div>
          </Panel>
        </Section>

        <Section title="Status">
          <div className="flex flex-wrap gap-2">
            <Badge>Pending</Badge>
            <Badge tone="success">Visible</Badge>
            <Badge tone="accent">Suggested</Badge>
            <Badge tone="warning">Source missing</Badge>
            <Badge tone="danger">Sync failed</Badge>
          </div>
        </Section>

        <Section title="Panel and sheet">
          <div className="grid gap-6 rounded-panel bg-paper sm:grid-cols-[1fr_1.4fr]">
            <Panel className="p-5">
              <p className="font-medium">Panel</p>
              <p className="mt-1 text-sm text-graphite">Flat, bordered. Groups content inside the app.</p>
            </Panel>
            <Sheet className="p-7">
              <div className="flex items-center gap-4">
                <Avatar name="Maria Petrova" size={48} />
                <div>
                  <p className="font-serif text-title leading-tight">Maria Petrova</p>
                  <p className="text-sm text-graphite">Backend engineer, Sofia</p>
                </div>
              </div>
              <p className="mt-4 text-sm">The sheet is the user&apos;s document: the public page and the CV preview sit on the desk like paper.</p>
            </Sheet>
          </div>
        </Section>

        <Section title="Tabs">
          <Tabs
            label="Projects"
            items={[
              { value: "pending", label: "Pending", count: 3, content: <p className="text-graphite">3 repositories wait for your review.</p> },
              { value: "visible", label: "Visible", count: 8, content: <p className="text-graphite">8 projects are on your public page.</p> },
              { value: "hidden", label: "Hidden", count: 2, content: <p className="text-graphite">2 projects are hidden.</p> },
            ]}
          />
        </Section>

        <Section title="Dialog and menu">
          <div className="flex flex-wrap gap-3">
            <Dialog
              title="Delete this experience?"
              description="It disappears from your profile, public page and CV. You can undo right after."
              trigger={<Button variant="secondary">Open dialog</Button>}
              footer={
                <>
                  <DialogClose asChild>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="danger">Delete experience</Button>
                  </DialogClose>
                </>
              }
            >
              <p className="text-sm">Payments team lead at Paylane, 2021 to present.</p>
            </Dialog>
            <Menu
              trigger={
                <button className="flex items-center gap-2 rounded-full pr-3 hover:bg-sheet" aria-label="Account menu">
                  <Avatar name="Maria Petrova" />
                  <span className="text-sm">Maria</span>
                </button>
              }
            >
              <MenuLabel>maria@example.com</MenuLabel>
              <MenuItem icon={<UserRound size={15} />}>View public page</MenuItem>
              <MenuItem icon={<Settings size={15} />}>Settings</MenuItem>
              <MenuSeparator />
              <MenuItem icon={<LogOut size={15} />} tone="danger">
                Sign out
              </MenuItem>
            </Menu>
          </div>
        </Section>

        <Section title="Toast">
          <ToastDemo />
        </Section>

        <Section title="Loading and empty">
          <div className="grid gap-6 sm:grid-cols-2">
            <Panel className="flex flex-col gap-3 p-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </Panel>
            <EmptyState
              icon={<FolderGit2 aria-hidden size={20} />}
              title="No pending repositories"
              description="New repositories from GitHub appear here for review before anything is public."
              action={<Button size="sm" variant="secondary">Sync now</Button>}
            />
          </div>
        </Section>

        <Section title="Motion">
          <MotionDemo />
        </Section>
      </main>
    </ToastProvider>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="border-b border-rule pb-2 font-serif text-title">{title}</h2>
      {children}
    </section>
  );
}

function ToastDemo() {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="secondary" onClick={() => toast({ title: "Page published", description: "devsheet.app/maria-petrova is live.", tone: "success" })}>
        Success
      </Button>
      <Button variant="secondary" onClick={() => toast({ title: "Experience deleted", action: { label: "Undo", onClick: () => toast({ title: "Experience restored" }) } })}>
        With undo
      </Button>
      <Button variant="secondary" onClick={() => toast({ title: "Sync failed", description: "GitHub did not answer. Try again in a minute.", tone: "danger" })}>
        Error
      </Button>
    </div>
  );
}

const SUGGESTED = ["TypeScript", "PostgreSQL", "Docker", "React", "Go"];

function MotionDemo() {
  const presets = useMotionPresets();
  const [suggested, setSuggested] = useState(SUGGESTED);
  const [confirmed, setConfirmed] = useState<string[]>(["C#", ".NET"]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Panel className="p-5">
        <p className="mb-3 flex items-center gap-2 text-sm text-graphite">
          <Sparkles aria-hidden size={14} /> Suggested from your repositories
        </p>
        <ul className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {suggested.map((s) => (
              <motion.li key={s} layout variants={presets.listItem} initial="initial" animate="animate" exit="exit" transition={presets.layout}>
                <button
                  className="h-8 rounded-full border border-rule-strong px-3 text-sm hover:border-accent hover:text-accent"
                  onClick={() => {
                    setSuggested((l) => l.filter((x) => x !== s));
                    setConfirmed((l) => [...l, s]);
                  }}
                >
                  Confirm {s}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {suggested.length === 0 && (
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => { setSuggested(SUGGESTED); setConfirmed(["C#", ".NET"]); }}>
            Reset
          </Button>
        )}
      </Panel>
      <Panel className="p-5">
        <p className="mb-3 text-sm text-graphite">Confirmed skills</p>
        <ul className="flex flex-wrap gap-2">
          <AnimatePresence mode="popLayout">
            {confirmed.map((s) => (
              <motion.li key={s} layout variants={presets.listItem} initial="initial" animate="animate" exit="exit" transition={presets.layout}>
                <Badge tone="accent">{s}</Badge>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </Panel>
    </div>
  );
}
