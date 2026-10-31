import { viewportCenter } from "./actions";
import { pasteImage, pasteTarget } from "./clipboard";
import { readImage } from "./images";
import { fitSize } from "./images";
import { readVideo } from "./video";
import { useEditor } from "./store";

/** File > Place image… (Ctrl+Shift+K): choose images and put them in the middle of the visible canvas. */
export function placeImagePicker(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm";
  input.multiple = true;
  input.onchange = () => {
    const s = useEditor.getState();
    const c = viewportCenter(s.viewport);
    const parent = pasteTarget(s.doc, s.selection, s.pageId);
    const origin = parent === s.pageId ? { x: 0, y: 0 } : (s.doc.absoluteBox(parent) ?? { x: 0, y: 0 });
    [...(input.files ?? [])].forEach((file, i) => void placeMediaFile(file, parent, c.x - origin.x + i * 24, c.y - origin.y + i * 24));
  };
  input.click();
}

/** Put an image or a video file on the canvas, whichever it is. */
export function placeMediaFile(file: Blob, parentId: string, cx: number, cy: number): Promise<void> {
  return file.type.startsWith("video/") ? placeVideoFile(file, parentId, cx, cy) : placeImageFile(file, parentId, cx, cy);
}

/** Read a video file and put it on the canvas as a video layer (a rectangle that plays it) centred on (cx, cy) inside `parentId`. */
export async function placeVideoFile(file: Blob, parentId: string, cx: number, cy: number): Promise<void> {
  const { showToast } = useEditor.getState();
  try {
    const video = await readVideo(file);
    const s = useEditor.getState();
    const target = s.doc.hasNode(parentId) ? parentId : s.pageId;
    const size = fitSize(video.width, video.height);
    s.doc.stopCapturing();
    const assetId = s.doc.addAsset(video.mime, video.bytes);
    const id = s.doc.createNode("RECTANGLE", {
      parentId: target,
      props: { name: "Video", x: cx - size.width / 2, y: cy - size.height / 2, width: size.width, height: size.height, fills: [{ type: "SOLID", color: "#1e1e1e", opacity: 1 }], videoAssetId: assetId } as never,
    });
    s.doc.stopCapturing();
    s.select([id]);
  } catch (err) {
    showToast(err instanceof Error ? `Couldn't add the video: ${err.message}` : "Couldn't add the video");
  }
}

/** Read an image file (paste or drop) and put it on the canvas centred on (cx, cy) inside `parentId`. */
export async function placeImageFile(file: Blob, parentId: string, cx: number, cy: number): Promise<void> {
  const { showToast } = useEditor.getState();
  try {
    const image = await readImage(file);
    const s = useEditor.getState();
    const target = s.doc.hasNode(parentId) ? parentId : s.pageId;
    const ids = pasteImage(s.doc, image, target, cx, cy);
    s.select(ids);
  } catch (err) {
    showToast(err instanceof Error ? `Couldn't add the image: ${err.message}` : "Couldn't add the image");
  }
}

/** Fill type "Video": choose a video file and make the rectangle play it. */
export function pickVideoForLayer(nodeId: string): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "video/mp4,video/webm";
  input.onchange = () => {
    const file = input.files?.[0];
    if (file) void attachVideo(file, nodeId);
  };
  input.click();
}

async function attachVideo(file: Blob, nodeId: string): Promise<void> {
  const { showToast, doc } = useEditor.getState();
  try {
    const video = await readVideo(file);
    doc.stopCapturing();
    doc.setStyle(nodeId, { videoAssetId: doc.addAsset(video.mime, video.bytes) });
    doc.stopCapturing();
  } catch (err) {
    showToast(err instanceof Error ? `Couldn't add the video: ${err.message}` : "Couldn't add the video");
  }
}
