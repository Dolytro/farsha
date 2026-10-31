import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { buildPrintHtml, framesToExport, pdfPages } from "./pdf-export";

function setup() {
  const doc = new DesignDoc();
  const page = doc.pages()[0]!.id;
  const a = doc.createNode("FRAME", { parentId: page, props: { name: "A", x: 0, y: 0, width: 300, height: 200 } });
  const b = doc.createNode("FRAME", { parentId: page, props: { name: "B", x: 400, y: 0, width: 100, height: 80 } });
  const hidden = doc.createNode("FRAME", { parentId: page, props: { name: "H", x: 0, y: 300, width: 50, height: 50, visible: false } });
  const section = doc.createNode("FRAME", { parentId: page, props: { name: "S", x: 0, y: 500, width: 400, height: 300, isSection: true } as never });
  const inSection = doc.createNode("FRAME", { parentId: section, props: { name: "C", x: 10, y: 10, width: 60, height: 60 } });
  return { doc, page, a, b, hidden, section, inSection };
}

describe("pdf export", () => {
  it("exports every visible screen of the page, including frames inside sections, when nothing is selected", () => {
    const { doc, page, a, b, inSection } = setup();
    expect(framesToExport(doc, page, [])).toEqual([a, b, inSection]);
  });
  it("exports only the selected frames", () => {
    const { doc, page, b, section } = setup();
    expect(framesToExport(doc, page, [b, section])).toEqual([b]);
  });
  it("makes one page per frame with the frame's size", () => {
    const { doc, a, b } = setup();
    const pages = pdfPages(doc, [a, b]);
    expect(pages.map((p) => [p.width, p.height])).toEqual([[300, 200], [100, 80]]);
    const html = buildPrintHtml("My <file>", pages);
    expect(html).toContain("<title>My &lt;file&gt;</title>");
    expect(html).toContain("@page p0 { size: 300px 200px; margin: 0; }");
    expect(html).toContain("@page p1 { size: 100px 80px; margin: 0; }");
    expect(html.match(/<section class="page /g)).toHaveLength(2);
  });
});
