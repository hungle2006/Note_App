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
640px transparent WebP portrait from the same geometry. Rebuild the whole set
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

### Reference atelier v3 — Blender source and animation

The two supplied reference panels define the faces and accessories. All ten
characters were rebuilt with a continuous painted head surface, individual
proportions, planted feet, attached props and reference-specific smiles.
The original open/wink/smile balance is retained: rabbit and bear wink, owl has
both eyes open, and the other seven have smiling closed eyes at rest. The web
player no longer generates replacement eyes or changes the reference expression.

`src/lib/pet-rig.ts` now plays the actual GLB animation clips with AnimationMixer.
The former procedural whole-model bounce and generic species sinusoids were
removed. `scripts/pets/build_pets.py` authors the native NLA tracks and morphs.

| Pet | Reference details and acting |
| --- | --- |
| Cat | Apricot/cream blaze, smiling eyelids, pointed ears, striped curved tail, knitted scarf; short listening and tail gestures |
| Rabbit | Unequal floppy ears, orange star bow, wink, four toe pads, gold-cornered book; ear flex and book-hug response |
| Fox | Broad cream cheeks, white-tipped bushy tail, plum cape with gold lining, square cap; alert ears and slow tail sweep |
| Bear | Cream muzzle, wink, raised padded paw, ribbed sweater, diagonal pencil and backpack; two-part arm/wrist greeting |
| Owl | Glossy large eyes, gold round glasses, layered wing and breast feathers, tassel; wing motion and restrained head glance |
| Corgi | Pointed ears, white blaze, tongue, four short padded feet, saddle bag and buckles; tail wag with planted feet |
| Panda | Painted brown eye patches, smile, padded waving paw, scarf, backpack and open-book charm; wrist wave and gentle nod |
| Deer | Large ears, rounded branched antlers, forehead spots, bow, dark hooves and spiral book; ear flick and held-book response |
| Hedgehog | Layered caramel quills, soft cream face, sweater cuffs, backpack, pencil held in both hands; small attentive nod |
| Penguin | Cocoa/cream face, smiling eyelids, spectacles, webbed toes, lined cape and orange open book; book and head response |

Each GLB includes `Idle`, `Hello`, `Feed`, `Pet`, `Play` and `Blink` clips.
Idle has a short gesture and a long rest; actions ease in and out. Feet remain
fixed while sitting. Holding palms are parented to the prop to preserve contact.
Tail and rabbit-ear morphs bend the surface; tassels and charms have delayed
secondary motion. The web player cross-fades actions and pauses offscreen.

Open `design/pets/reference-companions.blend` for all ten editable collections.
Enable one NLA track name (e.g. `Play`) across its objects to inspect the action;
tracks are muted in the saved source to show the reference rest pose. Images
and normal maps are packed. Rebuild all ten with:

```sh
blender --background --python scripts/pets/build_pets.py
```

The meshes approximate the supplied raster references; they are not image
cutouts or a claim of exact image reconstruction. The native source, shipping
GLBs, portraits and animation preview all use the same modeled characters.
