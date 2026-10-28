export const CREW_NAMES: Record<number, string> = {
  1: "The Fiery Knights",
  2: "The Great Amalfi",
  3: "The Royal Duke",
  4: "The Mighty Malta",
};

export const crewName = (id: number | null | undefined) =>
  id ? (CREW_NAMES[id] ?? `Crew ${id}`) : "No crew";
