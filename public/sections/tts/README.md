Text-to-Speech Section

This folder contains a self-contained, embeddable Text-to-Speech (TTS) section you can add to your existing `myielts` website.

What’s included
- `tts-section.html` — the HTML snippet for the section (drop into a page where you want the section to appear).
- `tts-section.css` — scoped CSS (selectors are namespaced under `#tts-section` to avoid collisions).
- `tts-section.js` — modular JS exposing `initTTSSection(rootElementOrSelector)`; it does not pollute global IDs.
- `demo.html` — a local demo page that loads the section files so you can preview.

Quick integration (recommended)
1. Copy the three files into your `myielts` repo, e.g. into `public/sections/tts/` or `assets/tts/`.
2. Add the CSS link and JS script near your other site assets and insert the HTML snippet into the page where you want the section.

Example: in the page where you want the section (PowerShell-friendly commands below show how to copy files locally):

```powershell
# from your local clone of myielts (adjust paths as needed)
# create directory and copy files
mkdir -Force .\public\sections\tts
cp -Force "..\..\text to speech\tts-section\tts-section.html" .\public\sections\tts\index.html
cp -Force "..\..\text to speech\tts-section\tts-section.css" .\public\sections\tts\tts-section.css
cp -Force "..\..\text to speech\tts-section\tts-section.js" .\public\sections\tts\tts-section.js

# commit & push
git add public/sections/tts
git commit -m "Add Text-to-Speech section"
git push origin main
```

Initialization note
- The JS exposes a convenience function `initTTSSection(root)`.
- If you include the HTML snippet which contains a root element with `id="tts-section"`, the script will auto-init on DOMContentLoaded.

If you want, I can: 
- Open the `myielts` repo (if you give me access or point the workspace at it) and create the files directly and open a PR.
- Make further accessibility improvements (ARIA attributes) and automated tests.

Files created in this workspace:
- `tts-section/tts-section.html` — HTML snippet to insert.
- `tts-section/tts-section.css` — scoped styles.
- `tts-section/tts-section.js` — modular behavior.
- `tts-section/demo.html` — demo file to preview locally.
