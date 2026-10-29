export const CREW_NAMES: Record<number, string> = {
  1: "The Fiery Knights",
  2: "The Great Amalfi",
  3: "The Royal Duke",
  4: "The Mighty Malta",
};

export const CREW_COLORS: Record<number, string> = {
  1: "#ff5a36",
  2: "#3fb5e8",
  3: "#a78bfa",
  4: "#2fcb8b",
};

export const crewName = (id: number | null | undefined) =>
  id ? (CREW_NAMES[id] ?? `Crew ${id}`) : "No crew";

export const crewColor = (id: number | null | undefined) =>
  id ? (CREW_COLORS[id] ?? "#d4af5a") : "#d4af5a";
