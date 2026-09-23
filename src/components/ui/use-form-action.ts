"use client";

import { startTransition, useActionState } from "react";

/**
 * Submits a form to a server action WITHOUT React's automatic form reset.
 * With a plain `<form action>`, React clears every field after submitting — so a validation
 * error would wipe what the person typed. Submitting through onSubmit keeps their input.
 * Browser validation (required, minLength…) still runs first.
 */
export function useFormAction<S>(action: (state: S | undefined, fd: FormData) => Promise<S | undefined>) {
  const [state, dispatch, pending] = useActionState<S | undefined, FormData>(action, undefined);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, pending, onSubmit };
}
