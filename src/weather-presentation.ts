import type {
  CurrentWeather,
  Location,
  WeatherViewModel,
} from './types'

const DEFAULT_UNITS = {
  temperature: '°C',
  relativeHumidity: '%',
  apparentTemperature: '°C',
  windSpeed: 'km/h',
  windDirection: '°',
  precipitationProbability: '%',
}

const UNKNOWN_WEATHER_DESCRIPTION = 'Condição climática não identificada'

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isFiniteNumber = (value: number): boolean => Number.isFinite(value)

const isOptionalString = (value: unknown): boolean =>
  value === undefined || isNonEmptyString(value)

const formatNumber = (value: number): string =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const withUnitFallback = (
  value: string | undefined,
  fallback: string,
): string => (value?.trim() ? value : fallback)

const describeWeatherCode = (code: number): string => {
  switch (code) {
    case 0:
      return 'Céu limpo'
    case 1:
      return 'Predominantemente limpo'
    case 2:
      return 'Parcialmente nublado'
    case 3:
      return 'Encoberto'
    case 45:
      return 'Neblina'
    case 48:
      return 'Neblina com deposição de gelo'
    case 51:
      return 'Chuvisco fraco'
    case 53:
      return 'Chuvisco moderado'
    case 55:
      return 'Chuvisco intenso'
    case 56:
      return 'Chuvisco congelante fraco'
    case 57:
      return 'Chuvisco congelante intenso'
    case 61:
      return 'Chuva fraca'
    case 63:
      return 'Chuva moderada'
    case 65:
      return 'Chuva intensa'
    case 66:
      return 'Chuva congelante fraca'
    case 67:
      return 'Chuva congelante intensa'
    case 71:
      return 'Neve fraca'
    case 73:
      return 'Neve moderada'
    case 75:
      return 'Neve intensa'
    case 77:
      return 'Grãos de neve'
    case 80:
      return 'Pancadas de chuva fracas'
    case 81:
      return 'Pancadas de chuva moderadas'
    case 82:
      return 'Pancadas de chuva violentas'
    case 85:
      return 'Pancadas de neve fracas'
    case 86:
      return 'Pancadas de neve intensas'
    case 95:
      return 'Trovoada fraca ou moderada'
    case 96:
      return 'Trovoada com granizo fraco'
    case 99:
      return 'Trovoada com granizo intenso'
    default:
      return UNKNOWN_WEATHER_DESCRIPTION
  }
}

const parseLocalDateTime = (
  value: string,
): [
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
] | null => {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) {
    return null
  }

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
  ] = match
  const parts = [
    Number(yearText),
    Number(monthText),
    Number(dayText),
    Number(hourText),
    Number(minuteText),
    Number(secondText ?? 0),
  ] as const
  const [year, month, day, hour, minute, second] = parts
  const validationDate = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second),
  )

  if (
    validationDate.getUTCFullYear() !== year ||
    validationDate.getUTCMonth() !== month - 1 ||
    validationDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null
  }

  return [...parts]
}

const getZonedParts = (
  timestamp: number,
  timezone: string,
): [
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
] => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(timestamp)
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, Number(value)]),
  )

  return [
    values.year,
    values.month,
    values.day,
    values.hour,
    values.minute,
    values.second,
  ]
}

const getTimezoneOffset = (timestamp: number, timezone: string): number => {
  const [year, month, day, hour, minute, second] = getZonedParts(
    timestamp,
    timezone,
  )
  return Date.UTC(year, month - 1, day, hour, minute, second) - timestamp
}

const toZonedInstant = (
  localDateTime: string,
  timezone: string,
): Date | null => {
  const parts = parseLocalDateTime(localDateTime)
  if (!parts) {
    return null
  }

  const [year, month, day, hour, minute, second] = parts
  const localTimestamp = Date.UTC(year, month - 1, day, hour, minute, second)
  const firstOffset = getTimezoneOffset(localTimestamp, timezone)
  const candidate = localTimestamp - firstOffset
  const secondOffset = getTimezoneOffset(candidate, timezone)
  const timestamp = localTimestamp - secondOffset
  const actualParts = getZonedParts(timestamp, timezone)

  if (parts.some((part, index) => part !== actualParts[index])) {
    return null
  }

  return new Date(timestamp)
}

const formatLocalDate = (
  currentTime: string,
  timezone: string,
): string | null => {
  try {
    const localInstant = toZonedInstant(currentTime, timezone)
    if (!localInstant) {
      return null
    }

    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(localInstant)
  } catch (error) {
    if (error instanceof RangeError) {
      return null
    }
    throw error
  }
}

export const createWeatherViewModel = (
  location: Location,
  weather: CurrentWeather,
): WeatherViewModel | null => {
  if (
    !location ||
    !isNonEmptyString(location.name) ||
    !isNonEmptyString(location.countryCode) ||
    !isNonEmptyString(location.timezone) ||
    !weather ||
    !isNonEmptyString(weather.time) ||
    !weather.units ||
    !isOptionalString(weather.units.temperature) ||
    !isOptionalString(weather.units.relativeHumidity) ||
    !isOptionalString(weather.units.apparentTemperature) ||
    !isOptionalString(weather.units.windSpeed) ||
    !isOptionalString(weather.units.windDirection) ||
    !isOptionalString(weather.units.precipitationProbability) ||
    !isFiniteNumber(weather.temperature) ||
    !isFiniteNumber(weather.relativeHumidity) ||
    weather.relativeHumidity < 0 ||
    weather.relativeHumidity > 100 ||
    !isFiniteNumber(weather.apparentTemperature) ||
    (weather.isDay !== 0 && weather.isDay !== 1) ||
    !isFiniteNumber(weather.windSpeed) ||
    weather.windSpeed < 0 ||
    !isFiniteNumber(weather.windDirection) ||
    weather.windDirection < 0 ||
    weather.windDirection > 360 ||
    !isFiniteNumber(weather.precipitationProbability) ||
    weather.precipitationProbability < 0 ||
    weather.precipitationProbability > 100 ||
    !Number.isInteger(weather.weatherCode)
  ) {
    return null
  }

  const localDate = formatLocalDate(weather.time, location.timezone)
  if (!localDate) {
    return null
  }

  return {
    cityName: location.name,
    countryCode: location.countryCode,
    temperature: formatNumber(weather.temperature),
    temperatureUnit: withUnitFallback(
      weather.units.temperature,
      DEFAULT_UNITS.temperature,
    ),
    localDate,
    dayPeriod: weather.isDay === 1 ? 'Dia' : 'Noite',
    weatherDescription: describeWeatherCode(weather.weatherCode),
    relativeHumidity: formatNumber(weather.relativeHumidity),
    relativeHumidityUnit: withUnitFallback(
      weather.units.relativeHumidity,
      DEFAULT_UNITS.relativeHumidity,
    ),
    apparentTemperature: formatNumber(weather.apparentTemperature),
    apparentTemperatureUnit: withUnitFallback(
      weather.units.apparentTemperature,
      DEFAULT_UNITS.apparentTemperature,
    ),
    precipitationProbability: formatNumber(
      weather.precipitationProbability,
    ),
    precipitationProbabilityUnit: withUnitFallback(
      weather.units.precipitationProbability,
      DEFAULT_UNITS.precipitationProbability,
    ),
    windSpeed: formatNumber(weather.windSpeed),
    windSpeedUnit: withUnitFallback(
      weather.units.windSpeed,
      DEFAULT_UNITS.windSpeed,
    ),
    windDirection: formatNumber(weather.windDirection),
    windDirectionUnit: withUnitFallback(
      weather.units.windDirection,
      DEFAULT_UNITS.windDirection,
    ),
  }
}
