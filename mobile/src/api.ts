import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'idealab.mobile.session';
const BASE_URL_KEY = 'idealab.mobile.baseUrl';
const BUILD_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');

export type Role = 'super_admin' | 'admin' | 'sales' | 'project_manager' | 'finance' | 'content';
export type AppUser = { id: number; name: string; email: string; role: Role };
export type Dashboard = { leads: number; clients: number; projects: number; revenue: number };
export type Lead = { id:number; name:string; company:string|null; email:string|null; phone:string|null; status:string; service:string|null; next_action:string|null; next_action_at:string|null; value?:number; currency?:string };
export type Client = { id:number; name:string; company:string|null; email:string|null; phone:string|null; status:string; country:string|null };
export type Project = { id:number; name:string; client_name?:string|null; status:string; progress:number; due_date?:string|null; budget?:number; currency?:string };
export type Task = { id:number; title:string; status:string; priority:string; due_at:string|null; project_name?:string|null; client_name?:string|null };
export type Invoice = { id:number; invoice_no:string; client_name?:string|null; status:string; amount:number; currency:string; due_date:string|null };
export type D1Result<T> = { results:T[] };

export class ApiError extends Error {
  constructor(public status:number, message:string){
    super(message);
    this.name = 'ApiError';
  }
}

function normalizeBaseUrl(value:string){
  const trimmed = value.trim().replace(/\/$/, '');
  if (!/^https:\/\//i.test(trimmed)) throw new ApiError(0, 'Enter a secure https:// IDEA LAB server URL.');
  return trimmed;
}

export async function getToken(){ return SecureStore.getItemAsync(TOKEN_KEY); }
export async function clearToken(){ return SecureStore.deleteItemAsync(TOKEN_KEY); }
export async function getBaseUrl(){
  const stored = await SecureStore.getItemAsync(BASE_URL_KEY);
  return stored || BUILD_BASE_URL;
}
export async function setBaseUrl(value:string){
  const normalized = normalizeBaseUrl(value);
  await SecureStore.setItemAsync(BASE_URL_KEY, normalized);
  return normalized;
}

async function request<T>(path:string, init:RequestInit = {}, auth = true):Promise<T>{
  const baseUrl = await getBaseUrl();
  if (!baseUrl) throw new ApiError(0, 'Enter your deployed IDEA LAB server URL first.');
  const headers = new Headers(init.headers);
  headers.set('accept','application/json');
  if (init.body && !headers.has('content-type')) headers.set('content-type','application/json');
  if (auth) {
    const token = await getToken();
    if (!token) throw new ApiError(401,'Sign in required');
    headers.set('authorization',`Bearer ${token}`);
  }
  const response = await fetch(`${baseUrl}${path}`,{...init,headers});
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

export async function login(email:string,password:string,baseUrl:string){
  await setBaseUrl(baseUrl);
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

export const api = {
  me:()=>request<{user:AppUser}>('/api/me'),
  dashboard:()=>request<Dashboard>('/api/dashboard'),
  leads:()=>request<D1Result<Lead>>('/api/leads'),
  clients:()=>request<D1Result<Client>>('/api/clients'),
  projects:()=>request<D1Result<Project>>('/api/projects'),
  tasks:()=>request<D1Result<Task>>('/api/tasks'),
  invoices:()=>request<D1Result<Invoice>>('/api/invoices'),
};
