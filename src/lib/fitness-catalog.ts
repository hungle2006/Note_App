import {EXERCISES,type ExerciseId} from "./fitness-engine";

/** The seven automated counters are tested movement families. All remaining
 * exercises are guided routines: timer only, no AI counting or reward credit.
 */
export const FITNESS_CATEGORIES=[
 {id:"all",label:"Tất cả",icon:"✦"},
 {id:"ai",label:"AI đếm",icon:"◎"},
 {id:"warmup",label:"Khởi động",icon:"☀"},
 {id:"cardio",label:"Tim mạch",icon:"♡"},
 {id:"legs",label:"Chân & mông",icon:"⚡"},
 {id:"upper",label:"Tay & vai",icon:"✳"},
 {id:"core",label:"Bụng & lưng",icon:"◇"},
 {id:"mobility",label:"Linh hoạt",icon:"↗"},
 {id:"balance",label:"Thăng bằng",icon:"◉"},
 {id:"stretch",label:"Giãn cơ",icon:"❀"},
 {id:"recovery",label:"Thư giãn",icon:"☾"}
] as const;
export type FitnessCategory=typeof FITNESS_CATEGORIES[number]["id"];
export type FitnessLevel="Dễ"|"Vừa"|"Nâng cao";
export type LibraryExercise={
 id:string;name:string;short:string;instruction:string;camera:string;
 category:FitnessCategory;level:FitnessLevel;seconds:number;kind:"ai"|"guided";
 aiId?:ExerciseId;goal:number;equipment:"Không cần"|"Ghế"|"Thảm"|"Tường";
};
const CATEGORY_FOR_AI:Record<ExerciseId,FitnessCategory>={squat:"legs",chair:"legs",pushup:"upper",jack:"cardio",knees:"cardio",press:"upper",arms:"upper"};
export const AI_EXERCISES:LibraryExercise[]=EXERCISES.map(ex=>({
 id:ex.id,name:ex.name,short:ex.short,instruction:ex.instruction,camera:ex.camera,
 category:CATEGORY_FOR_AI[ex.id],level:ex.id==="pushup"?"Nâng cao":ex.id==="jack"||ex.id==="squat"?"Vừa":"Dễ",
 seconds:45,kind:"ai",aiId:ex.id,goal:ex.goal,equipment:ex.id==="chair"?"Ghế":"Không cần"
}));
type GuidedTuple=[string,string,string,string,FitnessLevel?,number?];
const GROUPS:{category:FitnessCategory;items:GuidedTuple[]}[]=[
 {category:"warmup",items:[
 ["march-place","Đi bộ tại chỗ","Làm nóng toàn thân","Bước nhẹ liên tục, đánh tay tự nhiên; giữ nhịp thở đều."],
 ["shoulder-roll","Xoay vai tròn","Mềm vùng vai","Đứng thẳng, xoay hai vai chậm về trước rồi ra sau."],
 ["ankle-circle","Xoay cổ chân","Mềm cổ chân","Đứng cạnh điểm tựa, nhấc một chân thấp và xoay cổ chân theo hai chiều."],
 ["wrist-circle","Xoay cổ tay","Làm nóng bàn tay","Khép nhẹ ngón tay, xoay cổ tay theo hai chiều không gồng."],
 ["neck-tilt","Nghiêng cổ nhẹ","Thả lỏng cổ","Nghiêng tai về vai từng bên, không xoay giật hoặc ép cổ."],
 ["arm-swing","Đung đưa hai tay","Khởi động cánh tay","Đưa hai tay trước–sau ở biên độ dễ chịu, không vung quá mạnh."],
 ["side-step-warm","Bước sang hai bên","Làm nóng chân","Bước phải rồi trái, giữ đầu gối mềm, thả lỏng vai."],
 ["heel-toe-rock","Chuyển gót – mũi","Khởi động bàn chân","Tựa nhẹ vào ghế, nâng gót rồi chuyển sang nâng mũi chân."],
 ["hip-circle","Xoay hông nhỏ","Làm nóng hông","Chân rộng bằng vai, xoay hông vòng nhỏ và đều."],
 ["knee-bend-small","Nhún gối nhẹ","Làm nóng khớp gối","Hạ người vài centimet rồi đứng lên, không khóa cứng gối."],
 ["reach-up-warm","Vươn người lên cao","Kéo dài toàn thân","Đứng vững, đưa tay lên rồi hạ chậm cùng hơi thở."],
 ["cross-body-tap","Chạm tay đối bên","Phối hợp tay chân","Chạm tay phải về phía gối trái rồi đổi bên, di chuyển chậm."]
 ]},
 {category:"cardio",items:[
 ["step-touch","Bước chạm ngang","Cardio nhẹ","Bước sang bên, chân kia chạm vào; đánh tay theo nhịp dễ chịu."],
 ["low-impact-jack","Dang tay chân không nhảy","Thay Jumping Jack","Bước một chân sang ngang, đưa tay cao rồi khép, đổi chân."],
 ["walk-fast","Đi bộ nhanh tại chỗ","Tăng nhịp tim nhẹ","Bước nhanh vừa sức nhưng vẫn có thể nói chuyện."],
 ["heel-dig","Chạm gót ra trước","Nhịp điệu chân","Luân phiên chạm gót phía trước, gập gối trụ nhẹ."],
 ["box-step","Bước hình vuông","Phối hợp di chuyển","Bước tiến, bước ngang, lùi và khép về vị trí ban đầu."],
 ["grapevine-slow","Bước chéo ngang chậm","Phối hợp chân","Bước ngang, bước chéo chân phía sau rồi bước tiếp; đổi chiều."],
 ["side-knee-drive","Bước ngang nâng gối","Cardio vừa","Bước sang một bên rồi nâng gối đối diện, giữ thân thẳng.","Vừa"],
 ["march-arms","Đi bộ đánh tay cao","Cardio toàn thân","Đi tại chỗ và đưa hai tay lên xuống trong giới hạn vai."],
 ["back-step-tap","Lùi chạm mũi chân","Cardio không nhảy","Bước lùi ngắn, chạm mũi chân rồi quay lại, đổi bên."],
 ["toe-tap-forward","Chạm mũi chân trước","Nhẹ cho người mới","Luân phiên đưa mũi chân chạm phía trước mà không dồn trọng lực."],
 ["side-boxer-step","Bước võ sĩ nhẹ","Nhịp bước linh hoạt","Dịch trọng tâm từ chân trái sang phải, tay giữ thoải mái.","Vừa"],
 ["corner-step","Bước chéo góc","Thay đổi hướng","Bước chéo lên trước, về giữa rồi đổi hướng, không xoay gối đột ngột."]
 ]},
 {category:"legs",items:[
 ["calf-raise","Nhón gót hai chân","Bắp chân","Đứng cạnh ghế, nâng gót lên rồi hạ từ từ, giữ bàn chân song song."],
 ["wall-sit-light","Ngồi tựa tường nông","Sức bền đùi","Tựa lưng vào tường, khuỵu gối nhẹ và giữ tư thế ngắn.","Vừa"],
 ["side-leg-lift","Nâng chân sang ngang","Cơ hông ngoài","Tựa ghế, đưa chân sang ngang từ từ, không nghiêng thân."],
 ["back-leg-lift","Đưa chân ra sau","Mông và hông","Đứng thẳng, đưa một chân ra sau biên độ nhỏ, không võng lưng."],
 ["front-leg-lift","Nâng chân trước","Sức mạnh đùi","Đứng cạnh điểm tựa, nâng chân thẳng thấp về trước, đổi bên."],
 ["glute-bridge","Nâng hông nằm ngửa","Mông và thân dưới","Nằm trên thảm, gập gối, nâng hông tới khi vai–hông–gối thành đường gần thẳng.","Vừa"],
 ["mini-lunge","Chùng chân nông","Luyện hai chân","Bước một chân trước, hạ người nhẹ theo phương thẳng rồi đứng lên.","Vừa"],
 ["side-lunge-small","Chùng chân ngang nông","Đùi trong","Bước rộng vừa phải, dồn trọng tâm sang một bên, bên kia duỗi mềm.","Vừa"],
 ["heel-raise-single","Nhón gót từng chân","Thăng bằng bắp chân","Tay vịn ghế, nhón gót một chân rồi đổi chân.","Vừa"],
 ["clam-shell","Mở gối nằm nghiêng","Cơ hông","Nằm nghiêng, gập hai gối và mở gối trên mà không xoay hông."],
 ["hip-hinge","Gập hông nhẹ","Luyện gập hông","Đứng thẳng, đẩy hông ra sau, gập thân nhẹ với lưng trung tính rồi về."]
 ]},
 {category:"upper",items:[
 ["wall-push","Chống đẩy tường","Ngực và tay","Đứng cách tường một cánh tay, chống tay và gập khuỷu nhẹ rồi đẩy ra."],
 ["desk-push","Chống đẩy bàn vững","Chống đẩy nhẹ","Chống tay lên bàn thật chắc, giữ thân thẳng và hạ ngực có kiểm soát.","Vừa"],
 ["shoulder-tap-stand","Chạm vai luân phiên","Vai và phối hợp","Luân phiên chạm tay lên vai đối diện trong tư thế đứng."],
 ["overhead-reach","Vươn tay qua đầu","Vai và lưng trên","Đưa lần lượt từng tay lên cao, không ngửa lưng."],
 ["elbow-open","Mở khuỷu tay","Mở ngực","Đặt bàn tay sau gáy nhẹ, mở khuỷu hai bên rồi khép, không kéo cổ."],
 ["scapular-squeeze","Ép hai bả vai","Tư thế lưng trên","Đứng hoặc ngồi, kéo bả vai về sau và xuống nhẹ, sau đó thả."],
 ["wall-slide","Trượt tay trên tường","Linh hoạt vai","Đứng dựa tường, trượt cánh tay lên xuống trong tầm không đau."],
 ["biceps-isometric","Giữ gồng tay trước","Cơ tay trước","Gập khuỷu 90°, giữ lực nhẹ giữa hai bàn tay, thở đều."],
 ["triceps-extend","Duỗi khuỷu tay","Cơ tay sau","Gập khuỷu bên hông rồi từ từ duỗi cánh tay về phía sau."],
 ["arm-circles-small","Xoay tay vòng nhỏ","Sức bền vai","Dang tay thấp, xoay vòng nhỏ 10–15 giây rồi đổi chiều."]
 ]},
 {category:"core",items:[
 ["dead-bug-easy","Dead Bug cơ bản","Phối hợp bụng","Nằm ngửa, gối gập trên hông; hạ luân phiên một gót xuống thảm rồi nâng lại.","Vừa"],
 ["bird-dog-light","Bird Dog nhẹ","Cân bằng thân","Chống bốn điểm, duỗi một tay hoặc một chân, rồi đổi bên.","Vừa"],
 ["pelvic-tilt","Nghiêng chậu nằm","Kiểm soát bụng","Nằm ngửa gập gối, nhẹ nhàng áp lưng dưới vào thảm rồi thả."],
 ["seated-core-brace","Gồng bụng ngồi","Luyện ổn định","Ngồi thẳng, siết nhẹ bụng khi thở ra rồi thả khi hít vào."],
 ["side-bend-stand","Nghiêng thân sang bên","Sườn và bụng","Đứng vững, nghiêng thân nhẹ qua từng bên mà không xoắn cổ."],
 ["seated-knee-lift","Nâng gối khi ngồi","Bụng dưới nhẹ","Ngồi ghế ổn định, nâng từng chân thấp, không ngả lưng."],
 ["standing-core-twist","Xoay thân trên nhẹ","Linh hoạt thân","Đứng chân rộng bằng hông, xoay vai một góc nhỏ và thả lỏng gối."],
 ["bridge-hold","Giữ cầu hông","Ổn định thân","Nằm gập gối, nâng hông vừa sức rồi giữ và hạ chậm.","Vừa"],
 ["plank-wall","Plank trên tường","Core nhẹ","Chống cẳng tay vào tường, lùi chân vừa sức, giữ thân thành một đường."],
 ["plank-knees","Plank chống gối","Core vừa","Chống khuỷu và đầu gối trên thảm, giữ bụng hoạt động và thở đều.","Vừa"],
 ["side-plank-knee","Plank nghiêng chống gối","Core bên","Nằm nghiêng, chống khuỷu dưới vai và gối dưới, nâng hông thấp.","Nâng cao"],
 ["supine-knee-fall","Đổ gối qua bên","Bụng kiểm soát","Nằm ngửa gập gối, nghiêng hai gối nhẹ sang hai bên, vai giữ thảm."]
 ]},
 {category:"mobility",items:[
 ["cat-cow","Mèo – bò","Mềm cột sống","Chống bốn điểm, lần lượt cong và võng lưng nhẹ theo nhịp thở."],
 ["thoracic-open-book","Mở sách nằm nghiêng","Linh hoạt lưng trên","Nằm nghiêng gập gối, mở tay trên về phía sau theo tầm dễ chịu."],
 ["seated-spine-twist","Xoay người ngồi","Lưng trên","Ngồi thẳng trên ghế, xoay nhẹ vai sang hai bên, không giật."],
 ["standing-side-reach","Vươn tay sang bên","Mềm sườn","Giơ một tay, nghiêng người nhẹ về bên đối diện rồi đổi."],
 ["figure-four-seated","Hông hình số bốn","Mềm hông","Ngồi trên ghế chắc, đặt cổ chân lên đầu gối bên kia nếu thoải mái."],
 ["knee-hug-seated","Ôm gối khi ngồi","Mềm hông","Ngồi ổn định, ôm nhẹ một gối về phía thân rồi đổi bên."],
 ["heel-slide","Trượt gót nằm","Linh hoạt gối","Nằm ngửa, trượt gót về gần mông rồi duỗi chân ra."],
 ["shoulder-flexion","Nâng tay trước","Mềm khớp vai","Đứng thẳng, nâng một tay thẳng về trước rồi hạ có kiểm soát."],
 ["wrist-flex-extend","Gập – duỗi cổ tay","Cổ tay","Cẳng tay giữ cố định, gập rồi duỗi cổ tay chậm không ép."],
 ["ankle-pumps","Gập duỗi cổ chân","Máu lưu thông chân","Ngồi hoặc nằm, kéo mũi chân về mình rồi đẩy ra."],
 ["hip-opener-stand","Mở hông đứng","Hông và phối hợp","Vịn ghế, nhấc đầu gối thấp và mở ra ngoài một vòng nhỏ."],
 ["knee-extension-seated","Duỗi gối khi ngồi","Mềm đầu gối","Ngồi ghế chắc, duỗi từng cẳng chân ra trước và hạ chậm."]
 ]},
 {category:"balance",items:[
 ["tandem-stand","Đứng chân trước chân sau","Thăng bằng tĩnh","Đứng cạnh tường, đặt hai chân theo một đường, giữ trong vài giây."],
 ["single-leg-hold","Đứng một chân có vịn","Thăng bằng","Vịn ghế chắc, nhấc một chân thấp trong thời gian ngắn, đổi bên."],
 ["heel-toe-walk","Đi gót chạm mũi","Phối hợp bàn chân","Đi chậm cạnh tường, đặt gót gần mũi chân trước."],
 ["weight-shift-front","Chuyển trọng tâm trước sau","Kiểm soát trọng lực","Đứng rộng bằng hông, nhẹ nhàng chuyển trọng lượng về trước rồi về sau."],
 ["weight-shift-side","Chuyển trọng tâm ngang","Luyện hai chân","Dồn trọng lượng trái – phải mà chân vẫn chạm sàn."],
 ["star-toe-tap","Chạm mũi chân hình sao","Thăng bằng động","Vịn ghế, dùng một chân chạm mũi trước, ngang, sau rồi đổi."],
 ["slow-march-balance","Đi bộ thật chậm","Kiểm soát tư thế","Nâng từng gối thấp và bước thật chậm, tay có thể vịn nếu cần."],
 ["clock-reach","Chạm giờ đồng hồ","Phối hợp chân","Đứng cạnh điểm tựa, chạm một chân nhẹ về vị trí 12–3–6 giờ."],
 ["tandem-step","Bước nối gót","Thăng bằng bước","Bước thẳng nhỏ theo đường tưởng tượng, luôn gần tường."],
 ["tree-pose-wall","Tư thế cây có vịn","Yoga thăng bằng","Vịn tường, đặt bàn chân lên cổ chân chân trụ; không ép lên gối."]
 ]},
 {category:"stretch",items:[
 ["calf-stretch-wall","Giãn bắp chân ở tường","Giãn chân","Một chân sau, gót chạm sàn, dồn nhẹ thân về phía tường."],
 ["hamstring-seated","Giãn đùi sau khi ngồi","Giãn đùi sau","Ngồi ghế, duỗi một chân và gập nhẹ từ hông với lưng thẳng."],
 ["quad-standing","Giãn đùi trước có vịn","Giãn đùi trước","Đứng vịn chắc, co một gối về sau, không kéo quá tầm thoải mái."],
 ["chest-doorway","Giãn ngực ở cửa","Mở ngực","Đặt cẳng tay lên khung cửa, bước lên nhẹ để cảm thấy giãn ngực."],
 ["shoulder-cross","Giãn vai ngang ngực","Thả lỏng vai","Đưa một tay trước ngực, tay kia đỡ nhẹ phía trên khuỷu."],
 ["triceps-overhead","Giãn tay sau","Thả lỏng tay","Đưa một khuỷu lên, tay đối diện đỡ nhẹ mà không kéo mạnh."],
 ["hip-flexor-kneeling","Giãn hông quỳ mềm","Giãn hông","Quỳ trên thảm mềm, một chân trước, đẩy hông rất nhẹ về trước.","Vừa"],
 ["child-pose-easy","Tư thế em bé nhẹ","Giãn lưng","Quỳ trên thảm, hạ hông về gót nếu dễ chịu, vươn tay và thở."],
 ["butterfly-seated","Ngồi bướm nhẹ","Giãn hông trong","Ngồi, áp hai lòng bàn chân nếu thoải mái; giữ lưng thẳng, không ép gối."],
 ["side-neck-stretch","Giãn cổ bên","Thư giãn cổ","Nghiêng đầu nhẹ, giữ ngắn, không dùng tay kéo cổ."]
 ]},
 {category:"recovery",items:[
 ["box-breathing","Thở nhịp vuông nhẹ","Điều hòa hơi thở","Ngồi thoải mái, hít vào 3 giây, thở ra 3 giây; không nín thở."],
 ["belly-breathing","Thở bụng chậm","Hồi phục sau tập","Đặt tay lên bụng, hít và thở chậm tự nhiên trong tư thế ngồi."],
 ["relax-shoulders","Thả lỏng vai gáy","Hết giờ học","Thở ra và thả vai xuống, nhắm mắt nếu an toàn."],
 ["cooldown-walk","Đi bộ thả lỏng","Hạ nhịp sau vận động","Đi tại chỗ chậm dần, hít thở tự nhiên và uống nước khi cần."]
 ]}
];
const guidanceEquipment=(category:FitnessCategory):LibraryExercise["equipment"]=>
 category==="core"||category==="stretch"?"Thảm":category==="balance"?"Tường":"Không cần";
export const GUIDED_EXERCISES:LibraryExercise[]=GROUPS.flatMap(group=>group.items.map(([id,name,short,instruction,level="Dễ",seconds=45])=>({
 id,name,short,instruction,camera:"Bài hướng dẫn theo thời gian. AI chưa có thuật toán kiểm tra/đếm cho động tác này.",
 category:group.category,level,seconds,kind:"guided" as const,goal:0,equipment:guidanceEquipment(group.category)
})));
export const FITNESS_LIBRARY:LibraryExercise[]=[...AI_EXERCISES,...GUIDED_EXERCISES];
export const getFitnessExercise=(id:string)=>FITNESS_LIBRARY.find(ex=>ex.id===id);
export function searchFitnessLibrary(query:string,category:FitnessCategory="all",level:"all"|FitnessLevel="all"){
 const q=query.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("vi");
 return FITNESS_LIBRARY.filter(ex=>(category==="all"||category==="ai"&&ex.kind==="ai"||ex.category===category)
 &&(level==="all"||ex.level===level)
 &&(!q||[ex.name,ex.short,ex.instruction,ex.id].some(v=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("vi").includes(q))));
}
