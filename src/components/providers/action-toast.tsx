"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ActionToast({ state }: { state?: { ok: boolean; message: string } }) {
  useEffect(() => {
    if (!state?.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return null;
}

