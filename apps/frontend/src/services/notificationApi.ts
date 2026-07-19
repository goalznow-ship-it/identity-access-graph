import type{NotificationPage}from'../types/notification'
const BASE=((import.meta as any).env?.VITE_API_URL||'').replace(/\/$/,'')
async function request<T>(path:string,init?:RequestInit){const response=await fetch(`${BASE}${path}`,{...init,headers:{'Content-Type':'application/json',...init?.headers}});if(!response.ok)throw new Error(`Notification request failed (${response.status})`);return response.json()as Promise<T>}
export type NotificationQuery={offset?:number;limit?:number;search?:string;unread?:boolean;severity?:'INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';sort?:'newest'|'oldest'|'severity'}
export const getNotifications=(input:NotificationQuery|number={},legacySearch='')=>{const query:NotificationQuery=typeof input==='number'?{offset:input,search:legacySearch}:input;const params=new URLSearchParams({limit:String(query.limit??10),offset:String(query.offset??0)});if(query.search?.trim())params.set('search',query.search.trim());if(query.unread!==undefined)params.set('unread',String(query.unread));if(query.severity)params.set('severity',query.severity);if(query.sort)params.set('sort',query.sort);return request<NotificationPage>(`/notifications?${params}`)}
export const markNotificationRead=(id:string,read=true)=>request(`/notifications/${encodeURIComponent(id)}/read`,{method:'PATCH',body:JSON.stringify({read})})
export const markAllNotificationsRead=()=>request<{updated:number}>('/notifications/read-all',{method:'PATCH'})
export const deleteNotification=(id:string)=>request(`/notifications/${encodeURIComponent(id)}`,{method:'DELETE'})
