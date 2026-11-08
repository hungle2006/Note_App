"""Author peach-water in Blender: editable scene, motion and web shape keys.
blender --background --python scripts/water/build_surface.py [-- --render]
"""
import bpy, json, math, pathlib, sys
bpy.context.preferences.filepaths.save_version=0
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'public/water';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.frame_start,scene.frame_end,scene.render.fps=1,480,24
# Normalized frame composition. Large lenses are cropped at the edges.
edges=[
 dict(x=.045,y=.125,r=.12,sx=.64,sy=1.48,rotation=-.65,phase=.2,amber=.12),
 dict(x=1.025,y=.30,r=.245,sx=.69,sy=1.56,rotation=-.58,phase=1.8,amber=.58),
 dict(x=-.035,y=.60,r=.12,sx=.84,sy=1.1,rotation=.23,phase=3.4,amber=.16),
 dict(x=.09,y=1.075,r=.24,sx=1.65,sy=.66,rotation=.48,phase=2.5,amber=.43),
 dict(x=.975,y=1.09,r=.19,sx=1.68,sy=.68,rotation=-.56,phase=4.2,amber=.20),
 dict(x=.495,y=.29,r=.11,sx=1.46,sy=.65,rotation=.65,phase=5.5,amber=.15),
]
bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40,radius=1)
surface=bpy.context.object;surface.name='Water — asymmetric liquid lens'
for v in surface.data.vertices:
 x,y,z=v.co;taper=1-.14*y-.035*y*y
 v.co=(x*taper+.075*(1-y*y),y,z*(.87-.07*y))
for p in surface.data.polygons:p.use_smooth=True
surface.shape_key_add(name='Basis')
breath=surface.shape_key_add(name='Surface tension — breathe')
sway=surface.shape_key_add(name='Surface tension — flow')
for src,a,b in zip(surface.data.vertices,breath.data,sway.data):
 x,y,z=src.co
 a.co=(x*(1+.035*math.cos(y*2.4)),y*.973,z*1.025)
 b.co=(x+.045*math.sin(y*2.1)*(1-y*y),y*(1+.022*math.sin(x*2.7)),z*(1-.03*math.cos(y*2.1)))
surface.data.calc_loop_triangles()
asset=dict(generator='Blender 4.3 — peach water / 64 × 40 / authored shape keys',
 positions=[round(c,6) for v in surface.data.vertices for c in v.co],
 indices=[i for tri in surface.data.loop_triangles for i in tri.vertices],
 morphs=[[round(c,6) for v in key.data for c in v.co] for key in (breath,sway)],edges=edges)
(OUT/'drop-surface.json').write_text(json.dumps(asset,separators=(',',':')))
def material(amber):
 m=bpy.data.materials.new('Water / apricot '+str(amber));m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
 p.inputs['Base Color'].default_value=(1,.965-.12*amber,.91-.25*amber,1)
 p.inputs['Roughness'].default_value=.055;p.inputs['IOR'].default_value=1.333
 p.inputs['Transmission Weight'].default_value=1;p.inputs['Coat Weight'].default_value=.35;p.inputs['Coat Roughness'].default_value=.04
 return m
def place(name,d):
 o=surface.copy();o.data=surface.data.copy();scene.collection.objects.link(o);o.name=name;r=d['r']*9
 origin=Vector(((d['x']-.5)*16,(.5-d['y'])*9,.2));o.scale=(r*d['sx'],r*d['sy'],r*.77)
 o.data.materials.clear();o.data.materials.append(material(d.get('amber',.05)));phase=d['phase']
 for frame in (1,61,121,181,241,301,361,421,481):
  t=(frame-1)/480*math.tau
  o.location=origin+Vector((math.sin(t+phase)*.11,math.cos(t+phase)*.13,math.sin(t+phase)*.025))
  o.rotation_euler=(.08*math.sin(t+phase),.12*math.cos(t+phase),d['rotation']+.07*math.sin(t+phase))
  o.keyframe_insert(data_path='location',frame=frame);o.keyframe_insert(data_path='rotation_euler',frame=frame)
  for i,key in enumerate(list(o.data.shape_keys.key_blocks)[1:]):
   key.value=.5+.5*math.sin(t+phase+i*1.7);key.keyframe_insert(data_path='value',frame=frame)
 return o
for i,d in enumerate(edges):place('Edge water %02d'%i,d)
for i,(x,y,r) in enumerate([(.52,.17,.034),(.86,.20,.027),(.965,.63,.022),(.50,.86,.034),(.03,.29,.012),(.39,.72,.016),(.72,.91,.013)]):
 place('Floating droplet %02d'%i,dict(x=x,y=y,r=r,sx=1.1,sy=.87,rotation=-.65,phase=i*.93,amber=.06))
bpy.data.objects.remove(surface,do_unlink=True)
# Real backdrop is behind the water so it refracts through the lenses.
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,-3));back=bpy.context.object;back.name='Peach studio backdrop';back.scale=(12,8,1)
m=bpy.data.materials.new('Ivory to peach silk');m.use_nodes=True;n=m.node_tree.nodes;n.clear();links=m.node_tree.links
tex=n.new('ShaderNodeTexCoord');ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(1,.49,.28,1);ramp.color_ramp.elements[1].color=(1,.86,.73,1)
links.new(tex.outputs['Generated'],ramp.inputs[0]);emit=n.new('ShaderNodeEmission');links.new(ramp.outputs[0],emit.inputs[0]);out=n.new('ShaderNodeOutputMaterial');links.new(emit.outputs[0],out.inputs[0]);back.data.materials.append(m)
world=bpy.data.worlds.new('Cream photographic studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(1,.87,.77,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7
for name,loc,size,power,color in [('Long white key',(-4,4,7),(7,2),1400,(1,.97,.93)),('Narrow white rim',(6,1,5),(1,8),1100,(1,.96,.91)),('Apricot lower bounce',(-2,-5,4),(8,2),900,(1,.52,.24))]:
 light=bpy.data.lights.new(name,'AREA');light.shape='RECTANGLE';light.size=size[0];light.size_y=size[1];light.energy=power;light.color=color
 o=bpy.data.objects.new(name,light);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
cam_data=bpy.data.cameras.new('Reference camera 16 × 9');cam=bpy.data.objects.new('Reference camera',cam_data);scene.collection.objects.link(cam)
cam.location=(0,0,22);cam_data.type='ORTHO';cam_data.ortho_scale=16;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.cycles.max_bounces=10;scene.cycles.transmission_bounces=8
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.frame_set(1)
scene['Reference']='User supplied SmartNotes peach / transparent floating water background, 2026-11-08'
scene['Animation']='20 second float cycle; editable location, rotation and two liquid shape keys. Web small drops additionally collide live.'
(ROOT/'design').mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design/peach-water.blend'),compress=True)
if '--render' in sys.argv:
 scene.render.filepath=str(OUT/'peach-water-reference.png');bpy.ops.render.render(write_still=True)
print('Authored water:',len(asset['positions'])//3,'vertices;',len(edges),'large edge lenses; two morph targets')
