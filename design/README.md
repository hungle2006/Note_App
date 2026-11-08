# SmartNotes AI · Study Atlas

The hero scene is authored in Blender 5.2.2 LTS with the official `bpy` runtime. It is a real mesh scene, not CSS transforms posing as a Blender asset.

- `study-atlas.blend`: editable native authoring scene, materials, text, lighting and camera.
- `../scripts/blender/build_study_atlas.py`: reproducible scene generator.
- `../public/models/study-atlas.glb`: web mesh export, approximately 1 MB.
- `../public/images/study-atlas.webp`: transparent 1200px poster, approximately 31 KB.

Rebuild with `blender --background --python scripts/blender/build_study_atlas.py`, or a Python interpreter with the official bpy wheel. The render uses CPU Cycles and denoising. No paid render service is required.

The web component lazily loads Three.js/GLB on visible desktop scenes, caps device pixel ratio and rendering at 30 fps, pauses rendering off-screen, and releases resources on unmount. Mobile, reduced motion and WebGL errors retain the poster. The shared motion button also stops the interactive renderer.

## Peach water background

`peach-water.blend` is the editable background scene: asymmetric liquid lenses,
water IOR 1.333, white studio reflections, apricot bounce, two liquid shape keys
and a 480-frame / 24fps floating animation. Rebuild with:

```sh
blender --background --python scripts/water/build_surface.py -- --render
```

`public/water/drop-surface.json` contains the same triangulated mesh, both
shape keys and normalized edge composition. The website renders these live
with Three MeshPhysicalMaterial transmission; the studio background is in
the WebGL scene so it refracts correctly. The small free drops use damped
contact physics. This is a lightweight visual approximation of surface tension,
not a baked fluid simulation. The reference image supplied no motion footage,
so slow drift, gentle rotation and shape recovery were designed to suit it.

The renderer pauses when the document is hidden and honors the existing 3D
switch and reduced-motion setting. Mobile uses six free drops and five edge
lenses, a capped pixel ratio and a smaller transmission buffer.

Non-WebGL devices use `public/water/peach-drop.png`, rendered from the same
Blender mesh by `scripts/water/build_sprite.py`. Separate CSS transforms keep
the lenses floating independently. This also covers WebGL loading and context
loss. It is an optical sprite fallback, without live refraction/collisions.
