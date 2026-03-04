/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useReducer, useEffect } from 'react';

import { nanoid } from '../utils/nanoid';
import { runMatchingForProperty, runMatchingForRequest } from '../utils/matching';
import { supabase } from '../lib/supabase';

const AppContext = createContext(null);

const EMPTY_STATE = {
    currentUser: null,
    clients: [],
    properties: [],
    requests: [],
    matches: [],
    showings: [],
    tasks: [],
    loading: true,
};

function reducer(state, action) {
    switch (action.type) {
        case 'SET_LOADING': return { ...state, loading: action.value };
        case 'SET_USER': return { ...state, currentUser: action.user };
        case 'UPDATE_PROFILE': return { ...state, currentUser: { ...state.currentUser, ...action.profile } };
        case 'LOGOUT': return { ...EMPTY_STATE, loading: false };

        case 'SET_ALL':
            return { ...state, ...action.data, loading: false };

        case 'DELETE_CLIENT':
            return { ...state, clients: state.clients.filter(c => c.id !== action.id) };

        case 'ADD_CLIENT':
            return { ...state, clients: [...state.clients, action.client] };
        case 'UPDATE_CLIENT':
            return { ...state, clients: state.clients.map(c => c.id === action.client.id ? action.client : c) };

        case 'ADD_PROPERTY':
            return { ...state, properties: [...state.properties, action.property], matches: [...state.matches, ...action.matches] };
        case 'UPDATE_PROPERTY':
            return {
                ...state,
                properties: state.properties.map(p => p.id === action.property.id ? action.property : p),
                matches: [...state.matches.filter(m => m.property_id !== action.property.id || m.status !== 'new'), ...action.matches]
            };
        case 'DELETE_PROPERTY':
            return { ...state, properties: state.properties.filter(p => p.id !== action.id) };

        case 'ADD_REQUEST':
            return { ...state, requests: [...state.requests, action.request], matches: [...state.matches, ...action.matches] };
        case 'UPDATE_REQUEST':
            return {
                ...state,
                requests: state.requests.map(r => r.id === action.request.id ? action.request : r),
                matches: [...state.matches.filter(m => m.request_id !== action.request.id || m.status !== 'new'), ...action.matches]
            };
        case 'DELETE_REQUEST':
            return { ...state, requests: state.requests.filter(r => r.id !== action.id) };

        case 'UPDATE_MATCH':
            return { ...state, matches: state.matches.map(m => m.id === action.match.id ? action.match : m) };
        case 'ADD_MATCHES':
            return { ...state, matches: [...state.matches, ...action.matches] };

        case 'CLOSE_DEAL': {
            const { matchId, propertyId, requestId, now } = action;
            const properties = state.properties.map(p => p.id === propertyId ? { ...p, status: 'sold', updated_at: now } : p);
            const requests = state.requests.map(r => r.id === requestId ? { ...r, status: 'found', updated_at: now } : r);
            const matches = state.matches.map(m =>
                m.id === matchId ? { ...m, status: 'deal', updated_at: now } :
                    (m.property_id === propertyId || m.request_id === requestId) ? { ...m, status: 'rejected', updated_at: now } : m
            );
            const prop = properties.find(p => p.id === propertyId);
            const req = requests.find(r => r.id === requestId);
            const clients = state.clients.map(c => {
                if (prop && c.id === prop.client_id) return { ...c, status: 'deal_closed' };
                if (req && c.id === req.client_id) return { ...c, status: 'deal_closed' };
                return c;
            });
            return { ...state, matches, properties, requests, clients };
        }

        case 'ADD_SHOWING':
            return { ...state, showings: [...state.showings, action.showing], matches: action.matches, tasks: [...state.tasks, action.task] };
        case 'UPDATE_SHOWING':
            return { ...state, showings: state.showings.map(s => s.id === action.showing.id ? action.showing : s), matches: action.matches };
        case 'DELETE_SHOWING':
            return { ...state, showings: state.showings.filter(s => s.id !== action.id) };

        case 'ADD_TASK':
            return { ...state, tasks: [...state.tasks, action.task] };
        case 'UPDATE_TASK':
            return { ...state, tasks: state.tasks.map(t => t.id === action.task.id ? action.task : t) };
        case 'DELETE_TASK':
            return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };

        default:
            return state;
    }
}

// ─── Supabase sync helpers ───────────────────────────────────────────────────

async function loadUserData(userId) {
    const [clients, properties, requests, matches, showings, tasks] = await Promise.all([
        supabase.from('clients').select('*').eq('realtor_id', userId),
        supabase.from('properties').select('*').eq('realtor_id', userId),
        supabase.from('requests').select('*').eq('realtor_id', userId),
        supabase.from('matches').select('*').eq('realtor_id', userId),
        supabase.from('showings').select('*').eq('realtor_id', userId),
        supabase.from('tasks').select('*').eq('realtor_id', userId),
    ]);
    return {
        clients: clients.data || [],
        properties: properties.data || [],
        requests: requests.data || [],
        matches: matches.data || [],
        showings: showings.data || [],
        tasks: tasks.data || [],
    };
}

async function syncAction(rawAction) {
    try {
        const sanitizeObj = (obj) => {
            if (obj === '') return null;
            if (!obj || typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) return obj.map(sanitizeObj);
            const sanitized = { ...obj };
            for (const key in sanitized) {
                if (sanitized[key] === '') sanitized[key] = null;
                else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                    sanitized[key] = sanitizeObj(sanitized[key]);
                }
            }
            return sanitized;
        };
        const action = sanitizeObj(rawAction);

        let result;
        const logData = (table, data) => {
            console.log(`[Supabase] Syncing to ${table}:`, data);
        };

        switch (action.type) {
            case 'UPDATE_PROFILE': {
                const { id, full_name, phone, agency_name, role, created_at } = action.profile;
                const profileData = { id, full_name, phone, agency_name, role, created_at };
                logData('profiles', profileData);
                result = await supabase.from('profiles').upsert(profileData);
                break;
            }
            case 'ADD_CLIENT':
            case 'UPDATE_CLIENT':
                logData('clients', action.client);
                result = await supabase.from('clients').upsert(action.client);
                break;
            case 'DELETE_CLIENT':
                result = await supabase.from('clients').delete().eq('id', action.id);
                break;
            case 'ADD_PROPERTY':
            case 'UPDATE_PROPERTY':
                logData('properties', action.property);
                result = await supabase.from('properties').upsert(action.property);
                if (!result.error && action.matches?.length > 0) {
                    const matchResult = await supabase.from('matches').upsert(action.matches);
                    if (matchResult.error) console.error('[Supabase Match Sync Error]', matchResult.error);
                }
                break;
            case 'DELETE_PROPERTY':
                result = await supabase.from('properties').delete().eq('id', action.id);
                break;
            case 'ADD_REQUEST':
            case 'UPDATE_REQUEST':
                logData('requests', action.request);
                result = await supabase.from('requests').upsert(action.request);
                if (!result.error && action.matches?.length > 0) {
                    const matchResult = await supabase.from('matches').upsert(action.matches);
                    if (matchResult.error) console.error('[Supabase Match Sync Error]', matchResult.error);
                }
                break;
            case 'DELETE_REQUEST':
                result = await supabase.from('requests').delete().eq('id', action.id);
                break;
            case 'UPDATE_MATCH':
                result = await supabase.from('matches').upsert(action.match);
                break;
            case 'CLOSE_DEAL': {
                const { matchId, propertyId, requestId, now } = action;
                const results = await Promise.all([
                    supabase.from('matches').update({ status: 'deal', updated_at: now }).eq('id', matchId),
                    supabase.from('matches').update({ status: 'rejected', updated_at: now }).eq('property_id', propertyId).neq('id', matchId),
                    supabase.from('matches').update({ status: 'rejected', updated_at: now }).eq('request_id', requestId).neq('id', matchId),
                    supabase.from('properties').update({ status: 'sold', updated_at: now }).eq('id', propertyId),
                    supabase.from('requests').update({ status: 'found', updated_at: now }).eq('id', requestId)
                ]);
                results.forEach((res, i) => {
                    if (res.error) console.error(`[Supabase Deal Sync Error ${i}]`, res.error);
                });
                return;
            }
            case 'ADD_SHOWING': {
                const results = await Promise.all([
                    supabase.from('showings').upsert(action.showing),
                    supabase.from('tasks').upsert(action.task),
                    supabase.from('matches').upsert(action.matches)
                ]);
                results.forEach((res, i) => {
                    if (res.error) console.error(`[Supabase Showing Sync Error ${i}]`, res.error);
                });
                return;
            }
            case 'UPDATE_SHOWING': {
                const results = await Promise.all([
                    supabase.from('showings').upsert(action.showing),
                    supabase.from('matches').upsert(action.matches)
                ]);
                results.forEach((res, i) => {
                    if (res.error) console.error(`[Supabase Showing Update Error ${i}]`, res.error);
                });
                return;
            }
            case 'DELETE_SHOWING':
                result = await supabase.from('showings').delete().eq('id', action.id);
                break;
            case 'ADD_TASK':
            case 'UPDATE_TASK':
                result = await supabase.from('tasks').upsert(action.task);
                break;
            case 'DELETE_TASK':
                result = await supabase.from('tasks').delete().eq('id', action.id);
                break;
        }
        if (result?.error) {
            console.error('[Supabase Sync Error]', action.type, result.error);
            if (result.error.code === '42501') {
                alert('Ошибка доступа (RLS). Пожалуйста, убедитесь, что вы создали профиль в базе данных.');
            } else {
                alert(`Ошибка сохранения: ${result.error.message}`);
            }
        }
    } catch (err) {
        console.error('[Supabase Critical Error]', action.type, err);
    }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
    const stateRef = React.useRef(state);

    // Keep ref in sync without triggering render (useEffect runs after render)
    useEffect(() => {
        stateRef.current = state;
    });

    // Supabase-aware dispatch: handles ID generation and metadata before reducer
    const dbDispatch = React.useCallback(async (action) => {
        let enhancedAction = { ...action };
        const now = new Date().toISOString();

        if (action.type === 'ADD_CLIENT') {
            enhancedAction.client = { ...action.client, id: action.client.id || nanoid(), created_at: now, updated_at: now };
        } else if (action.type === 'UPDATE_CLIENT') {
            enhancedAction.client = { ...action.client, updated_at: now };
        } else if (action.type === 'ADD_PROPERTY' || action.type === 'UPDATE_PROPERTY') {
            const prop = {
                ...action.property,
                id: action.property.id || nanoid(),
                created_at: action.property.created_at || now,
                updated_at: now
            };
            enhancedAction.property = prop;
            enhancedAction.matches = runMatchingForProperty(prop, stateRef.current.requests).map(m => ({
                id: nanoid(), ...m, realtor_id: prop.realtor_id,
                status: 'new', rejection_reason: '', realtor_comment: '',
                created_at: now, updated_at: now,
            }));
        } else if (action.type === 'ADD_REQUEST' || action.type === 'UPDATE_REQUEST') {
            const req = {
                ...action.request,
                id: action.request.id || nanoid(),
                created_at: action.request.created_at || now,
                updated_at: now
            };
            enhancedAction.request = req;
            enhancedAction.matches = runMatchingForRequest(req, stateRef.current.properties).map(m => ({
                id: nanoid(), ...m, realtor_id: req.realtor_id,
                status: 'new', rejection_reason: '', realtor_comment: '',
                created_at: now, updated_at: now,
            }));
        } else if (action.type === 'UPDATE_MATCH') {
            enhancedAction.match = { ...action.match, updated_at: now };
        } else if (action.type === 'CLOSE_DEAL') {
            const match = stateRef.current.matches.find(m => m.id === action.matchId);
            if (match) {
                enhancedAction.propertyId = match.property_id;
                enhancedAction.requestId = match.request_id;
                enhancedAction.now = now;
            }
        } else if (action.type === 'ADD_SHOWING') {
            const sh = { ...action.showing, id: action.showing.id || nanoid(), created_at: now };
            enhancedAction.showing = sh;
            enhancedAction.matches = stateRef.current.matches.map(m =>
                m.id === sh.match_id ? { ...m, status: 'showing_planned', updated_at: now } : m
            );
            enhancedAction.task = {
                id: nanoid(), realtor_id: sh.realtor_id, client_id: sh.client_id, property_id: sh.property_id,
                title: `Показ — ${new Date(sh.showing_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
                description: '', due_date: sh.showing_date, priority: 'high', status: 'pending',
                created_at: now,
            };
        } else if (action.type === 'UPDATE_SHOWING') {
            enhancedAction.showing = action.showing;
            let matches = stateRef.current.matches;
            if (action.showing.status === 'completed') {
                matches = stateRef.current.matches.map(m =>
                    m.id === action.showing.match_id ? { ...m, status: 'showing_done', updated_at: now } : m
                );
            }
            enhancedAction.matches = matches;
        } else if (action.type === 'ADD_TASK') {
            enhancedAction.task = { ...action.task, id: action.task.id || nanoid(), created_at: now };
        }

        dispatch(enhancedAction);
        await syncAction(enhancedAction);
    }, []);

    // On mount: check session and load data
    useEffect(() => {
        let isInitial = true;

        async function loadProfileAndData(sessionUser) {
            // Try to load the profile from DB
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionUser.id)
                .single();

            if (profileErr && profileErr.code !== 'PGRST116') {
                // PGRST116 = "no rows returned" (profile just doesn't exist yet)
                // Any other error (like RLS recursion 42P17) means something is wrong with the DB
                console.error('[Profile load error]', profileErr);

                // Fallback: use auth metadata to log the user in so the app is at least usable
                const fallbackProfile = {
                    id: sessionUser.id,
                    full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Пользователь',
                    email: sessionUser.email,
                    phone: sessionUser.user_metadata?.phone || '',
                    agency_name: '',
                    role: 'realtor',
                };
                console.warn('[Profile] Using auth metadata fallback due to DB error');
                dispatch({ type: 'SET_USER', user: fallbackProfile });
                // Load data as best we can; individual loads may also fail if DB is broken
                try {
                    const data = await loadUserData(sessionUser.id);
                    dispatch({ type: 'SET_ALL', data });
                } catch (e) {
                    console.error('[Data load error]', e);
                    dispatch({ type: 'SET_LOADING', value: false });
                }
                return;
            }

            // If profile missing (for example, first OAuth sign-in), create it automatically
            if (!profile) {
                const newProfile = {
                    id: sessionUser.id,
                    full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Пользователь',
                    phone: sessionUser.user_metadata?.phone || '',
                    agency_name: '',
                    role: 'realtor',
                };
                console.log('[Profile] Creating new profile for', sessionUser.id);
                const { data: createdProfile, error: createErr } = await supabase.from('profiles').insert(newProfile).select().single();
                if (!createErr) {
                    const data = await loadUserData(sessionUser.id);
                    dispatch({ type: 'SET_USER', user: { ...createdProfile, email: sessionUser.email } });
                    dispatch({ type: 'SET_ALL', data });
                } else {
                    console.error('[Profile creation error]', createErr);
                    // Still let the user in with fallback
                    const fallbackProfile = {
                        id: sessionUser.id,
                        full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || 'Пользователь',
                        email: sessionUser.email,
                        phone: '',
                        agency_name: '',
                        role: 'realtor',
                    };
                    dispatch({ type: 'SET_USER', user: fallbackProfile });
                    dispatch({ type: 'SET_LOADING', value: false });
                }
                return;
            }

            if (profile) {
                dispatch({ type: 'SET_USER', user: { ...profile, email: sessionUser.email } });
                const data = await loadUserData(sessionUser.id);
                dispatch({ type: 'SET_ALL', data });
            } else {
                dispatch({ type: 'SET_LOADING', value: false });
            }
        }

        async function init() {
            dispatch({ type: 'SET_LOADING', value: true });
            const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
            if (sessionErr) console.error('[Session error]', sessionErr);

            if (session?.user) {
                await loadProfileAndData(session.user);
            } else {
                dispatch({ type: 'SET_LOADING', value: false });
            }
            isInitial = false;
        }
        init();

        // Listen to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                dispatch({ type: 'LOGOUT' });
            } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
                // If it's the initial load, init() already handled it
                if (!isInitial) {
                    await loadProfileAndData(session.user);
                }
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    return (
        <AppContext.Provider value={{ state, dispatch: dbDispatch }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    return useContext(AppContext);
}
