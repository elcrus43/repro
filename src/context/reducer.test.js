/**
 * Unit tests for the state reducer (src/context/reducer.js)
 *
 * Tests all action types to ensure state transitions are correct,
 * immutable, and handle edge cases.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { reducer, EMPTY_STATE } from '../context/reducer'

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeState(overrides = {}) {
  return { ...EMPTY_STATE, ...overrides }
}

// ─── Loading & Auth ─────────────────────────────────────────────────────────

describe('reducer — loading & auth', () => {
  it('SET_LOADING updates loading flag', () => {
    const state = makeState({ loading: false })
    const next = reducer(state, { type: 'SET_LOADING', value: true })
    expect(next.loading).toBe(true)
  })

  it('SET_USER sets currentUser', () => {
    const state = makeState()
    const user = { id: 'u1', full_name: 'Test User' }
    const next = reducer(state, { type: 'SET_USER', user })
    expect(next.currentUser).toEqual(user)
  })

  it('UPDATE_PROFILE merges into currentUser', () => {
    const state = makeState({
      currentUser: { id: 'u1', full_name: 'Old', phone: '' },
    })
    const next = reducer(state, {
      type: 'UPDATE_PROFILE',
      profile: { full_name: 'New' },
    })
    expect(next.currentUser.full_name).toBe('New')
    expect(next.currentUser.id).toBe('u1')
  })

  it('LOGOUT resets to EMPTY_STATE with loading: false', () => {
    const state = makeState({
      currentUser: { id: 'u1' },
      clients: [{ id: 'c1' }],
      loading: false,
    })
    const next = reducer(state, { type: 'LOGOUT' })
    expect(next.currentUser).toBeNull()
    expect(next.clients).toEqual([])
    expect(next.loading).toBe(false)
  })

  it('SET_ALL merges data and sets loading: false', () => {
    const state = makeState({ loading: true })
    const data = { clients: [{ id: 'c1' }], properties: [{ id: 'p1' }] }
    const next = reducer(state, { type: 'SET_ALL', data })
    expect(next.clients).toEqual([{ id: 'c1' }])
    expect(next.properties).toEqual([{ id: 'p1' }])
    expect(next.loading).toBe(false)
  })
})

// ─── Clients ────────────────────────────────────────────────────────────────

describe('reducer — clients', () => {
  it('ADD_CLIENT appends to clients array', () => {
    const state = makeState({ clients: [{ id: 'c1' }] })
    const next = reducer(state, { type: 'ADD_CLIENT', client: { id: 'c2' } })
    expect(next.clients).toHaveLength(2)
    expect(next.clients[1].id).toBe('c2')
  })

  it('UPDATE_CLIENT updates by id immutably', () => {
    const state = makeState({
      clients: [
        { id: 'c1', name: 'Alice' },
        { id: 'c2', name: 'Bob' },
      ],
    })
    const next = reducer(state, {
      type: 'UPDATE_CLIENT',
      client: { id: 'c2', name: 'Bob Updated' },
    })
    expect(next.clients[0].name).toBe('Alice') // unchanged
    expect(next.clients[1].name).toBe('Bob Updated')
  })

  it('DELETE_CLIENT removes by id', () => {
    const state = makeState({
      clients: [{ id: 'c1' }, { id: 'c2' }],
    })
    const next = reducer(state, { type: 'DELETE_CLIENT', id: 'c1' })
    expect(next.clients).toHaveLength(1)
    expect(next.clients[0].id).toBe('c2')
  })
})

// ─── Properties ─────────────────────────────────────────────────────────────

describe('reducer — properties', () => {
  it('ADD_PROPERTY appends property and matches', () => {
    const state = makeState({ properties: [], matches: [] })
    const next = reducer(state, {
      type: 'ADD_PROPERTY',
      property: { id: 'p1' },
      matches: [{ id: 'm1', property_id: 'p1' }],
    })
    expect(next.properties).toHaveLength(1)
    expect(next.matches).toHaveLength(1)
  })

  it('UPDATE_PROPERTY updates and clears new matches', () => {
    const state = makeState({
      properties: [{ id: 'p1', price: 5_000_000 }],
      matches: [
        { id: 'm1', property_id: 'p1', status: 'new' },
        { id: 'm2', property_id: 'p1', status: 'viewed' },
      ],
    })
    const next = reducer(state, {
      type: 'UPDATE_PROPERTY',
      property: { id: 'p1', price: 5_500_000 },
      matches: [{ id: 'm3', property_id: 'p1', status: 'new' }],
    })
    // 'new' match should be removed
    expect(next.matches.some(m => m.id === 'm1')).toBe(false)
    // 'viewed' match should remain
    expect(next.matches.some(m => m.id === 'm2')).toBe(true)
    // new match added
    expect(next.matches.some(m => m.id === 'm3')).toBe(true)
  })

  it('DELETE_PROPERTY removes by id', () => {
    const state = makeState({
      properties: [{ id: 'p1' }, { id: 'p2' }],
    })
    const next = reducer(state, { type: 'DELETE_PROPERTY', id: 'p1' })
    expect(next.properties).toHaveLength(1)
    expect(next.properties[0].id).toBe('p2')
  })
})

// ─── Requests ───────────────────────────────────────────────────────────────

describe('reducer — requests', () => {
  it('ADD_REQUEST appends request and matches', () => {
    const state = makeState({ requests: [], matches: [] })
    const next = reducer(state, {
      type: 'ADD_REQUEST',
      request: { id: 'r1' },
      matches: [{ id: 'm1', request_id: 'r1' }],
    })
    expect(next.requests).toHaveLength(1)
    expect(next.matches).toHaveLength(1)
  })

  it('UPDATE_REQUEST updates by id', () => {
    const state = makeState({
      requests: [{ id: 'r1', budget_max: 5_000_000 }],
    })
    const next = reducer(state, {
      type: 'UPDATE_REQUEST',
      request: { id: 'r1', budget_max: 6_000_000 },
      matches: [],
    })
    expect(next.requests[0].budget_max).toBe(6_000_000)
  })

  it('DELETE_REQUEST removes by id', () => {
    const state = makeState({
      requests: [{ id: 'r1' }, { id: 'r2' }],
    })
    const next = reducer(state, { type: 'DELETE_REQUEST', id: 'r1' })
    expect(next.requests).toHaveLength(1)
  })
})

// ─── Matches ────────────────────────────────────────────────────────────────

describe('reducer — matches', () => {
  it('UPDATE_MATCH updates by id', () => {
    const state = makeState({
      matches: [
        { id: 'm1', status: 'new' },
        { id: 'm2', status: 'new' },
      ],
    })
    const next = reducer(state, {
      type: 'UPDATE_MATCH',
      match: { id: 'm1', status: 'viewed' },
    })
    expect(next.matches[0].status).toBe('viewed')
    expect(next.matches[1].status).toBe('new')
  })

  it('ADD_MATCHES appends multiple matches', () => {
    const state = makeState({ matches: [{ id: 'm1' }] })
    const next = reducer(state, {
      type: 'ADD_MATCHES',
      matches: [{ id: 'm2' }, { id: 'm3' }],
    })
    expect(next.matches).toHaveLength(3)
  })
})

// ─── Close Deal ─────────────────────────────────────────────────────────────

describe('reducer — CLOSE_DEAL', () => {
  const baseState = makeState({
    properties: [
      { id: 'p1', client_id: 'c1', status: 'active' },
      { id: 'p2', client_id: 'c2', status: 'active' },
    ],
    requests: [
      { id: 'r1', client_id: 'c3', status: 'active' },
      { id: 'r2', client_id: 'c4', status: 'active' },
    ],
    matches: [
      { id: 'm1', property_id: 'p1', request_id: 'r1', status: 'new' },
      { id: 'm2', property_id: 'p1', request_id: 'r2', status: 'new' },
      { id: 'm3', property_id: 'p2', request_id: 'r1', status: 'new' },
    ],
    clients: [
      { id: 'c1', name: 'Client 1', status: 'active' },
      { id: 'c2', name: 'Client 2', status: 'active' },
      { id: 'c3', name: 'Client 3', status: 'active' },
      { id: 'c4', name: 'Client 4', status: 'active' },
    ],
  })

  it('sets matched deal to "deal" status', () => {
    const now = new Date().toISOString()
    const next = reducer(baseState, {
      type: 'CLOSE_DEAL',
      matchId: 'm1',
      propertyId: 'p1',
      requestId: 'r1',
      now,
    })
    const dealMatch = next.matches.find(m => m.id === 'm1')
    expect(dealMatch.status).toBe('deal')
  })

  it('sets related matches to "rejected"', () => {
    const now = new Date().toISOString()
    const next = reducer(baseState, {
      type: 'CLOSE_DEAL',
      matchId: 'm1',
      propertyId: 'p1',
      requestId: 'r1',
      now,
    })
    // Same property, different request
    expect(next.matches.find(m => m.id === 'm3').status).toBe('rejected')
    // Same request, different property
    expect(next.matches.find(m => m.id === 'm2').status).toBe('rejected')
  })

  it('sets property to "sold"', () => {
    const now = new Date().toISOString()
    const next = reducer(baseState, {
      type: 'CLOSE_DEAL',
      matchId: 'm1',
      propertyId: 'p1',
      requestId: 'r1',
      now,
    })
    expect(next.properties.find(p => p.id === 'p1').status).toBe('sold')
  })

  it('sets request to "found"', () => {
    const now = new Date().toISOString()
    const next = reducer(baseState, {
      type: 'CLOSE_DEAL',
      matchId: 'm1',
      propertyId: 'p1',
      requestId: 'r1',
      now,
    })
    expect(next.requests.find(r => r.id === 'r1').status).toBe('found')
  })

  it('sets related clients to "deal_closed"', () => {
    const now = new Date().toISOString()
    const next = reducer(baseState, {
      type: 'CLOSE_DEAL',
      matchId: 'm1',
      propertyId: 'p1',
      requestId: 'r1',
      now,
    })
    expect(next.clients.find(c => c.id === 'c1').status).toBe('deal_closed')
    expect(next.clients.find(c => c.id === 'c3').status).toBe('deal_closed')
    // Unrelated clients unchanged
    expect(next.clients.find(c => c.id === 'c2').status).toBe('active')
  })
})

// ─── Showings ───────────────────────────────────────────────────────────────

describe('reducer — showings', () => {
  it('ADD_SHOWING adds showing, task, and matches', () => {
    const state = makeState({ showings: [], tasks: [], matches: [] })
    const next = reducer(state, {
      type: 'ADD_SHOWING',
      showing: { id: 's1' },
      task: { id: 't1' },
      matches: [{ id: 'm1' }],
    })
    expect(next.showings).toHaveLength(1)
    expect(next.tasks).toHaveLength(1)
    expect(next.matches).toHaveLength(1)
  })

  it('UPDATE_SHOWING updates showing and matches', () => {
    const state = makeState({
      showings: [{ id: 's1', status: 'scheduled' }],
      matches: [{ id: 'm1' }],
    })
    const next = reducer(state, {
      type: 'UPDATE_SHOWING',
      showing: { id: 's1', status: 'completed' },
      matches: [{ id: 'm1', status: 'viewed' }],
    })
    expect(next.showings[0].status).toBe('completed')
    expect(next.matches[0].status).toBe('viewed')
  })

  it('DELETE_SHOWING removes by id', () => {
    const state = makeState({
      showings: [{ id: 's1' }, { id: 's2' }],
    })
    const next = reducer(state, { type: 'DELETE_SHOWING', id: 's1' })
    expect(next.showings).toHaveLength(1)
  })
})

// ─── Tasks ──────────────────────────────────────────────────────────────────

describe('reducer — tasks', () => {
  it('ADD_TASK appends task', () => {
    const state = makeState({ tasks: [{ id: 't1' }] })
    const next = reducer(state, { type: 'ADD_TASK', task: { id: 't2' } })
    expect(next.tasks).toHaveLength(2)
  })

  it('UPDATE_TASK updates by id', () => {
    const state = makeState({
      tasks: [{ id: 't1', completed: false }],
    })
    const next = reducer(state, {
      type: 'UPDATE_TASK',
      task: { id: 't1', completed: true },
    })
    expect(next.tasks[0].completed).toBe(true)
  })

  it('DELETE_TASK removes by id', () => {
    const state = makeState({
      tasks: [{ id: 't1' }, { id: 't2' }],
    })
    const next = reducer(state, { type: 'DELETE_TASK', id: 't1' })
    expect(next.tasks).toHaveLength(1)
  })
})

// ─── Pricelist ──────────────────────────────────────────────────────────────

describe('reducer — pricelist', () => {
  it('SET_PRICELIST replaces pricelist', () => {
    const state = makeState({ pricelist: [{ id: 'p1' }] })
    const next = reducer(state, { type: 'SET_PRICELIST', data: [{ id: 'p2' }] })
    expect(next.pricelist).toEqual([{ id: 'p2' }])
  })

  it('ADD_PRICE_ITEM appends item', () => {
    const state = makeState({ pricelist: [{ id: 'p1' }] })
    const next = reducer(state, { type: 'ADD_PRICE_ITEM', item: { id: 'p2' } })
    expect(next.pricelist).toHaveLength(2)
  })

  it('UPDATE_PRICE_ITEM updates by id', () => {
    const state = makeState({
      pricelist: [{ id: 'p1', price: 100 }],
    })
    const next = reducer(state, {
      type: 'UPDATE_PRICE_ITEM',
      item: { id: 'p1', price: 200 },
    })
    expect(next.pricelist[0].price).toBe(200)
  })

  it('DELETE_PRICE_ITEM removes by id', () => {
    const state = makeState({
      pricelist: [{ id: 'p1' }, { id: 'p2' }],
    })
    const next = reducer(state, { type: 'DELETE_PRICE_ITEM', id: 'p1' })
    expect(next.pricelist).toHaveLength(1)
  })
})

// ─── User Management (Admin) ────────────────────────────────────────────────

describe('reducer — user management', () => {
  it('APPROVE_USER updates profile and removes from pending', () => {
    const state = makeState({
      profiles: [{ id: 'u1', status: 'pending' }],
      pendingUsers: [{ id: 'u1', status: 'pending' }],
    })
    const next = reducer(state, { type: 'APPROVE_USER', userId: 'u1' })
    expect(next.profiles[0].status).toBe('approved')
    expect(next.pendingUsers).toHaveLength(0)
  })

  it('REJECT_USER updates profile and pending', () => {
    const state = makeState({
      profiles: [{ id: 'u1', status: 'pending' }],
      pendingUsers: [{ id: 'u1', status: 'pending' }],
    })
    const next = reducer(state, { type: 'REJECT_USER', userId: 'u1' })
    expect(next.profiles[0].status).toBe('rejected')
    expect(next.pendingUsers[0].status).toBe('rejected')
  })

  it('SET_PENDING_USERS replaces pending users', () => {
    const state = makeState({ pendingUsers: [] })
    const next = reducer(state, {
      type: 'SET_PENDING_USERS',
      users: [{ id: 'u1' }],
    })
    expect(next.pendingUsers).toHaveLength(1)
  })
})

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe('reducer — edge cases', () => {
  it('unknown action returns same state', () => {
    const state = makeState()
    const next = reducer(state, { type: 'UNKNOWN_ACTION' })
    expect(next).toBe(state)
  })

  it('SET_CALENDAR_STATUS updates calendarStatus', () => {
    const state = makeState({ calendarStatus: null })
    const next = reducer(state, { type: 'SET_CALENDAR_STATUS', status: 'ok' })
    expect(next.calendarStatus).toBe('ok')
  })

  it('state immutability — original state unchanged', () => {
    const state = makeState({ clients: [{ id: 'c1' }] })
    reducer(state, { type: 'ADD_CLIENT', client: { id: 'c2' } })
    expect(state.clients).toHaveLength(1)
  })
})
