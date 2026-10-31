# AI features plan (later)

Owner decision (2026-10-31): the AI features of Figma are planned for later. Nothing here is built yet.

## What Figma has
Agents, Actions (AI), Make / code layers, Build this with code, generate image, remove background, AI rename layers, translate text,
shaders and other generative tools.

## Ideas for Farsha (all optional, off by default)
- **Bring your own key:** the person pastes their own API key in Preferences; it stays in the browser (localStorage), is never sent to a
  Farsha server (there is none) and never goes into a saved document or git.
- **Rename layers** from their content and type (smallest, safest first step).
- **Describe to design:** text prompt to a frame with auto layout, built from the existing node types.
- **Generate image** into an image fill.
- **Build with code:** send the selection's generated CSS / React to the model and ask for a cleaner component.
- **Remove background / translate text** (translate can run in the browser with a small local model).
- **Agent:** a chat that calls the same commands the command palette has (`buildCommands()` is the tool list).

## Rules
- No key, no AI UI beyond a short "add a key in Preferences" hint.
- Show the exact text that will be sent before sending selected content.
- Free to use means the user pays their own provider; Farsha adds no paid tier.
