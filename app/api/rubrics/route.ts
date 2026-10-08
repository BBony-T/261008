import { randomUUID } from 'crypto';
import { teacher, services, failure, HttpError } from '@/lib/server';
import { rubricSchema } from '@/lib/types';
export const runtime = 'nodejs';
export async function GET(request: Request) {
 try { const uid = await teacher(request); const snapshot = await services().db.collection(`teachers/${uid}/rubrics`).get(); return Response.json(snapshot.docs.map(d => ({ ...d.data(), id: d.id }))); } catch (e) { return failure(e); }
}
export async function POST(request: Request) {
 try { const uid = await teacher(request); const body = await request.json(); const parsed = rubricSchema.safeParse(body); if (!parsed.success) throw new HttpError(400, '평가 기준의 제목, 설명, 배점을 확인해 주세요.');
 const id = typeof body.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(body.id) ? body.id : randomUUID();
 await services().db.doc(`teachers/${uid}/rubrics/${id}`).set({ ...parsed.data, updatedAt: new Date().toISOString() }); return Response.json({ ...parsed.data, id }); } catch (e) { return failure(e); }
}
