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
# Use the runtime composition directly so edge placement cannot diverge.
LAYERS=json.loads((ROOT/'src/lib/water-composition.json').read_text())
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

OPTICS=json.loads((ROOT/'src/lib/water-optics.json').read_text())

def material(amber,theme='light'):
 # Layered optical depth: transparent body, thin reflected crescent, soft
 # shoulder, warm lower caustic and restrained cool reflection. Both themes
 # use the same mesh/normal fields; only the lighting palette/body density differ.
 palette=OPTICS[theme];night=theme=='dark'
 m=bpy.data.materials.new('Liquid / '+theme+' / '+str(amber));m.use_nodes=True
 n=m.node_tree.nodes;n.clear();links=m.node_tree.links
 def val(q):return q.outputs[0] if hasattr(q,'outputs') else q
 def mathnode(op,a,b=None):
  node=n.new('ShaderNodeMath');node.operation=op
  for i,x in enumerate([a,b] if b is not None else [a]):
   x=val(x)
   if hasattr(x,'node'):links.new(x,node.inputs[i])
   else:node.inputs[i].default_value=x
  return node.outputs[0]
 def add(*terms):
  result=terms[0]
  for x in terms[1:]:result=mathnode('ADD',result,x)
  return result
 def mul(a,b):return mathnode('MULTIPLY',a,b)
 def clamp(x):return mathnode('MINIMUM',mathnode('MAXIMUM',x,0),1)
 def power(x,p):return mathnode('POWER',mathnode('MAXIMUM',x,0),p)
 def gaussian(x,center,width):
  ratio=mathnode('DIVIDE',mathnode('SUBTRACT',x,center),width)
  return mathnode('EXPONENT',mul(mul(ratio,ratio),-1))
 def smooth(x,lo,hi):
  t=clamp(mathnode('DIVIDE',mathnode('SUBTRACT',x,lo),hi-lo))
  return mul(mul(t,t),mathnode('SUBTRACT',3,mul(t,2)))
 def mix(a,b,f):
  node=n.new('ShaderNodeMixRGB');node.blend_type='MIX';node.use_clamp=False
  for i,x in enumerate([clamp(f),a,b]):
   x=val(x)
   if hasattr(x,'node'):links.new(x,node.inputs[i])
   else:node.inputs[i].default_value=(*x,1)
  return node.outputs[0]
 normal=n.new('ShaderNodeNewGeometry').outputs['Normal']
 sep=n.new('ShaderNodeSeparateXYZ');links.new(normal,sep.inputs[0])
 facing=clamp(sep.outputs['Z']);edge=mathnode('SUBTRACT',1,facing)
 def direction(x,y):
  q=n.new('ShaderNodeVectorMath');q.operation='DOT_PRODUCT';links.new(normal,q.inputs[0]);q.inputs[1].default_value=(x,y,0)
  return q.outputs['Value']
 side=smooth(direction(-.72,.69),.05,.6)
 thin=mul(gaussian(edge,.56,.032),side)
 shoulder=mul(gaussian(edge,.50,.15),smooth(direction(-.72,.69),-.15,.5))
 rim=mul(power(edge,6),add(.2,mul(clamp(direction(-.72,.69)),.8)))
 cap=mul(gaussian(sep.outputs['X'],-.20,.25),gaussian(sep.outputs['Y'],.50,.14))
 warm=mul(gaussian(edge,.37,.13),smooth(direction(.50,-.866),.05,.65))
 cool=mul(gaussian(edge,.52,.18),smooth(direction(-.62,-.78),.05,.65))
 inner=mul(gaussian(edge,.71,.026),smooth(direction(.64,-.76),.05,.65))
 reflect=n.new('ShaderNodeVectorMath');reflect.operation='REFLECT';reflect.inputs[0].default_value=(0,0,-1);links.new(normal,reflect.inputs[1])
 dot=n.new('ShaderNodeVectorMath');dot.operation='DOT_PRODUCT';links.new(reflect.outputs[0],dot.inputs[0]);dot.inputs[1].default_value=Vector((-.65,.65,-.35)).normalized()
 key=power(dot.outputs['Value'],32)
 absorption=mul(min(1,amber*1.6),add(.35,mul(power(facing,1.6),.65)))
 body=mix(palette['clearBody'],palette['amberBody'],absorption)
 body=mix(body,palette['coolReflection'],mul(cool,.34*(1-amber*.7)))
 body=mix(body,palette['warmReflection'],mul(warm,.60))
 body=mix(body,palette['innerReflection'],mul(inner,.35))
 white=clamp(add(mul(thin,.98),mul(shoulder,.62),mul(key,.65),mul(cap,.70),mul(rim,.60)))
 color=mix(body,palette['whiteReflection'],white)
 density=add(.012,mul(power(facing,2),amber*.25),mul(cool,.03)) if night else add(.025,mul(power(facing,1.35),amber*.88))
 alpha=mathnode('MINIMUM',add(density,mul(thin,.92),mul(shoulder,.23),mul(key,.42),mul(cap,.55),mul(rim,.55),mul(warm,.30),mul(cool,.18),mul(inner,.13)),.98)
 emit=n.new('ShaderNodeEmission');links.new(color,emit.inputs[0])
 transparent=n.new('ShaderNodeBsdfTransparent');blend=n.new('ShaderNodeMixShader');links.new(alpha,blend.inputs[0]);links.new(transparent.outputs[0],blend.inputs[1]);links.new(emit.outputs[0],blend.inputs[2])
 out=n.new('ShaderNodeOutputMaterial');links.new(blend.outputs[0],out.inputs['Surface'])
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
# Derive the night file from the very same geometry, camera and animation.
for item in LAYERS:
 obj=bpy.data.objects[item['id']];obj.data.materials.clear();obj.data.materials.append(material(item['amber'],'dark'))
ramp.color_ramp.elements[0].color=(.006,.007,.010,1);ramp.color_ramp.elements[1].color=(.045,.020,.012,1)
scene['Lighting']='Night: separate silver rim, amber bounce, low-density transparent body.'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design/peach-water-night.blend'),compress=True)
# Continue authoring in the light setup; the sprite generator selects its theme.
for item in LAYERS:
 obj=bpy.data.objects[item['id']];obj.data.materials.clear();obj.data.materials.append(material(item['amber'],'light'))
ramp.color_ramp.elements[0].color=(1,.88,.77,1);ramp.color_ramp.elements[1].color=(1,.62,.49,1)

if '--render' in sys.argv:
 scene.render.filepath=str(OUT/'peach-water-reference.png');bpy.ops.render.render(write_still=True)
print('Authored four distinct liquid profiles and',len(LAYERS),'reference positions')
