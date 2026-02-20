const TRADE_KEYWORDS = {
  Plumber: ["plumber", "plumbing", "pipefitter", "pipe fitter"],
  Electrician: ["electrician", "electrical", "wiring", "wireman"],
  Carpenter: [
    "carpenter",
    "carpentry",
    "woodwork",
    "cabinetmaker",
    "cabinet maker",
  ],
  Locksmith: ["locksmith", "lock smith", "rekey", "rekeying"],
  HVAC: [
    "hvac",
    "heating",
    "ventilation",
    "air conditioning",
    "refrigeration",
    "hvac technician",
  ],
  Welder: ["welder", "welding", "fabricator", "fabrication"],
  Roofer: ["roofer", "roofing"],
  Painter: ["painter", "painting"],
  Mason: ["mason", "masonry", "bricklayer", "bricklaying"],
  "General Labor": [
    "general labor",
    "laborer",
    "construction worker",
    "general laborer",
  ],
  "Heavy Equipment": [
    "operator",
    "excavator",
    "bulldozer",
    "crane",
    "equipment operator",
    "heavy equipment",
  ],
  Drywall: ["drywall", "drywaller", "plastering", "taping"],
  Flooring: [
    "flooring",
    "tile setter",
    "tile installer",
    "hardwood",
    "floor installer",
  ],
  "General Contractor": ["general contractor", "gc", "contractor"],
  "Project Manager": [
    "project manager",
    "construction manager",
    "site manager",
  ],
};

/**
 * Infer trade type from job title
 * @param {string} title - Job title
 * @returns {string} Inferred trade type
 */
export function inferTrade(title) {
  if (!title) return "General Trade";

  const lower = title.toLowerCase();

  for (const [trade, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return trade;
    }
  }

  return "General Trade";
}
