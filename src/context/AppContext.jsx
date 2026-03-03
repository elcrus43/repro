import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
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
        case 'LOGOUT': return { ...EMPTY_STATE, loading: false };

        case 'SET_ALL':
            return { ...state, ...action.data, loading: false };

        // Clients
        case 'ADD_CLIENT': {
            const c = { ...action.client, id: action.client.id || nanoid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            return { ...state, clients: [...state.clients, c] };
        }
        case 'UPDATE_CLIENT': {
            const clients = state.clients.map(c => c.id === action.client.id ? { ...action.client, updated_at: new Date().toISOString() } : c);
            return { ...state, clients };
        }
        case 'DELETE_CLIENT':
            return { ...state, clients: state.clients.filter(c => c.id !== action.id) };

        // Properties
        case 'ADD_PROPERTY': {
            const prop = { ...action.property, id: action.property.id || nanoid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            const newMatches = runMatchingForProperty(prop, state.requests).map(r => ({
                id: nanoid(), ...r, realtor_id: prop.realtor_id,
                status: 'new', rejection_reason: '', realtor_comment: '',
                created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            }));
            return { ...state, properties: [...state.properties, prop], matches: [...state.matches, ...newMatches] };
        }
        case 'UPDATE_PROPERTY': {
            const prop = { ...action.property, updated_at: new Date().toISOString() };
            const properties = state.properties.map(p => p.id === prop.id ? prop : p);
            const filteredMatches = state.matches.filter(m => m.property_id !== prop.id || m.status !== 'new');
            const newMatches = runMatchingForProperty(prop, state.requests).map(r => ({
                id: nanoid(), ...r, realtor_id: prop.realtor_id,
                status: 'new', rejection_reason: '', realtor_comment: '',
                created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            }));
            return { ...state, properties, matches: [...filteredMatches, ...newMatches] };
        }
        case 'DELETE_PROPERTY':
            return { ...state, properties: state.properties.filter(p => p.id !== action.id) };

        // Requests
        case 'ADD_REQUEST': {
            const req = { ...action.request, id: action.request.id || nanoid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
            const newMatches = runMatchingForRequest(req, state.properties).map(r => ({
                id: nanoid(), ...r, realtor_id: req.realtor_id,
                status: 'new', rejection_reason: '', realtor_comment: '',
                created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            }));
            return { ...state, requests: [...state.requests, req], matches: [...state.matches, ...newMatches] };
        }
        case 'UPDATE_REQUEST': {
            const req = { ...action.request, updated_at: new Date().toISOString() };
            const requests = state.requests.map(r => r.id === req.id ? req : r);
            const filteredMatches = state.matches.filter(m => m.request_id !== req.id || m.status !== 'new');
            const newMatches = runMatchingForRequest(req, state.properties).map(r => ({
                id: nanoid(), ...r, realtor_id: req.realtor_id,
                status: 'new', rejection_reason: '', realtor_comment: '',
                created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
            }));
            return { ...state, requests, matches: [...filteredMatches, ...newMatches] };
        }
        case 'DELETE_REQUEST':
            return { ...state, requests: state.requests.filter(r => r.id !== action.id) };

        // Matches
        case 'UPDATE_MATCH': {
            const matches = state.matches.map(m => m.id === action.match.id ? { ...action.match, updated_at: new Date().toISOString() } : m);
            return { ...state, matches };
        }
        case 'ADD_MATCHES': {
            return { ...state, matches: [...state.matches, ...action.matches] };
        }
        case 'CLOSE_DEAL': {
            const { matchId } = action;
            const match = state.matches.find(m => m.id === matchId);
            if (!match) return state;
            const matches = state.matches.map(m => {
                if (m.id === matchId) return { ...m, status: 'deal', updated_at: new Date().toISOString() };
                if ((m.property_id === match.property_id || m.request_id === match.request_id) && m.id !== matchId)
                    return { ...m, status: 'rejected', updated_at: new Date().toISOString() };
                return m;
            });
            const properties = state.properties.map(p => p.id === match.property_id ? { ...p, status: 'sold' } : p);
            const requests = state.requests.map(r => r.id === match.request_id ? { ...r, status: 'found' } : r);
            const prop = state.properties.find(p => p.id === match.property_id);
            const req = state.requests.find(r => r.id === match.request_id);
            const clients = state.clients.map(c => {
                if (prop && c.id === prop.client_id) return { ...c, status: 'deal_closed' };
                if (req && c.id === req.client_id) return { ...c, status: 'deal_closed' };
                return c;
            });
            return { ...state, matches, properties, requests, clients };
        }

        // Showings
        case 'ADD_SHOWING': {
            const sh = { ...action.showing, id: action.showing.id || nanoid(), created_at: new Date().toISOString() };
            const matches = state.matches.map(m => m.id === sh.match_id ? { ...m, status: 'showing_planned', updated_at: new Date().toISOString() } : m);
            const task = {
                id: nanoid(), realtor_id: sh.realtor_id, client_id: sh.client_id, property_id: sh.property_id,
                title: `Показ — ${new Date(sh.showing_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
                description: '', due_date: sh.showing_date, priority: 'high', status: 'pending',
                created_at: new Date().toISOString(),
            };
            return { ...state, showings: [...state.showings, sh], matches, tasks: [...state.tasks, task] };
        }
        case 'UPDATE_SHOWING': {
            const showings = state.showings.map(s => s.id === action.showing.id ? action.showing : s);
            let matches = state.matches;
            if (action.showing.status === 'completed') {
                matches = state.matches.map(m => m.id === action.showing.match_id ? { ...m, status: 'showing_done', updated_at: new Date().toISOString() } : m);
            }
            return { ...state, showings, matches };
        }

        // Tasks
        case 'ADD_TASK': {
            const t = { ...action.task, id: action.task.id || nanoid(), created_at: new Date().toISOString() };
            return { ...state, tasks: [...state.tasks, t] };
        }
        case 'UPDATE_TASK': {
            const tasks = state.tasks.map(t => t.id === action.task.id ? action.task : t);
            return { ...state, tasks };
        }
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

async function syncAction(action, state) {
    try {
        switch (action.type) {
            case 'ADD_CLIENT':
            case 'UPDATE_CLIENT': {
                const c = action.client;
                await supabase.from('clients').upsert({ ...c, id: c.id || nanoid() });
                break;
            }
            case 'DELETE_CLIENT':
                await supabase.from('clients').delete().eq('id', action.id);
                break;
            case 'ADD_PROPERTY':
            case 'UPDATE_PROPERTY': {
                const p = action.property;
                await supabase.from('properties').upsert({ ...p, id: p.id || nanoid() });
                // Also upsert new matches generated
                const freshState = state;
                const newMatches = freshState.matches.filter(m => m.property_id === (p.id || p.id) && m.status === 'new');
                if (newMatches.length > 0) {
                    await supabase.from('matches').upsert(newMatches);
                }
                break;
            }
            case 'DELETE_PROPERTY':
                await supabase.from('properties').delete().eq('id', action.id);
                break;
            case 'ADD_REQUEST':
            case 'UPDATE_REQUEST': {
                const r = action.request;
                await supabase.from('requests').upsert({ ...r, id: r.id || nanoid() });
                const freshState = state;
                const newMatches = freshState.matches.filter(m => m.request_id === r.id && m.status === 'new');
                if (newMatches.length > 0) {
                    await supabase.from('matches').upsert(newMatches);
                }
                break;
            }
            case 'DELETE_REQUEST':
                await supabase.from('requests').delete().eq('id', action.id);
                break;
            case 'UPDATE_MATCH':
                await supabase.from('matches').upsert(action.match);
                break;
            case 'CLOSE_DEAL': {
                // Sync all affected matches, properties, requests
                const match = state.matches.find(m => m.id === action.matchId);
                if (match) {
                    const affectedMatches = state.matches.filter(m =>
                        m.id === action.matchId || m.property_id === match.property_id || m.request_id === match.request_id
                    );
                    await supabase.from('matches').upsert(affectedMatches.map(m => ({
                        ...m,
                        status: m.id === action.matchId ? 'deal' : 'rejected'
                    })));
                    await supabase.from('properties').update({ status: 'sold' }).eq('id', match.property_id);
                    await supabase.from('requests').update({ status: 'found' }).eq('id', match.request_id);
                }
                break;
            }
            case 'ADD_SHOWING': {
                const sh = action.showing;
                await supabase.from('showings').upsert(sh);
                break;
            }
            case 'UPDATE_SHOWING':
                await supabase.from('showings').upsert(action.showing);
                break;
            case 'ADD_TASK':
                await supabase.from('tasks').upsert(action.task);
                break;
            case 'UPDATE_TASK':
                await supabase.from('tasks').upsert(action.task);
                break;
            case 'DELETE_TASK':
                await supabase.from('tasks').delete().eq('id', action.id);
                break;
        }
    } catch (err) {
        console.warn('[Supabase sync error]', action.type, err.message);
    }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, EMPTY_STATE);
    const stateRef = React.useRef(state);
    stateRef.current = state;

    // Supabase-aware dispatch: updates local state immediately, syncs in background
    const dbDispatch = React.useCallback(async (action) => {
        dispatch(action);
        await syncAction(action, stateRef.current);
    }, []);

    // On mount: check session and load data
    useEffect(() => {
        async function init() {
            dispatch({ type: 'SET_LOADING', value: true });
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
                if (profile) {
                    dispatch({ type: 'SET_USER', user: { ...profile, email: session.user.email } });
                    const data = await loadUserData(session.user.id);
                    dispatch({ type: 'SET_ALL', data });
                } else {
                    dispatch({ type: 'SET_LOADING', value: false });
                }
            } else {
                dispatch({ type: 'SET_LOADING', value: false });
            }
        }
        init();

        // Listen to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_OUT') {
                dispatch({ type: 'LOGOUT' });
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
