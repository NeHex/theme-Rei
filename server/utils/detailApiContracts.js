function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertRecord(value, label) {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object`)
  }
  return value
}

function assertNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
  return value
}

function assertString(value, label) {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`)
  }
  return value
}

function assertNullableString(value, label) {
  if (value === null || value === undefined) {
    return null
  }
  return assertString(value, label)
}

function assertNullableNumber(value, label) {
  if (value === null || value === undefined) {
    return null
  }
  return assertNumber(value, label)
}

function assertScore(value, label) {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    return value
  }
  throw new Error(`${label} must be a number, string, or null`)
}

function assertDailyMovie(value, label) {
  if (value === null || value === undefined) {
    return null
  }

  const source = assertRecord(value, label)
  return {
    id: assertNumber(source.id, `${label}.id`),
    provider: assertNullableString(source.provider, `${label}.provider`),
    movie_id: assertNullableString(source.movie_id, `${label}.movie_id`),
    watch_status: assertNullableString(source.watch_status, `${label}.watch_status`),
    cover: assertNullableString(source.cover, `${label}.cover`),
    title: assertNullableString(source.title, `${label}.title`),
    years: assertNullableString(source.years, `${label}.years`),
    score: assertScore(source.score, `${label}.score`),
    url: assertNullableString(source.url, `${label}.url`),
  }
}

export function assertDailyDetailApiResponse(payload) {
  const source = assertRecord(payload, 'daily detail response')
  const data = assertRecord(source.data, 'daily detail response.data')

  return {
    data: {
      id: assertNumber(data.id, 'daily.id'),
      title: assertString(data.title, 'daily.title'),
      content: assertNullableString(data.content, 'daily.content'),
      create_time: assertString(data.create_time, 'daily.create_time'),
      weather: assertNullableString(data.weather, 'daily.weather'),
      daily_type: assertNullableString(data.daily_type, 'daily.daily_type'),
      kuma_movie_id: assertNullableNumber(data.kuma_movie_id, 'daily.kuma_movie_id'),
      movie: assertDailyMovie(data.movie, 'daily.movie'),
    },
  }
}

export function assertProjectDetailApiResponse(payload) {
  const source = assertRecord(payload, 'project detail response')
  const data = assertRecord(source.data, 'project detail response.data')

  return {
    data: {
      id: assertNumber(data.id, 'project.id'),
      title: assertString(data.title, 'project.title'),
      cover: assertNullableString(data.cover, 'project.cover'),
      category: assertNullableString(data.category, 'project.category'),
      description: assertNullableString(data.description, 'project.description'),
      content: assertNullableString(data.content, 'project.content'),
      tech_stack: assertNullableString(data.tech_stack, 'project.tech_stack'),
      project_url: assertNullableString(data.project_url, 'project.project_url'),
      github_url: assertNullableString(data.github_url, 'project.github_url'),
      sort: assertNumber(data.sort, 'project.sort'),
      status: assertNumber(data.status, 'project.status'),
      create_time: assertString(data.create_time, 'project.create_time'),
      update_time: assertString(data.update_time, 'project.update_time'),
    },
  }
}

export function assertAlbumDetailApiResponse(payload) {
  const source = assertRecord(payload, 'album detail response')
  const data = assertRecord(source.data, 'album detail response.data')

  return {
    data: {
      id: assertNumber(data.id, 'album.id'),
      title: assertString(data.title, 'album.title'),
      cover: assertNullableString(data.cover, 'album.cover'),
      class: assertString(data.class, 'album.class'),
      like_count: assertNumber(data.like_count, 'album.like_count'),
      img_urls: assertNullableString(data.img_urls, 'album.img_urls'),
      create_time: assertString(data.create_time, 'album.create_time'),
      update_time: assertString(data.update_time, 'album.update_time'),
    },
  }
}
