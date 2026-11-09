// Supabase Postgres 직접 연결 (서버 전용). SUPABASE_DB_URL 이 없으면 모임은 화면 데모 모드로 동작
// 연결 문자열은 Supabase → Connect → Transaction pooler (포트 6543). 서버리스(Vercel)에서도 이 주소를 씀
import 'server-only';
import { Pool, type QueryResultRow } from 'pg';

export const dbConfigured = () => !!process.env.SUPABASE_DB_URL;

// 개발 서버 새로고침(HMR)마다 풀이 새로 생기지 않게 전역에 하나만
const g = globalThis as unknown as { __babplanPool?: Pool };

function pool() {
  return (g.__babplanPool ??= new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }, // Supabase 풀러 인증서는 Node 기본 인증서 목록에 없음
    max: 4,
    idleTimeoutMillis: 10_000,
  }));
}

export type Query = <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<T[]>;

export const sql: Query = async (text, params = []) => (await pool().query(text, params)).rows;

// 여러 문장을 한 번에 (실패하면 전부 되돌림)
export async function tx<T>(fn: (q: Query) => Promise<T>): Promise<T> {
  const c = await pool().connect();
  try {
    await c.query('begin');
    const out = await fn(async (text, params = []) => (await c.query(text, params)).rows);
    await c.query('commit');
    return out;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
