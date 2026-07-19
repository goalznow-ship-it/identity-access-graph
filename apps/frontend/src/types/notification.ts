export interface NotificationItem{id:string;type:string;severity:'INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';isRead:boolean;title:string;message:string;link:string|null;metadata:Record<string,unknown>;createdAt:string;readAt:string|null}
export interface NotificationPage{items:NotificationItem[];total:number;unread:number;limit:number;offset:number;hasMore:boolean}
