"""Render the same authored water as a transparent fallback for non-WebGL devices.
blender --background --python scripts/water/build_sprite.py
"""
import bpy,runpy,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
runpy.run_path(str(ROOT/'scripts/water/build_surface.py'))
scene=bpy.context.scene
for obj in list(bpy.data.objects):
 if obj.type=='MESH' and obj.name!='Edge water 00':bpy.data.objects.remove(obj,do_unlink=True)
water=bpy.data.objects['Edge water 00'];water.animation_data_clear();water.data.shape_keys.animation_data_clear()
water.location=(0,0,0);water.rotation_euler=(0,0,0);water.scale=(.89,1,.93)
for key in list(water.data.shape_keys.key_blocks)[1:]:key.value=.4
scene.camera.location=(0,0,8);scene.camera.data.ortho_scale=2.7
scene.render.resolution_x=512;scene.render.resolution_y=640
scene.render.film_transparent=True;scene.cycles.film_transparent_glass=True
scene.cycles.film_transparent_roughness=.2
scene.cycles.samples=256
scene.view_settings.view_transform='Standard'
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.filepath=str(ROOT/'public/water/peach-drop.png')
bpy.ops.render.render(write_still=True)
