'use client';

import { useActionState, useEffect, useRef } from 'react';
import { LoaderCircle, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { createBoxAction } from '../server/mutations';
import {
  initialCreateBoxActionState,
  type CreateBoxActionState,
} from '../server/types';

type CreateBoxFormProps = {
  parentBoxId?: string;
  placeholder?: string;
  buttonLabel?: string;
  onCreated?: (box: NonNullable<CreateBoxActionState['box']>) => void;
};

export function CreateBoxForm({
  parentBoxId,
  placeholder = 'Box name',
  buttonLabel = 'New Box',
  onCreated,
}: CreateBoxFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const handledBoxIdRef = useRef<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    createBoxAction,
    initialCreateBoxActionState
  );

  useEffect(() => {
    if (state.status !== 'success' || !state.box) {
      return;
    }

    if (handledBoxIdRef.current === state.box.id) {
      return;
    }

    handledBoxIdRef.current = state.box.id;
    formRef.current?.reset();
    onCreated?.(state.box);
  }, [onCreated, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex min-w-0 items-center gap-2"
    >
      {parentBoxId ? (
        <input type="hidden" name="parentBoxId" value={parentBoxId} />
      ) : null}
      <Input
        name="name"
        required
        maxLength={80}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-9 min-w-0 bg-background"
      />
      <Button
        type="submit"
        variant="outline"
        className="shrink-0"
        disabled={isPending}
      >
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        {buttonLabel}
      </Button>
      {state.status === 'error' ? (
        <p className="sr-only" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
