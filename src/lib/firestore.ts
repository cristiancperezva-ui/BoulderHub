// ─── Helpers Firestore tipados ────────────────────────────────────────────────

import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, collectionGroup, query, where, orderBy, limit,
  getDocs, addDoc, serverTimestamp,
  type WhereFilterOp, type OrderByDirection,
  onSnapshot, type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { FirestoreDoc } from '@/types';

/** Convierte un snapshot de Firestore a un documento tipado con id */
function snapshotToDoc<T>(snap: { id: string; data: () => Record<string, unknown> }): FirestoreDoc<T> {
  return { id: snap.id, ...snap.data() } as FirestoreDoc<T>;
}

/** Obtener un documento por ID */
export async function getDocById<T>(collectionName: string, id: string): Promise<FirestoreDoc<T> | null> {
  const snap = await getDoc(doc(db, collectionName, id));
  if (!snap.exists()) return null;
  return snapshotToDoc<T>(snap);
}

/** Crear un documento con ID autogenerado */
export async function createDoc<T>(collectionName: string, data: Partial<T>): Promise<string> {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** Crear un documento con ID específico */
export async function setDocById<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
  await setDoc(doc(db, collectionName, id), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Actualizar un documento */
export async function updateDocById<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
  await updateDoc(doc(db, collectionName, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Eliminar (o soft-delete) un documento */
export async function deleteDocById(collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

/** Query genérica */
export async function queryDocs<T>(
  collectionName: string,
  constraints: { field: string; op: WhereFilterOp; value: unknown }[],
  order?: { field: string; dir?: OrderByDirection },
  limitCount?: number,
): Promise<FirestoreDoc<T>[]> {
  const q = collection(db, collectionName);
  const queryConditions: unknown[] = constraints.map(c => where(c.field, c.op, c.value));
  if (order) queryConditions.push(orderBy(order.field, order.dir ?? 'desc'));
  if (limitCount) queryConditions.push(limit(limitCount));

  const queryRef = query(q, ...queryConditions as never[]);
  const snap = await getDocs(queryRef);
  return snap.docs.map(d => snapshotToDoc<T>(d));
}

/** Obtener todos los documentos de una colección (con filtro opcional) */
export async function getAllDocs<T>(
  collectionName: string,
  orderField?: string,
  orderDir?: OrderByDirection,
): Promise<FirestoreDoc<T>[]> {
  const ref = collection(db, collectionName);
  const q = orderField ? query(ref, orderBy(orderField, orderDir ?? 'desc')) : query(ref);
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotToDoc<T>(d));
}

/** Suscripción en tiempo real a un documento */
export function onDocSnapshot<T>(
  collectionName: string,
  id: string,
  callback: (doc: FirestoreDoc<T> | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, collectionName, id), (snap) => {
    if (!snap.exists()) { callback(null); return; }
    callback(snapshotToDoc<T>(snap));
  });
}

/** Suscripción en tiempo real a una colección */
export function onCollectionSnapshot<T>(
  collectionName: string,
  callback: (docs: FirestoreDoc<T>[]) => void,
  orderField?: string,
  orderDir?: OrderByDirection,
): Unsubscribe {
  const ref = collection(db, collectionName);
  const q = orderField ? query(ref, orderBy(orderField, orderDir ?? 'desc')) : query(ref);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => snapshotToDoc<T>(d)));
  });
}

/** Crear/actualizar documento en subcolección */
export async function setSubDoc<T>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  subId: string,
  data: Partial<T>,
): Promise<void> {
  await setDoc(doc(db, parentCollection, parentId, subCollection, subId), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/** Obtener todos los documentos de una subcolección */
export async function getSubDocs<T>(
  parentCollection: string,
  parentId: string,
  subCollection: string,
  orderField?: string,
  orderDir?: OrderByDirection,
): Promise<FirestoreDoc<T>[]> {
  const ref = collection(db, parentCollection, parentId, subCollection);
  const q = orderField ? query(ref, orderBy(orderField, orderDir ?? 'desc')) : query(ref);
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotToDoc<T>(d));
}

/**
 * Query en collection group (ej: buscar en todas las subcolecciones 'attempts').
 * Útil para encontrar documentos del usuario sin saber su padre.
 */
export async function queryCollectionGroup<T>(
  collectionName: string,
  field: string,
  op: WhereFilterOp,
  value: unknown,
): Promise<FirestoreDoc<T>[]> {
  const q = query(collectionGroup(db, collectionName), where(field, op, value));
  const snap = await getDocs(q);
  return snap.docs.map(d => snapshotToDoc<T>(d));
}
