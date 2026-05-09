import { Pool, QueryResultRow } from 'pg';
import { env } from './env';
export const pool = new Pool({ connectionString: env.databaseUrl });
export async function query<T extends QueryResultRow = any>(text:string, params:any[]=[]){ const res = await pool.query<T>(text, params); return res; }
export async function tx<T>(fn:(client:any)=>Promise<T>){ const client=await pool.connect(); try{ await client.query('BEGIN'); const result=await fn(client); await client.query('COMMIT'); return result;} catch(e){ await client.query('ROLLBACK'); throw e;} finally{client.release();}}
