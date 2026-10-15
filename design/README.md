# SmartNotes AI · Study Atlas

The hero scene is authored in Blender 5.2.2 LTS with the official `bpy` runtime. It is a real mesh scene, not CSS transforms posing as a Blender asset.

- `study-atlas.blend`: editable native authoring scene, materials, text, lighting and camera.
- `../scripts/blender/build_study_atlas.py`: reproducible scene generator.
- `../public/models/study-atlas.glb`: web mesh export, approximately 1 MB.
- `../public/images/study-atlas.webp`: transparent 1200px poster, approximately 31 KB.

Rebuild with `blender --background --python scripts/blender/build_study_atlas.py`, or a Python interpreter with the official bpy wheel. The render uses CPU Cycles and denoising. No paid render service is required.

The web component lazily loads Three.js/GLB on visible desktop scenes, caps device pixel ratio and rendering at 30 fps, pauses rendering off-screen, and releases resources on unmount. Mobile, reduced motion and WebGL errors retain the poster. The shared motion button also stops the interactive renderer.
