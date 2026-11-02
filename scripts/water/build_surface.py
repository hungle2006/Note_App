"""Blender-authored unit surface used by the browser's liquid vertex shader.
Run: blender --background --python scripts/water/build_surface.py
A reusable surface avoids shipping baked video or a heavy fluid cache.
"""
import bpy, json, pathlib
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=1)
obj = bpy.context.object
obj.name = 'LiquidSurface'
for polygon in obj.data.polygons:
    polygon.use_smooth = True
obj.data.calc_loop_triangles()
asset = {
    'generator': 'Blender reusable liquid surface, 40 x 24',
    'positions': [round(c, 6) for vertex in obj.data.vertices for c in vertex.co],
    'indices': [i for triangle in obj.data.loop_triangles for i in triangle.vertices],
}
root = pathlib.Path(__file__).resolve().parents[2]
(root / 'public/water/drop-surface.json').write_text(json.dumps(asset, separators=(',', ':')))
print('Liquid surface:', len(obj.data.vertices), 'vertices')
