const key = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-5-mini";

(async () => {
  if (!key) {
    console.log("OPENAI_API_KEY is not in .env yet. Do Step 1 first.");
    return;
  }
  console.log("Key found (" + key.length + " characters, starts " + key.slice(0, 3) + "...)");
  console.log("Model to test: " + model + "\n");

  const list = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: "Bearer " + key } });
  if (list.status === 401) {
    console.log("The key was rejected (401). It may be copied incompletely, or revoked.");
    return;
  }
  if (!list.ok) {
    console.log("Could not list models (HTTP " + list.status + "): " + (await list.text()).slice(0, 200));
  } else {
    const ids = ((await list.json()).data || []).map((m) => m.id).sort();
    const small = ids.filter((id) => /^(gpt-[\d.]+-(mini|nano)|gpt-4o-mini)$/.test(id));
    console.log("Small, low-cost models your key can use:\n  " + (small.join(", ") || "(none matched)"));
    console.log(
      ids.includes(model)
        ? "\n'" + model + "' is available to you."
        : "\nWARNING: '" + model + "' is not in your list. Set OPENAI_MODEL in .env to one of the names above."
    );
  }

  console.log("\nSending a tiny test question...");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: "Reply with exactly: ready",
      max_output_tokens: 400,
      store: false,
      ...(process.env.OPENAI_REASONING === "off" ? {} : { reasoning: { effort: process.env.OPENAI_REASONING || "low" } }),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body.error && body.error.message) || "HTTP " + res.status;
    console.log("FAILED (" + res.status + "): " + msg);
    if (res.status === 429) console.log("A 429 usually means no credit left. Add credit or a payment method in your OpenAI billing settings.");
    if (/reasoning/i.test(msg)) console.log("This model has no reasoning setting. Add OPENAI_REASONING=\"off\" to .env.");
    if (res.status === 404 || /model/i.test(msg)) console.log("Pick a model from the list above and set OPENAI_MODEL in .env.");
    return;
  }
  const text = (body.output || [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content || [])
    .map((c) => c.text || "")
    .join("")
    .trim();
  console.log("Answer: " + (text || "(empty)"));
  if (body.usage) console.log("Tokens used: " + body.usage.input_tokens + " in, " + body.usage.output_tokens + " out");
  console.log("\nIt works. The assistant is ready to be switched on.");
})().catch((e) => console.error("Could not reach OpenAI: " + e.message));
