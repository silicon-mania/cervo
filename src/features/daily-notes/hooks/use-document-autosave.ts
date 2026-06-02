"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DocumentEditorValue } from "@/components/editor";

const AUTOSAVE_DELAY_MS = 1000;

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

type UseDocumentAutosaveOptions = {
  documentId: string;
};

export function useDocumentAutosave({
  documentId,
}: UseDocumentAutosaveOptions) {
  const latestDraftRevisionRef = useRef(0);
  const latestDraftRef = useRef<DocumentEditorValue | null>(null);
  const savedRevisionRef = useRef(0);
  const attemptedRevisionRef = useRef(0);
  const [draft, setDraft] = useState<DocumentEditorValue | null>(null);
  const [draftRevision, setDraftRevision] = useState(0);
  const [attemptedRevision, setAttemptedRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [status, setStatus] = useState<AutosaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = useCallback((value: DocumentEditorValue) => {
    latestDraftRef.current = value;
    setDraft(value);
    setDraftRevision((revision) => {
      const nextRevision = revision + 1;

      latestDraftRevisionRef.current = nextRevision;

      return nextRevision;
    });
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  const saveDraft = useCallback(
    async (revision: number, value: DocumentEditorValue) => {
      setIsSaving(true);
      setAttemptedRevision(revision);
      attemptedRevisionRef.current = revision;
      setStatus("saving");
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/documents/${documentId}/autosave`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(value),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;

          throw new Error(payload?.error ?? "Couldn’t save changes.");
        }

        setSavedRevision((currentRevision) =>
          revision > currentRevision ? revision : currentRevision,
        );
        savedRevisionRef.current = revision;
        setStatus(latestDraftRevisionRef.current > revision ? "idle" : "saved");
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Couldn’t save changes.",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [documentId],
  );

  useEffect(() => {
    const flushPendingDraft = () => {
      const latestDraft = latestDraftRef.current;
      const latestDraftRevision = latestDraftRevisionRef.current;

      if (!latestDraft) {
        return;
      }

      if (
        latestDraftRevision === 0 ||
        latestDraftRevision === savedRevisionRef.current ||
        latestDraftRevision === attemptedRevisionRef.current
      ) {
        return;
      }

      const payload = JSON.stringify(latestDraft);

      if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        const blob = new Blob([payload], { type: "application/json" });

        navigator.sendBeacon(
          `/api/documents/${documentId}/autosave`,
          blob,
        );

        attemptedRevisionRef.current = latestDraftRevision;

        return;
      }

      void fetch(`/api/documents/${documentId}/autosave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
        keepalive: true,
      });

      attemptedRevisionRef.current = latestDraftRevision;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingDraft();
      }
    };

    window.addEventListener("pagehide", flushPendingDraft);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushPendingDraft);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [documentId]);

  useEffect(() => {
    if (!draft || draftRevision === 0) {
      return;
    }

    if (
      draftRevision === savedRevision ||
      draftRevision === attemptedRevision ||
      isSaving
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveDraft(draftRevision, draft);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    attemptedRevision,
    draft,
    draftRevision,
    isSaving,
    saveDraft,
    savedRevision,
  ]);

  const autosaveState = useMemo(
    () => ({
      handleChange,
      status,
      errorMessage,
    }),
    [errorMessage, handleChange, status],
  );

  return autosaveState;
}
