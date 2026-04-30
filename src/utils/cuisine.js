// Cuisine type → card background color mapping
const CUISINE_COLORS = {
  Japanese: "#FF6B6B",
  Chinese: "#FF6B6B",
  Thai: "#69DB7C",
  Vietnamese: "#38D9A9",
  Korean: "#E64980",
  Indian: "#FF922B",
  Mexican: "#FFA94D",
  Italian: "#FF8787",
  Greek: "#339AF0",
  Mediterranean: "#20C997",
  American: "#FCC419",
  Hawaiian: "#20C997",
  Pizza: "#FF8787",
  Seafood: "#339AF0",
  Steakhouse: "#E64980",
  BBQ: "#FF922B",
  Breakfast: "#FCC419",
  Brunch: "#FCC419",
  Sandwiches: "#FFA94D",
  Dessert: "#E599F7",
  Bakery: "#FFA94D",
  Cafe: "#69DB7C",
  Coffee: "#69DB7C",
  French: "#E64980",
  Irish: "#38D9A9",
  Uzbek: "#FF922B",
  Restaurant: "#9775FA",
};

export function getCuisineColor(cuisine) {
  return CUISINE_COLORS[cuisine] || "#9775FA";
}

// Cuisine → group mapping (mirrors server-side + extends)
const CUISINE_GROUPS = {
  Asian: ["Japanese", "Thai", "Vietnamese", "Korean", "Chinese"],
  "South Asian": ["Indian"],
  Latin: ["Mexican"],
  European: ["Italian", "Greek", "Mediterranean", "French", "Irish"],
  "Central Asian": ["Uzbek"],
  American: ["American", "BBQ", "Steakhouse", "Breakfast", "Brunch", "Sandwiches"],
  Island: ["Hawaiian"],
};

export function getCuisineGroup(cuisine) {
  for (const [group, cuisines] of Object.entries(CUISINE_GROUPS)) {
    if (cuisines.includes(cuisine)) return group;
  }
  return "Other";
}

// Filter dropdown options. Each label maps to one or more raw cuisine values
// so a single chip catches related tags (e.g. "Mediterranean" also matches
// Greek). Order is the visual order of chips in the filter drawer.
export const CUISINE_FILTER_OPTIONS = [
  { label: "Fast Food", match: ["Fast Food", "Burgers", "Sandwiches"] },
  { label: "American", match: ["American"] },
  { label: "Italian", match: ["Italian"] },
  { label: "Pizza", match: ["Pizza"] },
  { label: "Mexican", match: ["Mexican"] },
  { label: "Chinese", match: ["Chinese"] },
  { label: "Japanese", match: ["Japanese", "Sushi"] },
  { label: "Thai", match: ["Thai", "Vietnamese"] },
  { label: "Indian", match: ["Indian"] },
  { label: "Mediterranean", match: ["Mediterranean", "Greek"] },
  { label: "BBQ", match: ["BBQ", "Steakhouse"] },
  { label: "Seafood", match: ["Seafood"] },
];

export const CUISINE_FILTER_MAP = Object.fromEntries(
  CUISINE_FILTER_OPTIONS.map(o => [o.label, o.match])
);

// Price level (1-4) → display string
export function formatPriceLevel(level) {
  if (level == null) return "";
  const map = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };
  return map[level] ?? "";
}

// Haversine distance between two lat/lng points, returns miles
export function calcDistanceMi(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(miles) {
  if (miles < 0.1) return "nearby";
  return `${miles.toFixed(1)} mi`;
}
