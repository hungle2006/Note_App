"use client";

import type {CSSProperties} from "react";

/**
 * A GPU-friendly ambience behind the actual app content. Each pair travels
 * toward its center then drifts apart over a long cycle. It deliberately
 * simulates soft water collisions, rather than running costly fluid physics.
 * Disabling 3D unmounts every droplet.
 */
const pairs=[
 {id:"a",x:"7%",y:"13%",size:68,delay:"-4s",duration:"20s",tilt:-15},
 {id:"b",x:"77%",y:"18%",size:52,delay:"-13s",duration:"23s",tilt:17},
 {id:"c",x:"62%",y:"54%",size:74,delay:"-9s",duration:"25s",tilt:-9},
 {id:"d",x:"10%",y:"73%",size:48,delay:"-18s",duration:"21s",tilt:9},
 {id:"e",x:"79%",y:"84%",size:63,delay:"-6s",duration:"27s",tilt:-19}
] as const;

export function WaterAtmosphere({active}:{active:boolean}){
 if(!active)return null;
 return <div className="water-atmosphere" role="presentation" aria-hidden="true" data-effect="soft-water-collision">
  {pairs.map(p=><div key={p.id} className={"water-pair water-pair-"+p.id}
   style={{
    "--drop-x":p.x,"--drop-y":p.y,"--drop-size":p.size+"px",
    "--drop-delay":p.delay,"--drop-cycle":p.duration,"--drop-tilt":p.tilt+"deg"
   } as CSSProperties}>
   <span className="water-drop water-drop-left"/>
   <span className="water-drop water-drop-right"/>
   <span className="water-collision-glint"/>
  </div>)}
 </div>;
}
