import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import type { CreateNotification, NotificationQuery, NotificationSeverity, NotificationType } from './notification.types'
import { optionalBoolean, optionalEnum, optionalInteger } from '../common/http-validation'
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications:NotificationsService){}
  @Get()list(@Query()query:Record<string,string>){return this.notifications.list({unread:optionalBoolean(query.unread,'unread'),type:optionalEnum(query.type,'type',['RISK_SCAN','RISK_FINDING','ATTACK_PATH','CONNECTOR','IMPORT','SYSTEM']) as NotificationType,severity:optionalEnum(query.severity,'severity',['INFO','LOW','MEDIUM','HIGH','CRITICAL']) as NotificationSeverity,search:query.search,limit:optionalInteger(query.limit,'limit',{min:1,max:200}),offset:optionalInteger(query.offset,'offset'),sort:optionalEnum(query.sort,'sort',['newest','oldest','severity']) as NotificationQuery['sort']})}
  @Post()create(@Body()body:CreateNotification){return this.notifications.create(body)}
  @Patch('read-all')markAllRead(){return this.notifications.markAllRead()}
  @Patch(':id/read')markRead(@Param('id')id:string,@Body()body:{read?:boolean}={}){return this.notifications.markRead(id,body.read!==false)}
  @Delete(':id')remove(@Param('id')id:string){return this.notifications.remove(id)}
}
