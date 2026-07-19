import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import type { CreateNotification, NotificationQuery, NotificationSeverity, NotificationType } from './notification.types'
@Controller('notifications')
export class NotificationsController {
  constructor(private notifications:NotificationsService){}
  @Get()list(@Query()query:Record<string,string>){return this.notifications.list({unread:query.unread===undefined?undefined:query.unread==='true',type:query.type as NotificationType,severity:query.severity as NotificationSeverity,search:query.search,limit:query.limit?Number(query.limit):undefined,offset:query.offset?Number(query.offset):undefined,sort:query.sort as NotificationQuery['sort']})}
  @Post()create(@Body()body:CreateNotification){return this.notifications.create(body)}
  @Patch('read-all')markAllRead(){return this.notifications.markAllRead()}
  @Patch(':id/read')markRead(@Param('id')id:string,@Body()body:{read?:boolean}={}){return this.notifications.markRead(id,body.read!==false)}
  @Delete(':id')remove(@Param('id')id:string){return this.notifications.remove(id)}
}
