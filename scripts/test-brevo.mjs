/**
 * Brevo Email Test Script
 * Usage:
 *   node --env-file=.env scripts/test-brevo.mjs <recipient-email>
 */

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error("\n❌ Error: Please specify a recipient email address.");
  console.log("Usage: node --env-file=.env scripts/test-brevo.mjs your-email@example.com\n");
  process.exit(1);
}

const apiKey = process.env.BREVO_API_KEY;
const mailFrom = process.env.MAIL_FROM;
const mailFromName = process.env.MAIL_FROM_NAME || "SJA Kisii";

console.log("\n--- Checking Brevo Configuration ---");
console.log(`MAIL_FROM:      ${mailFrom || "❌ NOT SET"}`);
console.log(`MAIL_FROM_NAME: ${mailFromName}`);
console.log(`BREVO_API_KEY:  ${apiKey ? apiKey.slice(0, 12) + "..." : "❌ NOT SET"}`);
console.log(`Sending test to: ${targetEmail}\n`);

if (!apiKey || !mailFrom) {
  console.error("❌ Missing required environment variables in .env!");
  console.error("Ensure your .env contains:");
  console.error('  BREVO_API_KEY="xkeysib-..."');
  console.error('  MAIL_FROM="your-verified-brevo-sender@domain.com"');
  console.error('  MAIL_FROM_NAME="SJA Kisii"\n');
  process.exit(1);
}

async function run() {
  const testCode = Math.floor(100000 + Math.random() * 900000).toString();

  console.log(`Attempting to send test verification email with code [${testCode}]...`);

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: mailFromName,
          email: mailFrom,
        },
        to: [{ email: targetEmail }],
        subject: `[Test] SJA Kisii Reset Code: ${testCode}`,
        textContent: `Hello,\n\nThis is a test email from SJA Kisii via Brevo API.\nYour test verification code is: ${testCode}\n`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
            <h2 style="color: #111;">SJA Kisii Brevo Test</h2>
            <p>Your Brevo API connection is working properly!</p>
            <p>Sample verification code:</p>
            <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px; background: #f4f4f5; text-align: center; border-radius: 6px; font-family: monospace;">
              ${testCode}
            </div>
            <p style="font-size: 12px; color: #888; margin-top: 20px;">Sent via Brevo v3 Transactional Email API.</p>
          </div>
        `,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error(`\n❌ Brevo API Error (${res.status}):`);
      console.error(JSON.stringify(data, null, 2));
      if (res.status === 401) {
        console.error("\n👉 Tip: Your BREVO_API_KEY appears to be invalid. Check your API key in Brevo.");
      } else if (data?.message?.toLowerCase().includes("sender")) {
        console.error("\n👉 Tip: Your MAIL_FROM sender email must be verified in Brevo:");
        console.error("   Brevo Dashboard -> Senders, Domains & Dedicated IPs -> Senders -> Add/Verify Sender");
      }
      process.exit(1);
    }

    console.log("\n✅ Success! Test email sent successfully.");
    console.log("Brevo Message ID:", data?.messageId);
    console.log(`Check inbox (${targetEmail}) to confirm delivery.\n`);
  } catch (err) {
    console.error("\n❌ Network or execution error:", err);
    process.exit(1);
  }
}

run();

