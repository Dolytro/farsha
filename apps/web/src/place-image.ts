import { pasteImage } from "./clipboard";
import { readImage } from "./images";
import { useEditor } from "./store";

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
