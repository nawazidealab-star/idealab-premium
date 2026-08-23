import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'idealab.mobile.session';
const CURRENCY_KEY = 'idealab.mobile.defaultCurrency';
export const DEFAULT_API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://idealab-premium.idealab-2a4.workers.dev').replace(/\/$/, '');

export const CURRENCIES = ['USD','PKR','AUD','GBP','EUR','AED','CAD','SAR','QAR','NZD','SGD','INR','CNY','JPY','CHF','KWD','BHD','OMR'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];
export type Role = 'super_admin' | 'admin' | 'sales' | 'project_manager' | 'finance' | 'content';
export type AppUser = { id:number; name:string; email:string; role:Role; active?:number };
export type Dashboard = { leads:number; clients:number; projects:number; revenue:number };
export type Lead = { id:number; name:string; company:string|null; email:string|null; phone:string|null; source?:string|null; service:string|null; status:string; value?:number; currency?:string; next_action:string|null; next_action_at?:string|null; owner_user_id?:number|null; notes?:string|null; created_at?:string; updated_at?:string };
export type Client = { id:number; name:string; company:string|null; email:string|null; phone:string|null; status:string; country:string|null; notes?:string|null; created_at?:string };
export type Project = { id:number; client_id:number; name:string; client_name?:string|null; type?:string|null; status:string; progress:number; start_date?:string|null; due_date?:string|null; budget?:number; currency?:string };
export type Task = { id:number; title:string; status:string; priority:string; project_id?:number|null; client_id?:number|null; assigned_user_id?:number|null; due_at:string|null; project_name?:string|null; client_name?:string|null; assignee_name?:string|null };
export type Invoice = { id:number; client_id:number; invoice_no:string; client_name?:string|null; status:string; amount:number; currency:string; due_date:string|null; paid_at?:string|null; notes?:string|null };
export type ContentItem = { id:number; client_id:number|null; client_name?:string|null; title:string; platform:string|null; format:string|null; status:string; publish_at:string|null; caption:string|null; asset_url:string|null };
export type ReportRow = { status:string; count:number; total?:number };
export type Reports = { leadStatus:ReportRow[]; clientStatus:ReportRow[]; projectStatus:ReportRow[]; taskStatus:ReportRow[]; invoiceStatus:ReportRow[]; contentStatus:ReportRow[]; overdueTasks:number; outstandingAmount:number; recentActivities:Array<{id:number;action:string;entity_type:string;detail:string|null;created_at:string;user_name?:string|null}> };
export type D1Result<T> = { results:T[]; success?:boolean; meta?:Record<string,unknown> };

export class ApiError extends Error {
  constructor(public status:number, message:string){
    super(message);
    this.name = 'ApiError';
  }
}

export async function getToken(){ return SecureStore.getItemAsync(TOKEN_KEY); }
export async function clearToken(){ return SecureStore.deleteItemAsync(TOKEN_KEY); }
export async function getBaseUrl(){ return DEFAULT_API_BASE_URL; }
export async function getDefaultCurrency():Promise<CurrencyCode>{
  const saved = await SecureStore.getItemAsync(CURRENCY_KEY);
  return CURRENCIES.includes(saved as CurrencyCode) ? saved as CurrencyCode : 'USD';
}
export async function setDefaultCurrency(code:string){
  const normalized = code.toUpperCase() as CurrencyCode;
  if (!CURRENCIES.includes(normalized)) throw new ApiError(0,'Unsupported currency');
  await SecureStore.setItemAsync(CURRENCY_KEY, normalized);
  return normalized;
}

async function request<T>(path:string, init:RequestInit = {}, auth = true):Promise<T>{
  const headers = new Headers(init.headers);
  headers.set('accept','application/json');
  if (init.body && !headers.has('content-type')) headers.set('content-type','application/json');
  if (auth) {
    const token = await getToken();
    if (!token) throw new ApiError(401,'Sign in required');
    headers.set('authorization',`Bearer ${token}`);
  }
  let response:Response;
  try {
    response = await fetch(`${DEFAULT_API_BASE_URL}${path}`,{...init,headers});
  } catch (error) {
    throw new ApiError(0, error instanceof Error ? error.message : 'Unable to reach IDEA LAB server');
  }
  const payload = await response.json().catch(()=>null);
  if(!response.ok){
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : `Request failed (${response.status})`;
    if(response.status===401) await clearToken();
    throw new ApiError(response.status,message);
  }
  return payload as T;
}

export async function login(email:string,password:string){
  const payload = await request<{user:AppUser;token:string;expires_in:number}>('/api/mobile/auth/login',{
    method:'POST',
    body:JSON.stringify({email,password}),
  },false);
  await SecureStore.setItemAsync(TOKEN_KEY,payload.token);
  return payload.user;
}

export async function logout(){
  try { await request('/api/mobile/auth/logout',{method:'POST',body:'{}'}); }
  finally { await clearToken(); }
}

const jsonWrite = <T>(path:string, method:'POST'|'PATCH', body:Record<string,unknown>) => request<T>(path,{method,body:JSON.stringify(body)});

export const api = {
  me:()=>request<{user:AppUser}>('/api/me'),
  dashboard:()=>request<Dashboard>('/api/dashboard'),
  leads:()=>request<D1Result<Lead>>('/api/leads'),
  clients:()=>request<D1Result<Client>>('/api/clients'),
  projects:()=>request<D1Result<Project>>('/api/projects'),
  tasks:()=>request<D1Result<Task>>('/api/tasks'),
  invoices:()=>request<D1Result<Invoice>>('/api/invoices'),
  content:()=>request<D1Result<ContentItem>>('/api/content_items'),
  reports:()=>request<Reports>('/api/reports'),
  users:()=>request<D1Result<AppUser>>('/api/users'),

  createLead:(body:Record<string,unknown>)=>jsonWrite<{ok:true;id:number}>('/api/leads','POST',body),
  updateLead:(id:number,body:Record<string,unknown>)=>jsonWrite<{ok:true}>(`/api/leads/${id}`,'PATCH',body),
  createClient:(body:Record<string,unknown>)=>jsonWrite<{ok:true;id:number}>('/api/clients','POST',body),
  updateClient:(id:number,body:Record<string,unknown>)=>jsonWrite<{ok:true}>(`/api/clients/${id}`,'PATCH',body),
  createProject:(body:Record<string,unknown>)=>jsonWrite<{ok:true;id:number}>('/api/projects','POST',body),
  updateProject:(id:number,body:Record<string,unknown>)=>jsonWrite<{ok:true}>(`/api/projects/${id}`,'PATCH',body),
  createTask:(body:Record<string,unknown>)=>jsonWrite<{ok:true;id:number}>('/api/tasks','POST',body),
  updateTask:(id:number,body:Record<string,unknown>)=>jsonWrite<{ok:true}>(`/api/tasks/${id}`,'PATCH',body),
  createInvoice:(body:Record<string,unknown>)=>jsonWrite<{ok:true;id:number}>('/api/invoices','POST',body),
  updateInvoice:(id:number,body:Record<string,unknown>)=>jsonWrite<{ok:true}>(`/api/invoices/${id}`,'PATCH',body),
  createContent:(body:Record<string,unknown>)=>jsonWrite<{ok:true;id:number}>('/api/content_items','POST',body),
  updateContent:(id:number,body:Record<string,unknown>)=>jsonWrite<{ok:true}>(`/api/content_items/${id}`,'PATCH',body),
  createUser:(body:Record<string,unknown>)=>jsonWrite<{ok:true;id:number}>('/api/users','POST',body),
  updateUser:(id:number,body:Record<string,unknown>)=>jsonWrite<{ok:true}>(`/api/users/${id}`,'PATCH',body),
};
