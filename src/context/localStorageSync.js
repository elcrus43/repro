/**
 * localStorageSync.js — Local Storage Synchronization Layer
 *
 * Provides a 100% offline, local-only database layer using the browser's LocalStorage.
 * Bypasses network blocks, VPN restrictions, and service outages.
 */

export async function loadUserData(userId, role) {
    try {
        const getList = (key) => {
            const data = localStorage.getItem(`repro_${key}`);
            return data ? JSON.parse(data) : [];
        };
        
        let profiles = getList('profiles');
        if (!profiles.find(p => p.id === userId)) {
            profiles.push({
                id: userId,
                full_name: 'Локальный пользователь',
                email: 'local@example.com',
                role: 'admin',
                status: 'approved'
            });
            localStorage.setItem('repro_profiles', JSON.stringify(profiles));
        }

        return {
            properties: getList('properties'),
            clients: getList('clients'),
            selectionItems: getList('selectionItems'),
            showings: getList('showings'),
            requests: getList('requests'),
            matches: getList('matches'),
            tasks: getList('tasks'),
            pricelist: getList('pricelist'),
            profiles: profiles
        };
    } catch (e) {
        console.error('Failed to load local user data:', e);
        return {
            properties: [],
            clients: [],
            selectionItems: [],
            showings: [],
            requests: [],
            matches: [],
            tasks: [],
            pricelist: [],
            profiles: []
        };
    }
}

export async function syncAction(action, { onError } = {}) {
    try {
        const getList = (key) => {
            const data = localStorage.getItem(`repro_${key}`);
            return data ? JSON.parse(data) : [];
        };
        const setList = (key, list) => {
            localStorage.setItem(`repro_${key}`, JSON.stringify(list));
        };

        const updateItem = (key, item, idKey = 'id') => {
            if (!item || !item[idKey]) return;
            const list = getList(key);
            const idx = list.findIndex(x => x[idKey] === item[idKey]);
            if (idx >= 0) {
                list[idx] = { ...list[idx], ...item };
            } else {
                list.push(item);
            }
            setList(key, list);
        };

        const deleteItem = (key, id, idKey = 'id') => {
            if (!id) return;
            const list = getList(key);
            const filtered = list.filter(x => x[idKey] !== id);
            setList(key, filtered);
        };

        switch (action.type) {
            case 'ADD_PROPERTY':
            case 'UPDATE_PROPERTY':
                updateItem('properties', action.property);
                break;
            case 'PATCH_PROPERTY':
                updateItem('properties', action.patch);
                break;
            case 'DELETE_PROPERTY':
                deleteItem('properties', action.id);
                break;

            case 'ADD_CLIENT':
            case 'UPDATE_CLIENT':
                updateItem('clients', action.client);
                break;
            case 'DELETE_CLIENT':
                deleteItem('clients', action.id);
                break;

            case 'ADD_SELECTION_ITEM':
            case 'UPDATE_SELECTION_ITEM':
                updateItem('selectionItems', action.item);
                break;
            case 'DELETE_SELECTION_ITEM':
                deleteItem('selectionItems', action.id);
                break;

            case 'ADD_SHOWING':
            case 'UPDATE_SHOWING':
                updateItem('showings', action.showing);
                if (action.task) {
                    updateItem('tasks', action.task);
                }
                break;
            case 'DELETE_SHOWING':
                deleteItem('showings', action.id);
                break;

            case 'ADD_REQUEST':
            case 'UPDATE_REQUEST':
                updateItem('requests', action.request);
                break;
            case 'DELETE_REQUEST':
                deleteItem('requests', action.id);
                break;

            case 'ADD_TASK':
            case 'UPDATE_TASK':
                updateItem('tasks', action.task);
                break;
            case 'DELETE_TASK':
                deleteItem('tasks', action.id);
                break;

            case 'ADD_PRICELIST_ITEM':
            case 'UPDATE_PRICELIST_ITEM':
                updateItem('pricelist', action.item);
                break;
            case 'DELETE_PRICELIST_ITEM':
                deleteItem('pricelist', action.id);
                break;

            case 'ADD_MATCH':
            case 'UPDATE_MATCH':
                updateItem('matches', action.match);
                break;
            case 'DELETE_MATCH':
                deleteItem('matches', action.id);
                break;

            case 'APPROVE_USER':
                updateItem('profiles', { id: action.userId, status: 'approved' });
                break;
            case 'REJECT_USER':
                updateItem('profiles', { id: action.userId, status: 'rejected' });
                break;

            default:
                break;
        }
    } catch (e) {
        console.error('Failed to sync action to local storage:', e);
        if (onError) onError(e);
    }
}
