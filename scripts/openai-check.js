const key = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || "openai/gpt-5-mini";

(async () => {
  if (!key) return console.log("OPENROUTER_API_KEY is not in .env. Do Step 2 first.");
  console.log("Key found (" + key.length + " characters, starts " + key.slice(0, 6) + "...)");
  console.log("Model to test: " + model + "\n");

  const list = await fetch("https://openrouter.ai/api/v1/models");
  if (list.ok) {
    const ids = ((await list.json()).data || []).map((m) => m.id);
    if (ids.includes(model)) console.log("'" + model + "' exists on OpenRouter.\n");
    else {
      console.log("WARNING: '" + model + "' was not found. Some small models you could use:");
      console.log("  " + ids.filter((id) => /(mini|nano|flash|haiku|gpt-oss)/.test(id)).slice(0, 25).join("\n  ") + "\n");
    }
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with exactly: ready" }], max_tokens: 400 }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log("FAILED (" + res.status + "): " + ((body.error && body.error.message) || "unknown"));
    if (res.status === 401) console.log("The key was rejected. Check it was pasted completely.");
    if (res.status === 402) console.log("No credit on the account. Add credit at openrouter.ai/credits.");
    return;
  }
  console.log("Answer: " + (((body.choices || [])[0] || {}).message || {}).content);
  console.log("\nIt works. The assistant is ready.");
})().catch((e) => console.error("Could not reach OpenRouter: " + e.message));
