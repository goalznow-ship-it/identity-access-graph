import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { NotificationsService } from '../notifications.service'

function repository(){
  const rows:any[]=[]
  const repo:any={
    save:async(row:any)=>{const existing=rows.findIndex(x=>x.id===row.id);if(existing>=0)rows[existing]=row;else rows.push({...row,createdAt:row.createdAt??new Date()});return row},
    findOneBy:async({id}:any)=>rows.find(x=>x.id===id)??null,
    countBy:async({isRead}:any)=>rows.filter(x=>x.isRead===isRead).length,
    delete:async(id:string)=>{const index=rows.findIndex(x=>x.id===id);return{affected:index<0?0:rows.splice(index,1).length}},
    createQueryBuilder:()=>({andWhere(){return this},orderBy(){return this},addOrderBy(){return this},skip(){return this},take(){return this},getManyAndCount:async()=>[rows,rows.length],update(){return this},set(values:any){rows.forEach(row=>Object.assign(row,values));return this},where(){return this},execute:async()=>({affected:rows.length})}),
  }
  return{service:new NotificationsService(repo),rows}
}

describe('enterprise notifications',()=>{
  it('validates and persists notifications',async()=>{const{service}=repository();const item=await service.create({type:'RISK_SCAN',severity:'HIGH',title:'Scan complete',message:'Findings detected',link:'/risk'});assert.equal(item.isRead,false);assert.equal((await service.list()).total,1);await service.markRead(item.id);assert.equal((await service.list()).unread,0)})
  it('marks all read and deletes records',async()=>{const{service}=repository();const a=await service.create({type:'SYSTEM',severity:'INFO',title:'One',message:'First'});await service.create({type:'SYSTEM',severity:'INFO',title:'Two',message:'Second'});assert.equal((await service.markAllRead()).updated,2);assert.deepEqual(await service.remove(a.id),{deleted:true});await assert.rejects(()=>service.remove(a.id),NotFoundException)})
  it('rejects invalid links and missing content',async()=>{const{service}=repository();await assert.rejects(()=>service.create({type:'SYSTEM',severity:'INFO',title:'',message:'x'}),BadRequestException);await assert.rejects(()=>service.create({type:'SYSTEM',severity:'INFO',title:'x',message:'x',link:'https://evil.test'}),BadRequestException)})
})
