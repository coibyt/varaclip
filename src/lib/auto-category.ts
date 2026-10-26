import { CATEGORIES, type CategorySlug } from "./categories";

/**
 * Guesses a video's category from its caption and hashtags (Vietnamese, Finnish and English words),
 * for videos that were posted before categories existed. Returns null when nothing clearly matches,
 * so those videos can be sorted by hand instead of being put in the wrong place.
 */
const WORDS: Record<CategorySlug, string[]> = {
  nails: [
    "nail", "nails", "nailart", "nailinspo", "nailsart", "gelnails", "gel nails", "manicure", "pedicure", "mani", "pedi", "acrylic", "polygel",
    "french tip", "frenchnails", "kynnet", "kynsi", "kynsien", "rakennekynnet", "geelilakka", "geelikynnet", "manikyyri", "pedikyyri",
    "mong", "lam mong", "son gel", "ve mong", "dap bot", "mong tay", "mong chan",
  ],
  "eyebrows-lashes": [
    "lash", "lashes", "lashlift", "lashlamination", "lashextensions", "lash extensions", "eyelash", "volume lashes", "brow", "brows", "eyebrow",
    "eyebrows", "browlamination", "microblading", "henna brows", "ripsi", "ripset", "ripsien", "ripsienpidennys", "ripsihuolto", "ripsipalvelu",
    "ripsikestotaivutus", "kulmat", "kulmien", "kulmakarva", "noi mi", "uon mi", "mi", "chan may", "phun may", "dieu khac may",
  ],
  barber: ["barber", "barbershop", "fade", "skin fade", "beard", "mens haircut", "menshair", "parturi", "parta", "toc nam", "cat toc nam", "cao rau"],
  "hair-salon": [
    "hair", "hairstyle", "haircut", "hairdresser", "haircolor", "haircolour", "balayage", "highlights", "ombre", "blowout", "keratin", "hairdye",
    "hair extensions", "curls", "updo", "hiukset", "kampaamo", "kampaus", "varjays", "hiustenleikkaus", "permanentti", "raidat",
    "toc", "lam toc", "nhuom toc", "uon toc", "duoi toc", "cat toc", "goi dau",
  ],
  skincare: [
    "facial", "facials", "skincare", "skin care", "hydrafacial", "peeling", "peel", "microneedling", "dermaplaning", "acne", "glowing skin",
    "kasvohoito", "ihonhoito", "iho", "kasvot", "cham soc da", "da mat", "tri mun", "nan mun", "duong da",
  ],
  makeup: ["makeup", "make-up", "make up", "mua", "bridalmakeup", "bridal makeup", "meikki", "meikkaus", "hääpuku", "trang diem", "make up co dau"],
  "spa-massage": [
    "massage", "spa", "headspa", "head spa", "body treatment", "aromatherapy", "hieronta", "hoitola", "kylpyla", "goi dau duong sinh", "xoa bop", "tam trang",
  ],
  wellness: ["wellness", "relax", "relaxing", "meditation", "yoga", "sauna", "hyvinvointi", "rentoutus", "thu gian", "suc khoe"],
};

// Strip accents so "tóc", "toc" and "TÓC" all match, and keep words separated by single spaces.
const norm = (s: string) =>
  ` ${s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[#_]/g, " ").replace(/[^a-z0-9äöå\- ]+/g, " ").replace(/\s+/g, " ")} `;

export function guessCategory(caption: string, tags: string): CategorySlug | null {
  const hay = norm(`${caption} ${tags}`);
  let best: CategorySlug | null = null;
  let bestScore = 0;
  for (const c of CATEGORIES) {
    let score = 0;
    for (const w of WORDS[c.slug]) {
      const needle = ` ${norm(w).trim()} `;
      if (hay.includes(needle)) score += needle.trim().includes(" ") ? 2 : 1; // phrases are a stronger hint
      else if (needle.trim().length >= 6 && hay.includes(needle.trim())) score += 1; // part of a longer word, e.g. #lashliftsalon
    }
    if (score > bestScore) {
      best = c.slug;
      bestScore = score;
    }
  }
  return best;
}
