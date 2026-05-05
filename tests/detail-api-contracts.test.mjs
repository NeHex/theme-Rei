import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assertAlbumDetailApiResponse,
  assertDailyDetailApiResponse,
  assertProjectDetailApiResponse,
} from '../server/utils/detailApiContracts.js'

test('daily detail contract accepts expected payload', () => {
  const payload = assertDailyDetailApiResponse({
    data: {
      id: 1,
      title: 'daily',
      content: 'content',
      create_time: '2026-05-05 12:00:00',
      weather: 'sunny',
      daily_type: 'note',
      kuma_movie_id: 2,
      movie: {
        id: 2,
        provider: 'tmdb',
        movie_id: 'abc',
        watch_status: 'done',
        cover: '/cover.jpg',
        title: 'movie',
        years: '2026',
        score: 8.8,
        url: 'https://example.com',
      },
    },
  })

  assert.equal(payload.data.movie?.title, 'movie')
})

test('daily detail contract rejects invalid id', () => {
  assert.throws(
    () => assertDailyDetailApiResponse({ data: { id: '1' } }),
    /daily\.id must be a finite number/,
  )
})

test('project detail contract accepts expected payload', () => {
  const payload = assertProjectDetailApiResponse({
    data: {
      id: 3,
      title: 'project',
      cover: null,
      category: 'web',
      description: 'desc',
      content: 'body',
      tech_stack: 'rust,vue',
      project_url: 'https://example.com',
      github_url: 'https://github.com/example/repo',
      sort: 1,
      status: 1,
      create_time: '2026-05-05 12:00:00',
      update_time: '2026-05-05 13:00:00',
    },
  })

  assert.equal(payload.data.status, 1)
})

test('project detail contract rejects missing title', () => {
  assert.throws(
    () => assertProjectDetailApiResponse({ data: { id: 3, title: null } }),
    /project\.title must be a string/,
  )
})

test('album detail contract accepts expected payload', () => {
  const payload = assertAlbumDetailApiResponse({
    data: {
      id: 4,
      title: 'album',
      cover: '/cover.png',
      class: 'photo',
      like_count: 10,
      img_urls: '["a.jpg"]',
      create_time: '2026-05-05 12:00:00',
      update_time: '2026-05-05 12:30:00',
    },
  })

  assert.equal(payload.data.like_count, 10)
})

test('album detail contract rejects non-string class', () => {
  assert.throws(
    () => assertAlbumDetailApiResponse({ data: { id: 4, title: 'album', class: 1 } }),
    /album\.class must be a string/,
  )
})
