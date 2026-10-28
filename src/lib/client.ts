// Small fetch helper for client components. Throws an Error with a readable message.
export async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const issues = Array.isArray(data.issues)
      ? data.issues.map((i: { field: string; message: string }) => `${i.field}: ${i.message}`).join(" | ")
      : "";
    throw new Error(issues || data.error || "Something went wrong");
  }
  return data;
}
