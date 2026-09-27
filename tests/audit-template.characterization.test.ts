import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(resolve("features/five-s/audit-list-page.tsx"), "utf8");
const templateSource = source.match(
  /const FIVE_S_QUESTIONS:[\s\S]*?= \{([\s\S]*?)\n\};/,
)?.[1];

function questionsFor(category: string, nextCategory?: string) {
  if (!templateSource) throw new Error("Active audit-list question template was not found.");
  const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const end = nextCategory
    ? `\\n\\s*(?:"${nextCategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"|${nextCategory}):`
    : "$";
  const block = templateSource.match(
    new RegExp(`(?:"${escaped}"|${escaped}): \\[([\\s\\S]*?)\\],${end}`),
  )?.[1];
  if (block === undefined) throw new Error(`Question section ${category} was not found.`);
  return [...block.matchAll(/^\s*"((?:[^"\\]|\\.)*)",?$/gm)].map((match) =>
    JSON.parse(`"${match[1]}"`) as string,
  );
}

describe("active audit-list 5S template", () => {
  it("preserves section order, counts, question order, and exact wording", () => {
    const template = [
      ["Sort", questionsFor("Sort", "Set in Order")],
      ["Set in Order", questionsFor("Set in Order", "Shine")],
      ["Shine", questionsFor("Shine", "Standardize")],
      ["Standardize", questionsFor("Standardize", "Sustain")],
      ["Sustain", questionsFor("Sustain")],
    ];

    expect(template.map(([name, questions]) => [name, questions.length])).toEqual([
      ["Sort", 7],
      ["Set in Order", 9],
      ["Shine", 8],
      ["Standardize", 7],
      ["Sustain", 8],
    ]);
    expect(template.flatMap(([, questions]) => questions)).toHaveLength(39);
    expect(template).toMatchInlineSnapshot(`
      [
        [
          "Sort",
          [
            "Are unnecessary tools, materials, and items removed from the work area?",
            "Are obsolete or unused items clearly identified and segregated?",
            "Are only required materials stored at the workstation?",
            "Are damaged, defective, or redundant items identified and removed?",
            "Are excess raw materials and work-in-progress controlled to required quantities?",
            "Are red-tagged or unwanted items reviewed and disposed of within the defined timeframe?",
            "Is there a clear process for deciding whether an item is required or unnecessary?",
          ],
        ],
        [
          "Set in Order",
          [
            "Are tools and materials stored in clearly identified locations?",
            "Are storage locations visually marked and easy to identify?",
            "Can frequently used items be accessed without unnecessary movement?",
            "Are tools and materials arranged according to frequency of use?",
            "Are floor markings, location markings, and labels clearly visible?",
            "Are shadow boards, racks, cabinets, or storage systems properly organized?",
            "Does every required item have a defined and designated storage location?",
            "Are items returned to their designated locations after use?",
            "Are aisles, walkways, emergency routes, and access areas clearly identified and kept unobstructed?",
          ],
        ],
        [
          "Shine",
          [
            "Is the work area clean and free from visible dirt and waste?",
            "Are machines and equipment maintained in a clean condition?",
            "Are abnormal conditions identified during cleaning activities?",
            "Are floors, work surfaces, and surrounding areas cleaned regularly?",
            "Are oil, coolant, grease, dust, and other contamination controlled?",
            "Are cleaning tools and materials themselves clean, organized, and properly stored?",
            "Are leaks, damage, loose parts, or other abnormalities reported and addressed?",
            "Are cleaning and inspection activities performed according to the defined schedule?",
          ],
        ],
        [
          "Standardize",
          [
            "Are standard 5S procedures available and followed?",
            "Are visual standards available for the work area?",
            "Are cleaning and inspection responsibilities clearly defined?",
            "Are standard locations, markings, labels, and color codes consistently maintained?",
            "Are 5S standards displayed or easily accessible to employees?",
            "Are standard cleaning, inspection, and workplace organization schedules followed?",
            "Are deviations from the defined 5S standards identified and corrected?",
          ],
        ],
        [
          "Sustain",
          [
            "Are 5S practices consistently followed by employees?",
            "Are regular 5S audits conducted according to the defined schedule?",
            "Are previous audit findings reviewed and closed within the required timeframe?",
            "Are employees aware of their 5S responsibilities?",
            "Are recurring 5S problems identified and addressed?",
            "Are 5S improvements communicated to the relevant employees?",
            "Is management or area ownership involved in maintaining 5S standards?",
            "Is continual improvement encouraged based on 5S audit findings?",
          ],
        ],
      ]
    `);
  });

  it("characterizes the live two-point maximum without treating fixtures as canonical", () => {
    expect(39 * 2).toBe(78);
    expect(source).toContain("maxScore: 2");
  });
});
