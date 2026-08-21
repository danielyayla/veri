import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { dispatch, encode, parseRequest } from './protocol.ts';
import type { Method } from './protocol.ts';

test('parseRequest accepts a well-formed line and defaults params', () => {
  assert.deepEqual(parseRequest('{"id":1,"method":"snapshot"}'), { id: 1, method: 'snapshot', params: [] });
  assert.deepEqual(parseRequest('{"id":2,"method":"read-doc","params":["a.md"]}'), {
    id: 2,
    method: 'read-doc',
    params: ['a.md'],
  });
});

test('parseRequest rejects malformed lines', () => {
  assert.equal(parseRequest('not json'), null);
  assert.equal(parseRequest('"a string"'), null);
  assert.equal(parseRequest('null'), null);
  assert.equal(parseRequest('{"method":"snapshot"}'), null); // no id to answer to
  assert.equal(parseRequest('{"id":"1","method":"snapshot"}'), null);
  assert.equal(parseRequest('{"id":1}'), null);
  assert.equal(parseRequest('{"id":1,"method":"x","params":{"a":1}}'), null);
});

test('dispatch routes to the named method and spreads params', async () => {
  const methods: Record<string, Method> = {
    add: (a: number, b: number) => a + b,
  };
  assert.deepEqual(await dispatch(methods, { id: 7, method: 'add', params: [2, 3] }), {
    id: 7,
    ok: true,
    result: 5,
  });
});

test('dispatch awaits async results and maps undefined to null', async () => {
  const methods: Record<string, Method> = {
    later: async () => 'done',
    fireAndForget: () => undefined,
  };
  assert.deepEqual(await dispatch(methods, { id: 1, method: 'later', params: [] }), {
    id: 1,
    ok: true,
    result: 'done',
  });
  assert.deepEqual(await dispatch(methods, { id: 2, method: 'fireAndForget', params: [] }), {
    id: 2,
    ok: true,
    result: null,
  });
});

test('dispatch preserves falsy results other than undefined', async () => {
  const methods: Record<string, Method> = { no: () => false, zero: () => 0 };
  assert.deepEqual(await dispatch(methods, { id: 1, method: 'no', params: [] }), { id: 1, ok: true, result: false });
  assert.deepEqual(await dispatch(methods, { id: 2, method: 'zero', params: [] }), { id: 2, ok: true, result: 0 });
});

test('an unknown method answers ok:false instead of hanging the caller', async () => {
  assert.deepEqual(await dispatch({}, { id: 9, method: 'nope', params: [] }), {
    id: 9,
    ok: false,
    error: 'unknown method: nope',
  });
});

test('a throwing handler maps to its own message — the words the renderer shows', async () => {
  const methods: Record<string, Method> = {
    guarded: () => {
      throw new Error('approved is set via veri approve');
    },
    rude: () => {
      // eslint-disable-next-line no-throw-literal
      throw 'not even an Error';
    },
    rejects: () => Promise.reject(new Error('async failure')),
  };
  assert.deepEqual(await dispatch(methods, { id: 1, method: 'guarded', params: [] }), {
    id: 1,
    ok: false,
    error: 'approved is set via veri approve',
  });
  assert.deepEqual(await dispatch(methods, { id: 2, method: 'rude', params: [] }), {
    id: 2,
    ok: false,
    error: 'not even an Error',
  });
  assert.deepEqual(await dispatch(methods, { id: 3, method: 'rejects', params: [] }), {
    id: 3,
    ok: false,
    error: 'async failure',
  });
});

test('encode emits one newline-terminated JSON line', () => {
  assert.equal(encode({ id: 1, ok: true, result: null }), '{"id":1,"ok":true,"result":null}\n');
  assert.equal(encode({ event: 'changed' }), '{"event":"changed"}\n');
  assert.equal(encode({ event: 'mcp-changed', data: { external: true } }), '{"event":"mcp-changed","data":{"external":true}}\n');
});
