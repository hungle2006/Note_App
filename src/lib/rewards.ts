/** Virtual-only rewards: no money, leaderboards or required streaks. */
export const rewardCatalog=[
 {id:'curious-star',name:'Ngôi sao tò mò',cost:10,emoji:'✦',description:'Dành cho khoảnh khắc em bắt đầu khám phá điều mới.',theme:'Học hỏi'},
 {id:'morning-sun',name:'Nắng đầu ngày',cost:20,emoji:'☀',description:'Một chút tiến bộ cũng xứng đáng được ghi nhận.',theme:'Khởi đầu'},
 {id:'knowledge-orbit',name:'Quỹ đạo kiến thức',cost:30,emoji:'✺',description:'Gắn kết những điều em đã học theo cách riêng.',theme:'Kiến thức'},
 {id:'kind-heart',name:'Trái tim ấm',cost:45,emoji:'♡',description:'Nhắc em trân trọng cố gắng của bản thân và bạn bè.',theme:'Tích cực'},
 {id:'learning-universe',name:'Vũ trụ của em',cost:60,emoji:'✧',description:'Một dấu mốc khám phá kiến thức và niềm vui.',theme:'Khám phá'},
 {id:'little-garden',name:'Khu vườn nhỏ',cost:90,emoji:'❀',description:'Mỗi bước nhỏ vun đắp một hành trình thú vị.',theme:'Bền bỉ'}
] as const;
export type RewardId=typeof rewardCatalog[number]['id'];
export type PointsEvent={id:string;amount:number;kind:'practice'|'redeem';label:string;createdAt:string};
export type RewardWallet={balance:number;earned:number;redeemed:{rewardId:string;createdAt:string}[];history:PointsEvent[]};
export function emptyWallet():RewardWallet{return {balance:0,earned:0,redeemed:[],history:[]};}
export const fitnessAward={minReps:4,minSeconds:30,perSession:4,maxDistinctPerUtcDay:2} as const;
export type WorkoutRewardInput={id:string;exercise:string;reps:number;seconds:number};
export function eligibleFitnessReward(workout:WorkoutRewardInput){
 return Number.isInteger(workout.reps)&&workout.reps>=fitnessAward.minReps
  &&Number.isInteger(workout.seconds)&&workout.seconds>=fitnessAward.minSeconds;
}
export const progressTiers=[
 {label:'Mầm tò mò',min:0,icon:'🌱'},
 {label:'Bạn khám phá',min:20,icon:'🌤️'},
 {label:'Người kết nối',min:55,icon:'🌻'},
 {label:'Ngôi sao sáng',min:110,icon:'⭐'},
 {label:'Vườn tri thức',min:200,icon:'🌳'}
] as const;
export function tierProgress(earned:number){
 const total=Math.max(0,Math.round(earned));
 let tier=0;for(let i=0;i<progressTiers.length;i++)if(total>=progressTiers[i].min)tier=i;
 const current=progressTiers[tier],next=progressTiers[tier+1]??null;
 const progress=next?Math.max(0,Math.min(100,Math.round((total-current.min)/(next.min-current.min)*100))):100;
 return {current,next,progress,remaining:next?Math.max(0,next.min-total):0};
}
