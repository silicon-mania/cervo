import { beforeEach, describe, expect, it, vi } from "vitest";

import { appendCaptureTextToCurrentDailyNote } from "@/features/capture/server/mutations";
import { requireWorkspace } from "@/server/auth/require-workspace";

import { POST } from "./route";

vi.mock("@/features/capture/server/mutations", () => ({
  appendCaptureTextToCurrentDailyNote: vi.fn(),
}));

vi.mock("@/server/auth/require-workspace", () => ({
  requireWorkspace: vi.fn(),
}));

const captureId = "11111111-1111-4111-8111-111111111111";
const dailyNoteId = "22222222-2222-4222-8222-222222222222";

function multipartRequest(fields: Record<string, string>) {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, value);
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
    vi.mocked(appendCaptureTextToCurrentDailyNote).mockResolvedValue({
      ok: true,
      dailyNoteId,
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
    });
    expect(appendCaptureTextToCurrentDailyNote).toHaveBeenCalledWith({
      workspaceId: "workspace_123",
      clerkUserId: "user_123",
      captureId,
      text: "one\ntwo",
    });
  });

  it("rejects unauthenticated requests before appending", async () => {
    vi.mocked(requireWorkspace).mockRejectedValue(new Error("Authentication required."));

    const response = await POST(multipartRequest({ captureId, text: "hello" }));

    expect(response.status).toBe(401);
    await expect(expectJson(response)).resolves.toEqual({ error: "Authentication required." });
    expect(appendCaptureTextToCurrentDailyNote).not.toHaveBeenCalled();
  });

  it("rejects workspace-less requests before appending", async () => {
    vi.mocked(requireWorkspace).mockRejectedValue(new Error("Organization required."));

    const response = await POST(multipartRequest({ captureId, text: "hello" }));

    expect(response.status).toBe(401);
    await expect(expectJson(response)).resolves.toEqual({ error: "Organization required." });
    expect(appendCaptureTextToCurrentDailyNote).not.toHaveBeenCalled();
  });

  it("validates capture id and text fields", async () => {
    const response = await POST(multipartRequest({ captureId: "not-a-uuid", text: "" }));

    expect(response.status).toBe(400);
    expect(appendCaptureTextToCurrentDailyNote).not.toHaveBeenCalled();
  });
});
