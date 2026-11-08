"""Render each Blender water profile with transparent optical film.
blender --background --python scripts/water/build_sprite.py
"""
import bpy,runpy,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
author=runpy.run_path(str(ROOT/'scripts/water/build_surface.py'))
scene=bpy.context.scene
sources={}
for obj in list(bpy.data.objects):
 if obj.type!='MESH':continue
 profile=next((d['profile'] for d in author['LAYERS'] if d['id']==obj.name),None)
 if profile and profile not in sources:sources[profile]=obj
 else:bpy.data.objects.remove(obj,do_unlink=True)
for obj in sources.values():obj.hide_render=True
scene.camera.location=(0,0,8);scene.camera.data.ortho_scale=2.4
scene.render.resolution_x=512;scene.render.resolution_y=512
scene.render.film_transparent=True;scene.cycles.film_transparent_glass=True;scene.cycles.film_transparent_roughness=.2
scene.cycles.samples=512;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
for theme in ('light','dark'):
 for name,amber in [('bead',.12),('ribbon',.22),('lens',.65),('wave',.18)]:
  obj=sources[name];obj.hide_render=False;obj.animation_data_clear();obj.data.shape_keys.animation_data_clear()
  obj.location=(0,0,0);obj.rotation_euler=(0,0,0);obj.scale=(1,1,1)
  obj.data.materials.clear();obj.data.materials.append(author['material'](amber,theme))
  for key in list(obj.data.shape_keys.key_blocks)[1:]:key.value=.35
  suffix=('-amber' if amber>.4 else '')+('-night' if theme=='dark' else '')
  scene.render.filepath=str(ROOT/('public/water/'+name+suffix+'.png'));bpy.ops.render.render(write_still=True)
  image=bpy.data.images.load(scene.render.filepath,check_existing=False)
  scene.render.image_settings.file_format='WEBP';scene.render.image_settings.quality=97
  image.save_render(str(ROOT/('public/water/'+name+suffix+'.webp')),scene=scene)
  bpy.data.images.remove(image);pathlib.Path(scene.render.filepath).unlink(missing_ok=True);scene.render.image_settings.file_format='PNG'
  obj.hide_render=True
print('Rendered matching light/night optical assets for four liquid profiles')
