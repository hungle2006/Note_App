import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PetProvider,PetShop} from '../src/components/pet-habitat';
import {emptyWallet} from '../src/lib/rewards';
import type {Learning} from '../src/lib/use-learning';
function shop(demo:boolean,owned:string[]=[]){
 const wallet={...emptyWallet(),redeemed:owned.map(rewardId=>({rewardId,createdAt:'2026-11-03T00:00:00Z'}))};
 const learning={wallet,walletError:'',loading:false} as Learning;
 return renderToStaticMarkup(createElement(PetProvider,{wallet,demo,account:demo?'demo':'account-a',children:createElement(PetShop,{learning,demo})}));
}
test('sample space keeps previews and try-on-top controls for all ten pets',()=>{
 const html=shop(true);
 assert.equal((html.match(/aria-label="Xem trước /g)||[]).length,10);
 assert.equal((html.match(/class="pet-try"/g)||[]).length,10);
});
test('real account with no unlocks has no interactive pet previews or demo controls',()=>{
 const html=shop(false);
 assert.equal((html.match(/aria-label="Xem trước /g)||[]).length,0);
 assert.equal((html.match(/Chưa mở khóa"/g)||[]).length,10);
 assert.ok(!html.includes('class="pet-try"'));
 assert.ok(!html.includes('Khám phá trong bản demo.'));
});
test('real account can inspect owned pet while other pets remain locked',()=>{
 const html=shop(false,['pet-cat']);
 assert.equal((html.match(/aria-label="Xem trước /g)||[]).length,1);
 assert.ok(html.includes('aria-label="Xem trước Miu Nắng"'));
 assert.ok(!html.includes('aria-label="Xem trước Cún Bắp"'));
 assert.ok(!html.includes('class="pet-try"'));
 assert.ok(html.includes('Chọn đồng hành'));
});
