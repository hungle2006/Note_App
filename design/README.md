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

### Runtime motion refinement

The live mesh renderer adds a continuous, broad deformation field and derives
its normals from that same field so reflected strokes follow the changing
surface. Drift, rotation and shape recovery run on separate clocks. Desktop
renders up to 60fps and mobile up to 30fps.

Without WebGL, each optical layer has an independent 13–19 second drift, an
8–12 second area-preserving breathing transform, and a smooth local SVG
displacement field. The field changes the silhouette inside the image instead
of only moving a rigid sprite. Native SVG animation and CSS animations both
pause when the document is hidden and are removed when 3D is disabled.

## Ten reference plush school companions

`pets/reference-companions.blend` contains all ten characters in separate named
collections. `scripts/pets/build_pets.py` authors each model and renders its
768px transparent WebP portrait from the same geometry. Rebuild the whole set
with `blender --background --python scripts/pets/build_pets.py`, or pass animal
names after `--` for a partial revision. After partial revisions, synchronize the
native gallery with `scripts/pets/assemble_gallery.py`.

The reference roster is cat, rabbit, fox, bear, owl, corgi, panda, deer, hedgehog
and penguin. Each has authored facial details and its own school accessories:
knitted scarves, enamel stars, books with raised emblems, bags with buckles,
pencils, graduation caps and tassels, glasses, capes, layered feathers or quills.
Packed fibre/knit normal maps and tapered mesh fibres support a plush surface.
These are art-directed mesh recreations, not exact reproductions of image-gen
fur or a simulation of individual hairs.

`public/pets/manifest.json` records each exported asset. The web player animates
explicit `petMotion` pivots; attached head accessories follow those pivots, and
held books remain connected to their hands. Shop cards use small WebP portraits;
GLBs load only for selected companions and the preview. Existing reward IDs and
prices are preserved so previous unlocks remain valid; the former turtle/chick
slots now carry the hedgehog/owl reference designs.

### Species motion

`src/lib/pet-rig.ts` adds runtime pivots without changing the exported meshes.
`src/lib/pet-motion.ts` supplies three idle gestures per species and distinct
care reactions. Blinks use complete eye groups (iris and catchlights included),
random intervals and occasional double blinks; gaze follows the pointer. Gestures
blend when interrupted, pause offscreen, and reset when motion is disabled.

| Pet | Idle repertoire |
| --- | --- |
| Cat | Paw grooming, listening, stretching |
| Corgi | Sniffing, tail wagging, offering a paw |
| Rabbit | Nose twitching, listening with ears, small hops |
| Fox | Alert head tilt, tail swishing, playful pounce |
| Bear | Waving, sniffing, stretching |
| Panda | Gentle sway, slow wave, sleepy nod |
| Owl | Head scan, wing stretch, head tilt |
| Penguin | Alternating waddle, flipper movements, preening |
| Deer | Ear flicks, feeding nod, looking around |
| Hedgehog | Sniffing, cautious peek, short steps |

These remain stylized plush characters with procedural joint animation rather
than a soft-body or muscle simulation. Shop portraits stay static; full motion
is available in the preview and equipped companions on WebGL2 devices. Tests
bind all ten real GLBs, verify unchanged geometry placement, exercise blinks and
care sequences, and check that disabling motion restores every original joint.
