# SmartNotes AI · Study Atlas

The hero scene is authored in Blender 5.2.2 LTS with the official `bpy` runtime. It is a real mesh scene, not CSS transforms posing as a Blender asset.

- `study-atlas.blend`: editable native authoring scene, materials, text, lighting and camera.
- `../scripts/blender/build_study_atlas.py`: reproducible scene generator.
- `../public/models/study-atlas.glb`: web mesh export, approximately 1 MB.
- `../public/images/study-atlas.webp`: transparent 1200px poster, approximately 31 KB.

Rebuild with `blender --background --python scripts/blender/build_study_atlas.py`, or a Python interpreter with the official bpy wheel. The render uses CPU Cycles and denoising. No paid render service is required.

The web component lazily loads Three.js/GLB on visible desktop scenes, caps device pixel ratio and rendering at 30 fps, pauses rendering off-screen, and releases resources on unmount. Mobile, reduced motion and WebGL errors retain the poster. The shared motion button also stops the interactive renderer.

## Reference liquid background — revised

`peach-water.blend` contains four independently sculpted profiles: a small bead,
a curved elongated ribbon, a tall amber lens and a broad flowing wave. Twelve
placements are traced from the supplied 1200 × 675 reference. There are seven
large edge/hero forms and five smaller beads; the text field remains clear.

Rebuild the scene/mesh data and optical renders with:

```sh
blender --background --python scripts/water/build_surface.py
blender --background --python scripts/water/build_sprite.py
```

The native node material and browser shader use matching normal-driven curved
white highlights, a warm lower caustic and a restrained blue-gray reflection.
These are art-directed liquid optics, not a fluid solver or physical ray-traced
refraction. No rectangular light panels or dark glass outlines are used.

`src/lib/water-composition.json` drives both the live mesh scene and individual
Blender-rendered WebP layers. Unlike the first implementation, no single round
sprite is stretched into every shape. The live renderer animates both authored
shape keys and normals. Without WebGL, each rendered layer has its own slow
float, slight turn and breathing transform. Both follow the same composition.

The editable native animation lasts 25 seconds. Drift stays close to the traced
positions rather than letting drops migrate over the text. Mobile omits the
middle ribbon and lower crest, caps pixel ratio, and retains the existing 3D
switch/reduced-motion preference. Both rendering paths pause in hidden tabs.
