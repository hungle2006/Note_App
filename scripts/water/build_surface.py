"""Rebuild the reference-matched liquid composition and editable Blender scene.
blender --background --python scripts/water/build_surface.py [-- --render]
"""
import bpy,json,math,pathlib,sys
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'public/water'
OUT.mkdir(parents=True,exist_ok=True);bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.frame_start=1;scene.frame_end=600;scene.render.fps=24
# The positions are traced from the supplied 1200 x 675 reference.
LAYERS=[
 dict(id='upper-left',profile='ribbon',x=.071,y=.106,r=.120,angle=.79,phase=.2,amber=.22),
 dict(id='right-amber',profile='lens',x=1.005,y=.30,r=.265,angle=-.59,phase=1.8,amber=.65),
 dict(id='left-crop',profile='bead',x=-.014,y=.60,r=.110,angle=.27,phase=3.4,amber=.12),
 dict(id='bottom-crest',profile='lens',x=.018,y=.965,r=.185,angle=.90,phase=2.5,amber=.64),
 dict(id='bottom-wave',profile='wave',x=.225,y=1.015,r=.51,angle=-.20,phase=4.2,amber=.18),
 dict(id='lower-right',profile='wave',x=1.055,y=1.02,r=.285,angle=.62,phase=2.9,amber=.18),
 dict(id='middle-lens',profile='ribbon',x=.495,y=.302,r=.160,angle=.45,phase=5.5,amber=.22),
 dict(id='top-bead',profile='bead',x=.521,y=.18,r=.044,angle=.35,phase=.6,amber=.12),
 dict(id='right-bead',profile='bead',x=.862,y=.203,r=.036,angle=.80,phase=2.1,amber=.12),
 dict(id='lower-bead',profile='bead',x=.505,y=.864,r=.043,angle=.35,phase=4.7,amber=.12),
 dict(id='far-right-bead',profile='bead',x=.972,y=.634,r=.028,angle=.85,phase=1.4,amber=.12),
 dict(id='tiny-left-bead',profile='bead',x=.030,y=.290,r=.013,angle=-.65,phase=3.9,amber=.12),
]
# One composition drives the live meshes AND rendered optical assets.
(ROOT/'src/lib/water-composition.json').write_text(json.dumps(LAYERS,indent=2)+'\n')
PROFILES={};objects={}
for name in ('bead','ribbon','lens','wave'):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=40,radius=1)
 obj=bpy.context.object;obj.name='Authored '+name
 for v in obj.data.vertices:
  x,y,z=v.co
  if name=='bead':v.co=(x*(1-.09*y),y*.77+.025*(1-y*y),z*.65)
  elif name=='ribbon':v.co=(x,y*.40*(1-.25*x)+.15*(1-x*x),z*.36*(1-.09*x))
  elif name=='lens':v.co=(x*.62*(1-.10*y)+.12*(1-y*y),y,z*.43*(1-.10*y))
  else:v.co=(x,y*.27+.14*math.sin(x*1.8),z*.32*(1-.13*x))
 for face in obj.data.polygons:face.use_smooth=True
 obj.shape_key_add(name='Basis');breath=obj.shape_key_add(name='Slow surface tension');flow=obj.shape_key_add(name='Liquid shoulder flow')
 for base,a,b in zip(obj.data.vertices,breath.data,flow.data):
  x,y,z=base.co
  a.co=(x*1.016,y*.979,z*1.022)
  b.co=(x+.018*math.sin(y*2.4)*(1-x*x),y+.022*math.cos(x*2.2)*(1-y*y),z*(1+.025*math.sin(x*2.7)))
 obj.data.calc_loop_triangles()
 PROFILES[name]=dict(positions=[round(c,6) for v in obj.data.vertices for c in v.co],
  indices=[i for t in obj.data.loop_triangles for i in t.vertices],
  morphs=[[round(c,6) for v in key.data for c in v.co] for key in (breath,flow)])
 objects[name]=obj
(OUT/'drop-surface.json').write_text(json.dumps(dict(generator='Blender / individually sculpted bead, ribbon, lens and wave',profiles=PROFILES),separators=(',',':')))

def material(amber):
 # Art-directed liquid optics match the reference's curved white shoulder and
 # warm lower caustic. No dark glass outline or rectangular light reflections.
 m=bpy.data.materials.new('Reference liquid optics '+str(amber));m.use_nodes=True
 n=m.node_tree.nodes;n.clear();links=m.node_tree.links
 def mathnode(op,a,b=None):
  q=n.new('ShaderNodeMath');q.operation=op
  if hasattr(a,'node'):links.new(a,q.inputs[0])
  else:q.inputs[0].default_value=a
  if b is not None:
   if hasattr(b,'node'):links.new(b,q.inputs[1])
   else:q.inputs[1].default_value=b
  return q.outputs[0]
 normal=n.new('ShaderNodeNewGeometry').outputs['Normal']
 sep=n.new('ShaderNodeSeparateXYZ');links.new(normal,sep.inputs[0])
 reflect=n.new('ShaderNodeVectorMath');reflect.operation='REFLECT';reflect.inputs[0].default_value=(0,0,-1);links.new(normal,reflect.inputs[1])
 def highlight(direction,focus):
  v=Vector(direction).normalized();q=n.new('ShaderNodeVectorMath');q.operation='DOT_PRODUCT';links.new(reflect.outputs[0],q.inputs[0]);q.inputs[1].default_value=v
  return mathnode('POWER',mathnode('MAXIMUM',q.outputs['Value'],0),focus)
 key=highlight((-.65,.65,-.35),18);strip=highlight((-.5,.8,1.1),48);lower=highlight((.3,-.8,.8),10);cool=highlight((-.4,-.65,.45),14)
 fresnel=mathnode('POWER',mathnode('SUBTRACT',1,mathnode('ABSOLUTE',sep.outputs['Z'])),2.2)
 side=n.new('ShaderNodeVectorMath');side.operation='DOT_PRODUCT';links.new(normal,side.inputs[0]);side.inputs[1].default_value=(-.65,.76,0)
 rim=mathnode('MULTIPLY',fresnel,mathnode('MAXIMUM',side.outputs['Value'],0))
 white=mathnode('ADD',mathnode('ADD',mathnode('MULTIPLY',key,.94),mathnode('MULTIPLY',strip,.85)),mathnode('MULTIPLY',rim,.8))
 blend=n.new('ShaderNodeMixRGB');blend.blend_type='MIX';links.new(white,blend.inputs[0]);blend.inputs[1].default_value=(1,.80-amber*.73,.57-amber*.80,1);blend.inputs[2].default_value=(1,.995,.97,1)
 warm=n.new('ShaderNodeMixRGB');links.new(mathnode('MULTIPLY',lower,.42),warm.inputs[0]);links.new(blend.outputs[0],warm.inputs[1]);warm.inputs[2].default_value=(1,.57,.15,1)
 shade=n.new('ShaderNodeMixRGB');links.new(mathnode('MULTIPLY',cool,.38*(1-amber)),shade.inputs[0]);links.new(warm.outputs[0],shade.inputs[1]);shade.inputs[2].default_value=(.32,.48,.54,1)
 fringe=n.new('ShaderNodeMixRGB');links.new(mathnode('MULTIPLY',fresnel,.48),fringe.inputs[0]);links.new(shade.outputs[0],fringe.inputs[1]);fringe.inputs[2].default_value=(1,.48,.10,1)
 final=n.new('ShaderNodeMixRGB');links.new(mathnode('MULTIPLY',rim,.75),final.inputs[0]);links.new(fringe.outputs[0],final.inputs[1]);final.inputs[2].default_value=(1,.995,.97,1)
 emit=n.new('ShaderNodeEmission');links.new(final.outputs[0],emit.inputs[0])
 alpha=mathnode('ADD',mathnode('ADD',.045+amber*.55,mathnode('MULTIPLY',fresnel,.25)),mathnode('ADD',mathnode('ADD',mathnode('MULTIPLY',key,.91),mathnode('MULTIPLY',strip,.75)),mathnode('ADD',mathnode('MULTIPLY',rim,.52),mathnode('ADD',mathnode('MULTIPLY',lower,.24),mathnode('MULTIPLY',cool,.28)))))
 transparent=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader');links.new(alpha,mix.inputs[0]);links.new(transparent.outputs[0],mix.inputs[1]);links.new(emit.outputs[0],mix.inputs[2])
 out=n.new('ShaderNodeOutputMaterial');links.new(mix.outputs[0],out.inputs['Surface'])
 return m

# The node material defines the curved highlights; an even peach world avoids
# introducing a second set of reflections in native editing/rendering.
world=bpy.data.worlds.new('Reference peach studio');scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(1,.88,.77,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.7

for item in LAYERS:
 source=objects[item['profile']];obj=source.copy();obj.data=source.data.copy();scene.collection.objects.link(obj);obj.name=item['id']
 obj.data.materials.append(material(item['amber']));r=item['r']*9;obj.scale=(r,r,r)
 origin=Vector(((item['x']-.5)*16,(.5-item['y'])*9,0))
 for frame in (1,101,201,301,401,501,601):
  t=(frame-1)/600*math.tau+item['phase']
  obj.location=origin+Vector((math.sin(t)*.055,math.cos(t)*.06,0))
  obj.rotation_euler=(.025*math.sin(t),.035*math.cos(t),item['angle']+.025*math.sin(t))
  obj.keyframe_insert(data_path='location',frame=frame);obj.keyframe_insert(data_path='rotation_euler',frame=frame)
  for k,key in enumerate(list(obj.data.shape_keys.key_blocks)[1:]):
   key.value=.5+.5*math.sin(t+k*1.7);key.keyframe_insert(data_path='value',frame=frame)
for obj in objects.values():bpy.data.objects.remove(obj,do_unlink=True)
# Peach-to-ivory backdrop: bright text area on the left and warm top/right.
bpy.ops.mesh.primitive_plane_add(size=2,location=(0,0,-4));back=bpy.context.object;back.name='Reference peach silk backdrop';back.scale=(9,6,1)
m=bpy.data.materials.new('Peach silk');m.use_nodes=True;n=m.node_tree.nodes;n.clear();links=m.node_tree.links
coord=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');links.new(coord.outputs['Generated'],sep.inputs[0])
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(1,.88,.77,1);ramp.color_ramp.elements[1].color=(1,.62,.49,1)
links.new(sep.outputs['X'],ramp.inputs[0]);emit=n.new('ShaderNodeEmission');links.new(ramp.outputs[0],emit.inputs[0]);out=n.new('ShaderNodeOutputMaterial');links.new(emit.outputs[0],out.inputs[0]);back.data.materials.append(m)
camdata=bpy.data.cameras.new('Reference 1200 by 675 camera');cam=bpy.data.objects.new('Reference camera',camdata);scene.collection.objects.link(cam)
cam.location=(0,0,22);camdata.type='ORTHO';camdata.ortho_scale=16;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=128;scene.cycles.use_denoising=False;scene.cycles.max_bounces=8;scene.cycles.transmission_bounces=6
scene.render.resolution_x=1600;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.view_settings.view_transform='Standard';scene.frame_set(1)
scene['Reference']='Geometry, placement and lighting revised against the supplied 1200 × 675 peach-water image.'
scene['Motion']='25 second slow float, subtle 1.5 degree turns and authored surface tension shape keys.'
(ROOT/'design').mkdir(exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design/peach-water.blend'),compress=True)
if '--render' in sys.argv:
 scene.render.filepath=str(OUT/'peach-water-reference.png');bpy.ops.render.render(write_still=True)
print('Authored four distinct liquid profiles and',len(LAYERS),'reference positions')
