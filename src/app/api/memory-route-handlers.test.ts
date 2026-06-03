import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createBox,
  deleteBox,
  placeDocumentInBox,
  removeDocumentFromBox,
  updateBox,
} from "@/features/boxes/server/mutations";
import { createBlankNote } from "@/features/documents/server/mutations";

import { POST as createBoxPost } from "./boxes/route";
import { DELETE as deleteBoxDelete, PATCH as updateBoxPatch } from "./boxes/[boxId]/route";
import { POST as createNotePost } from "./documents/route";
import {
  DELETE as placementDelete,
  POST as placementPost,
} from "./documents/[documentId]/box-placements/route";

vi.mock("@/features/boxes/server/mutations", () => ({
  createBox: vi.fn(),
  deleteBox: vi.fn(),
  placeDocumentInBox: vi.fn(),
  removeDocumentFromBox: vi.fn(),
  updateBox: vi.fn(),
}));

vi.mock("@/features/documents/server/mutations", () => ({
  createBlankNote: vi.fn(),
}));

const boxId = "11111111-1111-4111-8111-111111111111";
const childBoxId = "22222222-2222-4222-8222-222222222222";
const documentId = "33333333-3333-4333-8333-333333333333";
const noteId = "44444444-4444-4444-8444-444444444444";

const boxSummary = {
  id: boxId,
  name: "Projects",
  slug: "projects",
  status: "active" as const,
  parentBoxId: null,
  homeDocumentId: null,
  directNoteCount: 1,
  directBoxCount: 0,
};

const documentSummary = {
  id: documentId,
  title: "Strategy",
  type: "note" as const,
  date: null,
  updatedAt: "2026-06-03T10:00:00.000Z",
};

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api-test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function expectJson(response: Response) {
  return response.json() as Promise<unknown>;
}

describe("Memory Route Handler contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the canonical created box directly from POST /api/boxes", async () => {
    vi.mocked(createBox).mockResolvedValue(boxSummary);

    const response = await createBoxPost(
      jsonRequest({ id: boxId, name: "Projects", parentBoxId: null }),
    );

    expect(response.status).toBe(200);
    await expect(expectJson(response)).resolves.toEqual(boxSummary);
    expect(createBox).toHaveBeenCalledWith({
      id: boxId,
      name: "Projects",
      parentBoxId: undefined,
    });
  });

  it("returns the canonical updated box directly from PATCH /api/boxes/:boxId", async () => {
    const updatedBox = { ...boxSummary, name: "Renamed projects" };
    vi.mocked(updateBox).mockResolvedValue(updatedBox);

    const response = await updateBoxPatch(jsonRequest({ name: "Renamed projects" }, "PATCH"), {
      params: Promise.resolve({ boxId }),
    });

    expect(response.status).toBe(200);
    await expect(expectJson(response)).resolves.toEqual(updatedBox);
    expect(updateBox).toHaveBeenCalledWith(boxId, { name: "Renamed projects" });
  });

  it("returns recursive deletion results from DELETE /api/boxes/:boxId", async () => {
    const deletionResult = {
      deletedBoxIds: [boxId, childBoxId],
      deletedDocumentIds: ["subtree-only-note"],
      preservedDocumentIds: ["shared-note"],
    };
    vi.mocked(deleteBox).mockResolvedValue(deletionResult);

    const response = await deleteBoxDelete(new Request("http://localhost/api/boxes"), {
      params: Promise.resolve({ boxId }),
    });

    expect(response.status).toBe(200);
    await expect(expectJson(response)).resolves.toEqual(deletionResult);
    expect(deleteBox).toHaveBeenCalledWith(boxId);
  });

  it("returns the created note and placement target from POST /api/documents", async () => {
    const createdNote = {
      document: {
        id: noteId,
        title: "Undefined",
        type: "note" as const,
        date: null,
        contentJson: { type: "doc", content: [] },
        contentText: "",
      },
      summary: {
        id: noteId,
        title: "Undefined",
        type: "note" as const,
        date: null,
        updatedAt: "2026-06-03T10:00:00.000Z",
      },
      boxId,
    };
    vi.mocked(createBlankNote).mockResolvedValue(createdNote);

    const response = await createNotePost(jsonRequest({ id: noteId, boxId }));

    expect(response.status).toBe(200);
    await expect(expectJson(response)).resolves.toEqual(createdNote);
    expect(createBlankNote).toHaveBeenCalledWith({ id: noteId, boxId });
  });

  it("returns canonical placement changes from POST /api/documents/:documentId/box-placements", async () => {
    const placement = { box: boxSummary, document: documentSummary };
    vi.mocked(placeDocumentInBox).mockResolvedValue(placement);

    const response = await placementPost(jsonRequest({ boxId }), {
      params: Promise.resolve({ documentId }),
    });

    expect(response.status).toBe(200);
    await expect(expectJson(response)).resolves.toEqual(placement);
    expect(placeDocumentInBox).toHaveBeenCalledWith({ documentId, boxId });
  });

  it("returns canonical placement changes from DELETE /api/documents/:documentId/box-placements", async () => {
    const placement = { box: boxSummary, document: documentSummary };
    vi.mocked(removeDocumentFromBox).mockResolvedValue(placement);

    const response = await placementDelete(jsonRequest({ boxId }, "DELETE"), {
      params: Promise.resolve({ documentId }),
    });

    expect(response.status).toBe(200);
    await expect(expectJson(response)).resolves.toEqual(placement);
    expect(removeDocumentFromBox).toHaveBeenCalledWith({ documentId, boxId });
  });
});
