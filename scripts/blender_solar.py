import bpy, math, random
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(42)
def material(name,color,bands=False,earth=False,glow=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.7
 if glow:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=2.0
 if bands or earth:
  tex=n.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=4 if earth else 9;tex.inputs['Detail'].default_value=3
  coord=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='MULTIPLY';mapping.inputs[1].default_value=(1,1,1) if earth else (1,1,8)
  m.node_tree.links.new(coord.outputs['Generated'],mapping.inputs[0]);m.node_tree.links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
  ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.4;ramp.color_ramp.elements[1].position=.62
  ramp.color_ramp.elements[0].color=(*((.015,.08,.35) if earth else tuple(c*.45 for c in color)),1)
  ramp.color_ramp.elements[1].color=(*((.12,.5,.22) if earth else color),1)
  m.node_tree.links.new(tex.outputs['Fac'],ramp.inputs[0]);m.node_tree.links.new(ramp.outputs[0],p.inputs['Base Color'])
  # Bake color into vertices for lightweight, portable glTF materials.
 return m
def sphere(name,r,mat,parent=None,loc=(0,0,0)):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=24,radius=r,location=loc)
 o=bpy.context.object;o.name=name;o.data.materials.append(mat);o.parent=parent
 for f in o.data.polygons:f.use_smooth=True
 return o
colors=[(1,.48,.08),(.45,.41,.37),(.85,.65,.37),(.07,.35,.8),(.72,.17,.07),(.77,.56,.35),(.85,.72,.44),(.3,.75,.8),(.12,.3,.85)]
names=['sun','mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']
radii=[1.4,.20,.35,.38,.27,.85,.72,.52,.5];dist=[0,2.2,3.2,4.3,5.4,7.3,9.5,11.8,14]
for i,name in enumerate(names):
 orbit=bpy.data.objects.new('orbit_'+name,None);bpy.context.collection.objects.link(orbit);orbit.rotation_euler.z=i*.85
 group=bpy.data.objects.new('body_'+name,None);bpy.context.collection.objects.link(group);group.parent=orbit;group.location=(dist[i],0,0)
 mat=material(name,colors[i],bands=i in [4,5,6],earth=i==3,glow=i==0)
 body=sphere('surface_'+name,radii[i],mat,group)
 # Portable vertex colors produce planet markings without external texture requests.
 if i in [1,2,3,4,5,6,7,8]:
  mesh=body.data;attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
  for poly in mesh.polygons:
   for li in poly.loop_indices:
    co=mesh.vertices[mesh.loops[li].vertex_index].co.normalized();lon=math.atan2(co.y,co.x);lat=math.asin(co.z)
    v=.76+.24*math.sin(lat*32+math.sin(lon*3)*.5) if i in [5,6] else .9+.1*math.sin(lon*12+lat*19)
    if i==3:
     land=math.sin(lon*3+lat*4)+.6*math.cos(lon*7-lat*5)+.3*math.sin(lat*12)
     c=(.08,.37,.16) if land>.6 else (.025,.18,.6)
     if abs(lat)>1.2:c=(.8,.89,.95)
    else:c=tuple(x*v for x in colors[i])
    attr.data[li].color=(*c,1)
  mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(1,1,1,1)
  for link in list(mat.node_tree.links):
   if link.to_socket==mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color']:mat.node_tree.links.remove(link)
  color_node=mat.node_tree.nodes.new('ShaderNodeVertexColor');color_node.layer_name='Color';mat.node_tree.links.new(color_node.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
 if i:
  curve=bpy.data.curves.new('path_'+name,'CURVE');curve.dimensions='3D';curve.bevel_depth=.012;curve.bevel_resolution=0
  spline=curve.splines.new('POLY');spline.points.add(127)
  for j,pt in enumerate(spline.points):a=j*2*math.pi/128;pt.co=(dist[i]*math.cos(a),dist[i]*math.sin(a),0,1)
  spline.use_cyclic_u=True;o=bpy.data.objects.new('path_'+name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(material('orbit_line_'+name,(.09,.15,.24),glow=True))
 if i==6:
  for r in [1.0,1.12,1.24,1.35]:
   bpy.ops.mesh.primitive_torus_add(major_segments=80,minor_segments=6,location=(0,0,0),major_radius=r,minor_radius=.035)
   ring=bpy.context.object;ring.name='saturn_ring';ring.parent=group;ring.rotation_euler.x=.35;ring.data.materials.append(material('ring'+str(r),(.65,.53,.36)))
 if i==3:sphere('moon',.1,material('moon',(.55,.59,.63)),group,(.7,0,.1))
# Camera and lighting for a real Blender poster.
bpy.ops.object.light_add(type='AREA',location=(0,-5,14));bpy.context.object.data.energy=2200;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=15
bpy.ops.object.light_add(type='POINT',location=(0,0,1));bpy.context.object.data.energy=1100
bpy.ops.object.camera_add(location=(17,-23,25));cam=bpy.context.object;direction=__import__('mathutils').Vector((0,0,0))-cam.location;cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=35;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.world.color=(.04,.04,.04);scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False
scene.render.resolution_x=1400;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(root/'public/images/solar-system.png')
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.005,.009,.025,1)
(root/'design').mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(root/'design/solar-system.blend'))
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/solar-system.glb'),export_format='GLB',export_cameras=False,export_lights=False,export_extras=True)
bpy.ops.render.render(write_still=True)
