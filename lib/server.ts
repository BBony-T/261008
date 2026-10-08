import 'server-only';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
export function services() {
 const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID, storageBucket: process.env.FIREBASE_STORAGE_BUCKET });
 return { auth: getAuth(app), db: getFirestore(app), bucket: getStorage(app).bucket() };
}
export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function teacher(request: Request) {
 const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if (!token) throw new HttpError(401, '로그인이 필요합니다.');
 let decoded;
 try { decoded = await services().auth.verifyIdToken(token, true); } catch (error) {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (['auth/id-token-expired', 'auth/id-token-revoked', 'auth/user-disabled', 'auth/user-not-found', 'auth/invalid-id-token', 'auth/argument-error'].includes(code)) {
   throw new HttpError(401, '로그인을 확인할 수 없습니다. 로그아웃 후 다시 로그인해 주세요.');
  }
  console.error('Firebase server authentication failed', { code, message: error instanceof Error ? error.message : 'Unknown error' });
  throw new HttpError(503, 'Firebase 서버 인증 설정을 확인해 주세요. 로컬 실행 시 관리자 인증(ADC)이 필요합니다. 자세한 원인은 서버 터미널에 표시됩니다.');
 }
 if (decoded.teacher !== true) throw new HttpError(403, '교사 계정 승인이 필요합니다. 관리자에게 문의해 주세요.');
 return decoded.uid;
}
export function failure(error: unknown) {
 if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
 console.error('API request failed', error instanceof Error ? error.name : 'Unknown');
 return Response.json({ error: '요청을 처리하지 못했습니다. 설정을 확인하고 다시 시도해 주세요.' }, { status: 500 });
}
