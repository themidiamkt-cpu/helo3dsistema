"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";
import { ActionToast } from "@/components/providers/action-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type FormField =
  | { name: string; label: string; kind?: "input"; type?: string; placeholder?: string; defaultValue?: string | number }
  | { name: string; label: string; kind: "textarea"; placeholder?: string; defaultValue?: string | number }
  | { name: string; label: string; kind: "select"; options: readonly (string | { label: string; value: string })[]; defaultValue?: string };

type FormState = { ok: boolean; message: string };

const initialState: FormState = { ok: false, message: "" };
const nativeSelectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function SimpleFormCard({
  title,
  action,
  fields,
  submitLabel,
  modal = true,
}: {
  title: string;
  action: (formData: FormData) => Promise<FormState>;
  fields: FormField[];
  submitLabel: string;
  modal?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (_: FormState, formData: FormData) => {
    const result = await action(formData);
    if (result.ok) setOpen(false);
    return result;
  }, initialState);

  const form = (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {fields.map((field) => (
        <div key={field.name} className={field.kind === "textarea" ? "grid gap-2 sm:col-span-2 xl:col-span-3" : "grid gap-2"}>
          <Label htmlFor={field.name}>{field.label}</Label>
          {field.kind === "select" ? (
            <select id={field.name} name={field.name} defaultValue={field.defaultValue?.toString()} className={nativeSelectClassName}>
              {!field.defaultValue ? <option value="">Selecione</option> : null}
              {field.options.map((option) => {
                const item = typeof option === "string" ? { label: option, value: option } : option;
                return (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                );
              })}
            </select>
          ) : field.kind === "textarea" ? (
            <Textarea id={field.name} name={field.name} placeholder={field.placeholder} defaultValue={field.defaultValue} />
          ) : (
            <Input id={field.name} name={field.name} type={field.type ?? "text"} placeholder={field.placeholder} defaultValue={field.defaultValue} />
          )}
        </div>
      ))}
      <div className="flex justify-end gap-2 sm:col-span-2 xl:col-span-3">
        {modal ? <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );

  if (modal) {
    return (
      <div>
        <ActionToast state={state} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            {title}
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            {form}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Card>
      <ActionToast state={state} />
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {form}
      </CardContent>
    </Card>
  );
}
