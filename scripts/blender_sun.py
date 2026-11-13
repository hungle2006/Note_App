"""Blender-authored, tile-free spherical solar photosphere and editable shader source.
Run: blender -b --python scripts/blender_sun.py
The baked JPEG is served in Three.js; procedural Blender nodes are not portable to glTF.
The surface is an educational artistic approximation, not a NASA solar photograph.
"""
import bpy, math
from pathlib import Path
from array import array
from mathutils import Vector, noise

root = Path(__file__).resolve().parents[1]
output = root / "public" / "images" / "sun-photosphere.jpg"
project = root / "design" / "sun-photosphere.blend"
output.parent.mkdir(parents=True, exist_ok=True)
project.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for mat in list(bpy.data.materials):
    bpy.data.materials.remove(mat)

W, H = 1024, 512
img = bpy.data.images.new("Sun Photosphere • Blender", width=W, height=H, alpha=False)
img.colorspace_settings.name = "sRGB"
values = array("f", [0.0]) * (W * H * 4)
colors = [
    (0.00, (0.22, 0.028, 0.010)),
    (0.20, (0.55, 0.10, 0.022)),
    (0.41, (0.92, 0.30, 0.043)),
    (0.65, (1.00, 0.62, 0.14)),
    (0.83, (1.00, 0.82, 0.38)),
    (1.00, (1.00, 0.95, 0.68)),
]

def gradient(t):
    t = max(0.0, min(1.0, t))
    for i in range(len(colors)-1):
        a, ca = colors[i]
        b, cb = colors[i+1]
        if t <= b:
            f = (t-a)/(b-a)
            f = f*f*(3-2*f)
            return tuple(c*(1-f)+d*f for c, d in zip(ca, cb))
    return colors[-1][1]

for y in range(H):
    lat = (y + .5)/H*math.pi-math.pi/2
    for x in range(W):
        lon = (x+.5)/W*2*math.pi-math.pi
        point = Vector((math.cos(lat)*math.cos(lon),math.cos(lat)*math.sin(lon),math.sin(lat)))
        warp = noise.noise_vector(point*3.3)
        p = point + warp*.073
        # Chromospheric turbulent cells: broad flows plus high-frequency granules.
        broad = noise.noise(p*2.35)
        medium = noise.noise(p*8.2)
        cells = noise.noise(p*41.0)
        granules = noise.noise(p*132.0)
        filament = math.sin(p.x*95 + medium*12 + p.y*28)*.025
        heat = .62 + broad*.19 + medium*.11 + cells*.07 + granules*.055 + filament
        magnetic = noise.noise(point*5.8) + .25*noise.noise(point*11)
        if magnetic < -.39:
            heat -= min(.39,(-magnetic-.39)*1.3)
        rgb = gradient(heat)
        # Tiny latitude variation avoids an overly smooth synthetic ball.
        index = (y*W + x)*4
        values[index:index+4] = array("f", (*rgb, 1.0))

img.pixels.foreach_set(values)
img.filepath_raw = str(output)
img.file_format = "JPEG"
img.save()

bpy.ops.mesh.primitive_uv_sphere_add(segments=128, ring_count=80, radius=1.4)
sun = bpy.context.object
sun.name = "sun_photosphere_blender"
for polygon in sun.data.polygons:
    polygon.use_smooth = True
mat = bpy.data.materials.new("Sun plasma • baked emission")
mat.use_nodes = True
nodes=mat.node_tree.nodes
nodes.clear()
uv=nodes.new("ShaderNodeTexCoord")
tex=nodes.new("ShaderNodeTexImage")
tex.image=img
emission=nodes.new("ShaderNodeEmission")
emission.inputs["Strength"].default_value = 2.3
out=nodes.new("ShaderNodeOutputMaterial")
links=mat.node_tree.links
links.new(uv.outputs["UV"],tex.inputs["Vector"])
links.new(tex.outputs["Color"],emission.inputs["Color"])
links.new(emission.outputs[0],out.inputs["Surface"])
sun.data.materials.append(mat)

bpy.ops.wm.save_as_mainfile(filepath=str(project),compress=True)
print(f"SOLAR_BAKE_OK {output} bytes={output.stat().st_size}")
print(f"BLENDER_SOURCE_OK {project} bytes={project.stat().st_size}")
