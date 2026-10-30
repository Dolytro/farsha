import { viewportCenter } from "./actions";
import { pasteImage, pasteTarget } from "./clipboard";
import { readImage } from "./images";
import { useEditor } from "./store";

/** File > Place image… (Ctrl+Shift+K): choose images and put them in the middle of the visible canvas. */
export function placeImagePicker(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif";
  input.multiple = true;
  input.onchange = () => {
    const s = useEditor.getState();
    const c = viewportCenter(s.viewport);
    const parent = pasteTarget(s.doc, s.selection, s.pageId);
    const origin = parent === s.pageId ? { x: 0, y: 0 } : (s.doc.absoluteBox(parent) ?? { x: 0, y: 0 });
    [...(input.files ?? [])].forEach((file, i) => void placeImageFile(file, parent, c.x - origin.x + i * 24, c.y - origin.y + i * 24));
  };
  input.click();
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
