type Issue = { field: string; message: string };

function fail(data: { error?: string; issues?: Issue[] }): never {
  const issues = Array.isArray(data.issues)
    ? data.issues.map((i) => (i.field ? `${i.field}: ${i.message}` : i.message)).join(" | ")
    : "";
  throw new Error(issues || data.error || "Something went wrong");
}

// Small fetch helper for client components. Throws an Error with a readable message.
export async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) fail(data);
  return data;
}

// For uploads (multipart form data)
export async function postForm(url: string, form: FormData) {
  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) fail(data);
  return data;
}
