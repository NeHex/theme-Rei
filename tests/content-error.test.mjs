import test from 'node:test'
import assert from 'node:assert/strict'

import {
  resolveContentErrorMessage,
  resolveContentErrorStatus,
} from '../app/utils/contentError.js'

test('content errors preserve client errors and map upstream failures to 502', () => {
  assert.equal(resolveContentErrorStatus({ statusCode: 400 }), 400)
  assert.equal(resolveContentErrorStatus({ statusCode: 404 }), 404)
  assert.equal(resolveContentErrorStatus({ statusCode: 500 }), 502)
  assert.equal(resolveContentErrorStatus(new Error('network failure')), 502)
})

test('content errors expose safe user-facing messages', () => {
  assert.equal(
    resolveContentErrorMessage({ statusCode: 404 }, '文章不存在'),
    '文章不存在',
  )
  assert.equal(
    resolveContentErrorMessage({ statusCode: 400 }, '文章不存在'),
    '请求参数无效',
  )
  assert.equal(
    resolveContentErrorMessage({ statusCode: 502 }, '文章不存在'),
    '内容加载失败，请稍后重试',
  )
  assert.equal(
    resolveContentErrorMessage({ statusCode: 502, statusMessage: '上游暂时不可用' }, '文章不存在'),
    '上游暂时不可用',
  )
})
