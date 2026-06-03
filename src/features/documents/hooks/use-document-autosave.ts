"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DocumentEditorValue } from "@/components/editor";

const AUTOSAVE_DELAY_MS = 1000;

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

export type DocumentAutosaveValue = DocumentEditorValue & {
  title: string;
};

type UseDocumentAutosaveOptions = {
  documentId?: string | null;
  dailyNoteDate?: string | null;
  onDocumentPersisted?: (documentId: string) => void;
};

export function useDocumentAutosave({
  documentId,
  dailyNoteDate,
  onDocumentPersisted,
}: UseDocumentAutosaveOptions) {
  const persistedDocumentIdRef = useRef(documentId ?? null);
  const latestDraftRevisionRef = useRef(0);
  const latestDraftRef = useRef<DocumentAutosaveValue | null>(null);
  const savedRevisionRef = useRef(0);
  const attemptedRevisionRef = useRef(0);
  const [draft, setDraft] = useState<DocumentAutosaveValue | null>(null);
  const [draftRevision, setDraftRevision] = useState(0);
  const [attemptedRevision, setAttemptedRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [status, setStatus] = useState<AutosaveStatus>("saved");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getAutosaveUrl = useCallback(() => {
    if (persistedDocumentIdRef.current) {
      return `/api/documents/${persistedDocumentIdRef.current}/autosave`;
    }

    if (dailyNoteDate) {
      return `/api/daily-notes/${dailyNoteDate}/autosave`;
    }

    return null;
  }, [dailyNoteDate]);

  const handleChange = useCallback((value: DocumentAutosaveValue) => {
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
    async (revision: number, value: DocumentAutosaveValue) => {
      const autosaveUrl = getAutosaveUrl();

      if (!autosaveUrl) {
        setStatus("error");
        setErrorMessage("Unable to save this document.");
        return;
      }

      setIsSaving(true);
      setAttemptedRevision(revision);
      attemptedRevisionRef.current = revision;
      setStatus("saving");
      setErrorMessage(null);

      try {
        const response = await fetch(autosaveUrl, {
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

        const payload = (await response.json().catch(() => null)) as
          | { document?: { id?: string } }
          | null;
        const persistedDocumentId = payload?.document?.id;

        if (!persistedDocumentIdRef.current && persistedDocumentId) {
          persistedDocumentIdRef.current = persistedDocumentId;
          onDocumentPersisted?.(persistedDocumentId);
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
    [getAutosaveUrl, onDocumentPersisted],
  );

  useEffect(() => {
    persistedDocumentIdRef.current = documentId ?? null;
  }, [documentId]);

  useEffect(() => {
    const flushPendingDraft = () => {
      const latestDraft = latestDraftRef.current;
      const latestDraftRevision = latestDraftRevisionRef.current;
      const autosaveUrl = getAutosaveUrl();

      if (!latestDraft || !autosaveUrl) {
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

        navigator.sendBeacon(autosaveUrl, blob);

        attemptedRevisionRef.current = latestDraftRevision;

        return;
      }

      void fetch(autosaveUrl, {
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
      flushPendingDraft();
      window.removeEventListener("pagehide", flushPendingDraft);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [getAutosaveUrl]);

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

  return useMemo(
    () => ({
      handleChange,
      status,
      errorMessage,
    }),
    [errorMessage, handleChange, status],
  );
}
