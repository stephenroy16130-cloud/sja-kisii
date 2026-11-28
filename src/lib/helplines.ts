// Free support lines in Kenya. Check them now and then, numbers change.
// Used by the assistant's instructions and by the support card in the chat.
// You can add the Kisii University counselling office here too.
export const HELPLINES = [
  { name: "Kenya Red Cross (free, emotional support)", number: "1199", tel: "1199" },
  { name: "Befrienders Kenya (call, SMS or WhatsApp)", number: "+254 722 178 177", tel: "+254722178177" },
  { name: "Gender violence helpline (free)", number: "1195", tel: "1195" },
  { name: "Childline Kenya (for under 18s)", number: "116", tel: "116" },
];

export const HELPLINE_TEXT = HELPLINES.map((h) => h.name + " " + h.number).join("; ");
