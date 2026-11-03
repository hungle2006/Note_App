"""Create ten original stylized animal companions and small shop portraits.
blender --background --python scripts/pets/build_pets.py
Named parts are animated by the web player; GLBs contain only pet meshes.
"""
import bpy, math, pathlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2]/'public/pets'
ROOT.mkdir(parents=True,exist_ok=True)
bpy.context.scene.render.engine='CYCLES'
bpy.context.scene.cycles.samples=24
bpy.context.scene.render.resolution_x=320
bpy.context.scene.render.resolution_y=320
bpy.context.scene.render.resolution_percentage=100
bpy.context.scene.render.film_transparent=True
bpy.context.scene.world.color=(.55,.55,.55)
scene=bpy.context.scene
scene.cycles.use_denoising=False
scene.view_settings.view_transform='AgX'
def mat(name,color):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.48
 return m
cream=mat('Vanilla',(1,.85,.65));ink=mat('Cocoa eyes',(.045,.028,.024));white=mat('Milk',(1,.97,.88));pink=mat('Peach cheeks',(1,.42,.43));shine=mat('Eye glints',(1,1,1))
parts=[]
def ball(name,loc,scale,material):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 parts.append(o);return o
def cone(name,loc,r,depth,material,rot=(0,0,0)):
 bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=r,radius2=.035,depth=depth,location=loc,rotation=rot)
 o=bpy.context.object;o.name=name;o.data.materials.append(material)
 bevel=o.modifiers.new('Soft tips','BEVEL');bevel.width=.09;bevel.segments=3
 bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
 for p in o.data.polygons:p.use_smooth=True
 parts.append(o);return o
def rod(name,a,b,r,material):
 mid=(Vector(a)+Vector(b))/2;direction=Vector(b)-Vector(a)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=mid)
 o=bpy.context.object;o.name=name;o.scale=(r,r,direction.length/2+r);o.rotation_euler=direction.to_track_quat('Z','Y').to_euler();o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 parts.append(o);return o
def face(z=1.78,y=-.56,wide=.27):
 for x in [-wide,wide]:
  ball('Eye', (x,y,z),(.115,.075,.145),ink)
  ball('Glint',(x-.025,y-.065,z+.045),(.035,.022,.04),shine)
  ball('Blush',(x*1.65,y+.015,z-.21),(.12,.035,.065),pink)
 ball('Nose',(0,y-.025,z-.19),(.075,.065,.055),ink)
 for side in [-1,1]:rod('Smile',(0,y-.028,z-.24),(side*.11,y-.026,z-.29),.017,ink)
animals=[('cat',(.93,.58,.27)),('dog',(.68,.39,.18)),('rabbit',(.92,.84,.73)),('fox',(.92,.30,.09)),('panda',(.92,.90,.83)),('penguin',(.12,.22,.31)),('bear',(.58,.32,.17)),('turtle',(.26,.57,.36)),('chick',(1,.69,.12)),('deer',(.66,.40,.22))]
for kind,color in animals:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);parts=[]
 fur=mat(kind+' coat',color)
 accent=ink if kind=='panda' else fur
 ball('Body',(0,0,.91),(.62,.44,.73),fur)
 ball('Belly',(0,-.36,.84),(.43,.13,.48),cream if kind not in ['panda','penguin'] else white)
 ball('Head',(0,-.10,1.76),(.70,.54,.63),fur)
 for i,x in enumerate([-.36,.36]):
  ball('Foot_'+str(i),(x,-.15,.25),(.25,.34,.23),accent)
  arm=ball('Arm_'+str(i),(x*1.8,-.02,1.02),(.20,.23,.38),accent)
  arm.rotation_euler[1]=(-1 if x<0 else 1)*.24
 if kind in ['cat','fox']:
  for x in [-.45,.45]:
   cone('Ear',(x,-.04,2.35),.28,.63,fur)
   ball('InnerEar',(x,-.23,2.37),(.12,.04,.20),pink if kind=='cat' else cream)
  tail=ball('Tail',(.68,.26,.76),(.22,.25,.65),fur);tail.rotation_euler[1]=-.6
  ball('TailTip',(.99,.25,1.13),(.20,.23,.22),cream)
  if kind=='fox':ball('Muzzle',(0,-.54,1.52),(.45,.18,.27),cream)
 elif kind=='rabbit':
  for x in [-.30,.30]:
   ball('Ear',(x,-.015,2.52),(.19,.18,.70),fur)
   ball('InnerEar',(x,-.17,2.55),(.09,.035,.46),pink)
  ball('Tail',(0,.47,.62),(.25,.23,.25),white)
 elif kind in ['panda','bear']:
  for x in [-.51,.51]:
   ball('Ear',(x,-.02,2.24),(.26,.18,.26),accent)
   ball('InnerEar',(x,-.18,2.25),(.13,.025,.13),pink if kind=='bear' else cream)
  if kind=='panda':
   for x in [-.28,.28]:ball('EyePatch',(x,-.56,1.81),(.23,.055,.25),ink)
   # Bright inset eyes remain visible against the characteristic patches.
   for x in [-.27,.27]:ball('EyeWhite',(x,-.61,1.80),(.14,.04,.16),white)
  else:ball('Muzzle',(0,-.57,1.55),(.36,.15,.25),cream)
 elif kind=='dog':
  for x in [-.59,.59]:ball('Ear',(x,-.03,1.79),(.23,.20,.52),accent)
  ball('Muzzle',(0,-.57,1.55),(.36,.20,.25),cream)
  tail=ball('Tail',(.55,.30,.74),(.13,.16,.42),fur);tail.rotation_euler[1]=-.7
 elif kind=='penguin':
  ball('Face',(0,-.46,1.72),(.54,.13,.45),white)
  ball('Beak',(0,-.64,1.49),(.18,.20,.085),mat('Tangerine',(.95,.41,.09)))
  for o in parts:
   if o.name.startswith('Arm'):o.scale=(.17,.23,.54)
 elif kind=='turtle':
  shell=mat('Jade shell',(.12,.36,.22))
  ball('Shell',(0,.28,.95),(.76,.36,.79),shell)
  for x,z in [(-.35,1.16),(.35,1.16),(0,1.5),(0,.72)]:ball('ShellPlate',(x,.57,z),(.25,.08,.26),fur)
  ball('Tail',(0,.55,.25),(.16,.28,.13),fur)
 elif kind=='chick':
  for x in [-.18,0,.18]:ball('Crest',(x,-.02,2.35+(.08 if x==0 else 0)),(.10,.14,.22),fur)
  ball('Beak',(0,-.67,1.52),(.16,.19,.10),mat('Mango beak',(.95,.32,.07)))
  for o in parts:
   if o.name.startswith('Arm'):o.scale=(.23,.17,.30)
 elif kind=='deer':
  for side in [-1,1]:
   ball('Ear',(side*.62,-.02,2.10),(.33,.16,.18),fur)
   rod('Antler',(side*.34,0,2.17),(side*.43,0,2.91),.065,cream)
   rod('AntlerBranch',(side*.40,0,2.60),(side*.68,0,2.78),.055,cream)
  ball('Muzzle',(0,-.56,1.54),(.37,.16,.24),cream)
 face(y=-.68 if kind in ['panda','penguin'] else -.63)
 # Keep facial features attached when the browser nods the head.
 bpy.context.view_layer.update()
 head=next(o for o in parts if o.name=='Head')
 for o in parts:
  if o is not head and o.name.startswith(('Eye','Glint','Blush','Nose','Smile','Ear','InnerEar','Muzzle','Face','Beak','Crest','Antler')):
   o.parent=head;o.matrix_parent_inverse=head.matrix_world.inverted()
 tail=next((o for o in parts if o.name=='Tail'),None)
 if tail:
  for o in parts:
   if o.name.startswith('TailTip'):
    o.parent=tail;o.matrix_parent_inverse=tail.matrix_world.inverted()
 # Export only geometry, not the render studio. Names support runtime animation.
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(ROOT/(kind+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT')
 bpy.ops.object.camera_add(location=(3.8,-7,3.1))
 camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.44))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=3.65;scene.camera=camera
 for loc,power,size in [((-3,-4,6),450,5),((4,-2,4),220,4),((0,4,5),350,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(ROOT/(kind+'.png'));bpy.ops.render.render(write_still=True)
 print('Finished pet:',kind,flush=True)
