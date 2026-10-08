import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rubricSchema, resultSchema } from '../lib/types';
const criterion={id:'a',title:'개념',description:'개념 정확성',maxScore:10};
test('기준은 중복 ID와 잘못된 배점을 거부한다',()=>{
 assert.equal(rubricSchema.safeParse({name:'평가',criteria:[criterion,criterion]}).success,false);
 assert.equal(rubricSchema.safeParse({name:'평가',criteria:[{...criterion,maxScore:0}]}).success,false);
 assert.equal(rubricSchema.safeParse({name:'평가',criteria:[criterion]}).success,true);
});
test('결과는 빈 근거와 음수 점수를 거부한다',()=>{
 const result={summary:'요약',criteria:[{criterionId:'a',score:5,evidence:'1페이지에 근거 있음',suggestion:'설명을 보완하세요'}]};
 assert.equal(resultSchema.safeParse(result).success,true);
 assert.equal(resultSchema.safeParse({...result,criteria:[{...result.criteria[0],score:-1}]}).success,false);
 assert.equal(resultSchema.safeParse({...result,criteria:[{...result.criteria[0],evidence:''}]}).success,false);
});
