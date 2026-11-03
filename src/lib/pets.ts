export const petCatalog=[
 {id:'pet-cat',animal:'cat',name:'Miu Nắng',species:'Mèo',cost:20,color:'#f8dec3',emoji:'🐱',description:'Tò mò, thích được vuốt ve và rón rén theo em học bài.'},
 {id:'pet-dog',animal:'dog',name:'Cún Bắp',species:'Chó',cost:30,color:'#eddbc4',emoji:'🐶',description:'Vẫy đuôi chào em và luôn sẵn sàng cho một trò chơi nhỏ.'},
 {id:'pet-rabbit',animal:'rabbit',name:'Thỏ Mây',species:'Thỏ',cost:40,color:'#eee5e2',emoji:'🐰',description:'Đôi tai dài, bước nhảy nhẹ và một cái mũi hay nhúc nhích.'},
 {id:'pet-fox',animal:'fox',name:'Cáo Quýt',species:'Cáo',cost:55,color:'#ffe0c5',emoji:'🦊',description:'Tinh nghịch, nhanh nhẹn và thích khoe chiếc đuôi bồng bềnh.'},
 {id:'pet-panda',animal:'panda',name:'Gấu Trúc Mochi',species:'Gấu trúc',cost:70,color:'#e4e9db',emoji:'🐼',description:'Chậm rãi, dịu dàng, cùng em tận hưởng một khoảng nghỉ.'},
 {id:'pet-penguin',animal:'penguin',name:'Chim Cánh Cụt Băng',species:'Chim cánh cụt',cost:85,color:'#dcecf0',emoji:'🐧',description:'Lạch bạch đáng yêu và vỗ cánh mỗi khi được gọi tên.'},
 {id:'pet-bear',animal:'bear',name:'Gấu Mật',species:'Gấu',cost:100,color:'#efd9c5',emoji:'🐻',description:'Một người bạn tròn trịa, ấm áp, rất thích những cái ôm.'},
 {id:'pet-turtle',animal:'turtle',name:'Rùa Lá',species:'Rùa',cost:120,color:'#dcebdc',emoji:'🐢',description:'Không cần vội. Rùa Lá nhắc em tiến bộ từng chút một.'},
 {id:'pet-chick',animal:'chick',name:'Gà Bông',species:'Gà con',cost:145,color:'#fff0be',emoji:'🐥',description:'Một cục bông vàng líu ríu, nhảy nhót khi em chạm vào.'},
 {id:'pet-deer',animal:'deer',name:'Hươu Sao',species:'Hươu',cost:180,color:'#e8dfd0',emoji:'🦌',description:'Hiền lành, thanh thoát với đôi gạc nhỏ màu kem.'},
] as const;
export type Pet=typeof petCatalog[number];
export type PetAction='hello'|'feed'|'play'|'pet';
export function findPet(id:string|null|undefined){return petCatalog.find(p=>p.id===id);}
export function ownsPet(redeemed:{rewardId:string}[],id:string){return Boolean(findPet(id)&&redeemed.some(r=>r.rewardId===id));}

export const maxCompanionPets=3;
export function normalizePetSelection(value:unknown):string[]{
 const candidates=Array.isArray(value)?value:typeof value==='string'?[value]:[];
 return [...new Set(candidates.filter((id):id is string=>typeof id==='string'&&Boolean(findPet(id))))].slice(0,maxCompanionPets);
}
export function addCompanionPet(selected:string[],previews:string[],id:string,trial=false){
 const ownedIds=normalizePetSelection(selected),trialIds=normalizePetSelection(previews).filter(x=>!ownedIds.includes(x));
 if(!findPet(id))return null;
 if(ownedIds.includes(id)||trialIds.includes(id))return {selected:ownedIds,previews:trialIds};
 if(ownedIds.length+trialIds.length>=maxCompanionPets)return null;
 return trial?{selected:ownedIds,previews:[...trialIds,id]}:{selected:[...ownedIds,id],previews:trialIds};
}
export function visibleCompanionPets(selected:string[],previews:string[],redeemed:{rewardId:string}[],demo:boolean){
 const owned=normalizePetSelection(selected).filter(id=>ownsPet(redeemed,id));
 return [...owned,...(demo?normalizePetSelection(previews).filter(id=>!owned.includes(id)):[])].slice(0,maxCompanionPets);
}
