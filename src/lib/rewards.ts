export const rewardCatalog=[
 {id:'curious-star',name:'Ngôi sao tò mò',cost:10,emoji:'✦',description:'Nhãn thành tích đầu tiên cho hành trình học của em.'},
 {id:'knowledge-orbit',name:'Quỹ đạo kiến thức',cost:30,emoji:'✺',description:'Huy hiệu dành cho những lần chủ động ôn tập.'},
 {id:'learning-universe',name:'Vũ trụ của em',cost:60,emoji:'✧',description:'Một dấu mốc cho sự kiên trì với kiến thức.'}
] as const;
export type RewardId=typeof rewardCatalog[number]['id'];
export type PointsEvent={id:string;amount:number;kind:'practice'|'redeem';label:string;createdAt:string};
export type RewardWallet={balance:number;earned:number;redeemed:{rewardId:string;createdAt:string}[];history:PointsEvent[]};
export function emptyWallet():RewardWallet{return {balance:0,earned:0,redeemed:[],history:[]};}
