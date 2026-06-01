/**
 * firebaseSync.js — Firebase аналог supabaseSync.js
 *
 * Загрузка данных и синхронизация всех операций с Firestore.
 * Интерфейс намеренно совпадает с supabaseSync.js для простого переключения.
 *
 * Коллекции Firestore (соответствуют таблицам Supabase):
 *   clients, properties, requests, matches, showings, deals, tasks, profiles, pricelist
 */

import {
  collection, doc, getDocs, getDoc, addDoc, setDoc,
  updateDoc, deleteDoc, query, where, writeBatch, serverTimestamp
} from 'firebase/firestore';
import {
  ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from 'firebase/storage';
import { db, storage } from './firebase';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

/** Получить все документы из коллекции с опциональным фильтром */
async function getAll(collectionName, filters = []) {
  try {
    let q = collection(db, collectionName);
    if (filters.length > 0) {
      q = query(q, ...filters);
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error(`[Firebase] getAll(${collectionName}) error:`, e);
    return [];
  }
}

/** Создать или обновить документ по ID */
async function upsert(collectionName, id, data) {
  const { id: _id, ...cleanData } = data;
  cleanData.updated_at = new Date().toISOString();
  const ref = doc(db, collectionName, id);
  await setDoc(ref, cleanData, { merge: true });
}

/** Добавить документ (auto-ID) */
async function insert(collectionName, data) {
  const { id: _id, ...cleanData } = data;
  cleanData.created_at = cleanData.created_at || new Date().toISOString();
  cleanData.updated_at = new Date().toISOString();
  // Если есть UUID-шный id — используем его как document ID
  if (data.id) {
    await setDoc(doc(db, collectionName, data.id), cleanData);
    return data.id;
  }
  const ref = await addDoc(collection(db, collectionName), cleanData);
  return ref.id;
}

/** Удалить документ */
async function remove(collectionName, id) {
  await deleteDoc(doc(db, collectionName, id));
}

/* ─── Loader ───────────────────────────────────────────────────────────────── */

/**
 * Загружает все данные пользователя из Firestore.
 * Интерфейс совпадает с loadUserData() из supabaseSync.js.
 */
export async function loadUserDataFirebase(userId, role) {
  const isAdmin = role === 'admin';

  try {
    const userFilter    = (field) => [where(field, '==', userId)];
    const realtorFilter = userFilter('realtor_id');

    const [
      clients, properties, requests, matches,
      showings, tasks, pricelist, deals, profiles
    ] = await Promise.all([
      isAdmin ? getAll('clients') : getAll('clients', [where('realtor_id', '==', userId)]),
      getAll('properties'),   // все объекты видны всем (для матчинга)
      getAll('requests'),     // все запросы видны всем (для матчинга)
      isAdmin ? getAll('matches') : getAll('matches', realtorFilter),
      isAdmin ? getAll('showings') : getAll('showings', realtorFilter),
      isAdmin ? getAll('tasks') : getAll('tasks', realtorFilter),
      getAll('pricelist'),
      isAdmin ? getAll('deals') : getAll('deals', realtorFilter),
      getAll('profiles'),
    ]);

    const pendingUsers = isAdmin
      ? profiles.filter(p => ['pending', 'rejected'].includes(p.status))
      : [];

    console.log('[Firebase] Loaded:', { clients: clients.length, properties: properties.length });

    return {
      clients, properties, requests, matches,
      showings, tasks, pricelist, deals, profiles,
      pendingUsers,
      error: null,
      allFailed: false,
    };
  } catch (err) {
    console.error('[Firebase loadUserData] Error:', err);
    return {
      clients: [], properties: [], requests: [], matches: [],
      showings: [], tasks: [], pricelist: [], deals: [], profiles: [],
      pendingUsers: [],
      error: err.message,
      allFailed: true,
    };
  }
}

/* ─── Sync ─────────────────────────────────────────────────────────────────── */

/**
 * syncActionFirebase — отправляет изменение в Firestore.
 * Интерфейс совпадает с syncAction() из supabaseSync.js.
 */
export async function syncActionFirebase(action, { onError } = {}) {
  const handleError = onError ?? ((msg) => console.error('[Firebase]', msg));

  try {
    switch (action.type) {

      /* ── Профиль ── */
      case 'UPDATE_PROFILE': {
        const { id, full_name, phone, agency_name, inn } = action.profile;
        await upsert('profiles', id, { full_name, phone, agency_name, inn });
        break;
      }

      /* ── Клиенты ── */
      case 'ADD_CLIENT':
        await insert('clients', action.client);
        break;

      case 'UPDATE_CLIENT': {
        const { id, ...data } = action.client;
        await upsert('clients', id, data);
        break;
      }

      case 'DELETE_CLIENT':
        await remove('clients', action.id);
        break;

      /* ── Объекты ── */
      case 'ADD_PROPERTY':
        await insert('properties', action.property);
        if (action.matches?.length > 0) {
          for (const m of action.matches) await insert('matches', m);
        }
        break;

      case 'UPDATE_PROPERTY': {
        const prop = action.property || { ...action.data, id: action.id };
        const { id, ...data } = prop;
        await upsert('properties', id, data);
        if (action.matches?.length > 0) {
          for (const m of action.matches) await upsert('matches', m.id, m);
        }
        break;
      }

      case 'DELETE_PROPERTY':
        await remove('properties', action.id);
        break;

      /* ── Запросы ── */
      case 'ADD_REQUEST':
      case 'UPDATE_REQUEST': {
        const { id, ...data } = action.request;
        await upsert('requests', id, data);
        if (action.matches?.length > 0) {
          for (const m of action.matches) await upsert('matches', m.id, m);
        }
        break;
      }

      case 'DELETE_REQUEST':
        await remove('requests', action.id);
        break;

      /* ── Матчи ── */
      case 'UPDATE_MATCH': {
        const { id, ...data } = action.match;
        await upsert('matches', id, data);
        break;
      }

      case 'DELETE_MATCH':
        await remove('matches', action.id);
        break;

      /* ── Показы ── */
      case 'ADD_SHOWING':
      case 'UPDATE_SHOWING': {
        const { id, ...data } = action.showing;
        await upsert('showings', id, data);
        if (action.task) {
          const { id: tid, ...tdata } = action.task;
          await upsert('tasks', tid, tdata);
        }
        break;
      }

      case 'DELETE_SHOWING':
        await remove('showings', action.id);
        break;

      /* ── Задачи ── */
      case 'ADD_TASK':
      case 'UPDATE_TASK': {
        const { id, ...data } = action.task;
        await upsert('tasks', id, data);
        break;
      }

      case 'DELETE_TASK':
        await remove('tasks', action.id);
        break;

      /* ── Сделки ── */
      case 'ADD_DEAL':
        await insert('deals', action.deal);
        break;

      case 'UPDATE_DEAL': {
        const { id, ...data } = action.deal;
        await upsert('deals', id, data);
        break;
      }

      case 'DELETE_DEAL':
        await remove('deals', action.id);
        break;

      case 'CLOSE_DEAL': {
        const { propertyId, requestId, matchId, now } = action;
        await Promise.all([
          upsert('properties', propertyId, { status: 'sold', updated_at: now }),
          upsert('requests',   requestId,  { status: 'found', updated_at: now }),
          upsert('matches',    matchId,    { status: 'deal', updated_at: now }),
        ]);
        break;
      }

      /* ── Прайс-лист ── */
      case 'ADD_PRICE_ITEM':
        await insert('pricelist', action.item);
        break;

      case 'UPDATE_PRICE_ITEM': {
        const { id, ...data } = action.item;
        await upsert('pricelist', id, data);
        break;
      }

      case 'DELETE_PRICE_ITEM':
        await remove('pricelist', action.id);
        break;

      /* ── Пользователи (admin) ── */
      case 'APPROVE_USER':
        await upsert('profiles', action.userId, { status: 'approved' });
        break;

      case 'REJECT_USER':
        await upsert('profiles', action.userId, { status: 'rejected' });
        break;

      default:
        return;
    }
  } catch (err) {
    console.error('[Firebase syncAction]', action.type, err);
    handleError(`Ошибка сохранения: ${err.message}`);
  }
}

/* ─── Storage: загрузка фото ───────────────────────────────────────────────── */

/**
 * Загружает файл в Firebase Storage и возвращает публичный URL.
 * Замена Cloudinary для новых загрузок после миграции.
 */
export async function uploadPhotoFirebase(file, path) {
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return getDownloadURL(ref);
}

/* ─── Migration helpers ─────────────────────────────────────────────────────── */

/**
 * importCollection — импортирует массив записей в Firestore коллекцию.
 * Используется при миграции данных из Supabase.
 */
export async function importCollection(collectionName, records) {
  const batch = writeBatch(db);
  let count = 0;

  for (const record of records) {
    const { id, ...data } = record;
    if (!id) continue;
    data.updated_at = data.updated_at || new Date().toISOString();
    const ref = doc(db, collectionName, String(id));
    batch.set(ref, data, { merge: true });
    count++;

    // Firestore batch limit = 500 операций
    if (count % 499 === 0) {
      await batch.commit();
    }
  }

  await batch.commit();
  console.log(`[Firebase] Imported ${count} records into '${collectionName}'`);
  return count;
}
