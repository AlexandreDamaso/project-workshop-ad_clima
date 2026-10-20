export type Location = {
  name: string
  latitude: number
  longitude: number
  countryCode: string
  timezone: string
}

export type CurrentWeather = {
  time: string
  temperature: number
  relativeHumidity: number
  apparentTemperature: number
  isDay: 0 | 1
  windSpeed: number
  windDirection: number
  precipitationProbability: number
  weatherCode: number
  units: {
    temperature?: string
    relativeHumidity?: string
    apparentTemperature?: string
    windSpeed?: string
    windDirection?: string
    precipitationProbability?: string
  }
}

export type WeatherViewModel = {
  cityName: string
  countryCode: string
  temperature: string
  temperatureUnit: string
  localDate: string
  dayPeriod: string
  weatherDescription: string
  relativeHumidity: string
  relativeHumidityUnit: string
  apparentTemperature: string
  apparentTemperatureUnit: string
  precipitationProbability: string
  precipitationProbabilityUnit: string
  windSpeed: string
  windSpeedUnit: string
  windDirection: string
  windDirectionUnit: string
}

export type ApiError =
  | 'invalid-parameters'
  | 'not-found'
  | 'http-error'
  | 'network-error'
  | 'invalid-json'
  | 'invalid-response'

export type ApiResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError }

export type GeocodingLocationPayload = {
  name?: unknown
  latitude?: unknown
  longitude?: unknown
  country_code?: unknown
  timezone?: unknown
}

export type GeocodingPayload = {
  results?: unknown
}

export type CurrentWeatherPayload = {
  time?: unknown
  temperature_2m?: unknown
  relative_humidity_2m?: unknown
  apparent_temperature?: unknown
  is_day?: unknown
  wind_speed_10m?: unknown
  wind_direction_10m?: unknown
  precipitation_probability?: unknown
  weather_code?: unknown
}

export type CurrentUnitsPayload = {
  temperature_2m?: unknown
  relative_humidity_2m?: unknown
  apparent_temperature?: unknown
  wind_speed_10m?: unknown
  wind_direction_10m?: unknown
  precipitation_probability?: unknown
}

export type WeatherPayload = {
  current?: unknown
  current_units?: unknown
}
