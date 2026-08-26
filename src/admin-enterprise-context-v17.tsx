import{createContext,useContext}from'react';
import type{AppUser}from'./admin-api';

export type ModuleKey='leads'|'clients'|'projects'|'tasks'|'invoices'|'content'|'reports'|'settings'|'chat';
export type AccessMap=Record<ModuleKey,boolean>&{all_clients:boolean};
export type PortalToast={id:number;text:string;tone:'success'|'error'|'info'};
export type PortalContextValue={user:AppUser;access:AccessMap;isSuper:boolean;notify:(text:string,tone?:PortalToast['tone'])=>void;refreshSession:()=>Promise<void>};
export const PortalContext=createContext<PortalContextValue|null>(null);
export function useEnterprisePortal(){const value=useContext(PortalContext);if(!value)throw new Error('Enterprise portal context missing');return value}
