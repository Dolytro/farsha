import { describe, expect, it } from "vitest";
import { DesignDoc } from "@farsha/design-core";
import { cleanSnippet, codeConnectFor } from "./code-connect";

describe("cleanSnippet", () => {
  it("keeps text, drops blanks and non-text, and caps the length", () => {
    expect(cleanSnippet("<Button />")).toBe("<Button />");
    expect(cleanSnippet("  \n ")).toBeNull();
    expect(cleanSnippet(5)).toBeNull();
    expect(cleanSnippet("a\r\nb")).toBe("a\nb");
    expect(cleanSnippet("x".repeat(30000))).toHaveLength(20000);
  });
});

describe("codeConnectFor", () => {
  it("returns the snippet for a main component and for its instances", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Button", width: 100, height: 40 } });
    const mainId = doc.createComponent([frame]);
    doc.setStyle(mainId, { codeSnippet: "<Button variant='primary' />" });
    const instanceId = doc.createInstance(mainId, page, 200, 0);
    const main = codeConnectFor(doc, doc.getNode(mainId)!);
    expect(main).toMatchObject({ snippet: "<Button variant='primary' />", mainId, isMain: true });
    const inst = codeConnectFor(doc, doc.getNode(instanceId)!);
    expect(inst).toMatchObject({ snippet: "<Button variant='primary' />", mainId, mainName: "Button", isMain: false });
  });

  it("is null without a snippet and for ordinary layers", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { name: "Card", width: 10, height: 10 } });
    const rect = doc.createNode("RECTANGLE", { parentId: page, props: { name: "R", width: 10, height: 10 } });
    expect(codeConnectFor(doc, doc.getNode(rect)!)).toBeNull();
    expect(codeConnectFor(doc, doc.getNode(frame)!)).toBeNull();
    const mainId = doc.createComponent([frame]);
    expect(codeConnectFor(doc, doc.getNode(mainId)!)).toBeNull();
  });
});
