// First aid notes, written in our own words from the First Aid Manual, 11th edition
// (St John Ambulance, St Andrew's First Aid, British Red Cross). Page numbers are the printed ones.
// Have your trainers review this file. Edit it when the division's guidance changes.

type Topic = { id: string; title: string; pages: string; words: string[]; text: string };

const T = (lines: string[]) => lines.join("\n");

const TOPICS: Topic[] = [
  {
    id: "priorities",
    title: "First steps and priorities (primary survey)",
    pages: "pp.46-47, 260-261",
    words: ["first aid", "what do i do", "collapsed", "unconscious", "unresponsive", "not breathing", "passed out", "primary survey", "priority", "emergency"],
    text: T([
      "- Make sure the scene is safe for you first, then for the casualty.",
      "- Check response: speak loudly and gently shake the shoulders (tap the shoulder of a child, the foot of an infant).",
      "- No response: shout for help, open the airway (tilt the head back, lift the chin) and look, listen and feel for normal breathing for no more than 10 seconds. Gasping is not normal breathing. If in doubt, act as if it is not normal.",
      "- Not breathing normally: get someone to call 999/112 and fetch an AED, then start CPR at once. Never leave the casualty to look for an AED. An adult casualty and you are alone: call first (speaker phone), then CPR.",
      "- Breathing normally but unresponsive: check for severe bleeding, put them in the recovery position, call 999/112, and keep watching them.",
      "- Severe bleeding must be dealt with immediately and can come before airway and breathing.",
      "- When life-threatening problems are managed, do a head-to-toe check and monitor the casualty until help arrives.",
      "- With several casualties, treat the most seriously injured first.",
    ]),
  },
  {
    id: "cpr-adult",
    title: "CPR for an adult",
    pages: "pp.64-73, 262-263",
    words: ["cpr", "resuscitat", "chest compression", "compressions", "cardiac arrest", "heart stopped", "no pulse", "rescue breath", "not breathing", "unconscious adult"],
    text: T([
      "- Ask someone to call 999/112 and bring an AED. If you are alone, call first on speaker phone, then start.",
      "- Kneel beside the chest. Heel of one hand on the centre of the chest (the breastbone), other hand on top, fingers interlocked and kept off the ribs.",
      "- Lean over with straight arms and press down 5 to 6 cm, then release fully without taking your hands off. Give 30 compressions at 100 to 120 a minute.",
      "- Open the airway (head tilt, chin lift), pinch the nose, seal your lips over the mouth and blow steadily until the chest rises. Each breath takes about one second. Give 2 breaths.",
      "- Keep going with 30 compressions to 2 breaths (30:2) until help takes over, the casualty shows signs of life (coughing, opening eyes, speaking, moving purposefully) and breathes normally, or you are too exhausted.",
      "- If you are untrained, unwilling or unable to give breaths, give chest compressions only. The emergency call handler can guide you.",
      "- Vomit: roll them onto their side, clear the mouth, roll back and restart. If the chest does not rise, recheck head tilt and mouth, with no more than two attempts before going back to compressions. No finger sweeps.",
      "- More than one rescuer: swap every 1 to 2 minutes with minimal pause. Heavily pregnant: tilt the right hip up with rolled clothing or a helper's knees.",
      "- Use an AED as soon as it arrives, without stopping CPR while the pads go on.",
    ]),
  },
  {
    id: "cpr-child",
    title: "CPR for a child (1 year to puberty)",
    pages: "pp.74-81, 264-265",
    words: ["child cpr", "cpr child", "cpr on a child", "child not breathing", "child unconscious", "kid cpr", "toddler", "child collapsed"],
    text: T([
      "- Check the airway is open (head tilt, chin lift). Give FIVE initial rescue breaths, each about one second until the chest rises.",
      "- Then 30 chest compressions: heel of one hand on the centre of the chest, press down at least one third of the depth of the chest, 100 to 120 a minute, releasing fully.",
      "- Then 2 breaths. Continue 30:2 for one minute, then call 999/112 if nobody has yet (take the child to the phone if you must).",
      "- Ask a helper to fetch an AED, ideally with paediatric pads. Carry on until help arrives, the child shows signs of life and breathes normally, or you are exhausted.",
      "- Vomit: roll onto the side, clear the mouth, roll back and restart. Swap rescuers every 1 to 2 minutes. Chest compressions only if untrained or unwilling to give breaths.",
    ]),
  },
  {
    id: "cpr-infant",
    title: "CPR for an infant (under 1 year)",
    pages: "pp.82-85, 264-265",
    words: ["infant cpr", "baby cpr", "cpr baby", "cpr on a baby", "baby not breathing", "baby unconscious", "baby collapsed", "infant not breathing", "newborn"],
    text: T([
      "- Lay the infant on a firm surface. Gently tilt the head and lift the chin with one finger to open the airway.",
      "- Give FIVE initial rescue breaths: seal your lips over the infant's mouth and nose and blow gently and steadily until the chest rises, about one second each.",
      "- Then 30 compressions with two fingertips on the centre of the chest, pressing down at least one third of the depth of the chest, 100 to 120 a minute, releasing fully.",
      "- Then 2 breaths. Continue 30:2 for one minute, then call 999/112 if not already done, taking the infant to the phone if necessary.",
      "- The manual says do not use an AED on an infant under one year.",
      "- Vomit: roll the infant away from you onto their side, clear the mouth, roll back and restart.",
    ]),
  },
  {
    id: "aed",
    title: "Using an AED (defibrillator)",
    pages: "pp.86-89",
    words: ["aed", "defibrillat", "shock machine", "pads"],
    text: T([
      "- Start CPR first and keep going while the AED is brought and the pads go on. Anyone can use an AED without training.",
      "- Switch it on and follow its voice and visual prompts. Bare the chest, wipe away sweat or water, and shave heavy chest hair only if it stops the pads sticking.",
      "- Adult pads: one on the upper right chest just below the collarbone, one on the left side below the armpit.",
      "- Make sure nobody touches the casualty while it analyses and when a shock is given. If a shock is advised, stand clear and press the shock button if it asks you to. Then carry on with CPR for 2 minutes until it analyses again.",
      "- Do not switch it off or remove the pads, even if the casualty seems to recover. Pads on the wrong way round still work, so do not waste time moving them.",
      "- Children 1 to 8 years: paediatric pads if available (one on the back, one on the chest). Over 8: adult pads. Never on an infant under one year.",
      "- Do not put a pad over a lump under the skin (pacemaker). Remove a medicine patch from the chest. Dry the chest if the casualty was in water.",
      "- Tell the ambulance crew the number of shocks given and when the casualty collapsed.",
    ]),
  },
  {
    id: "recovery",
    title: "Recovery position",
    pages: "pp.66-67",
    words: ["recovery position", "on their side", "unconscious but breathing", "breathing but unresponsive", "faint and not waking"],
    text: T([
      "- For an unresponsive casualty who is breathing normally. Remove glasses and bulky objects from pockets.",
      "- Kneel beside them. Straighten the legs. Place the arm nearest you out at right angles, elbow bent, palm up.",
      "- Bring the far arm across the chest and hold the back of the hand against the cheek nearest you. Pull the far knee up with the foot flat.",
      "- Keeping their hand against the cheek, pull the far knee to roll them towards you onto their side.",
      "- Adjust the upper leg so hip and knee are at right angles. Tilt the head back so the airway stays open, and adjust the hand under the cheek.",
      "- Call 999/112 if not done, and keep checking breathing. If they stay in this position over 30 minutes, roll them onto their back and then onto the other side.",
      "- Suspected spinal injury: keep the spine straight, use helpers to steady the head, or use the log-roll with four or more people.",
    ]),
  },
  {
    id: "choking",
    title: "Choking (adult, child and infant)",
    pages: "pp.96-98, 268-270",
    words: ["chok", "something stuck in", "swallowed wrong", "back blows", "abdominal thrust", "heimlich", "cant breathe food"],
    text: T([
      "- Adult or child over 1: ask 'Are you choking?'. A mild blockage means they can speak, cough and breathe: encourage them to keep coughing.",
      "- Severe blockage (cannot speak, cough or breathe): lean them forward and give up to 5 sharp back blows between the shoulder blades with the heel of your hand. Check the mouth. No finger sweeps.",
      "- Still choking: up to 5 abdominal thrusts. Stand behind, put a fist between the navel and the bottom of the breastbone, grasp it with the other hand and pull sharply inwards and upwards. Recheck the mouth.",
      "- If it is still not clear, call 999/112, then repeat back blows and thrusts until help arrives, it clears, or they become unresponsive. If unresponsive, open the airway, check breathing and begin CPR.",
      "- Infant under 1: lay them face down along your forearm and thigh, supporting the head. Up to 5 back blows between the shoulder blades, then turn them face up along your other leg and check the mouth.",
      "- Still choking: up to 5 chest thrusts with two fingertips on the lower half of the breastbone, a finger's breadth below the nipples. They are sharp downward pushes, like compressions but sharper and slower. No abdominal thrusts for an infant.",
      "- Not cleared: call 999/112 (take the infant with you) and repeat until help arrives, it clears, or they become unresponsive, then begin infant CPR.",
    ]),
  },
  {
    id: "bleeding",
    title: "Severe bleeding",
    pages: "pp.116-117, 274-275",
    words: ["bleed", "blood", "cut deep", "stabbed", "tourniquet", "haemorrhage", "hemorrhage", "wound"],
    text: T([
      "- Press directly on the wound with fingers or the palm over a sterile dressing or clean cloth. If you have no pad, ask the casualty to press themselves. Cut or remove clothing if needed.",
      "- If something is stuck in the wound, do not press on it or pull it out. Press on either side of it.",
      "- Call 999/112 (ask a helper). Give details of the injury and how much bleeding.",
      "- Secure the pad with a bandage tied over it, firm but not so tight it cuts off circulation. Check circulation beyond the bandage and again every 10 minutes. If blood soaks through, take it off and press again over a fresh pad. Use a haemostatic dressing if there is one.",
      "- Lay them down and raise the legs to treat shock (not if a leg is broken). Do not give food or drink. Monitor until help comes.",
      "- Tourniquet: only if direct pressure fails on a limb and you are trained. About 5 cm above the wound, never over a joint, on skin if possible. Note the time, tell the emergency services, and never release it yourself.",
    ]),
  },
  {
    id: "shock",
    title: "Shock",
    pages: "pp.114-115, 274-275",
    words: ["shock", "pale cold clammy", "clammy", "going into shock"],
    text: T([
      "- Signs: fast pulse, pale cold clammy skin, sweating, then fast shallow breathing, weakness, thirst, grey-blue lips, and eventually unresponsiveness.",
      "- Treat the cause, such as bleeding or a burn. Lay the casualty down, ideally on a blanket, and raise and support their legs above the level of the heart.",
      "- Call 999/112. Loosen tight clothing at neck, chest and waist. Cover them to keep them warm but do not use hot-water bottles or other direct heat.",
      "- Do not give food or drink. Do not let them move. Do not leave them alone unless you must call for help. Do not raise the legs if a leg is broken.",
      "- Late pregnancy: lean them towards their left side. If they become unresponsive, open the airway, check breathing and be ready for CPR.",
    ]),
  },
  {
    id: "heart-attack",
    title: "Heart attack and angina",
    pages: "pp.212-213, 266-267",
    words: ["heart attack", "chest pain", "angina", "crushing pain", "pain in left arm", "aspirin"],
    text: T([
      "- Heart attack signs: vice-like chest pain that may spread to the arms or jaw and does not ease with rest, breathlessness, indigestion-like discomfort, ashen skin, blue lips, sweating, a sense of doom, sudden collapse.",
      "- Call 999/112 at once and say you suspect a heart attack. Help them into a comfortable position, often half-sitting, with the head and shoulders supported and cushions under the knees. Reassure them.",
      "- Help them take one 300 mg aspirin tablet, chewed slowly. Do NOT give aspirin if they are allergic, under 16, or have a known problem such as severe asthma or stomach bleeding. If they have their own angina tablets or spray, let them use it.",
      "- Do not give food or drink. Keep onlookers away, monitor them, and if they become unresponsive open the airway, check breathing and begin CPR.",
      "- Angina: stop and sit them down, reassure, and let them use their own medicine. If the pain is not relieved 5 minutes after a dose, they may take a second dose. If it persists 5 minutes after the second dose, or returns, treat it as a heart attack and call 999/112. A first-ever episode of chest pain also needs 999/112.",
    ]),
  },
  {
    id: "stroke",
    title: "Stroke",
    pages: "pp.214-215, 266-267",
    words: ["stroke", "face droop", "slurred speech", "facial weakness", "cant lift arm", "fast test"],
    text: T([
      "- Use FAST: Face (cannot smile evenly or one side droops), Arms (can only lift one arm fully), Speech (slurred or cannot understand), Time to call 999/112.",
      "- Other signs: sudden weakness or numbness down one side, sudden loss of vision, confusion, sudden severe headache, dizziness or a sudden fall.",
      "- Call 999/112 and say you suspect a stroke. Keep them comfortable and reassured, and monitor them.",
      "- Do not give food or drink because swallowing may be difficult. If they become unresponsive, open the airway, check breathing and be ready for CPR.",
    ]),
  },
  {
    id: "asthma",
    title: "Asthma attack",
    pages: "pp.104, 270-271",
    words: ["asthma", "wheez", "inhaler", "cant breathe", "short of breath", "breathless"],
    text: T([
      "- Signs: difficulty breathing, wheezing, coughing, difficulty speaking, distress, grey-blue skin in severe attacks.",
      "- Stay calm and reassure. Sit them in the position they find easiest. Help them take their usual reliever inhaler (usually blue), with a spacer if they have one. Tell them to breathe slowly and deeply.",
      "- If it does not ease within a few minutes, they may take 1 to 2 puffs every 30 to 60 seconds until they have had 10 puffs. If they have a personal asthma plan, follow it.",
      "- Call 999/112 if it is their first attack, they have no inhaler, or the attack is severe: the inhaler has no effect, they cannot talk because of breathlessness, or they are becoming exhausted. If help is delayed more than 15 minutes, repeat the puffs.",
      "- Never leave them alone. If they become unresponsive, open the airway, check breathing and begin CPR.",
    ]),
  },
  {
    id: "anaphylaxis",
    title: "Severe allergic reaction (anaphylaxis)",
    pages: "pp.227, 276-277",
    words: ["anaphyla", "allergic", "allergy", "epipen", "auto-injector", "adrenaline", "swollen tongue", "swelling face", "sting allergy", "nut allergy"],
    text: T([
      "- Signs: anxiety, red itchy rash or weals, swelling of face, hands, feet, tongue or throat, puffy eyes, vomiting and stomach pain, wheezing or difficulty breathing, confusion, collapse.",
      "- Call 999/112 and say you suspect anaphylaxis.",
      "- Help them use their adrenaline auto-injector (you may give it if trained): hold it in your fist, pull off the safety cap, push the tip against the outer thigh until it clicks, hold for 3 seconds (or as the device says). It works through clothing.",
      "- Help them sit in the position that eases breathing. If they go very pale with a weak pulse, lay them down with legs raised as for shock. A pregnant casualty lies tilted to the left.",
      "- If there is no improvement or symptoms return, a further dose can be given every 5 minutes. Monitor them, and if they become unresponsive open the airway, check breathing and be ready for CPR.",
    ]),
  },
  {
    id: "hypo",
    title: "Low blood sugar (hypoglycaemia)",
    pages: "pp.216-217, 276-277",
    words: ["hypo", "low blood sugar", "diabet", "insulin", "sugar level", "glucose"],
    text: T([
      "- Signs: weakness, faintness or hunger, confusion or odd behaviour, sweating with cold clammy skin, fast pulse, trembling, falling level of response. They may carry insulin, a glucose kit or a medical warning bracelet.",
      "- Sit them down. Help them take their glucose gel, or give 15 to 20 g of sugar: a 150 ml glass of fruit juice or non-diet fizzy drink, 3 teaspoons of sugar, or 3 sweets.",
      "- If they recover quickly, give more sugary food or drink, let them rest, and help them check their glucose. Monitor until fully recovered.",
      "- If they do not improve, look for other causes and call 999/112.",
      "- If they are not fully alert, give nothing to eat or drink. If they become unresponsive, open the airway, check breathing and be ready for CPR.",
    ]),
  },
  {
    id: "seizure",
    title: "Seizures (fits) in adults and children",
    pages: "pp.218-220, 282-283",
    words: ["seizure", "convuls", "epilep", " fit ", " fits ", "shaking uncontrol", "febrile"],
    text: T([
      "- Adult: ease their fall, talk calmly, clear dangerous objects, ask onlookers to keep back, and note when it started. Cushion the head with soft material and loosen clothing at the neck.",
      "- Do not restrain them and put nothing in their mouth. A wheelchair user stays in the chair with the brakes on.",
      "- When it stops, open the airway and check breathing. If breathing normally, place them in the recovery position if needed, and monitor them. Note how long it lasted.",
      "- Call 999/112 if it is their first seizure, it lasts more than 5 minutes, they have repeated seizures, they stay unresponsive more than 10 minutes after, or they are injured.",
      "- Child: protect from injury with soft padding, remove bedding and some clothing to cool them (a fever is common) without letting them get too cold. Do not sponge them. After the seizure, open the airway, check breathing and use the recovery position. Call 999/112 and reassure the parents.",
    ]),
  },
  {
    id: "burns",
    title: "Burns and scalds",
    pages: "pp.176-179, 182, 280-281",
    words: ["burn", "scald", "boiling water", "hot oil", "fire injury", "blister"],
    text: T([
      "- Cool the burn immediately with plenty of cold running water for at least 20 minutes, or until the pain eases. Do not delay getting them to hospital for severe burns.",
      "- While cooling, gently remove rings, watches, belts and clothing near the burn before it swells. Do not remove anything stuck to the burn.",
      "- Do not touch the burn or burst blisters. Do not put on lotions, ointments, fat, adhesive dressings or special burn gels or sprays.",
      "- After cooling, cover loosely with kitchen film laid lengthways (discard the first two turns of the roll), or a clean plastic bag for a hand or foot, or a sterile dressing. Do not cover a burn on the face; keep cooling it.",
      "- Call 999/112 for severe burns, large burns or burns to a child. Treat for shock. Be careful of overcooling, especially babies and the elderly, which can cause hypothermia.",
      "- Burns to the face, mouth or throat, soot around the nose or mouth, singed nasal hair, a hoarse voice or breathing difficulty mean the airway may be burnt: call 999/112 at once.",
      "- Chemical burns: protect yourself with gloves and goggles. A chemical splash in the eye: hold the eye under gently running cold water, affected eye lower, for at least 20 minutes without splashing the other eye, then get them to hospital.",
    ]),
  },
  {
    id: "fracture",
    title: "Broken bones and sprains",
    pages: "pp.138-142, 280-281",
    words: ["fractur", "broken bone", "broke my", "broken arm", "broken leg", "sprain", "strain", "twisted ankle", "dislocat", "sling"],
    text: T([
      "- Signs: swelling, bruising, deformity, pain and difficulty moving; maybe a bent or shortened limb or bone through the skin.",
      "- Help them support the injured part at the joints above and below in the most comfortable position. Pad around it. Do not move the limb unnecessarily or if it causes pain.",
      "- An open wound: cover with a sterile dressing or clean pad and bandage it in place.",
      "- For extra support or if help is delayed, secure it to an uninjured part: a sling for the upper body, broad and narrow bandages for the legs, tying knots on the uninjured side. Check circulation after bandaging and every 10 minutes.",
      "- Do not give food or drink. An arm injury can go to hospital by car if they are not in shock. A leg injury needs an ambulance: call 999/112. Treat for shock but do not raise a broken leg.",
      "- Sprains and strains: rest the part, put a cold compress on it, and give comfortable support with the part raised. If in any doubt, treat it as a fracture.",
    ]),
  },
  {
    id: "head-spine",
    title: "Head injury and spinal injury",
    pages: "pp.146-147, 159-161, 278-279",
    words: ["head injury", "hit my head", "hit his head", "hit her head", "concussion", "knocked out", "spine", "spinal", "neck injury", "back injury", "fell from"],
    text: T([
      "- Head injury signs: brief loss of response, dizziness, nausea, headache, confusion, memory loss, a scalp wound. Severe: a hard blow, falling level of response, fluid or blood from the ear or nose, unequal pupils.",
      "- Scalp wound: replace displaced skin flaps, press firmly with a sterile or clean pad, and secure it with a bandage. Help them lie down with head and shoulders slightly raised, monitor them, and call 999/112 for any sign of severe injury.",
      "- Get medical advice if later they have increasing drowsiness, a lasting headache, confusion, loss of balance, trouble speaking, repeated vomiting, double vision or a seizure.",
      "- Spinal injury (after a fall from height or a hard blow to head, back or feet; neck or back pain, weakness, numbness, loss of bladder or bowel control): tell them not to move, hold their head still, and call 999/112. Do not move them unless they are in danger.",
      "- Steady the head from behind with your arms resting on the ground, hands either side of the head without covering the ears. Ask a helper to pad each side with rolled towels. If they are unresponsive, open the airway by lifting the jaw without tilting the head, then check breathing. For recovery position use the log-roll.",
    ]),
  },
  {
    id: "poison",
    title: "Swallowed poisons",
    pages: "pp.200-203, 284-285",
    words: ["poison", "swallowed", "overdose", "drank", "bleach", "berries", "pills", "tablets", "kerosene", "paraffin", "pesticide"],
    text: T([
      "- Reassure them. Ask what they took, how much and when, and look for clues such as containers, pill bottles or poisonous plants.",
      "- Call 999/112 and give the call handler all the information you have.",
      "- Do NOT try to make them vomit. Protect yourself from chemicals with gloves, a mask and goggles.",
      "- Monitor their vital signs. Keep samples of vomit and any clues for the ambulance crew.",
      "- If the lips are burnt by what they swallowed, give frequent sips of cool milk or water. If they become unresponsive, make sure the mouth is clear, open the airway, check breathing and be ready for CPR. Use a face shield or pocket mask if there are chemicals around the mouth.",
    ]),
  },
  {
    id: "heat",
    title: "Heat illness: dehydration, heat exhaustion and heatstroke",
    pages: "pp.184-187, 284-285",
    words: ["heat exhaustion", "heatstroke", "heat stroke", "overheat", "too hot", "dehydrat", "sunstroke"],
    text: T([
      "- Heat exhaustion (loss of salt and water): headache, dizziness, confusion, nausea, sweating with pale clammy skin, cramps, fast weak pulse. Move them to a cool shady place, have them lie down with the legs raised, and give plenty of water to drink (rehydration powders help). Advise medical advice even if they recover quickly; call 999/112 if they get worse.",
      "- Heatstroke is an emergency: body temperature above 40 C, hot flushed dry skin, headache, restlessness, confusion and rapid worsening. Call 999/112.",
      "- Move them to a cool place, remove outer clothing, and wrap them in a cold wet sheet (or fan them and sponge with cold water if no sheet).",
      "- Keep the sheet wet with cold water. Keep cooling until the temperature falls below 38 C, then swap to a dry sheet. If the temperature rises again, repeat. Monitor them, and if they become unresponsive open the airway and check breathing.",
    ]),
  },
  {
    id: "cold",
    title: "Hypothermia",
    pages: "pp.188-190",
    words: ["hypotherm", "too cold", "freezing", "exposure to cold", "shivering", "frostbite"],
    text: T([
      "- Signs: shivering, cold pale dry skin, apathy or odd behaviour, drowsiness, slow shallow breathing, a slowing pulse.",
      "- Stop further heat loss: shelter from wind, protect from the cold ground with dry insulating material, replace wet clothing, cover the head, and wrap them (sleeping bag, blankets, survival bag).",
      "- If fully alert, give warm non-alcoholic drinks and high-energy food such as chocolate. Do not give alcohol. Do not use hot-water bottles or fires next to them.",
      "- Call 999/112. Never leave them alone. Monitor them. Keep going with CPR if they become unresponsive, because survival is possible even after long resuscitation.",
      "- Indoors, re-warm with layers of blankets and warm the room to about 25 C. Babies lose heat fast: they may feel cold and limp and refuse feeds, so always seek medical advice.",
    ]),
  },
  {
    id: "drowning",
    title: "Drowning and water rescue",
    pages: "pp.36-37, 102",
    words: ["drown", "water rescue", "pulled from water", "swimming pool", "river", "lake", "fell in water"],
    text: T([
      "- Do not put yourself in danger. Stay on dry land and reach with a stick, branch or rope, or throw a float. Only a trained lifesaver should wade or swim out.",
      "- Once out, do a primary survey. If unresponsive and not breathing: call 999/112 (and ask for an AED), open the airway and give FIVE initial rescue breaths, then 30 compressions and 2 breaths (30:2).",
      "- If breathing returns, treat for hypothermia: dry them, cover with warm clothes and blankets, and monitor them.",
      "- Always call 999/112, even if they seem to have recovered. They may vomit, so be ready to roll them onto their side.",
    ]),
  },
  {
    id: "faint",
    title: "Fainting, hyperventilation and nosebleed",
    pages: "pp.103, 126, 225",
    words: ["faint", "dizzy", "hyperventilat", "panic attack", "nosebleed", "nose bleed", "bleeding nose"],
    text: T([
      "- Fainting: lay them down, kneel and raise their legs, supporting the ankles on your shoulders. Make sure they have fresh air. Help them sit up gradually once recovered. Do not sit them with the head between the knees. If they do not wake quickly, open the airway and check breathing. A pregnant casualty lies tilted to the left.",
      "- Hyperventilation: be kind and reassuring and lead them to a quiet place. Encourage slow breathing. Do not give them a paper bag to breathe into. Serious illness can look the same, so look for other causes, especially in children.",
      "- Nosebleed: sit them down, lean forward (never tip the head back), breathe through the mouth and pinch the soft part of the nose for up to 10 minutes. Repeat up to two more times. Do not speak, swallow, cough, spit or sniff. Go to hospital if it is severe or lasts over 30 minutes. Thin watery blood after a head injury is a very serious sign.",
    ]),
  },
  {
    id: "infection",
    title: "Fever, sepsis and meningitis",
    pages: "pp.221-223, 272-273",
    words: ["sepsis", "meningitis", "fever", "high temperature", "rash that does not fade", "glass test", "stiff neck"],
    text: T([
      "- Sepsis: severe breathlessness or fast shallow breathing, extreme pain, not passing urine, pale or mottled skin with cold hands and feet, slurred speech, confusion and drowsiness, or a feeling of dying. In children: fast breathing, hard to wake, mottled or blue skin, cold hands and feet, no wet nappies. Call 999/112 and say you suspect sepsis. Do not wait for every sign.",
      "- Meningitis: flu-like illness, high temperature, severe headache, neck stiffness, vomiting, dislike of light, and in infants a high-pitched cry, floppiness or a bulging fontanelle. A rash of red or purple spots that does not fade when pressed with the side of a glass is a late sign: call 999/112.",
      "- Keep them cool and give plenty of water. Monitor them. Call 999/112 if they worsen, even if a doctor has already seen them.",
    ]),
  },
  {
    id: "bites",
    title: "Snake bites and stings",
    pages: "pp.205-209",
    words: ["snake", "bitten", "bite", "venom", "sting", "jellyfish", "scorpion", "bee", "wasp", "tick"],
    text: T([
      "- Snake bite: assume the snake is venomous. Sit the casualty down, reassure them and tell them not to move the limb so venom spreads less. Call 999/112 and get them to hospital urgently.",
      "- Immobilise the limb: an upper limb in a sling with a broad bandage around limb and body, a lower limb secured to the other leg. Keep them still all the time.",
      "- Note the time of the bite and the snake's appearance. Photograph it only if safe.",
      "- Do NOT apply a tourniquet, cut the wound or try to suck out the venom. Leave clothing at the site alone because movement spreads venom.",
      "- Painless bite from an exotic snake: place a pad on the site and a pressure bandage over it, extended as far up the limb as possible, then check circulation. The manual is a UK book, so ask your trainers whether local snake-bite advice differs.",
      "- Sea creature stings: pour vinegar or sea water over a jellyfish sting, then use water as hot as can be tolerated but no hotter than 40 C for up to 30 minutes. Do not scald them. Watch for an allergic reaction. Call 999/112 for a severe reaction.",
    ]),
  },
  {
    id: "scene-safety",
    title: "Safety at an incident: traffic, fire and electricity",
    pages: "pp.28-37",
    words: ["road accident", "car crash", "traffic", "accident scene", "fire", "smoke", "electric", "electrocut", "live wire", "lightning", "clothing on fire", "make safe"],
    text: T([
      "- Assess the scene first: what dangers remain, how many casualties, what happened. If you cannot make it safe, call 999/112 and keep clear.",
      "- Roads: park well clear with hazard lights on, wear hi-vis, have helpers set warning triangles at least 45 m away in both directions, switch off the ignition of damaged vehicles, keep everyone away from spilt fuel and do not smoke. A casualty in a vehicle may have a neck injury: support head and neck and do not move them unless essential.",
      "- Fire: warn people, raise the alarm, call 999/112 and leave the building. Do not use lifts, re-enter, or fight a fire that puts you at risk. Never use water on an electrical fire or a pan fire. Never open a door to a fire. Stay low in smoke.",
      "- Clothing on fire: Stop (stop them running), Drop (to the ground), Roll (smother flames with a fire blanket or heavy coat and roll them). Then cool the burns.",
      "- Electricity: do not touch a casualty who is still in contact with the current. Switch off at the mains or unplug first. If you cannot, stand on dry insulating material and push the casualty or the source away with a wooden pole or broom, or pull them clear with a rope. Never use metal. Keep 18 m away from high-voltage lines until power is confirmed off. Then do a primary survey, treat burns, and call 999/112.",
      "- Lightning can strike twice: clear everyone from the area. Start CPR promptly if needed.",
    ]),
  },
  {
    id: "infection-control",
    title: "Protecting yourself from infection",
    pages: "p.18",
    words: ["gloves", "infection control", "blood on me", "protect myself", "hepatitis", "hiv", "ppe", "clinical waste", "needle", "sharps"],
    text: T([
      "- Wear disposable latex-free gloves (nitrile) whenever there may be contact with blood or body fluids, and use one pair per casualty. Wash or sanitise hands before and after.",
      "- Remove gloves by peeling the first off by the cuff without touching the outside, then peel the second over it so the first is inside. Bin them in a waste bag, ideally a yellow clinical waste bag.",
      "- Put sharps such as needles in a sharps box, or a screw-top jar if you have none.",
    ]),
  },
  {
    id: "mental-health",
    title: "Mental health crisis and looking after yourself as a first aider",
    pages: "pp.24-25, 224",
    words: ["suicid", "kill myself", "want to die", "self harm", "self-harm", "mental health", "depress", "anxious", "anxiety", "stress", "overwhelm", "hopeless", "after an incident", "nightmare", "flashback"],
    text: T([
      "- For someone in distress: listen with empathy, let them talk freely, do not judge, respect privacy, offer calm support, and tell them effective help exists.",
      "- Encourage them to seek professional support: their doctor, counselling, or mental health services. Encourage self-help such as talking to supportive family and friends, regular exercise, enough sleep, good food, relaxation, and cutting back caffeine and alcohol.",
      "- Someone who has self-harmed: do not criticise. Offer to treat any wound if they want, and recommend they get help.",
      "- Someone feeling suicidal: help them to call a close friend, a family member or a health professional. If they have acted on their feelings or are at risk of harm, call 999/112.",
      "- First aiders: strong feelings after a hard incident are normal. Talk about it with someone you trust, ideally someone who was there. Never hide your feelings or blame yourself. If nightmares, flashbacks or distress persist, seek professional help from a doctor or counsellor.",
    ]),
  },
];

const MAX_TOPICS = 3;

// Picks the notes that match what the member is asking about. Pass the last few things they said.
export function firstAidNotes(recent: string[]): string {
  const hay = " " + recent.join(" ").toLowerCase().replace(/[^a-z0-9' -]+/g, " ") + " ";
  const picked = TOPICS.map((t) => ({
    t,
    score: t.words.reduce((n, w) => (hay.includes(w) ? n + (w.trim().length > 5 ? 2 : 1) : n), 0),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_TOPICS);
  if (picked.length === 0) return "";

  const parts = picked.map(({ t }) => `${t.title} (Manual ${t.pages})\n${t.text}`);
  return [
    "FIRST AID MANUAL NOTES",
    "These come from the authorised First Aid Manual, 11th edition. Follow them closely and in order. Do not change, skip or add steps, numbers, timings or doses. Finish with the page references.",
    "",
    parts.join("\n\n"),
  ].join("\n");
}
