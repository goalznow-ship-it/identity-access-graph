import { randomUUID } from 'node:crypto'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { NotificationEntity } from '../database/entities'
import type { CreateNotification, NotificationQuery, NotificationSeverity, NotificationType } from './notification.types'

const types=new Set<NotificationType>(['RISK_SCAN','RISK_FINDING','ATTACK_PATH','CONNECTOR','IMPORT','SYSTEM'])
const severities=new Set<NotificationSeverity>(['INFO','LOW','MEDIUM','HIGH','CRITICAL'])
@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(NotificationEntity)private notifications:Repository<NotificationEntity>){}
  async create(input:CreateNotification){if(!types.has(input.type))throw new BadRequestException('Invalid notification type');if(!severities.has(input.severity))throw new BadRequestException('Invalid notification severity');if(!input.title?.trim()||input.title.length>255)throw new BadRequestException('Notification title must contain 1 to 255 characters');if(!input.message?.trim())throw new BadRequestException('Notification message is required');if(input.link&&!input.link.startsWith('/'))throw new BadRequestException('Notification link must be an application-relative path');return this.notifications.save({id:randomUUID(),type:input.type,severity:input.severity,isRead:false,title:input.title.trim(),message:input.message.trim(),link:input.link??null,metadata:input.metadata??{},readAt:null})}
  async list(query:NotificationQuery={}){const limit=Math.min(100,Math.max(1,Math.trunc(query.limit??20))),offset=Math.max(0,Math.trunc(query.offset??0));const qb=this.notifications.createQueryBuilder('notification');if(query.unread!==undefined)qb.andWhere('notification.is_read = :unread',{unread:!query.unread});if(query.type){if(!types.has(query.type))throw new BadRequestException('Invalid notification type');qb.andWhere('notification.type = :type',{type:query.type})}if(query.severity){if(!severities.has(query.severity))throw new BadRequestException('Invalid notification severity');qb.andWhere('notification.severity = :severity',{severity:query.severity})}if(query.search?.trim()){qb.andWhere(new Brackets(where=>where.where('notification.title ILIKE :search').orWhere('notification.message ILIKE :search')),{search:`%${query.search.trim().replace(/[%_]/g,'\\$&')}%`})}if(query.sort==='severity')qb.orderBy(`CASE notification.severity WHEN 'CRITICAL' THEN 5 WHEN 'HIGH' THEN 4 WHEN 'MEDIUM' THEN 3 WHEN 'LOW' THEN 2 ELSE 1 END`,'DESC').addOrderBy('notification.created_at','DESC');else qb.orderBy('notification.created_at',query.sort==='oldest'?'ASC':'DESC');const[items,total]=await qb.skip(offset).take(limit).getManyAndCount();const unread=await this.notifications.countBy({isRead:false});return{items,total,unread,limit,offset,hasMore:offset+items.length<total}}
  async markRead(id:string,read=true){const item=await this.notifications.findOneBy({id});if(!item)throw new NotFoundException('Notification not found');item.isRead=read;item.readAt=read?new Date():null;return this.notifications.save(item)}
  async markAllRead(){const result=await this.notifications.createQueryBuilder().update().set({isRead:true,readAt:new Date()}).where('is_read = false').execute();return{updated:result.affected??0}}
  async remove(id:string){const result=await this.notifications.delete(id);if(!result.affected)throw new NotFoundException('Notification not found');return{deleted:true}}
}
