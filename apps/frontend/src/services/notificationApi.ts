import type{NotificationPage}from'../types/notification'
const BASE=((import.meta as any).env?.VITE_API_URL||'').replace(/\/$/,'')
async function request<T>(path:string,init?:RequestInit){const response=await fetch(`${BASE}${path}`,{...init,headers:{'Content-Type':'application/json',...init?.headers}});if(!response.ok)throw new Error(`Notification request failed (${response.status})`);return response.json()as Promise<T>}
export const getNotifications=(offset=0,search='')=>request<NotificationPage>(`/notifications?limit=10&offset=${offset}${search?`&search=${encodeURIComponent(search)}`:''}`)
export const markNotificationRead=(id:string,read=true)=>request(`/notifications/${encodeURIComponent(id)}/read`,{method:'PATCH',body:JSON.stringify({read})})
export const markAllNotificationsRead=()=>request<{updated:number}>('/notifications/read-all',{method:'PATCH'})
export const deleteNotification=(id:string)=>request(`/notifications/${encodeURIComponent(id)}`,{method:'DELETE'})
