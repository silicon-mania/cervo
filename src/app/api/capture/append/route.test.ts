import { beforeEach, describe, expect, it, vi } from "vitest";

import { appendCaptureToCurrentDailyNote } from "@/features/capture/server/mutations";
import { requireWorkspace } from "@/server/auth/require-workspace";

import { POST } from "./route";

vi.mock("@/features/capture/server/mutations", () => ({
  appendCaptureToCurrentDailyNote: vi.fn(),
}));

vi.mock("@/server/auth/require-workspace", () => ({
  requireWorkspace: vi.fn(),
}));

const captureId = "11111111-1111-4111-8111-111111111111";
const dailyNoteId = "22222222-2222-4222-8222-222222222222";
const attachmentId = "33333333-3333-4333-8333-333333333333";

function multipartRequest(fields: Record<string, string>, images: File[] = []) {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, value);
  });

  images.forEach((image) => {
    formData.append("images", image);
  });

  return new Request("http://localhost/api/capture/append", {
    method: "POST",
    body: formData,
  });
}

async function expectJson(response: Response) {
  return response.json() as Promise<unknown>;
}

describe("POST /api/capture/append", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireWorkspace).mockResolvedValue({
      clerkUserId: "user_123",
      clerkOrgId: "org_123",
      clerkOrgRole: "org:member",
      workspace: {
        id: "workspace_123",
        clerkOrgId: "org_123",
        name: "Acme",
        createdBy: "user_123",
        localRole: "member",
        isCreator: false,
      },
    });
    vi.mocked(appendCaptureToCurrentDailyNote).mockResolvedValue({
      ok: true,
      dailyNoteId,
      attachmentIds: [],
      attachmentCount: 0,
    });
  });

  it("accepts multipart capture id and plain text, deriving workspace from the active session", async () => {
    const response = await POST(
      multipartRequest({
        captureId,
        text: "one\r\ntwo",
      }),
    );

    expect(response.status).toBe(200);
    await expect(expectJson(response)).resolves.toEqual({
      ok: true,
      dailyNoteId,
      attachmentIds: [],
      attachmentCount: 0,
    });
    expect(appendCaptureToCurrentDailyNote).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
      clerkUserId: "user_123",
      captureId,
      text: "one\ntwo",
      images: [],
    });
  });

  it("accepts image-only appends in the same multipart request", async () => {
    const image = new File(["image-bytes"], "capture.png", { type: "image/png" });
    vi.mocked(appendCaptureToCurrentDailyNote).mockResolvedValue({
      ok: true,
      dailyNoteId,
      attachmentIds: [attachmentId],
      attachmentCount: 1,
    });

    const response = await POST(multipartRequest({ captureId, text: "" }, [image]));

    expect(response.status).toBe(200);
    await expect(expectJson(response)).resolves.toEqual({
      ok: true,
      dailyNoteId,
      attachmentIds: [attachmentId],
      attachmentCount: 1,
    });
    expect(appendCaptureToCurrentDailyNote).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
      clerkUserId: "user_123",
      captureId,
      text: "",
      images: [
        {
          name: "capture.png",
          type: "image/png",
          size: 11,
          file: image,
        },
      ],
    });
  });

  it("passes mixed text and image appends through one server mutation", async () => {
    const image = new File(["image-bytes"], "capture.webp", { type: "image/webp" });

    const response = await POST(multipartRequest({ captureId, text: "with image" }, [image]));

    expect(response.status).toBe(200);
    expect(appendCaptureToCurrentDailyNote).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
      clerkUserId: "user_123",
      captureId,
      text: "with image",
      images: [
        {
          name: "capture.webp",
          type: "image/webp",
          size: 11,
          file: image,
        },
      ],
    });
  });

  it("rejects unauthenticated requests before appending", async () => {
    vi.mocked(requireWorkspace).mockRejectedValue(new Error("Authentication required."));

    const response = await POST(multipartRequest({ captureId, text: "hello" }));

    expect(response.status).toBe(401);
    await expect(expectJson(response)).resolves.toEqual({ error: "Authentication required." });
    expect(appendCaptureToCurrentDailyNote).not.toHaveBeenCalled();
  });

  it("rejects workspace-less requests before appending", async () => {
    vi.mocked(requireWorkspace).mockRejectedValue(new Error("Organization required."));

    const response = await POST(multipartRequest({ captureId, text: "hello" }));

    expect(response.status).toBe(401);
    await expect(expectJson(response)).resolves.toEqual({ error: "Organization required." });
    expect(appendCaptureToCurrentDailyNote).not.toHaveBeenCalled();
  });

  it("validates capture id and text fields", async () => {
    const response = await POST(multipartRequest({ captureId: "not-a-uuid", text: "" }));

    expect(response.status).toBe(400);
    expect(appendCaptureToCurrentDailyNote).not.toHaveBeenCalled();
  });

  it("rejects empty captures before appending", async () => {
    const response = await POST(multipartRequest({ captureId, text: "" }));

    expect(response.status).toBe(400);
    await expect(expectJson(response)).resolves.toEqual({
      error: "Capture text or image is required.",
    });
    expect(appendCaptureToCurrentDailyNote).not.toHaveBeenCalled();
  });

  it("maps server-side image validation failures to bad requests", async () => {
    vi.mocked(appendCaptureToCurrentDailyNote).mockRejectedValue(
      new Error("Only PNG, JPEG, GIF, or WebP images can be appended."),
    );

    const response = await POST(
      multipartRequest({ captureId, text: "" }, [
        new File(["image-bytes"], "capture.bmp", { type: "image/bmp" }),
      ]),
    );

    expect(response.status).toBe(400);
    await expect(expectJson(response)).resolves.toEqual({
      error: "Only PNG, JPEG, GIF, or WebP images can be appended.",
    });
  });
});
