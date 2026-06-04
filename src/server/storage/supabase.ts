type UploadSupabaseStorageObjectInput = {
  path: string;
  file: Blob;
  contentType: string;
};

function getSupabaseStorageConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "attachments";

  if (!url) {
    throw new Error("SUPABASE_URL is required.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required.");
  }

  return { bucket, serviceRoleKey, url };
}

export async function uploadSupabaseStorageObject({
  path,
  file,
  contentType,
}: UploadSupabaseStorageObjectInput) {
  const { bucket, serviceRoleKey, url } = getSupabaseStorageConfig();
  const response = await fetch(
    `${url}/storage/v1/object/${encodeURIComponent(bucket)}/${path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/")}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: file,
    },
  );

  if (!response.ok) {
    throw new Error("Unable to store attachment.");
  }

  return { path };
}
