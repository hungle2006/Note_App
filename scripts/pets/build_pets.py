"""Reference plush companions: ten actual meshes, accessories and packed surface maps.
blender --background --python scripts/pets/build_pets.py [-- cat rabbit ...]
Portraits are rendered from these same GLBs; no reference-image cutouts.
"""
import bpy, math, pathlib, random, json, sys
import numpy as np
from mathutils import Vector
BASE=pathlib.Path(__file__).resolve().parents[2];OUT=BASE/'public/pets';OUT.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=64;scene.cycles.use_denoising=False
scene.render.resolution_x=768;scene.render.resolution_y=768;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world.color=(.35,.29,.25)
random.seed(47)

def normal_map(name,cloth=False):
 n=256;y,x=np.mgrid[0:n,0:n]/n;rng=np.random.default_rng(42 if cloth else 19)
 h=(.36*np.sin(x*math.tau*64)+.24*np.sin(y*math.tau*48)) if cloth else (.20*np.sin(x*math.tau*59+1.2*np.sin(y*math.tau*7))+.10*np.sin(x*math.tau*103+y*math.tau*9))
 h+=rng.normal(0,.035,(n,n));dy,dx=np.gradient(h);strength=.65 if cloth else 1.0
 normal=np.stack([-dx*strength,-dy*strength,np.ones_like(h)],axis=-1);normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
 pixels=np.concatenate([normal*.5+.5,np.ones((n,n,1))],axis=-1).astype(np.float32)
 im=bpy.data.images.new(name,width=n,height=n,alpha=True);im.colorspace_settings.name='Non-Color';im.pixels.foreach_set(pixels.ravel());im.pack();return im
FUR_MAP=normal_map('Plush fine directional fibres');CLOTH_MAP=normal_map('Knitted scarf and sweater loops',True)
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def mat(name,hexcolor,texture=None,metal=0,rough=.52):
 c=tuple(linear(int(hexcolor[i:i+2],16)/255) for i in (0,2,4));m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if texture:
  tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=texture;normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.42
  m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color']);m.node_tree.links.new(normal.outputs[0],p.inputs['Normal']);p.inputs['Sheen Weight'].default_value=.22
 return m
M={
 'milk':mat('Ivory plush','FFF3DF',FUR_MAP),'white':mat('Snow plush','FFF9F3',FUR_MAP),'orange':mat('Apricot plush','F7A54F',FUR_MAP),
 'fox':mat('Tangerine plush','EE8A3F',FUR_MAP),'bear':mat('Honey brown plush','B77B53',FUR_MAP),'dark':mat('Chocolate plush','694535',FUR_MAP),
 'spine':mat('Caramel quills','B78058',FUR_MAP),'panda':mat('Warm panda brown plush','745345',FUR_MAP),'penguin':mat('Penguin cocoa grey plush','716059',FUR_MAP),
 'pink':mat('Warm blush','F2B59D',FUR_MAP),'inner':mat('Velvet inner ears','F5B69F',FUR_MAP),'nose':mat('Cocoa nose','603A2B',None,0,.3),
 'eye':mat('Glossy cocoa eyes','44251C',None,0,.13),'iris':mat('Honey iris','995327',None,0,.18),'glint':mat('Eye catchlights','FFFFFF',None,0,.2),
 'mouth':mat('Open happy mouth','873F29'),'tongue':mat('Coral tongue','F9896D'),'scarf':mat('Saffron knitted wool','F4A126',CLOTH_MAP),
 'wool':mat('Cream ribbed sweater','F8E6CB',CLOTH_MAP),'book':mat('Tangerine book leather','D97B29',CLOTH_MAP),'page':mat('Ivory paper edges','FFF0C9'),
 'gold':mat('Honey gold trim','F6BD41',None,.45,.25),'star':mat('Star enamel','FFE18A',None,.15,.3),'cap':mat('Chocolate graduation cap','68402C',CLOTH_MAP),
 'cape':mat('Plum velvet cape','955A53',CLOTH_MAP),'yellow':mat('Pencil yellow','FFC347'),'eraser':mat('Peach eraser','FBA893'),
 'wood':mat('Pencil cedar wood','EFD1A0'),'lead':mat('Graphite','51453D')}
parts=[];groups=[];root=None;head=None;manifest=[];collections=[]
def attach(o,parent=None):
 parent=parent or root;bpy.context.view_layer.update();world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world;return o
def group(name,loc=(0,0,0),role=None,parent=None):
 o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.location=loc;attach(o,parent)
 if role:o['petMotion']=role
 groups.append(o);return o
def finish(o,name,material,parent=None):
 o.name=name;o.data.materials.append(M[material] if isinstance(material,str) else material)
 for p in o.data.polygons:p.use_smooth=True
 parts.append(o);attach(o,parent);return o
def ball(name,loc,scale,material,parent=None,seg=24,rings=16):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc);o=bpy.context.object;o.scale=scale;finish(o,name,material,parent)
 if name in ('Head plush','Body plush','Cream face bib','Owl cream facial disc','Penguin cream face'):
  microfur(name,loc,scale,material,o,2600 if name=='Head plush' else 1100)
 return o
def microfur(name,c,scale,material,parent,count):
 # Actual tapered fibres retain the plush silhouette in the web mesh as well
 # as the Cycles portrait. One mesh per patch keeps the draw-call count small.
 verts=[];uvs=[];faces=[];rng=random.Random(name+str(c))
 for j in range(count):
  z=rng.uniform(-1,1);phi=rng.uniform(0,math.tau);s=math.sqrt(1-z*z);unit=Vector((s*math.cos(phi),s*math.sin(phi),z))
  normal=Vector(tuple(unit[i]/scale[i] for i in range(3))).normalized();point=Vector(c)+Vector(tuple(unit[i]*scale[i] for i in range(3)))
  tangent=normal.cross(Vector((0,0,1)) if abs(normal.z)<.9 else Vector((1,0,0))).normalized();width=.0017;length=rng.uniform(.011,.022)
  k=len(verts);verts.extend([tuple(point-tangent*width),tuple(point+tangent*width),tuple(point+normal*length+tangent*.004)])
  faces.append((k,k+1,k+2));uvs.extend([(phi/math.tau,(z+1)/2)]*3)
 me=bpy.data.meshes.new('Fine plush fibres');me.from_pydata(verts,[],faces);uv=me.uv_layers.new()
 for face in me.polygons:
  for i in face.loop_indices:uv.data[i].uv=uvs[me.loops[i].vertex_index]
 o=bpy.data.objects.new('Microfur '+name,me);scene.collection.objects.link(o);finish(o,'Microfur '+name,material,parent)
def box(name,loc,scale,material,parent=None,bevel=.07):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=o.modifiers.new('Soft stitched edge','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 mod=o.modifiers.new('Weighted soft normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,material,parent)
def curve(name,points,r,material,parent=None,closed=False):
 cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=2;cu.bevel_depth=r;cu.bevel_resolution=2
 s=cu.splines.new('POLY');s.points.add(len(points)-1)
 for v,p in zip(s.points,points):v.co=(*p,1)
 s.use_cyclic_u=closed;o=bpy.data.objects.new(name,cu);scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
 bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,material,parent)
def rod(name,a,b,r,material,parent=None):
 v=Vector(b)-Vector(a);o=ball(name,(Vector(a)+Vector(b))/2,(r,r,v.length/2+r),material,parent,16,10)
 o.rotation_euler=v.to_track_quat('Z','Y').to_euler();return o
def oval(name,c,rx,rz,r,material,parent=None):
 return curve(name,[(c[0]+rx*math.cos(t),c[1],c[2]+rz*math.sin(t)) for t in np.linspace(0,math.tau,48,endpoint=False)],r,material,parent,True)
def star(c,size=.16,parent=None):
 def layer(name,s,y,mat):
  verts=[(c[0]+math.sin(i*math.pi/5)*s*(1 if i%2==0 else .49),y,c[2]+math.cos(i*math.pi/5)*s*(1 if i%2==0 else .49)) for i in range(10)]
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],[list(range(10))]);o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o
  mod=o.modifiers.new('Enamel depth','SOLIDIFY');mod.thickness=.045;bpy.ops.object.modifier_apply(modifier=mod.name)
  mod=o.modifiers.new('Rounded star edges','BEVEL');mod.width=.015;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name);finish(o,name,mat,parent)
 layer('Star gold bezel',size,c[1],'gold');layer('Star cream enamel',size*.79,c[1]-.028,'star')
def book_logo(c,size=.20,parent=None):
 for side in (-1,1):
  pts=[(c[0],c[1],c[2]-.075),(c[0]+side*size,c[1],c[2]-.035),(c[0]+side*size,c[1],c[2]+.17),(c[0]+side*.09,c[1]-.005,c[2]+.19),(c[0],c[1],c[2]+.135),(c[0],c[1],c[2]-.075)]
  curve('Raised open book emblem',pts,.015,'page',parent)
def bow(c,parent=None):
 for side in (-1,1):
  o=ball('Bow folded satin loop',(c[0]+side*.16,c[1],c[2]+.04),(.22,.11,.14),'fox',parent);o.rotation_euler[1]=side*.32
  o=box('Bow ribbon tail',(c[0]+side*.11,c[1]+.01,c[2]-.18),(.15,.07,.30),'orange',parent,.025);o.rotation_euler[1]=side*.28
  curve('Bow crease',[(c[0],c[1]-.11,c[2]),(c[0]+side*.23,c[1]-.075,c[2]+.11)],.012,'scarf',parent)
 star((c[0],c[1]-.14,c[2]+.015),.13,parent)
def ear(side,kind,coat,loc=None):
 c=loc or (side*.55,.03,2.25);g=group('Ear'+str(side),c,'ear',head)
 if kind=='round':ball('Round plush ear',c,(.27,.16,.27),coat,g);ball('Round inner ear',(c[0],c[1]-.145,c[2]),(.15,.045,.16),'inner',g)
 elif kind=='rabbit':
  o=ball('Long floppy ear',(side*.79,.02,2.11),(.29,.20,.77),coat,g);o.rotation_euler[1]=-side*.45
  o=ball('Pink floppy ear inset',(side*.80,-.17,2.11),(.17,.045,.61),'inner',g);o.rotation_euler[1]=-side*.45
 else:
  # Pointed ears use a tapered soft mesh, not rigid cones.
  verts=[];faces=[]
  for j in range(13):
   t=j/12;z=c[2]-.18+t*.85;rr=.31*(1-t)**.7+.015
   for k in range(20):a=k*math.tau/20;verts.append((c[0]+math.cos(a)*rr+side*.09*t,c[1]+math.sin(a)*rr*.60,z))
  for j in range(12):
   for k in range(20):a=j*20+k;b=j*20+(k+1)%20;faces.append((a,b,b+20,a+20))
  faces.extend([tuple(range(19,-1,-1)),tuple(range(240,260))]);me=bpy.data.meshes.new('Soft pointed ear');me.from_pydata(verts,[],faces);o=bpy.data.objects.new('Ear plush',me);scene.collection.objects.link(o);finish(o,'Ear pointed plush',coat,g)
  o=ball('Pink ear inset',(c[0]+side*.045,c[1]-.16,c[2]+.20),(.17,.045,.31),'inner',g);o.rotation_euler[1]=side*.12
 return g
def eyes(expression='smile',owl=False):
 for side in (-1,1):
  x=side*(.34 if not owl else .36);y=-.67 if not owl else -.77;z=1.98
  if expression=='open' or expression=='wink' and side==-1:
   ball('Eye',(x,y,z),(.16,.075,.19),'eye',head);ball('Iris',(x,y-.065,z-.04),(.108,.025,.11),'iris',head)
   ball('Eye catchlight',(x-.045,y-.086,z+.06),(.048,.018,.048),'glint',head);ball('Eye tiny glint',(x+.05,y-.083,z-.045),(.018,.012,.018),'glint',head)
  else:curve('EyeSmile',[(x+t*.18,y-.018,z+.075*(1-t*t)) for t in np.linspace(-1,1,17)],.037,'nose',head)
  ball('Blush',(side*.51,y+.01,z-.20),(.14,.022,.075),'pink',head)
  curve('Soft eyebrow',[(x-.07,y+.10,z+.28),(x,y+.075,z+.31),(x+.06,y+.10,z+.28)],.014,'bear',head)
 if not owl:
  ball('Happy open mouth',(0,-.739,1.62),(.15,.046,.17),'mouth',head);ball('Little pink tongue',(0,-.785,1.555),(.105,.022,.072),'tongue',head)
  for side in (-1,1):ball('Cream muzzle',(side*.105,-.72,1.755),(.16,.11,.105),'white',head)
  ball('Nose',(0,-.833,1.79),(.086,.043,.055),'nose',head)
 else:
  ball('Open beak',(0,-.82,1.64),(.14,.08,.19),'yellow',head);ball('Beak mouth',(0,-.894,1.62),(.10,.025,.11),'mouth',head);ball('Beak tongue',(0,-.923,1.57),(.07,.013,.04),'tongue',head)
def paws(coat,pads=True,bird=False):
 for side in (-1,1):
  g=group('Foot'+str(side),(side*.39,-.26,.27),'foot');o=ball('Plush foot',(side*.39,-.29,.26),(.32,.36,.28),('yellow' if bird else coat),g)
  if bird:
   for dx in (-.15,0,.15):ball('Bird toe',(side*.39+dx,-.52,.18),(.095,.19,.12),'yellow',g)
  elif pads:
   ball('Paw large heart pad',(side*.39,-.668,.23),(.15,.026,.14),'pink',g)
   for dx,dz in [(-.15,.15),(-.055,.23),(.055,.23),(.15,.15)]:ball('Paw toe pad',(side*.39+dx,-.59,.28+dz),(.047,.022,.058),'pink',g,16,10)
def front_paws(coat,feet=None):
 for side in (-1,1):
  g=group('ArmFront'+str(side),(side*.28,-.27,.72))
  ball('Front plush leg',(side*.28,-.37,.50),(.20,.21,.39),coat,g)
  ball('Front paw',(side*.28,-.43,.18),(.23,.28,.18),feet or coat,g)
  for dx in (-.06,.055):curve('Front paw toe seam',[(side*.28+dx,-.675,.15),(side*.28+dx,-.66,.23)],.009,'wood',g)
  ball('Back plush paw',(side*.49,.02,.18),(.27,.28,.18),feet or coat)
def scarf(emblem=True):
 # An elliptical knitted wrap, two layered folds and a fringed hanging end.
 for dz,rx in [(0,.56),(.10,.53)]:
  curve('Knitted scarf wrap',[(rx*math.cos(a),.43*math.sin(a)-.05,1.27+dz+.025*math.cos(a)) for a in np.linspace(0,math.tau,64,endpoint=False)],.13,'scarf',closed=True)
 o=box('Scarf hanging end',(-.30,-.59,.94),(.30,.11,.52),'scarf',bevel=.04);o.rotation_euler[1]=-.18
 if emblem:book_logo((-.30,-.66,.92),.105)
 for i in range(7):rod('Scarf tassel',(-.47+i*.05,-.61,.68),(-.45+i*.05,-.62,.56),.024,'scarf')
 star((.35,-.62,1.26),.18)
def hat():
 ball('Graduation cap crown',(0,.005,2.56),(.49,.36,.23),'cap',head)
 o=box('Graduation mortarboard',(0,-.015,2.77),(1.15,.83,.095),'cap',head,.045);o.rotation_euler[1]=-.12
 curve('Gold tassel cord',[(0,-.04,2.83),(.53,-.15,2.76),(.62,-.24,2.60),(.62,-.24,2.31)],.022,'gold',head)
 ball('Tassel knot',(.62,-.24,2.30),(.06,.06,.075),'gold',head)
 for i in range(9):
  a=i*math.tau/9;curve('Tassel silk strand',[(.62+math.cos(a)*.025,-.24+math.sin(a)*.025,2.28),(.62+math.cos(a)*.09,-.24+math.sin(a)*.07,2.04)],.022,'scarf',head)
def glasses():
 for side in (-1,1):oval('Round gold spectacle rim',(side*.36,-.877,1.99),.32,.33,.026,'gold',head)
 curve('Glasses bridge',[(-.045,-.889,2.02),(0,-.915,2.07),(.045,-.889,2.02)],.025,'gold',head)
 for side in (-1,1):curve('Glasses temple',[(side*.68,-.85,2.03),(side*.80,-.43,2.06)],.024,'gold',head)
def cape():
 verts=[];faces=[];rows=8;cols=40
 for j in range(rows):
  t=j/(rows-1);r=.66+.20*t
  for k in range(cols):
   a=-2.63+k/(cols-1)*5.26;verts.append((r*math.sin(a),r*.90*math.cos(a),1.33-.94*t+.03*math.sin(a*3)*t))
 for j in range(rows-1):
  for k in range(cols-1):a=j*cols+k;faces.append((a,a+1,a+cols+1,a+cols))
 me=bpy.data.meshes.new('Soft draped cape');me.from_pydata(verts,[],faces);o=bpy.data.objects.new('Cape',me);scene.collection.objects.link(o);bpy.context.view_layer.objects.active=o
 mod=o.modifiers.new('Velvet thickness','SOLIDIFY');mod.thickness=.035;bpy.ops.object.modifier_apply(modifier=mod.name);finish(o,'Cape velvet', 'cape')
 curve('Cape gold hem',verts[-cols:],.025,'gold')
 for k in (0,cols-1):curve('Cape gold opening',[verts[j*cols+k] for j in range(rows)],.025,'gold')
 star((0,-.49,1.36),.17)
def book(opened=False,spiral=False):
 g=group('Held study book');y=-.73;z=.94
 if not opened:
  box('Leather book cover',(0,y,z),(.70,.19,.78),'book',g,.04);box('Cream page block',(0,y+.015,z+.04),(.62,.16,.67),'page',g,.025)
  box('Front book cover',(0,y-.12,z),(.72,.055,.80),'book',g,.025);book_logo((0,y-.155,z-.04),.17,g)
  for xx in (-.32,.32):
   for zz in (z-.34,z+.34):box('Gold book corner',(xx,y-.155,zz),(.10,.025,.10),'gold',g,.02)
  for zz in (z-.25,z,z+.25):rod('Gold binding band',(-.36,y-.13,zz),(-.30,y-.13,zz),.025,'gold',g)
  if spiral:
   for zz in np.linspace(z-.30,z+.30,5):oval('Notebook spiral',(-.34,y-.08,zz),.08,.028,.016,'gold',g)
 else:
  for side in (-1,1):
   panel=group('Open book half',parent=g);panel.location=(0,0,0)
   box('Open leather cover',(side*.24,y,z),(.48,.12,.74),'book',panel,.025);box('Open cream pages',(side*.24,y-.085,z+.02),(.43,.09,.68),'page',panel,.02)
   for zz in np.linspace(z-.2,z+.2,5):curve('Page embossed lines',[(side*.05,y-.14,zz),(side*.39,y-.14,zz+.015)],.006,'wood',panel)
   if side==1:book_logo((side*.24,y+.065,z-.04),.13,panel)
   panel.rotation_euler[2]=side*.20
  curve('Book central binding',[(0,y-.08,z-.37),(0,y-.08,z+.37)],.03,'gold',g)
 return g
def hands(coat,raised=False):
 for side in (-1,1):
  if raised and side==1:
   g=group('ArmWave',(side*.57,-.03,1.03),'wave');rod('Raised sleeve',(side*.57,-.02,1.00),(side*.76,-.10,1.50),.18,'wool' if coat=='bear' else coat,g)
   ball('Waving plush palm',(.76,-.18,1.60),(.24,.14,.27),coat,g);ball('Waving paw pad',(.76,-.309,1.60),(.115,.025,.10),'pink',g)
   for x,z in [(-.13,.10),(-.045,.19),(.06,.18),(.15,.09)]:ball('Waving toe pad',(.76+x,-.298,1.60+z),(.036,.02,.047),'pink',g,16,10)
  else:
   rod('Plush forearm',(side*.57,-.02,1.06),(side*.43,-.67,.99),.16,coat)
   ball('Arm holding',(side*.43,-.73,.99),(.18,.17,.23),coat)
def backpack():
 g=group('School backpack');box('Leather backpack',(-.66,.22,.76),(.55,.42,.89),'book',g,.14);box('Backpack flap',(-.68,-.025,1.07),(.58,.10,.35),'orange',g,.06)
 curve('Backpack top handle',[(-.83,.15,1.20),(-.82,.15,1.36),(-.63,.15,1.39),(-.52,.15,1.20)],.036,'book',g)
 for x in (-.85,-.53):
  box('Bag strap',(x,-.08,.78),(.07,.05,.40),'orange',g,.02);box('Gold backpack buckle',(x,-.12,.83),(.12,.04,.13),'gold',g,.025)
 book_logo((-.68,-.09,1.00),.13,g)
 for xx in (-.91,-.43):curve('Backpack piping',[(xx,-.02,.43),(xx,-.02,1.05)],.015,'gold',g)
 star((-.53,-.15,.45),.13,g)
def pencil():
 g=group('Oversized pencil');bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.12,depth=.91,location=(0,0,0));finish(bpy.context.object,'Hexagonal pencil','yellow',g)
 box('Eraser ferrule',(0,0,.50),(.24,.24,.13),'page',g,.04);ball('Pink eraser',(0,0,.64),(.12,.12,.14),'eraser',g)
 bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.018,radius2=.12,depth=.25,location=(0,0,-.58));finish(bpy.context.object,'Sharpened cedar','wood',g)
 ball('Graphite point',(0,0,-.72),(.025,.025,.045),'lead',g);g.location=(-.51,-.88,.88);g.rotation_euler[1]=-.42
 return g
def sweater():
 ball('Cream knitted sweater',(0,0,.86),(.64,.46,.58),'wool')
 for x in np.linspace(-.53,.53,21):rod('Sweater hem rib',(x,-.40,.46),(x,-.42,.65),.018,'wool')
 for side in (-1,1):
  for z in np.linspace(.77,1.05,7):oval('Ribbed sleeve cuff',(side*.49,-.53,z),.15,.035,.018,'wool')
def tail(coat,kind):
 g=group('Tail',(0,.25,.65),'tail');verts=[];faces=[];N=30;K=16
 for j in range(N):
  t=j/(N-1)
  if kind=='cat':c=Vector((-.52-.66*math.sin(t*math.pi*.76),.26,.46+t*1.10));radius=.18+.07*math.sin(t*math.pi)
  elif kind=='dog':c=Vector((.54+.55*math.sin(t*math.pi*.7),.30,.45+t*.66));radius=.20+.08*math.sin(t*math.pi)
  else:c=Vector((.52+.74*math.sin(t*math.pi*.60),.25,.39+t*1.29));radius=.16+.20*math.sin(t*math.pi)
  radius*=min(1,(1-t)*10+.08)
  for k in range(K):a=k*math.tau/K;verts.append(tuple(c+Vector((math.cos(a)*radius,math.sin(a)*radius,.045*math.cos(a)))))
 for j in range(N-1):
  for k in range(K):faces.append((j*K+k,j*K+(k+1)%K,(j+1)*K+(k+1)%K,(j+1)*K+k))
 faces.extend([tuple(range(K-1,-1,-1)),tuple(range((N-1)*K,N*K))]);me=bpy.data.meshes.new('Fluffy swept tail');me.from_pydata(verts,[],faces);o=bpy.data.objects.new('Tail plush',me);scene.collection.objects.link(o);finish(o,'Tail plush',coat,g);o.data.materials.append(M['white'])
 for poly in o.data.polygons:
  t=(sum(o.data.vertices[i].co.z for i in poly.vertices)/len(poly.vertices)-.39)/1.29
  if (kind=='cat' and (.3<t<.48 or t>.78)) or (kind!='cat' and t>.70):poly.material_index=1
 return g
def tuft(c,coat,parent=None,size=.15):
 o=ball('Fluffy silhouette tuft',c,(size,.12,size*.44),coat,parent,16,10);o.rotation_euler[1]=-.45 if c[0]<0 else .45

def build(kind):
 global root,head,parts,groups
 for o in list(scene.objects):
  if o.type in ('CAMERA','LIGHT') or o.name=='Studio shadow catcher':bpy.data.objects.remove(o,do_unlink=True)
 parts=[];groups=[]
 root=bpy.data.objects.new('ReferencePlush_'+kind,None);scene.collection.objects.link(root);root['referenceVersion']='plush-school-v2';root['animal']=kind
 coat={'cat':'orange','rabbit':'white','fox':'fox','bear':'bear','owl':'milk','dog':'orange','panda':'panda','deer':'orange','hedgehog':'milk','penguin':'penguin'}[kind]
 isbird=kind in ('owl','penguin');head=group('Head',(0,-.02,1.92),'head')
 ball('Body plush',(0,.04,.87),(.64,.47,.67),coat,seg=36,rings=24)
 ball('Head plush',(0,-.04,1.93),(.80,.60,.73),('white' if kind in ('cat','panda') else coat),head,40,28)
 if kind in ('cat','dog','fox','deer'):
  ball('Cream face bib',(0,-.26,1.69),(.72,.46,.40),'white',head)
  for side in (-1,1):
   tuft((side*.72,-.27,1.74),'white',head);tuft((side*.65,-.31,1.59),'white',head,.13)
  ball('Cream chest',(0,-.35,.97),(.40,.16,.46),'white')
 if kind=='cat':
  for side in (-1,1):ball('Apricot head patch',(side*.40,.015,2.21),(.40,.55,.40),'orange',head)
  for x in (-.24,0,.24):rod('Cat forehead stripe',(x,-.43,2.48),(x*.8,-.52,2.34),.045,'fox',head)
  for side in (-1,1):
   ear(side,'point','orange')
   for dz in (0,.13):curve('Cocoa whisker',[(side*.57,-.63,1.72+dz),(side*.84,-.65,1.77+dz)],.016,'bear',head)
  eyes();scarf();tail(coat,kind);front_paws('white')
 elif kind=='rabbit':
  for side in (-1,1):ear(side,'rabbit','white',loc=(side*.64,.04,2.45))
  bow((-.39,-.46,2.58),head);eyes('wink');paws('white');ball('Cotton tail',(-.60,.32,.59),(.30,.28,.32),'white');book();hands('white')
 elif kind=='fox':
  for side in (-1,1):ear(side,'point','fox')
  eyes();cape();hat();tail(coat,kind);front_paws('fox','dark')
 elif kind=='bear':
  for side in (-1,1):ear(side,'round','bear')
  eyes('wink');paws('bear');sweater();backpack();pencil();hands('bear',True);star((.35,-.49,1.14),.16)
 elif kind=='owl':
  for side in (-1,1):
   ball('Owl cream facial disc',(side*.34,-.49,1.97),(.39,.20,.47),'white',head)
   tuft((side*.64,-.01,2.39),'milk',head,.26)
  eyes('open',True);glasses();hat();paws('gold',False,True);scarf()
  for row in range(4):
   for col in range(5-row%2):
    x=(col-(4-row%2)/2)*.21;o=ball('Layered breast feather',(x,-.40-.035*row,.48+row*.16),(.14,.08,.21),'milk');o.rotation_euler[1]=x*.20
  for side in (-1,1):
   wing=group('ArmWing'+str(side),(side*.55,.0,1.00),'wing')
   for i in range(5):
    o=ball('Layered wing feather',(side*(.62+i*.09),-.05,1.03+i*.10),(.15,.12,.37),'milk',wing);o.rotation_euler[1]=side*(.7+i*.13)
 elif kind=='dog':
  for side in (-1,1):ear(side,'point','orange')
  ball('Corgi white blaze',(0,-.64,2.18),(.14,.065,.43),'white',head);eyes();ball('Corgi hanging tongue',(0,-.82,1.50),(.105,.045,.17),'tongue',head);front_paws('white');tail(coat,kind)
  curve('Corgi orange collar',[(.50*math.cos(a),.37*math.sin(a),1.25) for a in np.linspace(0,math.tau,48,endpoint=False)],.08,'book',closed=True);star((0,-.47,1.15),.18)
  g=group('Corgi saddle satchel');box('Saddle leather bag',(.56,.11,.91),(.45,.39,.56),'book',g,.08);box('Satchel orange flap',(.57,-.11,1.01),(.48,.07,.40),'orange',g,.04);book_logo((.57,-.16,.98),.13,g)
  for x in (-.47,.47):curve('Saddle straps',[(x,-.21,.45),(x,-.26,1.22),(x,.18,1.32)],.035,'gold',g)
 elif kind=='panda':
  for side in (-1,1):
   ear(side,'round','panda');o=ball('EyePatch',(side*.34,-.59,2.00),(.25,.095,.27),'panda',head);o.rotation_euler[1]=side*.22
  eyes();paws('panda');ball('Panda belly',(0,-.36,.88),(.40,.15,.44),'white');scarf(False);backpack();hands('panda',True)
  g=group('Dangling book charm');box('Book charm',(-.72,-.19,.56),(.25,.06,.22),'page',g,.025);book_logo((-.72,-.23,.50),.075,g)
  curve('Gold charm chain',[(-.63,-.11,.97),(-.67,-.13,.78),(-.72,-.17,.69)],.018,'gold',g)
 elif kind=='deer':
  for side in (-1,1):
   g=ear(side,'round','orange',loc=(side*.70,-.01,2.22));g.scale=(1.2,1,.70)
   a=group('Antler'+str(side),parent=head);rod('Antler stem',(side*.39,.08,2.44),(side*.45,.07,3.02),.07,'bear',a)
   for j in range(2):rod('Antler branch',(side*.42,.08,2.65+j*.20),(side*(.68-j*.12),.08,2.78+j*.20),.065,'bear',a)
  for x,z,r in [(-.12,2.51,.045),(0,2.55,.05),(.14,2.50,.045),(.07,2.40,.04)]:ball('Deer forehead spot',(x,-.39,z),(r,.025,r),'white',head,16,10)
  for x,z in [(-.45,.76),(-.51,.92),(-.40,1.03)]:ball('Deer coat spot',(x,-.34,z),(.06,.025,.08),'white')
  bow((-.51,-.46,2.53),head);eyes();paws('dark',False);scarf(False);book(spiral=True);hands('white');ball('Deer white tail',(-.67,.25,.68),(.18,.17,.34),'white')
 elif kind=='hedgehog':
  # Distinct individually rounded quills fan around the silhouette.
  for row in range(3):
   for j in range(15):
    a=-.30+j/14*(math.pi+.60);x=math.cos(a)*(.71+row*.06);z=1.70+math.sin(a)*(.70+row*.08)-row*.22
    o=ball('Soft caramel quill',(x,.12+row*.12,z),(.16,.19,.32),'spine');o.rotation_euler[1]=math.pi/2-a
  for side in (-1,1):ear(side,'round','milk',loc=(side*.60,-.07,2.13))
  eyes();paws('milk');sweater();backpack();pencil();hands('milk');star((-.55,-.50,2.48),.18,head)
 elif kind=='penguin':
  for side in (-1,1):ball('Penguin cream face',(side*.29,-.48,1.96),(.34,.19,.46),'white',head)
  ball('Penguin white tummy',(0,-.38,.79),(.43,.15,.49),'white');eyes('smile',True);glasses();hat();paws('gold',False,True);cape();scarf(False);book(True);hands('penguin')
 # Stitched fur clumps around the cheeks and crown give a plush silhouette.
 if kind not in ('owl','penguin','hedgehog'):
  for side in (-1,1):
   for i in range(4):tuft((side*(.61+i*.035),-.05,1.60+i*.13),'white' if kind in ('cat','dog','fox','deer') else coat,head,.10)
 # Export selected actual pet geometry and pivots; retain normal maps in GLB.
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in parts+groups:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_extras=True,export_image_format='WEBP',export_image_quality=86)
 # Studio portraits share the detailed model, no painted replacement characters.
 bpy.ops.object.camera_add(location=(2.6,-8.6,3.25));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1.52))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.75;scene.camera=cam
 for loc,power,size,color in [((-3,-4,6),650,5,(1,.87,.72)),((4,-2,4),380,4,(1,.94,.85)),((0,4,5),750,3,(1,.72,.51))]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.color=color;l.data.size=size;l.rotation_euler=(Vector((0,0,1.3))-l.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025));floor=bpy.context.object;floor.name='Studio shadow catcher';floor.is_shadow_catcher=True
 scene.render.image_settings.file_format='WEBP';scene.render.image_settings.quality=92
 scene.render.filepath=str(OUT/(kind+'.webp'));bpy.ops.render.render(write_still=True)
 manifest.append({'animal':kind,'version':'plush-school-v2','meshes':len(parts),'bytes':(OUT/(kind+'.glb')).stat().st_size,'portrait':[768,768]})
 print('FINISHED_REFERENCE_PET',kind,'meshes',len(parts),'bytes',manifest[-1]['bytes'],flush=True)
 col=bpy.data.collections.new(kind.title()+' / reference plush');scene.collection.children.link(col)
 for o in [root]+parts+groups:
  for old in list(o.users_collection):old.objects.unlink(o)
  col.objects.link(o)
 col.hide_render=True;col.hide_viewport=True;collections.append((col,root))

kinds=['cat','rabbit','fox','bear','owl','dog','panda','deer','hedgehog','penguin']
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else kinds
for kind in selected:build(kind)
# Keep all ten editable characters in separately named native collections.
for i,(col,petroot) in enumerate(collections):
 col.hide_render=False;col.hide_viewport=False
 petroot.location.x=(i%5-2)*3.25;petroot.location.z=(1-i//5)*3.6
scene.camera.location=(0,-18,5.8);scene.camera.rotation_euler=(Vector((0,0,3.2))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=17.2
scene.render.resolution_x=1800;scene.render.resolution_y=920
scene['Reference']='Ten school plush companions, recreated as editable meshes with packed fibre/knit normal maps.'
scene['Collections']='Cat, rabbit, fox, bear, owl, corgi, panda, deer, hedgehog, penguin.'
(BASE/'design/pets').mkdir(parents=True,exist_ok=True)
if selected==kinds:bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'design/pets/reference-companions.blend'),compress=True)
existing=json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else []
merged={m['animal']:m for m in existing+manifest};(OUT/'manifest.json').write_text(json.dumps([merged[k] for k in kinds if k in merged],indent=2)+'\n')
