export type TipDef = { id: string; title: string; text: string; target?: string };

// One tip per page, shown the first time a member opens it. The first match wins.
// "target" is the main feature on the page. A gold ring is drawn around it when it is there.
export const TIPS: { match: RegExp; tip: TipDef }[] = [
  { match: /^\/dashboard\/?$/, tip: { id: "Overview", title: "Your home", text: "See the Member of the Week and your Points in service, which grow every time you attend something.", target: '[data-tip="service-points"]' } },
  { match: /^\/dashboard\/meetings\/[^/]+\/?$/, tip: { id: "MeetingDetail", title: "A meeting", text: "Send an apology here at least 2 hours before it starts. Leaders also manage check-in and documents from this page." } },
  { match: /^\/dashboard\/meetings\/?$/, tip: { id: "Meetings", title: "Meetings", text: "Open a meeting for its details. If you cannot come, send an apology at least 2 hours before it starts." } },
  { match: /^\/dashboard\/fieldops\/[^/]+\/?$/, tip: { id: "FieldOpDetail", title: "A field operation", text: "See where and when, and your own attendance. Being there earns 15 points." } },
  { match: /^\/dashboard\/fieldops\/?$/, tip: { id: "FieldOps", title: "Field operations", text: "Service in the field for your crew. Every operation you attend earns 15 points." } },
  { match: /^\/dashboard\/training\/[^/]+\/?$/, tip: { id: "TrainingDetail", title: "A training session", text: "Training counts for points once DO Training has verified it. Check-in and attendance are shown here." } },
  { match: /^\/dashboard\/training\/?$/, tip: { id: "Training", title: "First Aid manual", text: "Open the First Aid manual here. Verified training sessions earn 10 points each.", target: '[data-tip="first-aid-manual"]' } },
  { match: /^\/dashboard\/band\/?$/, tip: { id: "Band", title: "Band practice", text: "Band attendance is counted here. Band points only break ties for Member of the Week." } },
  { match: /^\/dashboard\/crew\/?$/, tip: { id: "Crew", title: "Your crew", text: "Announcements, RSVPs, the WhatsApp group and your crew mates are all here." } },
  { match: /^\/dashboard\/attendance\/?$/, tip: { id: "Attendance", title: "Your attendance", text: "Marked absent by mistake? Tap Dispute within 14 days and explain." } },
  { match: /^\/dashboard\/scan\/?$/, tip: { id: "Scan", title: "Check in", text: "Events open for check-in appear under Open now. Tap Check in here, or scan the QR code at the venue.", target: '[data-tip="scan-button"]' } },
  { match: /^\/dashboard\/profile\/?$/, tip: { id: "Profile", title: "Your two profiles", text: "Official is private (you and the DO Admin only). Social is what other members see. Add fingerprint sign-in further down.", target: '[data-tip="profile-tabs"]' } },
  { match: /^\/dashboard\/store\/manage\/?$/, tip: { id: "ShopManage", title: "Manage the shop", text: "Add items with up to 6 photos, set stock, and mark orders paid or collected." } },
  { match: /^\/dashboard\/store\/?$/, tip: { id: "Store", title: "The shop", text: "Order an item, then tap Pay with M-Pesa on your order. It is marked paid automatically.", target: '[data-tip="pay-now"]' } },
  { match: /^\/dashboard\/pay\/?$/, tip: { id: "Pay", title: "Payments", text: "Anything DO Finance opens for payment shows up here. Tap Pay with M-Pesa and enter your PIN on your phone.", target: '[data-tip="pay-now"]' } },
  { match: /^\/dashboard\/finance\/collections\/[^/]+\/?$/, tip: { id: "CollectionDetail", title: "Live payments", text: "Payments appear on this list by themselves as people pay. Close the activity when you are done." } },
  { match: /^\/dashboard\/finance\/collections\/?$/, tip: { id: "Collections", title: "Payment activities", text: "Create something people must pay for, set one fixed price, and watch the payments arrive." } },
  { match: /^\/dashboard\/finance\/alerts\/?$/, tip: { id: "Alerts", title: "Payment alerts", text: "Choose where you are told about each payment. Use Send test alert after saving." } },
  { match: /^\/dashboard\/finance\/?$/, tip: { id: "Finance", title: "Finance", text: "All M-Pesa payments, the registration fee, payment activities and alerts live here." } },
  { match: /^\/dashboard\/articles\/?$/, tip: { id: "Articles", title: "Articles", text: "News and notices from your leaders. Leaders can write, edit and add up to 10 photos." } },
  { match: /^\/dashboard\/documents\/?$/, tip: { id: "Documents", title: "Documents", text: "The constitution, manuals and other files. Download them, or open the Google links." } },
  { match: /^\/dashboard\/approvals\/?$/, tip: { id: "Approvals", title: "Approvals", text: "New members wait here for your decision. Approve or reject them." } },
  { match: /^\/dashboard\/people\/?$/, tip: { id: "People", title: "People and titles", text: "Promote or demote leaders. When every post is filled, finish the leadership setup to lock promotions." } },
  { match: /^\/dashboard\/members\/?$/, tip: { id: "Members", title: "Members", text: "Click a name to open their record. You can add people and export a member report from here." } },
  { match: /^\/dashboard\/analytics\/?$/, tip: { id: "Analytics", title: "Analytics", text: "Crew attendance trends, and members who may need a friendly check-in." } },
];
