import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createHealthPayload,
  createReadinessPayload,
} from '../server/utils/health.js'
import {
  classifyRequestError,
  sanitizeRequestId,
  withRequestIdHeader,
} from '../server/utils/requestContext.js'

test('health payloads expose stable status fields without backend details', () => {
  assert.deepEqual(createHealthPayload('request-1'), {
    status: 'ok',
    service: 'theme-rei',
    request_id: 'request-1',
  })
  assert.deepEqual(createReadinessPayload('request-2', false), {
    status: 'not_ready',
    service: 'theme-rei',
    backend: 'unavailable',
    request_id: 'request-2',
  })
})

test('request ids accept safe tracing values and reject header injection', () => {
  assert.equal(sanitizeRequestId(' trace-123:abc '), 'trace-123:abc')
  assert.equal(sanitizeRequestId('bad value'), '')
  assert.equal(sanitizeRequestId('a\r\nset-cookie: leaked'), '')
  assert.equal(sanitizeRequestId('x'.repeat(129)), '')
})

test('request errors are grouped by status class', () => {
  assert.equal(classifyRequestError(200), 'none')
  assert.equal(classifyRequestError(429), 'client_error')
  assert.equal(classifyRequestError(503), 'server_error')
})

test('request ids are forwarded without replacing existing headers', () => {
  const headers = withRequestIdHeader({ authorization: 'redacted' }, 'trace-123')
  assert.equal(headers.get('authorization'), 'redacted')
  assert.equal(headers.get('x-request-id'), 'trace-123')
})
