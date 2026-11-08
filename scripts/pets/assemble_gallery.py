"""Reassemble the editable ten-pet gallery from the exact shipping GLBs."""
import bpy,pathlib,math
from mathutils import Vector
BASE=pathlib.Path(__file__).resolve().parents[2]
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
kinds=['cat','rabbit','fox','bear','owl','dog','panda','deer','hedgehog','penguin']
for i,kind in enumerate(kinds):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(BASE/'public/pets'/(kind+'.glb')));objects=set(bpy.data.objects)-before
 col=bpy.data.collections.new(kind.title()+' / reference plush');bpy.context.scene.collection.children.link(col)
 for obj in objects:
  for old in list(obj.users_collection):old.objects.unlink(obj)
  col.objects.link(obj)
  if obj.parent is None:obj.location.x+=(i%5-2)*3.25;obj.location.z+=(1-i//5)*3.6
for image in bpy.data.images:
 if image.type=='IMAGE' and not image.packed_file:image.pack()
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.view_settings.view_transform='AgX'
bpy.ops.object.camera_add(location=(0,-18,5.8));cam=bpy.context.object;cam.name='All ten reference companions';cam.rotation_euler=(Vector((0,0,3.2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=17.2;scene.camera=cam
for loc,power,size in [((-7,-8,11),2000,10),((7,-4,9),1500,8),((0,4,10),2200,7)]:
 bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.size=size;light.rotation_euler=(Vector((0,0,3))-light.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.35,.29,.25);scene.render.resolution_x=1800;scene.render.resolution_y=920;scene.render.film_transparent=True
scene['Reference']='Ten complete editable plush companions. These exact meshes, normal maps and pivots ship to the website.'
bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'design/pets/reference-companions.blend'),compress=True)
