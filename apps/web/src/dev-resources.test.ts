import { describe, expect, it } from "vitest";
import { addResource, cleanResources } from "./dev-resources";

describe("dev resources", () => {
  it("keeps only web links and names them after the host when no name is given", () => {
    expect(cleanResources([{ name: " Spec ", url: "https://example.com/spec" }, { name: "x", url: "javascript:alert(1)" }, { url: "http://a.dev/x" }, null, 5])).toEqual([
      { name: "Spec", url: "https://example.com/spec" },
      { name: "a.dev", url: "http://a.dev/x" },
    ]);
    expect(cleanResources("nope")).toEqual([]);
  });

  it("adds a link once and refuses unsafe addresses", () => {
    const one = addResource(undefined, "Jira", "https://jira.example.com/T-1")!;
    expect(one).toEqual([{ name: "Jira", url: "https://jira.example.com/T-1" }]);
    expect(addResource(one, "Again", "https://jira.example.com/T-1")).toEqual(one);
    expect(addResource(one, "Bad", "data:text/html,hi")).toBeNull();
    expect(addResource(one, "Bad", "not a url")).toBeNull();
  });

  it("stops at 20 links", () => {
    let list: ReturnType<typeof addResource> = [];
    for (let i = 0; i < 25; i++) list = addResource(list ?? [], `L${i}`, `https://x.dev/${i}`) ?? list;
    expect(list).toHaveLength(20);
  });
});
