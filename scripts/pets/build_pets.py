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
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=False
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world.color=(.35,.29,.25);scene.view_settings.exposure=-.15
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
 if False:
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
  f=size/.20
  pts=[(c[0],c[1],c[2]-.075*f),(c[0]+side*size,c[1],c[2]-.035*f),(c[0]+side*size,c[1],c[2]+.17*f),(c[0]+side*.09*f,c[1]-.005,c[2]+.19*f),(c[0],c[1],c[2]+.135*f),(c[0],c[1],c[2]-.075*f)]
  curve('Raised open book emblem',pts,.015*f,'page',parent)

# v3: reference-specific silhouettes, authored faces and seated acting clips.
# Coordinates are Blender Z-up, looking toward -Y. All parenting preserves world matrices.
VERSION='reference-atelier-v3'
M['rim']=mat('Warm orange leather piping','FCB658',None,0,.40)
M['lining']=mat('Golden cape lining','F3A02D',CLOTH_MAP)
M['pad']=mat('Soft salmon paw pads','EE9B78',FUR_MAP)
M['belly']=mat('Soft warm cream','FFF1D9',FUR_MAP)
M['lip']=mat('Mouth inner warm coral','A44429')
M['knit']=mat('Cream knitted rib detail','F9E9D4',CLOTH_MAP)
M['spot']=mat('Deer ivory spots','FFF6DE',FUR_MAP)
cap_shader=M['cap'].node_tree.nodes.get('Principled BSDF')
cap_shader.inputs['Roughness'].default_value=.86;cap_shader.inputs['Specular IOR Level'].default_value=.12
for link in list(M['cap'].node_tree.links):
 if link.to_socket==cap_shader.inputs['Normal']:M['cap'].node_tree.links.remove(link)


def profile_mesh(name,vertices,faces,material,parent=None):
 me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update()
 uv=me.uv_layers.new(name='UVMap')
 for poly in me.polygons:
  for li in poly.loop_indices:
   v=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(v.x*1.7,v.z*1.7)
 o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);return finish(o,name,material,parent)


def soft_head(kind,c,scale):
 # One continuous cheek/forehead surface, with painted coat boundaries on it.
 coat={'cat':'orange','dog':'orange','fox':'fox','bear':'bear','owl':'milk','rabbit':'white','panda':'white','deer':'orange','hedgehog':'milk','penguin':'penguin'}[kind]
 def color(p):
  x,y,z=p;X=x-c[0];Z=z-c[2]
  if kind=='cat':
   return 'white' if y<c[1]-.10 and (Z<.15 or abs(X)<.17+.3*max(0,Z)) else coat
  if kind=='dog':
   return 'white' if y<c[1]-.12 and (Z<-.03 or abs(X+.045)<.13+.10*max(0,Z)) else coat
  if kind=='fox':
   return 'white' if y<c[1]-.09 and Z<-.02+.28*abs(X)/scale[0] else coat
  if kind=='panda' and y<c[1]-.22:
   for side in (-1,1):
    dx=X-side*.34;dz=Z-.025
    if ((dx*.94+dz*side*.34)/.25)**2+((dz*.94-dx*side*.34)/.27)**2<1:return 'panda'
  if kind=='deer' and y<c[1]-.15:
   return 'white' if Z<-.13 or ((abs(X)-.32)/.25)**2+((Z+.005)/.37)**2<1 else coat
  if kind in ('owl','penguin') and y<c[1]-.12:
   if Z<-.17 or min(((X-.29)/.41)**2+((Z+.00)/.47)**2,((X+.29)/.41)**2+((Z+.00)/.47)**2)<1:return 'white'
  return coat
 verts=[];faces=[];N=40;K=64
 for j in range(N+1):
  a=math.pi*j/N;zz=math.cos(a);rr=math.sin(a)
  for k in range(K):
   b=math.tau*k/K;xx=rr*math.cos(b);yy=rr*math.sin(b)
   # Cheek volume widens below the eye line; the chin is round, not a sphere stack.
   widen=1+.065*math.exp(-((zz+.27)/.35)**2)
   verts.append((c[0]+scale[0]*xx*widen,c[1]+scale[1]*yy,c[2]+scale[2]*zz))
 for j in range(N):
  for k in range(K):faces.append((j*K+k,j*K+(k+1)%K,(j+1)*K+(k+1)%K,(j+1)*K+k))
 o=profile_mesh('Head plush',verts,faces,coat,head)
 keys=list(dict.fromkeys([coat,'white','panda']))
 for key in keys[1:]:o.data.materials.append(M[key])
 # A painted UV coat gives smooth, curved blaze/eye-patch edges rather than
 # polygon-sized steps at material boundaries.
 W=512;H=256;pixels=np.ones((H,W,4),dtype=np.float32)
 palette={k:np.array([v**(1/2.2) for v in M[k].diffuse_color[:3]]) for k in keys}
 for j in range(H):
  a=math.pi*(1-(j+.5)/H);zz=math.cos(a);rr=math.sin(a)
  for k in range(W):
   b=math.tau*(k+.5)/W
   p=(c[0]+scale[0]*rr*math.cos(b)*(1+.065*math.exp(-((zz+.27)/.35)**2)),c[1]+scale[1]*rr*math.sin(b),c[2]+scale[2]*zz)
   tint=palette.get(color(p),palette[coat]).copy()
   blush=sum(math.exp(-(((p[0]-side*.50)/.13)**2+((p[2]-(c[2]-.16))/.075)**2)*2) for side in (-1,1)) if p[1]<c[1]-.25 else 0
   tint=tint*(1-blush*.22)+np.array((.96,.63,.52))*blush*.22
   pixels[j,k,:3]=tint
 im=bpy.data.images.new(kind+' smooth painted fur',width=W,height=H,alpha=True);im.pixels.foreach_set(pixels.ravel());im.pack()
 painted=M[coat].copy();painted.name=kind+' painted plush coat';pbr=painted.node_tree.nodes.get('Principled BSDF');pbr.inputs['Base Color'].default_value=(1,1,1,1)
 tex=painted.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;tex.interpolation='Linear';painted.node_tree.links.new(tex.outputs['Color'],pbr.inputs['Base Color'])
 o.data.materials.clear();o.data.materials.append(painted)
 for poly in o.data.polygons:
  for li in poly.loop_indices:
   idx=o.data.loops[li].vertex_index;jj,kk=divmod(idx,K)
   # Unwrap the seam per face so filtering never crosses the forehead.
   u=kk/K
   if kk==0 and any(o.data.loops[q].vertex_index%K==K-1 for q in poly.loop_indices):u=1
   o.data.uv_layers.active.data[li].uv=(u,1-jj/N)
 # Tiny tapered fibres share the same painted coat assignment; a single draw group.
 rng=random.Random(kind);vs=[];fs=[];colors=[]
 for i in range(4200):
  zz=rng.uniform(-.98,.98);a=rng.uniform(0,math.tau);rr=math.sqrt(1-zz*zz);u=Vector((rr*math.cos(a),rr*math.sin(a),zz))
  p=Vector(c)+Vector((u.x*scale[0]*(1+.065*math.exp(-((zz+.27)/.35)**2)),u.y*scale[1],u.z*scale[2]));normal=Vector((u.x/scale[0],u.y/scale[1],u.z/scale[2])).normalized();tangent=normal.cross(Vector((0,0,1))).normalized();width=.0012;length=rng.uniform(.006,.014)
  k=len(vs);vs.extend([tuple(p-tangent*width),tuple(p+tangent*width),tuple(p+normal*length+tangent*.0015)]);fs.append((k,k+1,k+2));colors.append(color(p))
 fur=profile_mesh('Microfur painted cheeks',vs,fs,coat,head)
 for key in keys[1:]:fur.data.materials.append(M[key])
 for poly,key in zip(fur.data.polygons,colors):poly.material_index=keys.index(key) if key in keys else 0
 return o


def tapered_leaf(name,a,b,width,depth,material,parent=None,bend=0):
 a=Vector(a);b=Vector(b);axis=(b-a).normalized();v=axis.cross(Vector((0,1,0))).normalized();w=axis.cross(v).normalized();verts=[];faces=[];N=16;K=20
 for j in range(N+1):
  t=j/N;r=max(.008,math.sin(math.pi*t)**.6)
  if name in ('Ear pointed plush','Pink ear inset') and active_kind in ('cat','dog','fox'):r=max(.007,min(1,t*7)*(1-t)**.68*1.3)
  center=a+(b-a)*t+Vector((bend*math.sin(math.pi*t),0,0))
  for k in range(K):
   q=k*math.tau/K;verts.append(tuple(center+v*(math.cos(q)*width*r)+w*(math.sin(q)*depth*r)))
 for j in range(N):
  for k in range(K):faces.append((j*K+k,j*K+(k+1)%K,(j+1)*K+(k+1)%K,(j+1)*K+k))
 return profile_mesh(name,verts,faces,material,parent)


def ear(side,kind,coat,loc=None):
 base=loc or (side*.53,.0,2.19);g=group('Ear'+str(side),base,'ear',head);g['side']=side
 if kind=='round':
  ball('Round plush ear',(base[0]+side*.05,base[1],base[2]+.08),(.25,.16,.25),coat,g)
  ball('Round inner ear',(base[0]+side*.05,base[1]-.145,base[2]+.08),(.135,.028,.15),'inner',g)
 elif kind=='rabbit':
  tip=(side*(1.02 if side<0 else .98),-.05,1.47 if side<0 else 1.58)
  o=tapered_leaf('Long floppy ear',(side*.52,.0,2.32),tip,.30,.145,coat,g,bend=side*.23)
  inset=tapered_leaf('Pink floppy ear inset',(side*.59,-.145,2.27),(tip[0]*.98,-.155,tip[2]+.10),.20,.025,'inner',g,bend=side*.20)
  for piece in (o,inset):
   piece.shape_key_add(name='Basis');key=piece.shape_key_add(name='EarFlex')
   for v in key.data:
    w=max(0,(2.32-v.co.z)/.9);v.co.y-=.13*w*w;v.co.x+=side*.07*w*w
 elif kind=='deer':
  tapered_leaf('Large pointed deer ear',(side*.58,.01,2.10),(side*1.02,.0,2.63),.26,.13,coat,g,bend=side*.02)
  tapered_leaf('Pink ear inset',(side*.63,-.13,2.14),(side*.98,-.12,2.57),.17,.025,'inner',g)
 else:
  tapered_leaf('Ear pointed plush',(side*.48,.03,2.12),(side*(.69 if kind!='dog' else .74),.015,2.94 if kind=='dog' else 2.80),.29,.16,coat,g,bend=side*.02)
  tapered_leaf('Pink ear inset',(side*.52,-.14,2.24),(side*(.69 if kind!='dog' else .74),-.10,2.81 if kind=='dog' else 2.68),.18,.022,'inner',g)
  for i in range(3):tapered_leaf('Ear soft inner tuft',(side*.53,-.15,2.28+i*.05),(side*(.65+i*.018),-.16,2.39+i*.04),.065,.027,'white',g)
 return g


def bow(c,parent=None,size=1):
 g=group('Bow satin assembly',c,parent=parent)
 for side in (-1,1):
  a=(c[0]+side*.025,c[1],c[2]);b=(c[0]+side*.36*size,c[1]+.04,c[2]+.18*size)
  o=ball('Bow folded satin loop',(c[0]+side*.18*size,c[1],c[2]+.045),(.225*size,.09*size,.15*size),'fox',g);o.rotation_euler[1]=side*.23
  for j in range(3):curve('Bow stitched fold',[(c[0]+side*.04,c[1]-.08,c[2]),(c[0]+side*.18,c[1]-.09,c[2]+(j-1)*.045),(c[0]+side*.29,c[1]-.045,c[2]+.09+(j-1)*.04)],.009,'orange',g)
  o=box('Bow ribbon tail',(c[0]+side*.13,c[1]+.025,c[2]-.24*size),(.17*size,.065,.40*size),'orange',g,.035);o.rotation_euler[1]=side*.34
 star((c[0],c[1]-.10,c[2]+.025),.16*size,g);return g


def face(kind):
 z={'cat':1.86,'rabbit':1.88,'fox':1.87,'bear':1.81,'owl':1.91,'dog':1.82,'panda':1.88,'deer':1.88,'hedgehog':1.75,'penguin':1.85}[kind]
 isbird=kind in ('owl','penguin');eyeY=-.635 if not isbird else -.66
 for side in (-1,1):
  x=side*(.34 if kind!='owl' else .35);open_default=kind=='owl' or (kind in ('rabbit','bear') and side==-1)
  eg=group('EyeOpen_'+str(side),(x,eyeY,z),'eyeOpen',head);eg['eyeDefault']=1 if open_default else 0;eg['side']=side
  radius=.205 if kind=='owl' else .137
  ball('Eye',(x,eyeY-.012,z),(radius,.065,radius*1.12),'eye',eg,32,20)
  ball('Iris',(x+.018,eyeY-.07,z-.045),(radius*.65,.014,radius*.65),'iris',eg)
  ball('Eye catchlight',(x-.045,eyeY-.082,z+.059),(.047,.016,.047),'glint',eg)
  ball('Eye tiny glint',(x+.047,eyeY-.077,z-.060),(.018,.009,.018),'glint',eg)
  eg.scale=(1,1,1) if open_default else (.001,.001,.001)
  cg=group('EyeClosed_'+str(side),(x,eyeY,z),'eyeClosed',head);cg['eyeDefault']=0 if open_default else 1;cg['side']=side
  curve('EyeSmile',[(x+t*.165,eyeY-.025,z+.077*(1-t*t)) for t in np.linspace(-1,1,20)],.028 if kind!='owl' else .032,'nose',cg)
  cg.scale=(.001,.001,.001) if open_default else (1,1,1)
  curve('Soft eyebrow',[(x-.055,eyeY+.10,z+.28),(x,eyeY+.085,z+.30),(x+.065,eyeY+.10,z+.27)],.017,'bear',head)
 mouth=group('Mouth jaw',(0,-.69,z-.21),'jaw',head)
 if not isbird:
  # A recessed rounded triangle smile, not a flat oval sticker.
  verts=[(-.16,-.718,z-.12),(.16,-.718,z-.12),(.115,-.733,z-.28),(0,-.742,z-.34),(-.115,-.733,z-.28)]
  o=profile_mesh('Happy open mouth',verts,[tuple(range(5))],'lip',mouth)
  mod=o.modifiers.new('Soft smile contour','SUBSURF');mod.levels=2;mod.render_levels=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  o=ball('Mouth inner cavity',(0,-.714,z-.225),(.139,.038,.142),'lip',mouth)
  ball('Little pink tongue',(0,-.760,z-.285),(.083,.016,.065),'tongue',mouth)
  for side in (-1,1):
   o=ball('Cream muzzle',(side*.075,-.698,z-.08),(.118,.079,.078),'milk' if kind=='bear' else 'white',head)
  n=ball('Nose',(0,-.802,z-.035),(.077,.042,.045),'nose',head);n['petMotion']='nose'
  curve('Philtrum',[(0,-.803,z-.06),(0,-.795,z-.105)],.012,'nose',head)
  if kind=='dog':
   o=ball('Corgi hanging tongue',(0,-.799,z-.32),(.086,.033,.16),'tongue',mouth)
   curve('Tongue center crease',[(0,-.835,z-.23),(0,-.837,z-.36)],.005,'lip',mouth)
 else:
  # Separate upper and lower lobes give the beak a defined mouth opening.
  tapered_leaf('Open beak',(-.125,-.74,z-.055),(.125,-.74,z-.055),.09,.095,'yellow',head)
  ball('Beak mouth',(0,-.760,z-.18),(.105,.040,.12),'lip',mouth)
  ball('Lower golden beak',(0,-.778,z-.26),(.10,.037,.045),'yellow',mouth)
  ball('Beak tongue',(0,-.805,z-.23),(.063,.010,.045),'tongue',mouth)
 return mouth


def paw_pad(c,parent,large=.17,toes=4):
 ball('Paw large heart pad',c,(large,.025,large*1.05),'pad',parent)
 for i in range(toes):
  a=(i/(toes-1)-.5)*1.75;ball('Paw toe pad',(c[0]+math.sin(a)*large*1.18,c[1]+.013,c[2]+math.cos(a)*large*1.35),(.052,.022,.063),'pad',parent,16,10)


def feet(kind,coat):
 for side in (-1,1):
  if kind=='owl':
   g=group('Foot'+str(side),(side*.30,-.18,.12),'foot')
   for dx in (-.10,0,.10):ball('Bird toe',(side*.30+dx,-.30,.10),(.085,.19,.10),'yellow',g)
  elif kind=='penguin':
   g=group('Foot'+str(side),(side*.39,-.31,.23),'foot')
   ball('Golden webbed foot',(side*.39,-.37,.20),(.30,.18,.22),'yellow',g)
   for i,dx in enumerate((-.16,0,.16)):ball('Penguin web toe',(side*.39+dx,-.40,.31),(.12,.145,.28 if i==1 else .23),'yellow',g)
  elif kind in ('cat','fox'):
   for back in (True,False):
    x=side*(.43 if back else .24);y=.04 if back else -.36
    g=group(('HindFoot' if back else 'FrontFoot')+str(side),(x,y,.42 if not back else .22),'foot' if back else 'front')
    if not back:ball('Front plush leg',(x,y,.46),(.18,.19,.34),'white' if kind=='cat' else coat,g)
    ball('Front paw' if not back else 'Back plush paw',(x,y-.06,.16),(.22,.25,.16),'dark' if kind=='fox' else 'white',g)
    for dx in (-.07,.035):curve('Front paw toe seam',[(x+dx,y-.29,.11),(x+dx,y-.29,.20)],.008,'wood',g)
  elif kind=='dog':
   for back in (True,False):
    x=side*(.46 if back else .28)+( .08 if back else -.08);y=.14 if back else -.40
    g=group(('HindFoot' if back else 'FrontFoot')+str(side),(x,y,.28),'foot' if back else 'front')
    ball('Corgi short leg',(x,y+.06,.34),(.24,.24,.28),coat,g)
    ball('Corgi soft paw',(x,y-.12,.16),(.25,.24,.17),'white',g);paw_pad((x,y-.355,.19),g,.105,3)
  else:
   x=side*(.42 if kind!='hedgehog' else .39);g=group('Foot'+str(side),(x,-.26,.24),'foot')
   ball('Plush seated haunch',(side*.44,.09,.38),(.31,.36,.37),'white' if kind=='deer' else coat)
   o=ball('Plush foot',(x,-.40,.26),(.32,.24,.31),'dark' if kind=='deer' else coat,g);o.rotation_euler[1]=side*.15
   if kind!='deer':paw_pad((x,-.63,.28),g,.155)
   else:
    ball('Dark rounded hoof',(x,-.54,.24),(.25,.14,.25),'dark',g)


def scarf(emblem=True,tail_side=-1,kind='cat'):
 g=group('Scarf knit assembly',(0,0,1.18),'scarf',torso)
 for dz in (0,.09):curve('Knitted scarf wrap',[(.52*math.cos(a),.40*math.sin(a)-.005,1.18+dz+.02*math.cos(a)) for a in np.linspace(0,math.tau,56,endpoint=False)],.115,'scarf',g,True)
 for i in range(29):
  x=-.49+i*.035;y=-math.sqrt(max(.01,1-(x/.56)**2))*.39-.057
  curve('Scarf tiny knitted rib',[(x,y,1.15),(x,y-.008,1.32)],.009,'orange',g)
 if kind not in ('deer','dog'):
  c=(tail_side*.31,-.47,.91);end=group('Scarf hanging soft end',c,'secondary',g)
  o=box('Scarf hanging end',c,(.32,.095,.46),'scarf',end,.025);o.rotation_euler[1]=-tail_side*.15
  for i in range(13):rod('Scarf knitted end rib',(c[0]-.145+i*.024,-.529,.72),(c[0]-.145+i*.024,-.53,1.10),.007,'orange',end)
  for i in range(7):rod('Scarf tassel',(c[0]-.14+i*.046,-.48,.70),(c[0]-.12+i*.046,-.49,.57),.020,'scarf',end)
  if emblem:book_logo((c[0],-.535,.87),.11,end)
 if kind!='deer':star((.28 if kind=='panda' else -tail_side*.35,-.444,1.19),.17,g)
 return g


def hat(kind):
 g=group('Graduation tilted cap',(0,.0,2.43),parent=head)
 ball('Graduation cap crown',(0,.03,2.43),(.43,.33,.21),'cap',g)
 board=box('Graduation mortarboard',(0,.035,2.64),(1.05,.72,.075),'cap',g,.04)
 # Reference camera sees the top plane and overhanging square corners.
 board.rotation_euler[1]=-.14
 curve('Cap edge piping',[(-.50,-.31,2.70),(.51,-.31,2.55),(.51,.36,2.55)],.012,'dark',g)
 tassel=group('Tassel soft swing',(-.48,-.20,2.61),'tassel',g)
 curve('Gold tassel cord',[(0,.015,2.69),(-.43,-.22,2.68),(-.55,-.26,2.50),(-.60,-.27,2.30)],.018,'gold',tassel)
 ball('Tassel knot',(-.60,-.27,2.29),(.057,.045,.065),'gold',tassel)
 for i in range(11):
  a=math.tau*i/11;curve('Tassel silk strand',[(-.60+math.cos(a)*.022,-.27+math.sin(a)*.022,2.26),(-.62+math.cos(a)*.095,-.28+math.sin(a)*.052,2.02)],.015,'scarf',tassel)
 g.rotation_euler[1]=-.10 if kind=='owl' else .09;return g


def glasses(kind):
 g=group('Gold spectacle assembly',(0,-.77,1.90),parent=head);z=1.91 if kind=='owl' else 1.85
 for side in (-1,1):
  oval('Round gold spectacle rim',(side*.35,-.76,z),.295,.30,.021,'gold',g)
  curve('Glasses temple',[(side*.64,-.75,z+.04),(side*.78,-.39,z+.06)],.020,'gold',g)
 curve('Glasses bridge',[(-.055,-.77,z+.03),(0,-.79,z+.075),(.055,-.77,z+.03)],.021,'gold',g)
 return g


def cape():
 g=group('Cape soft cloth',(0,.06,1.18),'cape',torso);verts=[];faces=[];N=16;K=44
 for j in range(N):
  t=j/(N-1);r=.52+.27*t
  for k in range(K):
   a=-2.67+k/(K-1)*5.34;verts.append((r*math.sin(a),r*.80*math.cos(a)+.04,1.24-.87*t+.055*math.cos(a*2.5)*t))
 for j in range(N-1):
  for k in range(K-1):a=j*K+k;faces.append((a,a+1,a+K+1,a+K))
 o=profile_mesh('Cape velvet',verts,faces,'cape',g);o.data.materials.append(M['lining'])
 mod=o.modifiers.new('Thick orange lined velvet','SOLIDIFY');mod.thickness=.028;mod.material_offset=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 curve('Cape gold hem',verts[-K:],.022,'gold',g)
 for k in (0,K-1):curve('Cape gold opening',[verts[j*K+k] for j in range(N)],.025,'gold',g)
 return g


def book(opened=False,spiral=False):
 g=group('Held study book',(0,-.58,.89),'book',torso);y=-.61;z=.86
 if not opened:
  box('Leather book cover',(0,y,z),(.60,.17,.72),'book',g,.035)
  box('Cream page block',(.012,y-.025,z+.025),(.52,.145,.64),'page',g,.025)
  box('Front book cover',(0,y-.105,z),(.62,.045,.74),'book',g,.028)
  book_logo((0,y-.135,z-.04),.13,g)
  for xx in (-.265,.265):
   for zz in (z-.30,z+.30):box('Gold book corner',(xx,y-.137,zz),(.09,.024,.09),'gold',g,.015)
  for zz in (z-.22,z,z+.22):
   if spiral:oval('Notebook spiral',(-.305,y-.075,zz),.075,.032,.014,'gold',g)
   else:rod('Gold binding band',(-.31,y-.127,zz),(-.25,y-.127,zz),.018,'gold',g)
  for j in range(5):curve('Page fine edges',[(-.24,y-.098+j*.025,z+.34),(.25,y-.098+j*.025,z+.34)],.003,'wood',g)
 else:
  for side in (-1,1):
   panel=group('Open book half',(side*.015,y,z),parent=g)
   box('Open leather cover',(side*.215,y-.07,z),(.45,.08,.71),'book',panel,.022)
   box('Open cream pages',(side*.215,y+.015,z+.045),(.40,.08,.65),'page',panel,.018)
   for j in range(6):curve('Open page layered edges',[(side*.03,y+.06-j*.004,z+.36),(side*.39,y+.06-j*.004,z+.34)],.004,'wood',panel)
   if side==1:book_logo((side*.215,y-.122,z-.05),.10,panel)
   panel.rotation_euler[2]=side*.23
  curve('Book central binding',[(0,y-.14,z-.34),(0,y-.14,z+.32)],.025,'gold',g)
 return g


def backpack(kind,emblem='book'):
 c=(-.72,.02,.66);g=group('School backpack',c,'bag',torso)
 box('Leather backpack',c,(.58,.43,.77),'book',g,.12)
 box('Backpack front pocket',(c[0],c[1]-.235,c[2]-.09),(.47,.08,.39),'orange',g,.065)
 flap=box('Backpack flap',(c[0],c[1]-.245,c[2]+.22),(.60,.09,.35),'orange',g,.065);flap.rotation_euler[0]=-.08
 for dx in (-.24,.24):curve('Backpack piping',[(c[0]+dx,c[1]-.278,c[2]-.33),(c[0]+dx,c[1]-.278,c[2]+.25)],.013,'rim',g)
 curve('Backpack top handle',[(c[0]-.16,.05,1.05),(c[0]-.15,.05,1.18),(c[0]+.05,.05,1.20),(c[0]+.16,.05,1.05)],.027,'book',g)
 for dx in (-.18,.18):
  box('Bag strap',(c[0]+dx,-.278,.63),(.058,.045,.36),'book',g,.02)
  box('Gold backpack buckle',(c[0]+dx,-.308,.66),(.105,.025,.115),'gold',g,.02)
  box('Buckle hollow',(c[0]+dx,-.325,.66),(.065,.012,.067),'book',g,.012)
 if emblem=='book':book_logo((c[0],-.286,.89),.12,g)
 else:star((c[0],-.286,.89),.13,g)
 # Reference has thin shoulder straps, rather than a box floating beside the pet.
 for side in (-1,1):curve('Backpack shoulder strap',[(side*.48,.18,1.10),(side*.49,-.26,1.12),(side*.44,-.44,.77)],.028,'book',torso)
 charm=group('Dangling book charm' if kind=='panda' else 'Dangling star charm',(-.56,-.33,.37),'charm',g)
 curve('Gold charm chain',[(-.48,-.31,.73),(-.51,-.33,.58),(-.56,-.34,.46)],.012,'gold',charm)
 if kind=='panda':
  for side in (-1,1):
   o=box('Book charm',(-.56+side*.085,-.35,.34),(.18,.055,.21),'page',charm,.023);o.rotation_euler[1]=side*.1
   for j in range(3):curve('Book charm page line',[(-.56+side*.025,-.386,.32+j*.045),(-.56+side*.145,-.385,.34+j*.045)],.005,'gold',charm)
 else:star((-.56,-.35,.34),.14,charm)
 return g


def pencil(kind):
 g=group('Oversized pencil',(0,0,0),parent=torso)
 bpy.ops.mesh.primitive_cylinder_add(vertices=6,radius=.105,depth=.75,location=(0,0,0));finish(bpy.context.object,'Hexagonal pencil','yellow',g)
 for dz in (.40,.45):oval('Pencil ferrule ridge',(0,-.003,dz),.105,.025,.012,'page',g)
 box('Eraser ferrule',(0,0,.43),(.21,.21,.15),'page',g,.027)
 ball('Pink eraser',(0,0,.55),(.103,.103,.13),'eraser',g)
 bpy.ops.mesh.primitive_cone_add(vertices=20,radius1=.013,radius2=.103,depth=.21,location=(0,0,-.47));finish(bpy.context.object,'Sharpened cedar','wood',g)
 ball('Graphite point',(0,0,-.59),(.022,.022,.035),'lead',g)
 target=Vector((-.32,-.66,.84) if kind=='bear' else (.35,-.65,.88));g.location=torso.matrix_world.inverted()@target;g.rotation_euler[1]=-.53 if kind=='bear' else .48;return g


def sweater():
 ball('Cream knitted sweater',(0,.015,.69),(.56,.41,.46),'wool',torso)
 for i in range(25):
  x=-.40+i*.033
  points=[]
  for z in np.linspace(.38,.57,8):
   y=.015-.41*math.sqrt(max(.015,1-(x/.56)**2-((z-.69)/.46)**2));points.append((x,y-.008,z))
  curve('Sweater hem rib',points,.006,'knit',torso)
 for j in range(9):
  z=.57+j*.043
  curve('Sweater horizontal stitch',[(-.42,-.31,z),(-.22,-.377,z+.012),(0,-.40,z),(.22,-.377,z+.012),(.42,-.31,z)],.0035,'knit',torso)


def arms(kind,coat,held=None):
 raised=kind in ('bear','panda')
 for side in (-1,1):
  g=group('ArmWave' if raised and side==1 else 'ArmHold'+str(side),(side*.47,-.01,1.00),'wave' if raised and side==1 else 'holding',torso);g['side']=side
  if raised and side==1:
   elbow=group('Raised wrist',(.70,-.18,1.36),'wrist',g)
   rod('Raised sleeve',(.47,-.01,1.02),(.66,-.12,1.33),.17,'wool' if kind=='bear' else coat,g)
   ball('Waving plush palm',(.76,-.20,1.51),(.23,.13,.255),coat,elbow);paw_pad((.76,-.337,1.51),elbow,.112)
   if kind=='bear':
    for i in range(6):oval('Ribbed raised sleeve cuff',(.66,-.14,1.29+i*.022),.17,.037,.014,'knit',g)
  else:
   target=(side*.34,-.73,.90)
   if kind=='bear':target=(-.32,-.73,.83)
   if kind=='panda':target=(-.30,-.45,.83)
   if kind=='hedgehog':target=(side*.22,-.72,.79 if side<0 else .88)
   if kind=='penguin':
    tapered_leaf('Penguin holding flipper',(side*.50,-.17,1.03),target,.18,.12,coat,g)
   else:
    rod('Plush forearm',(side*.47,-.02,1.01),target,.155,'wool' if kind in ('bear','hedgehog') else coat,g)
    if kind in ('bear','hedgehog'):
     for j in range(6):oval('Ribbed sleeve cuff',(target[0],target[1]+.13,.77+j*.025),.16,.027,.012,'knit',g)
    ball('Arm holding',target,(.17,.115,.19),coat,g)
   if held:
    # Prop and palms are one constrained acting group; neither loses contact.
    attach(g,held)
 return g


def tail(kind):
 side=-1 if kind=='cat' else 1;g=group('Tail',(side*.40,.17,.33),'tail')
 verts=[];faces=[];N=36;K=20;matids=[]
 for j in range(N+1):
  t=j/N
  if kind=='cat':c=Vector((-.43-.47*math.sin(t*math.pi*1.0),.22,.26+1.03*t));r=.18+.065*math.sin(math.pi*t)
  elif kind=='fox':c=Vector((.44+.55*math.sin(t*math.pi*.68),.26,.27+1.26*t));r=.11+.29*math.sin(math.pi*t)**.8
  elif kind=='deer':c=Vector((-.47-.26*t,.23,.40+.36*t));r=.05+.10*math.sin(math.pi*t)
  else:c=Vector((.49+.29*math.sin(t*math.pi*.85),.28,.32+.56*t));r=.13+.10*math.sin(math.pi*t)
  r*=min(1,(1-t)*15+.025)
  tangent=Vector((0,0,1))
  for k in range(K):a=math.tau*k/K;verts.append(tuple(c+Vector((math.cos(a)*r,math.sin(a)*r*.80,0))))
 for j in range(N):
  for k in range(K):faces.append((j*K+k,j*K+(k+1)%K,(j+1)*K+(k+1)%K,(j+1)*K+k));matids.append(1 if (kind=='cat' and (j/N>.79 or .29<j/N<.46)) or (kind!='cat' and j/N>.63) else 0)
 faces.extend([tuple(range(K-1,-1,-1)),tuple(range(N*K,(N+1)*K))]);matids.extend([0,1])
 o=profile_mesh('Tail plush',verts,faces,'orange' if kind in ('cat','dog','deer') else 'fox',g);o.data.materials.append(M['white'])
 for p,m in zip(o.data.polygons,matids):p.material_index=m
 o.shape_key_add(name='Basis');key=o.shape_key_add(name='SoftTailSweep')
 for i,v in enumerate(key.data):
  t=(i//K)/N;v.co.y+=.19*math.sin(t*math.pi*.7)*t;v.co.x+=side*.09*t*t
 if kind=='fox':
  for j in range(5):
   a=j*.55;tuft((.79+math.sin(a)*.25,.06,1.0+j*.07),'white' if j>2 else 'fox',g,.10)
 return g


def tuft(c,coat,parent=None,size=.15):
 return tapered_leaf('Fluffy silhouette tuft',(c[0]*.94,c[1]+.03,c[2]-.03),(c[0]+(.12 if c[0]>0 else -.12),c[1],c[2]+.07),size*.5,.045,coat,parent)


def body(kind,coat):
 c=(0,.06,.65);scale=(.55,.42,.55)
 if kind=='dog':c=(.12,.13,.60);scale=(.66,.49,.48)
 if kind in ('owl','penguin'):c=(0,.035,.77);scale=(.57,.43,.68)
 if kind=='hedgehog':scale=(.56,.43,.55)
 ball('Body plush',c,scale,coat,torso,32,24)
 if kind in ('cat','fox','dog','deer','panda','penguin'):
  ball('Penguin white tummy' if kind=='penguin' else 'Cream chest',(0,-.275,.68),(.38,.18,.45),'white',torso)
 if kind in ('cat','fox','dog'):
  for side in (-1,1):
   for j in range(4):tuft((side*(.25+j*.05),-.41,.82+j*.05),'white',torso,.13)
 if kind in ('cat','dog','fox'):ball('Rounded rear haunch',(.30 if kind=='dog' else -.04,.20,.40),(.48,.40,.36),coat,torso)


def dog_satchel():
 g=group('Corgi saddle satchel',(.56,.15,.68),'bag',torso)
 box('Saddle leather bag',(.58,.15,.65),(.48,.45,.58),'book',g,.09)
 box('Satchel orange flap',(.59,-.095,.82),(.52,.07,.34),'orange',g,.045);book_logo((.59,-.14,.79),.12,g)
 curve('Satchel rounded piping',[(.38,-.15,.67),(.38,-.15,.96),(.81,-.15,.96),(.82,-.15,.67)],.014,'rim',g)
 for j in (-1,1):
  box('Satchel pocket',(.58+j*.12,-.095,.51),(.19,.07,.19),'orange',g,.028)
  box('Satchel buckle',(.58+j*.12,-.14,.55),(.07,.025,.08),'gold',g,.01)
 for side in (-1,1):curve('Saddle straps',[(side*.40,-.25,.34),(side*.48,-.30,.96),(side*.46,.27,1.02)],.028,'book',torso)
 curve('Corgi orange collar',[(.45*math.cos(a),.35*math.sin(a)-.035,1.18) for a in np.linspace(0,math.tau,48,endpoint=False)],.065,'book',torso,True);star((-.10,-.43,1.10),.15,torso)


def quills():
 mantle=group('Quill mantle',(0,.17,1.15),'quills',torso)
 # Wide, softly tapered blades overlap like the reference's caramel rosette.
 for row in range(4):
  for j in range(14):
   a=-.25+j/13*(math.pi+.50);r=.69+row*.045;cx=math.cos(a)*r;cz=1.58+math.sin(a)*(.69+row*.04)-row*.12
   tangent=Vector((math.cos(a),0,math.sin(a)))
   start=Vector((cx*.88,.14+row*.12,cz-.05));end=Vector((cx,.11+row*.12,cz))+tangent*.20+Vector((-.07 if cx<0 else .07,0,-.10))
   tapered_leaf('Soft caramel quill',start,end,.13,.14,'spine',mantle)
 for side in (-1,1):
  for j in range(8):tapered_leaf('Body soft quill',(side*.48,.22,.26+j*.11),(side*(.76+.09*math.sin(j)),.19,.20+j*.12),.105,.11,'spine',mantle)
 return mantle


def owl_wings():
 for side in (-1,1):
  wing=group('ArmWing'+str(side),(side*.44,.0,1.04),'wing',torso);wing['side']=side
  for row in range(2):
   for j in range(6):
    tapered_leaf('Layered wing feather',(side*.48,.01-row*.06,1.04+j*.035),(side*(.82+j*.075),-.02-row*.05,.99+j*.105),.115,.07,'milk',wing)
 for row in range(5):
  for j in range(5-row%2):
   x=(j-(4-row%2)/2)*.19;z=.39+row*.13
   tapered_leaf('Layered breast feather',(x,-.35-.04*(1-abs(x)),z+.19),(x+.025,-.43,z),.12,.055,'white' if row%2 else 'milk',torso)


def antlers():
 for side in (-1,1):
  g=group('Antler'+str(side),(side*.38,.08,2.30),parent=head)
  curve('Antler stem',[(side*.38,.09,2.28),(side*.43,.10,2.64),(side*.47,.11,2.97)],.054,'bear',g)
  for a,b in [((side*.43,.1,2.61),(side*.67,.10,2.80)),((side*.45,.1,2.74),(side*.31,.10,2.94))]:
   rod('Antler branch',a,b,.052,'bear',g)
  ball('Antler round tip',(side*.47,.11,2.97),(.055,.055,.065),'bear',g)


def animate_object(obj,clip,keys,prop='rotation_euler',index=0):
 obj.animation_data_create();base=getattr(obj,prop).copy()
 existing=next((track for track in obj.animation_data.nla_tracks if track.name==clip),None)
 act=existing.strips[0].action if existing else bpy.data.actions.new(clip+'_'+obj.name)
 obj.animation_data.action=act
 for frame,value in keys:
  getattr(obj,prop)[index]=base[index]+value;obj.keyframe_insert(data_path=prop,index=index,frame=frame)
 for fc in act.fcurves:
  for key in fc.keyframe_points:key.interpolation='BEZIER';key.handle_left_type='AUTO_CLAMPED';key.handle_right_type='AUTO_CLAMPED'
 if not existing:
  track=obj.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,0,act);strip.blend_type='REPLACE';strip.extrapolation='NOTHING';track.mute=True
 obj.animation_data.action=None;setattr(obj,prop,base)


def author_motion(kind):
 # Sitting acting: feet remain on the floor and props stay held in both hands.
 roles={}
 for o in groups:
  if o.get('petMotion'):roles.setdefault(o['petMotion'],[]).append(o)
 headj=roles['head'][0]
 idle=[(0,0),(45,0),(72,.05),(100,.05),(124,0),(190,0),(230,-.035),(256,0),(300,0)]
 animate_object(headj,'Idle',idle,index=2)
 animate_object(torso,'Idle',[(0,0),(70,.006),(140,0),(220,.006),(300,0)],'location',2)
 for clip in ('Hello','Feed','Pet','Play'):
  nod={'Hello':-.07,'Feed':.10,'Pet':-.05,'Play':-.055}[clip]
  times=[(0,0),(14,nod*.4),(30,nod),(48,nod*.4),(62,nod),(84,0),(108,0)] if clip=='Feed' else [(0,0),(16,nod),(40,-nod*.35),(65,nod*.4),(92,0),(108,0)]
  animate_object(headj,clip,times,index=0)
  if clip in ('Hello','Pet','Play'):animate_object(headj,clip,[(0,0),(22,.12 if kind not in ('owl','penguin') else .16),(45,.09),(72,0),(108,0)],index=1)
 # Each idle action includes a short species gesture, then a long still interval.
 for o in roles.get('ear',[]):
  side=o.get('side',1);amp=.14 if kind in ('rabbit','dog','deer','fox') else .04
  animate_object(o,'Idle',[(0,0),(80,0),(88,side*amp),(98,-side*amp*.4),(113,0),(300,0)],index=1)
  for clip in ('Hello','Play'):animate_object(o,clip,[(0,0),(14,side*amp),(28,-side*amp*.5),(45,side*amp*.7),(70,0),(108,0)],index=1)
 for o in roles.get('wave',[]):
  for clip,amp in [('Idle',.14),('Hello',.24),('Play',.28),('Pet',.10)]:
   end=300 if clip=='Idle' else 108;start=165 if clip=='Idle' else 10
   animate_object(o,clip,[(0,0),(start,0),(start+12,-amp),(start+24,amp*.65),(start+38,-amp*.75),(start+53,0),(end,0)],index=1)
 for o in roles.get('wrist',[]):
  for clip in ('Hello','Play'):animate_object(o,clip,[(0,0),(18,-.16),(30,.13),(44,-.13),(58,0),(108,0)],index=1)
 for o in roles.get('tail',[]):
  for clip,amp in [('Idle',.07),('Hello',.18),('Play',.23),('Pet',.10)]:
   if kind=='dog':amp*=1.6
   end=300 if clip=='Idle' else 108;start=30 if clip=='Idle' else 5
   animate_object(o,clip,[(0,0),(start,0),(start+12,amp),(start+25,-amp*.8),(start+38,amp*.6),(start+55,0),(end,0)],index=2)
 for o in roles.get('wing',[]):
  side=o['side']
  for clip,amp in [('Idle',.065),('Hello',.13),('Play',.24)]:
   end=300 if clip=='Idle' else 108;start=145 if clip=='Idle' else 10
   animate_object(o,clip,[(0,0),(start,0),(start+12,-side*amp),(start+25,side*amp*.3),(start+40,-side*amp*.7),(start+60,0),(end,0)],index=1)
 for o in roles.get('book',[]):
  for clip in ('Idle','Play'):
   end=300 if clip=='Idle' else 108
   animate_object(o,clip,[(0,0),(end*.25,-.025),(end*.45,.018),(end*.65,0),(end,0)],index=0)
 for o in roles.get('jaw',[]):
  animate_object(o,'Feed',[(0,0),(16,0),(24,.10),(34,0),(44,.08),(54,0),(65,.065),(77,0),(108,0)],index=0)
 for o in roles.get('tassel',[])+roles.get('secondary',[])+roles.get('charm',[]):
  for clip in ('Idle','Hello','Play'):
   end=300 if clip=='Idle' else 108
   animate_object(o,clip,[(0,0),(end*.20,.04),(end*.32,-.025),(end*.46,.017),(end*.66,0),(end,0)],index=1)
 # Tail and rabbit ears also bend along their length, rather than rotating
 # every surface as one rigid block.
 for o in parts:
  if not o.data.shape_keys:continue
  keys=o.data.shape_keys
  for block in list(keys.key_blocks)[1:]:
   for clip in ('Idle','Hello','Play'):
    keys.animation_data_create();act=bpy.data.actions.new(clip+'_'+o.name+'_soft');keys.animation_data.action=act
    end=300 if clip=='Idle' else 108
    for frame,value in [(0,0),(end*.18,.45),(end*.32,-.30),(end*.50,.20),(end*.70,0),(end,0)]:
     block.value=value;block.keyframe_insert(data_path='value',frame=frame)
    track=keys.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,0,act);strip.extrapolation='NOTHING';track.mute=True;keys.animation_data.action=None;block.value=0
 # Authored eyes retain the reference's smile/wink/open-eye balance.
 for o in roles.get('eyeOpen',[])+roles.get('eyeClosed',[]):
  isopen=o['petMotion']=='eyeOpen';default=o['eyeDefault'];base=o.scale.copy()
  if default:
   if isopen:
    # Squash the entire eye including iris and glints in a real 0.23s blink.
    animate_object(o,'Blink',[(0,0),(2,-.94),(3,-.94),(7,0)],'scale',2)
   else:animate_object(o,'Blink',[(0,0),(2,-.28),(4,-.28),(8,0)],'scale',2)
  else:
   # Keep unused authored expression tiny; runtime may use it for a brief curious glance.
   pass
 # Muted NLA tracks are exported individually; evaluate the rest pose for portraits.
 scene.frame_set(0)
 for o in groups:
  if o.animation_data:
   for track in o.animation_data.nla_tracks:track.mute=True
 return roles


def build(kind):
 global root,head,torso,parts,groups,active_kind
 active_kind=kind
 for o in list(scene.objects):
  if o.type in ('CAMERA','LIGHT') or o.name=='Studio shadow catcher':bpy.data.objects.remove(o,do_unlink=True)
 parts=[];groups=[]
 root=bpy.data.objects.new('ReferencePlush_'+kind,None);scene.collection.objects.link(root);root['referenceVersion']=VERSION;root['animal']=kind
 torso=group('Torso anchored sitting',(0,0,.56),'torso')
 head=group('Head neck pivot',(0,.015,1.21),'head',torso)
 coat={'cat':'orange','rabbit':'white','fox':'fox','bear':'bear','owl':'milk','dog':'orange','panda':'panda','deer':'orange','hedgehog':'milk','penguin':'penguin'}[kind]
 body(kind,coat)
 if kind not in ('owl','penguin'):ball('Soft neck connection',(0,-.01,1.16),(.34,.28,.24),coat,torso)
 hc={'cat':(0,-.03,1.87),'rabbit':(0,-.03,1.91),'fox':(0,-.015,1.87),'bear':(0,-.005,1.82),'owl':(0,-.015,1.92),'dog':(-.08,-.06,1.83),'panda':(0,-.015,1.90),'deer':(0,-.02,1.91),'hedgehog':(0,-.04,1.78),'penguin':(0,-.015,1.87)}[kind]
 hs={'cat':(.79,.55,.62),'rabbit':(.72,.52,.61),'fox':(.75,.53,.63),'bear':(.72,.53,.61),'owl':(.70,.54,.59),'dog':(.79,.54,.64),'panda':(.80,.56,.64),'deer':(.73,.53,.61),'hedgehog':(.64,.51,.55),'penguin':(.67,.52,.63)}[kind]
 soft_head(kind,hc,hs)
 feet(kind,coat);face(kind)
 if kind in ('rabbit','bear','deer','hedgehog'):head.location.z-=.10
 if kind in ('cat','fox','dog'):
  for side in (-1,1):
   ear(side,'dog' if kind=='dog' else 'point',coat)
   for j in range(3):tuft((side*(.61+j*.035),-.27,1.59+j*.10),'white',head,.15)
  if kind=='cat':
   for side in (-1,1):
    for dz in (0,.12):curve('Cocoa whisker',[(side*.53,-.58,1.72+dz),(side*.77,-.59,1.76+dz)],.011,'bear',head)
   for x in (-.20,0,.20):tapered_leaf('Cat forehead stripe',(x,-.41,2.35),(x*.92,-.49,2.21),.025,.015,'fox',head)
   scarf(True);tail(kind)
  if kind=='fox':cape();hat(kind);tail(kind);star((0,-.44,1.19),.16,torso)
  if kind=='dog':dog_satchel();tail(kind)
 elif kind=='rabbit':
  for side in (-1,1):ear(side,'rabbit','white',loc=(side*.48,.0,2.30))
  bow((-.38,-.40,2.43),head,1.0);ball('Cotton tail',(-.56,.26,.45),(.23,.23,.26),'white')
  prop=book();arms(kind,coat,prop);head.rotation_euler[1]=-.045
 elif kind=='bear':
  for side in (-1,1):ear(side,'round','bear',loc=(side*.50,.01,2.20))
  # Broad cream muzzle is a defining teddy-bear feature in the reference.
  ball('Teddy cream muzzle',(0,-.53,1.65),(.32,.17,.28),'milk',head)
  # Restore mouth/nose to the front of this muzzle, maintaining their shared jaw pivot.
  for o in list(head.children):
   if o.get('petMotion')=='jaw':o.location.y-=.045
  sweater();backpack(kind);pen=pencil(kind);arms(kind,coat);star((.34,-.39,1.01),.145,torso)
 elif kind=='panda':
  for side in (-1,1):ear(side,'round','panda',loc=(side*.52,.03,2.27))
  scarf(False,1,kind);backpack(kind,'star');arms(kind,coat);head.rotation_euler[1]=-.075
 elif kind=='deer':
  for side in (-1,1):ear(side,'deer','orange',loc=(side*.57,.03,2.14))
  antlers();bow((-.47,-.32,2.48),head,.92);scarf(False,-1,kind)
  for x,z,r in [(-.09,2.37,.043),(.06,2.41,.05),(.15,2.31,.042),(.02,2.27,.038)]:ball('Deer forehead spot',(x,-.43,z),(r,.012,r),'spot',head,16,10)
  for side in (-1,1):
   for j in range(5):ball('Deer coat spot',(side*(.42+.045*(j%2)),-.23,.50+j*.09),(.045,.012,.055),'spot',torso,16,10)
  prop=book(spiral=True);arms(kind,'white',prop);tail(kind)
 elif kind=='hedgehog':
  quills()
  for side in (-1,1):ear(side,'round','milk',loc=(side*.48,-.08,1.99))
  sweater();backpack(kind);pen=pencil(kind);arms(kind,coat,pen);star((-.45,-.39,2.24),.14,head)
 elif kind=='owl':
  for side in (-1,1):tapered_leaf('Owl swept eyebrow tuft',(side*.44,-.07,2.22),(side*.78,.0,2.43),.12,.07,'milk',head)
  owl_wings();scarf(True,-1,kind);glasses(kind);hat(kind)
 elif kind=='penguin':
  cape();scarf(False,-1,kind);glasses(kind);hat(kind);prop=book(opened=True);arms(kind,coat,prop)
 head.rotation_euler[0]-=.10
 author_motion(kind)
 # A small reference turn shows depth and the side bag/tail without hiding the face.
 root.rotation_euler[2]=math.radians(-8 if kind in ('cat','panda','bear','hedgehog') else 7)
 bpy.ops.object.select_all(action='DESELECT');root.select_set(True)
 for o in parts+groups:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(kind+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_materials='EXPORT',export_extras=True,export_image_format='WEBP',export_image_quality=82,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_step=2)
 # Portrait is rendered from the very same editable geometry and reference expression.
 scene.frame_set(0)
 for o in groups:
  if o.animation_data:
   for track in o.animation_data.nla_tracks:track.mute=True
 bpy.ops.object.camera_add(location=(2.2,-8,3.3));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1.35))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.35;scene.camera=cam
 for loc,power,size,color in [((-3,-4,6),600,5,(1,.88,.76)),((4,-2,4),280,4,(1,.95,.88)),((0,4,5),800,3,(1,.72,.53))]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.color=color;l.data.size=size;l.rotation_euler=(Vector((0,0,1.35))-l.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));floor=bpy.context.object;floor.name='Studio shadow catcher';floor.is_shadow_catcher=True
 scene.render.image_settings.file_format='WEBP';scene.render.image_settings.quality=92;scene.render.filepath=str(OUT/(kind+'.webp'));bpy.ops.render.render(write_still=True)
 # Store an editable individual native source as well as the assembled ten-pet file.
 col=bpy.data.collections.new(kind.title()+' / reference atelier');scene.collection.children.link(col)
 for o in [root]+parts+groups:
  for old in list(o.users_collection):old.objects.unlink(o)
  col.objects.link(o)
 manifest.append({'animal':kind,'version':VERSION,'meshes':len(parts),'bytes':(OUT/(kind+'.glb')).stat().st_size,'portrait':[640,640],'motion':'Blender authored NLA clips','expression':'open' if kind=='owl' else 'wink' if kind in ('bear','rabbit') else 'smile'})
 print('FINISHED_ATELIER',kind,manifest[-1],flush=True)
 col.hide_render=True;col.hide_viewport=True;collections.append((col,root))

kinds=['cat','rabbit','fox','bear','owl','dog','panda','deer','hedgehog','penguin']
selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else kinds
for kind in selected:build(kind)
for i,(col,petroot) in enumerate(collections):
 col.hide_render=False;col.hide_viewport=False;petroot.location.x=(i%5-2)*3.25;petroot.location.z=(1-i//5)*3.6
scene.camera.location=(0,-18,6.4);scene.camera.rotation_euler=(Vector((0,0,3.15))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=17.1
scene.render.resolution_x=1800;scene.render.resolution_y=920
scene['Reference']='Hand rebuilt from the supplied six-pet and four-pet reference images. Preserve smile/wink expressions.'
scene['Motion']='Authored seated acting clips: Idle, Hello, Feed, Pet, Play and Blink. NLA track names match the web mixer.'
(BASE/'design/pets').mkdir(parents=True,exist_ok=True)
if selected==kinds:bpy.ops.wm.save_as_mainfile(filepath=str(BASE/'design/pets/reference-companions.blend'),compress=True)
existing=json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else []
merged={m['animal']:m for m in existing+manifest};(OUT/'manifest.json').write_text(json.dumps([merged[k] for k in kinds if k in merged],indent=2)+'\n')
