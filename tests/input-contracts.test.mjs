import test from 'node:test'
import assert from 'node:assert/strict'

import {
  validateCommentPayload,
  validateFriendApplyPayload,
} from '../server/utils/inputContracts.js'

test('comment contract normalizes and accepts a valid payload', () => {
  const payload = validateCommentPayload({
    parent_id: 0,
    target_type: ' ARTICLE ',
    target_id: 7,
    content: '  hello  ',
    nickname: ' visitor ',
    email: 'visitor@example.com',
    website: 'https://example.com',
  })

  assert.deepEqual(payload, {
    parent_id: 0,
    target_type: 'article',
    target_id: 7,
    content: 'hello',
    nickname: 'visitor',
    email: 'visitor@example.com',
    website: 'https://example.com/',
  })
})

test('comment contract rejects unsupported target types', () => {
  assert.throws(
    () => validateCommentPayload({
      target_type: 'admin',
      target_id: 1,
      content: 'hello',
      nickname: 'visitor',
    }),
    /target_type is not supported/,
  )
})

test('comment contract rejects dangerous URLs and non-string input', () => {
  assert.throws(
    () => validateCommentPayload({
      target_type: 'article',
      target_id: 1,
      content: 'hello',
      nickname: 'visitor',
      website: 'javascript:alert(1)',
    }),
    /website must use http or https/,
  )

  assert.throws(
    () => validateCommentPayload({
      target_type: 'article',
      target_id: '1',
      content: 'hello',
      nickname: 'visitor',
    }),
    /target_id must be an integer/,
  )
})

test('comment contract enforces content and nickname limits', () => {
  assert.throws(
    () => validateCommentPayload({
      target_type: 'article',
      target_id: 1,
      content: 'x'.repeat(1201),
      nickname: 'visitor',
    }),
    /content must be at most 1200 characters/,
  )

  assert.throws(
    () => validateCommentPayload({
      target_type: 'article',
      target_id: 1,
      content: 'hello',
      nickname: 'x'.repeat(101),
    }),
    /nickname must be at most 100 characters/,
  )
})

test('friend apply contract normalizes valid fields', () => {
  const payload = validateFriendApplyPayload({
    site_title: ' My Site ',
    site_url: 'https://example.com/path',
    site_description: ' A personal site ',
    site_icon: 'https://example.com/icon.png',
    contact: ' owner@example.com ',
  })

  assert.deepEqual(payload, {
    site_title: 'My Site',
    site_url: 'https://example.com/path',
    site_description: 'A personal site',
    site_icon: 'https://example.com/icon.png',
    contact: 'owner@example.com',
  })
})

test('friend apply contract rejects missing fields and dangerous URLs', () => {
  assert.throws(
    () => validateFriendApplyPayload({
      site_title: 'My Site',
      site_description: 'Description',
    }),
    /site_url is required/,
  )

  assert.throws(
    () => validateFriendApplyPayload({
      site_title: 'My Site',
      site_url: 'javascript:alert(1)',
      site_description: 'Description',
    }),
    /site_url must use http or https/,
  )
})

