import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { studentCreateSchema, normalizeStudent, StudentCreateInput } from '@/types/student';
import { DomainError } from '@/types/errors';

export async function createStudent(raw: unknown) {
  const parsed = studentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DomainError('ERR_VALIDATION','Invalid student data', parsed.error.issues);
  }
  if (!db) throw new DomainError('ERR_DEPENDENCY','Firestore not initialized');
  const data = normalizeStudent(parsed.data as StudentCreateInput);
  const docData = { ...data, createdAt: serverTimestamp() };
  await addDoc(collection(db, 'students'), docData);
  return docData;
}

export function parseFormToStudent(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  return raw;
}