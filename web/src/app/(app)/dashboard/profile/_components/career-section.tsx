"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type ComponentType, type ReactNode } from "react";
import { Button, Dialog, EmptyState, Panel, cn, useToast } from "@/components/ui";
import type { Errors } from "@/lib/career";
import { send } from "@/lib/client";
import { mapFieldErrors } from "@/lib/field-errors";
import { focusFirstError, ItemDialog } from "./item-dialog";

export interface FieldsProps<Form> {
  form: Form;
  set: (patch: Partial<Form>) => void;
  errors: Errors;
}

/** Everything that differs between Experience, Education, Languages and Certifications. */
export interface SectionConfig<Item extends { id: string }, Form> {
  /** e.g. "/api/me/experience"; PUT and DELETE add "/{id}". */
  endpoint: string;
  /** Lower case, for "Add experience", "Experience deleted". */
  noun: string;
  intro: ReactNode;
  emptyTitle: string;
  emptyText: string;
  /** The fields the form shows, so API errors can be put under them. */
  fields: readonly string[];
  empty: Form;
  fromItem: (item: Item) => Form;
  toBody: (form: Form) => object;
  check: (form: Form) => Errors;
  /** Short name of one entry, for "Edit …" and "Delete …". */
  name: (item: Item) => string;
  sort: (items: Item[]) => Item[];
  /** Timeline for dated history (experience, education), a plain list otherwise. */
  layout: "timeline" | "list";
  /** Marks the entry that is still going on (a current job): its dot on the timeline is filled. */
  isCurrent?: (item: Item) => boolean;
  Fields: ComponentType<FieldsProps<Form>>;
  Summary: ComponentType<{ item: Item }>;
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The item as the API takes it back: the same fields without the id. Used by Undo, so nothing is rounded. */
function asInput<Item extends { id: string }>(item: Item): object {
  const { id: _id, ...rest } = item; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

/**
 * One career list: newest first, click an entry to edit it in a dialog, Add opens the same dialog empty.
 * Deleting asks first, then offers Undo (which creates the entry again). Errors sit under their fields: the
 * form checks first for instant feedback, then the API's answer is mapped onto the same fields.
 */
export function CareerSection<Item extends { id: string }, Form>({
  config,
  items,
  onItems,
  onChanged,
}: {
  config: SectionConfig<Item, Form>;
  items: Item[];
  onItems: (update: (items: Item[]) => Item[]) => void;
  /** After every saved change: refresh the public page. */
  onChanged: () => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [form, setForm] = useState<Form>(config.empty);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [removing, setRemoving] = useState(false);
  const { noun, Fields, Summary } = config;

  function open(item: Item | "new") {
    setEditing(item);
    setForm(item === "new" ? config.empty : config.fromItem(item));
    setErrors({});
    setFormError(null);
  }

  function set(patch: Partial<Form>) {
    setForm((f) => ({ ...f, ...patch }));
    // A changed field drops its error; a changed date or "current" also drops the other date's error.
    setErrors((e) => {
      const keys = Object.keys(patch);
      const dates = keys.some((k) => /date|current/i.test(k));
      const next = Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k) && !(dates && /date/i.test(k))));
      return Object.keys(next).length === Object.keys(e).length ? e : next;
    });
  }

  async function save(formElement: HTMLFormElement) {
    const found = config.check(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError(null);
      focusFirstError(formElement);
      return;
    }
    const target = editing;
    if (target === null) return;
    const isNew = target === "new";
    setSaving(true);
    try {
      const r = await send<Item>(isNew ? config.endpoint : `${config.endpoint}/${target.id}`, isNew ? "POST" : "PUT", config.toBody(form));
      if (r.ok && r.data) {
        const saved = r.data;
        onItems((list) => (isNew ? [...list, saved] : list.map((x) => (x.id === saved.id ? saved : x))));
        setEditing(null);
        onChanged();
        toast({ tone: "success", title: `${capital(noun)} ${isNew ? "added" : "saved"}` });
      } else if (r.status === 400) {
        const mapped = mapFieldErrors(r.body, config.fields);
        setErrors(mapped.fields);
        setFormError(mapped.form);
        focusFirstError(formElement);
      } else if (r.status === 404) {
        setFormError("This entry no longer exists. It may have been deleted in another tab; reload the page.");
      } else {
        setFormError("Not saved: the server did not answer as expected. Try again in a moment.");
      }
    } catch {
      setFormError("Not saved: DevSheet could not be reached. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const item = deleting;
    if (!item) return;
    setRemoving(true);
    const r = await send(`${config.endpoint}/${item.id}`, "DELETE").catch(() => null);
    setRemoving(false);
    setDeleting(null);
    // 404: already gone, which is what was asked for.
    if (!r || (!r.ok && r.status !== 404)) {
      toast({ tone: "danger", title: `${capital(noun)} not deleted`, description: "Nothing changed. Try again in a moment." });
      return;
    }
    onItems((list) => list.filter((x) => x.id !== item.id));
    onChanged();
    toast({ title: `${capital(noun)} deleted`, description: config.name(item), action: { label: "Undo", onClick: () => restore(item) } });
  }

  async function restore(item: Item) {
    const r = await send<Item>(config.endpoint, "POST", asInput(item)).catch(() => null);
    if (r?.ok && r.data) {
      const back = r.data;
      onItems((list) => [...list, back]);
      onChanged();
      toast({ tone: "success", title: `${capital(noun)} restored` });
    } else {
      toast({ tone: "danger", title: `${capital(noun)} not restored`, description: "Add it again with the Add button." });
    }
  }

  const sorted = config.sort(items);
  const add = (
    <Button size="sm" icon={<Plus aria-hidden size={15} />} onClick={() => open("new")}>Add {noun}</Button>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-prose text-sm text-graphite">{config.intro}</div>
        {sorted.length > 0 && add}
      </div>

      {sorted.length === 0 ? (
        <EmptyState title={config.emptyTitle} description={config.emptyText} action={add} />
      ) : config.layout === "timeline" ? (
        <ol className="ml-1.5 flex flex-col border-l border-rule" aria-label={capital(noun)}>
          {sorted.map((item) => (
            <li key={item.id} className="relative flex items-start gap-2 pl-5">
              <span
                aria-hidden
                className={cn(
                  "absolute top-[1.375rem] -left-[0.3125rem] size-2.5 rounded-full border-2",
                  config.isCurrent?.(item) ? "border-accent bg-accent" : "border-rule-strong bg-paper",
                )}
              />
              <Entry name={config.name(item)} onEdit={() => open(item)} onDelete={() => setDeleting(item)}>
                <Summary item={item} />
              </Entry>
            </li>
          ))}
        </ol>
      ) : (
        <Panel>
          <ul className="flex flex-col divide-y divide-rule px-2" aria-label={capital(noun)}>
            {sorted.map((item) => (
              <li key={item.id} className="flex items-start gap-2 py-1">
                <Entry name={config.name(item)} onEdit={() => open(item)} onDelete={() => setDeleting(item)}>
                  <Summary item={item} />
                </Entry>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <ItemDialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === "new" ? `Add ${noun}` : `Edit ${noun}`}
        submitLabel={editing === "new" ? `Add ${noun}` : "Save changes"}
        saving={saving}
        formError={formError}
        onSubmit={save}
      >
        <Fields form={form} set={set} errors={errors} />
      </ItemDialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(o) => !o && !removing && setDeleting(null)}
        title={`Delete ${noun}?`}
        description={deleting ? <><span className="font-medium text-ink">{config.name(deleting)}</span> is removed from your CV and your public page. You can undo this right after.</> : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={removing}>Keep it</Button>
            <Button variant="danger" onClick={remove} loading={removing}>Delete</Button>
          </>
        }
      />
    </div>
  );
}

function Entry({ name, onEdit, onDelete, children }: { name: string; onEdit: () => void; onDelete: () => void; children: ReactNode }) {
  return (
    <>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${name}`}
        className="min-w-0 flex-1 rounded-control px-3 py-3 text-left transition-colors duration-150 hover:bg-accent-soft/40 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        {children}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${name}`}
        className="mt-2 grid size-8 shrink-0 place-items-center rounded-control text-graphite transition-colors duration-150 hover:bg-danger-soft hover:text-danger focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      >
        <Trash2 aria-hidden size={15} />
      </button>
    </>
  );
}
