import type {
  ApiError,
  ApiResult,
  CurrentUnitsPayload,
  CurrentWeather,
  CurrentWeatherPayload,
  GeocodingLocationPayload,
  GeocodingPayload,
  Location,
  WeatherPayload,
} from './types'

const GEOCODING_ENDPOINT =
  'https://geocoding-api.open-meteo.com/v1/search'
const WEATHER_ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'wind_speed_10m',
  'wind_direction_10m',
  'precipitation_probability',
  'weather_code',
].join(',')

const failure = <T>(error: ApiError): ApiResult<T> => ({
  status: 'error',
  error,
})

const success = <T>(data: T): ApiResult<T> => ({
  status: 'success',
  data,
})

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isGeocodingLocation = (
  value: unknown,
): value is GeocodingLocationPayload =>
  isRecord(value)

const isWeatherPayload = (value: unknown): value is WeatherPayload =>
  isRecord(value)

const isCurrentWeatherPayload = (
  value: unknown,
): value is CurrentWeatherPayload =>
  isRecord(value)

const isCurrentUnitsPayload = (
  value: unknown,
): value is CurrentUnitsPayload => isRecord(value)

const readUnit = (
  units: CurrentUnitsPayload | undefined,
  key: keyof CurrentUnitsPayload,
): string | undefined => {
  const unit = units?.[key]
  return typeof unit === 'string' && unit.trim().length > 0
    ? unit
    : undefined
}

const parseLocation = (
  payload: GeocodingLocationPayload,
): Location | null => {
  const { name, latitude, longitude, country_code, timezone } = payload

  if (
    !isNonEmptyString(name) ||
    !isFiniteNumber(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !isFiniteNumber(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !isNonEmptyString(country_code) ||
    !isNonEmptyString(timezone)
  ) {
    return null
  }

  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: timezone })
  } catch (error) {
    if (error instanceof RangeError) {
      return null
    }
    throw error
  }

  return {
    name: name.trim(),
    latitude,
    longitude,
    countryCode: country_code.trim(),
    timezone: timezone.trim(),
  }
}

const parseCurrentWeather = (
  payload: CurrentWeatherPayload,
  unitsPayload: unknown,
): CurrentWeather | null => {
  const {
    time,
    temperature_2m,
    relative_humidity_2m,
    apparent_temperature,
    is_day,
    wind_speed_10m,
    wind_direction_10m,
    precipitation_probability,
    weather_code,
  } = payload

  if (
    !isNonEmptyString(time) ||
    !isFiniteNumber(temperature_2m) ||
    !isFiniteNumber(relative_humidity_2m) ||
    relative_humidity_2m < 0 ||
    relative_humidity_2m > 100 ||
    !isFiniteNumber(apparent_temperature) ||
    (is_day !== 0 && is_day !== 1) ||
    !isFiniteNumber(wind_speed_10m) ||
    wind_speed_10m < 0 ||
    !isFiniteNumber(wind_direction_10m) ||
    wind_direction_10m < 0 ||
    wind_direction_10m > 360 ||
    !isFiniteNumber(precipitation_probability) ||
    precipitation_probability < 0 ||
    precipitation_probability > 100 ||
    !isFiniteNumber(weather_code) ||
    !Number.isInteger(weather_code)
  ) {
    return null
  }

  let units: CurrentUnitsPayload | undefined
  if (unitsPayload !== undefined) {
    if (!isCurrentUnitsPayload(unitsPayload)) {
      return null
    }
    units = unitsPayload
  }

  return {
    time: time.trim(),
    temperature: temperature_2m,
    relativeHumidity: relative_humidity_2m,
    apparentTemperature: apparent_temperature,
    isDay: is_day,
    windSpeed: wind_speed_10m,
    windDirection: wind_direction_10m,
    precipitationProbability: precipitation_probability,
    weatherCode: weather_code,
    units: {
      temperature: readUnit(units, 'temperature_2m'),
      relativeHumidity: readUnit(units, 'relative_humidity_2m'),
      apparentTemperature: readUnit(units, 'apparent_temperature'),
      windSpeed: readUnit(units, 'wind_speed_10m'),
      windDirection: readUnit(units, 'wind_direction_10m'),
      precipitationProbability: readUnit(
        units,
        'precipitation_probability',
      ),
    },
  }
}

const fetchJson = async (url: URL): Promise<ApiResult<unknown>> => {
  let response: Response

  try {
    response = await fetch(url)
  } catch (error) {
    if (error instanceof TypeError) {
      return failure('network-error')
    }
    throw error
  }

  if (!response.ok) {
    return failure('http-error')
  }

  try {
    const payload: unknown = await response.json()
    return success(payload)
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return failure('invalid-json')
    }
    throw error
  }
}

export const searchLocation = async (
  cityName: string,
): Promise<ApiResult<Location>> => {
  if (!isNonEmptyString(cityName)) {
    return failure('invalid-parameters')
  }

  const params = new URLSearchParams({
    name: cityName.trim(),
    count: '1',
    language: 'pt',
    format: 'json',
  })
  const url = new URL(GEOCODING_ENDPOINT)
  url.search = params.toString()

  const response = await fetchJson(url)
  if (response.status === 'error') {
    return response
  }

  const payload: unknown = response.data
  if (!isRecord(payload)) {
    return failure('invalid-response')
  }

  const geocodingPayload: GeocodingPayload = payload
  if (geocodingPayload.results === undefined || geocodingPayload.results === null) {
    return failure('not-found')
  }
  if (!Array.isArray(geocodingPayload.results)) {
    return failure('invalid-response')
  }

  const [firstResult] = geocodingPayload.results
  if (firstResult === undefined) {
    return failure('not-found')
  }
  if (!isGeocodingLocation(firstResult)) {
    return failure('invalid-response')
  }

  const location = parseLocation(firstResult)
  return location ? success(location) : failure('invalid-response')
}

export const fetchCurrentWeather = async (
  location: Location | null | undefined,
): Promise<ApiResult<CurrentWeather>> => {
  if (
    !location ||
    !isFiniteNumber(location.latitude) ||
    location.latitude < -90 ||
    location.latitude > 90 ||
    !isFiniteNumber(location.longitude) ||
    location.longitude < -180 ||
    location.longitude > 180 ||
    !isNonEmptyString(location.timezone)
  ) {
    return failure('invalid-parameters')
  }

  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: location.timezone })
  } catch (error) {
    if (error instanceof RangeError) {
      return failure('invalid-parameters')
    }
    throw error
  }

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    timezone: location.timezone.trim(),
    current: CURRENT_FIELDS,
  })
  const url = new URL(WEATHER_ENDPOINT)
  url.search = params.toString()

  const response = await fetchJson(url)
  if (response.status === 'error') {
    return response
  }

  if (!isWeatherPayload(response.data)) {
    return failure('invalid-response')
  }
  if (!isCurrentWeatherPayload(response.data.current)) {
    return failure('invalid-response')
  }

  const weather = parseCurrentWeather(
    response.data.current,
    response.data.current_units,
  )
  return weather ? success(weather) : failure('invalid-response')
}
