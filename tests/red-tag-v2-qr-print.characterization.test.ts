import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { getRedTagQrTarget, getRedTagRecordPath } from "@/features/five-s/red-tag/qr";

describe("Red Tag V2 canonical QR identity", () => {
  it("builds the record locator from only the stable RT ID", () => {
    const tagId = "RT-EGM-ZA-125";
    expect(getRedTagRecordPath(tagId)).toBe("/5s/red/RT-EGM-ZA-125");
    expect(getRedTagQrTarget(tagId, "https://ops.example.com")).toBe("https://ops.example.com/5s/red/RT-EGM-ZA-125");
    const payload = getRedTagQrTarget(tagId, "https://ops.example.com");
    expect(payload).not.toContain("Unused Motor");
    expect(payload).not.toContain("Open");
    expect(payload).not.toContain("history");
  });

  it("is lifecycle-independent and remains identical after closure", () => {
    const statuses = ["Open", "Under Review", "Decision Made", "Disposition In Progress", "Awaiting Verification", "Closed"];
    const targets = statuses.map(() => getRedTagQrTarget("RT-EGM-ZB-009", "https://factory.example"));
    expect(new Set(targets)).toEqual(new Set(["https://factory.example/5s/red/RT-EGM-ZB-009"]));
  });

  it("retains legacy IDs and safely encodes unusual locator characters", () => {
    expect(getRedTagQrTarget("RT-EGM-ZA-077")).toBe("/5s/red/RT-EGM-ZA-077");
    expect(getRedTagRecordPath("legacy tag/01")).toBe("/5s/red/legacy%20tag%2F01");
  });

  it("falls back to the relative canonical path when an origin is unavailable or invalid", () => {
    expect(getRedTagQrTarget("RT-EGM-ZA-010")).toBe("/5s/red/RT-EGM-ZA-010");
    expect(getRedTagQrTarget("RT-EGM-ZA-010", "not an origin")).toBe("/5s/red/RT-EGM-ZA-010");
  });
});

describe("Red Tag QR and physical print UI", () => {
  const source = readFileSync(resolve(process.cwd(), "features/five-s/red-tag/red-tag-module.tsx"), "utf8");

  it("uses the same canonical target for detail, View QR, and Print Tag", () => {
    expect(source).toContain("const qrTarget = useRedTagQrTarget(tagId)");
    expect(source.match(/<QrCode value=\{qrTarget\}/g)).toHaveLength(3);
    expect(source).toContain("View QR");
    expect(source).toContain("Print Red Tag");
  });

  it("prints the physical identity and operational context without workflow payload", () => {
    for (const text of ["RED TAG", "tag.tagNumber", "tag.itemName", "Quantity", "Location", "Department", "Reason", "Identified", "Identified By", "SCAN TO VIEW RECORD"]) expect(source).toContain(text);
    expect(source).toContain("tag.category &&");
    expect(source).toContain("tag.estimatedValue !== undefined");
    expect(source).not.toContain("<LabelValue label=\"History\"");
    expect(source).not.toContain("<LabelValue label=\"Status\"");
  });

  it("preserves the lifecycle, Action, detail, print, and QR routes", () => {
    expect(source).toContain("RedTagLifecycleIndicator");
    expect(source).toContain("LinkedActionSection");
    expect(source).toContain("`/5s/red/${tag.id}/print`");
    expect(getRedTagRecordPath("RT-EGM-ZA-001")).toBe("/5s/red/RT-EGM-ZA-001");
  });
});
