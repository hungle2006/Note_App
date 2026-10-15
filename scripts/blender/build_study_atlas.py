"""Rebuild the SmartNote AI hero with Blender's Python runtime.
Run: blender --background --python scripts/blender/build_study_atlas.py
or: a Python interpreter with the official bpy wheel installed.
"""
import bpy, math, os
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,rough=.36,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
violet=mat('Violet ink',(.25,.105,.67));lilac=mat('Lavender edge',(.61,.46,.93));paper=mat('Warm paper',(.96,.94,.88));mint=mat('Mint ceramic',(.24,.7,.55));pale=mat('Pale mint',(.65,.9,.79));gold=mat('Soft apricot',(.98,.56,.24));white=mat('Porcelain',(.99,.99,1));ink=mat('Deep violet',(.095,.06,.2));metal=mat('Satin binding',(.8,.74,.97),.25,.4)
def group(name,loc=(0,0,0),rot=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=rot;return o
atlas=group('StudyAtlas')
def finish(o,name,material,parent=atlas):
 o.name=name;o.data.materials.append(material);o.parent=parent
 for poly in o.data.polygons:poly.use_smooth=True
 return o
def box(name,loc,scale,material,r=.08,parent=atlas):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,name,material,parent)
 if r:mod=o.modifiers.new('Soft rounded edges','BEVEL');mod.width=r;mod.segments=4;o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return o
def sphere(name,loc,r,material,parent=atlas):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,radius=r,location=loc);return finish(bpy.context.object,name,material,parent)
def torus(name,loc,major,minor,material,rot=(0,0,0),parent=atlas):
 bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=12,location=loc,major_radius=major,minor_radius=minor,rotation=rot);return finish(bpy.context.object,name,material,parent)
def cylinder(name,loc,r,depth,material,parent=atlas):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc);return finish(bpy.context.object,name,material,parent)
def text(name,value,loc,size,material,parent=atlas):
 c=bpy.data.curves.new(name,'FONT');c.body=value;c.size=size;c.extrude=.003;c.bevel_depth=.001;c.align_x='LEFT';o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.data.materials.append(material);o.parent=parent;return o
base=group('Pedestal');base.parent=atlas
cylinder('Lavender base',(0,0,-.64),2.35,.2,lilac,base);cylinder('Porcelain surface',(0,0,-.51),2.18,.08,white,base)
torus('Orbit inlay',(0,0,-.46),1.95,.009,pale,parent=base)
book=group('Notebook',(0,0,.12),(0,0,-.18));book.parent=atlas
box('Lower hard cover',(0,0,-.02),(2.55,3.15,.12),lilac,.09,book)
box('Paper block',(.04,0,.15),(2.38,2.99,.27),paper,.04,book)
for z in [.07,.105,.14,.175,.21]:box('Fine page edge',(.06,-1.493,z),(2.31,.008,.004),white,.001,book)
box('Violet hard cover',(0,0,.34),(2.56,3.16,.12),violet,.09,book)
box('Cover spine',(-1.14,0,.408),(.12,3.01,.013),lilac,.01,book)
for y in [-1.1,-.55,0,.55,1.1]:torus('Spiral binding',(-1.24,y,.27),.17,.032,metal,(math.pi/2,0,0),book)
text('Cover brand','SmartNote',(-.87,.95,.408),.26,white,book);text('Cover AI','AI',(-.85,.59,.408),.35,pale,book)
# An embossed note glyph stays crisp at all WebGL scales.
for x,angle in [(-.48,-.11),(.02,.11)]:
 o=box('Open notebook glyph',(x,-.12,.425),(.48,.66,.025),white,.055,book);o.rotation_euler.z=angle
for y in [-.8,-.98,-1.16]:box('Embossed ruled line',(-.27,y,.414),(1.2,.023,.012),lilac,.01,book)
box('Mint bookmark',(.83,-1.35,.435),(.23,.6,.025),mint,.025,book)
planet=group('MintPlanet',(1.86,.92,1.2));planet.parent=atlas
sphere('Planet',(0,0,0),.48,mint,planet);torus('Planet ring',(0,0,0),.7,.026,pale,(.25,.2,0),planet)
sphere('Apricot moon',(-1.95,-1.1,.68),.24,gold)
card=group('QuizCard',(1.75,-1.42,.5),(0,.1,.2));card.parent=atlas
box('Flashcard',(0,0,0),(1.18,.9,.09),white,.1,card)
text('Card number','01',(-.44,.12,.055),.23,violet,card)
for x,w,y in [(-.04,.74,-.1),(-.14,.54,-.26)]:box('Card text line',(x,y,.06),(w,.04,.012),lilac,.01,card)
card2=group('InsightCard',(-1.82,.92,.95),(0,-.12,-.2));card2.parent=atlas
box('Mint knowledge card',(0,0,0),(1.15,.9,.09),pale,.1,card2)
text('Card symbol','A+',(-.34,-.1,.06),.43,ink,card2)
pen=group('Pencil',(1.6,1.85,.3),(.6,-.5,-.5));pen.parent=atlas
cylinder('Pencil barrel',(0,0,.5),.085,1.35,gold,pen);cylinder('Pencil ferrule',(0,0,1.2),.087,.16,metal,pen);cylinder('Pencil eraser',(0,0,1.33),.087,.14,lilac,pen)
bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.007,radius2=.084,depth=.25,location=(0,0,-.29));finish(bpy.context.object,'Pencil tip',ink,pen)
for pos,r in [((-1.7,-.1,1.6),.065),((1.15,-.7,1.5),.055),((.3,1.9,.9),.07)]:
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=r,location=pos);finish(bpy.context.object,'Floating gem',gold)
scene=bpy.context.scene
world=bpy.data.worlds.new('Soft studio') if not scene.world else scene.world;scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.84,1,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,loc,energy,size in [('Large softbox',(2,-4,7),1100,5),('Mint fill',(-4,-1,4),650,4),('Cover rim',(2,4,6),900,4)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.2))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Hero camera');cam=bpy.data.objects.new('Hero camera',d);scene.collection.objects.link(cam);cam.location=(5,-7,7);cam.rotation_euler=(Vector((0,0,.5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=6.8;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.render.filepath=str(ROOT/'public/images/study-atlas.png')
# Keep a native authoring project alongside the reproducible generator.
(ROOT/'design').mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design/study-atlas.blend'))
# Export only renderable geometry, converting text to meshes for glTF.
bpy.ops.object.select_all(action='DESELECT')
for o in list(scene.objects):
 if o.type=='FONT':
  o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
for o in scene.objects:
 if o.type in {'MESH','EMPTY'}:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/study-atlas.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True,export_cameras=False,export_lights=False)
bpy.ops.render.render(write_still=True)
poster=bpy.data.images.load(scene.render.filepath)
scene.render.image_settings.file_format='WEBP';scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.quality=88
poster.save_render(str(ROOT/'public/images/study-atlas.webp'),scene=scene)
Path(scene.render.filepath).unlink(missing_ok=True)
print('Blender',bpy.app.version_string,'exported native scene, GLB and 1200px poster.')
