import { describe, expect, it } from "vitest";
import { DesignDoc } from "@canvylo/design-core";
import { isVideoFile, MAX_VIDEO_BYTES, videoProblem } from "./video";
import { videosIn } from "./prototype";

describe("video files", () => {
  it("accepts MP4 and WebM only", () => {
    expect(isVideoFile({ type: "video/mp4" })).toBe(true);
    expect(isVideoFile({ type: "video/webm" })).toBe(true);
    expect(isVideoFile({ type: "video/x-msvideo" })).toBe(false);
    expect(isVideoFile({ type: "image/png" })).toBe(false);
    expect(isVideoFile({ type: "text/html" })).toBe(false);
  });
  it("explains why a file is refused", () => {
    expect(videoProblem({ type: "video/mp4", size: 1000 })).toBeNull();
    expect(videoProblem({ type: "video/avi", size: 1000 })).toMatch(/MP4 and WebM/);
    expect(videoProblem({ type: "video/mp4", size: MAX_VIDEO_BYTES + 1 })).toMatch(/25 MB/);
  });
});

describe("videosIn", () => {
  it("lists the visible video layers of a frame relative to it", () => {
    const doc = new DesignDoc();
    const page = doc.pages()[0]!.id;
    const frame = doc.createNode("FRAME", { parentId: page, props: { x: 100, y: 100, width: 400, height: 300 } });
    const asset = doc.addAsset("video/mp4", new Uint8Array([1, 2, 3]));
    const v = doc.createNode("RECTANGLE", { parentId: frame, props: { x: 20, y: 30, width: 200, height: 120, videoAssetId: asset } as never });
    const hidden = doc.createNode("RECTANGLE", { parentId: frame, props: { videoAssetId: asset, visible: false } as never });
    doc.createNode("RECTANGLE", { parentId: frame });
    expect(videosIn(doc, frame)).toEqual([{ id: v, assetId: asset, box: { x: 20, y: 30, width: 200, height: 120 } }]);
    expect(hidden).toBeTruthy();
  });
});
