export type NotificationType='RISK_SCAN'|'RISK_FINDING'|'ATTACK_PATH'|'CONNECTOR'|'IMPORT'|'SYSTEM'
export type NotificationSeverity='INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'
export interface CreateNotification { type:NotificationType;severity:NotificationSeverity;title:string;message:string;link?:string;metadata?:Record<string,unknown> }
export interface NotificationQuery { unread?:boolean;type?:NotificationType;severity?:NotificationSeverity;search?:string;limit?:number;offset?:number;sort?:'newest'|'oldest'|'severity' }
