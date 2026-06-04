import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadSupabaseStorageObject } from "./supabase";

describe("uploadSupabaseStorageObject", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uploads a file to the configured Supabase Storage bucket", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubEnv("SUPABASE_URL", "https://supabase.example");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubEnv("SUPABASE_STORAGE_BUCKET", "capture-assets");
    vi.stubGlobal("fetch", fetch);

    const result = await uploadSupabaseStorageObject({
      path: "workspace/documents/note/capture/file name.png",
      file: new Blob(["image"], { type: "image/png" }),
      contentType: "image/png",
    });

    expect(result).toEqual({ path: "workspace/documents/note/capture/file name.png" });
    expect(fetch).toHaveBeenCalledWith(
      "https://supabase.example/storage/v1/object/capture-assets/workspace/documents/note/capture/file%20name.png",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer service-role-key",
          "Content-Type": "image/png",
          "x-upsert": "false",
        },
      }),
    );
  });

  it("fails when Supabase Storage rejects the upload", async () => {
    vi.stubEnv("SUPABASE_URL", "https://supabase.example");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    await expect(
      uploadSupabaseStorageObject({
        path: "workspace/file.png",
        file: new Blob(["image"], { type: "image/png" }),
        contentType: "image/png",
      }),
    ).rejects.toThrow("Unable to store attachment.");
  });
});
