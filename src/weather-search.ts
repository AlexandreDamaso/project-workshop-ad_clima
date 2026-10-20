import { fetchCurrentWeather, searchLocation } from './open-meteo.ts'
import type { ApiResult, WeatherViewModel } from './types.ts'
import { createWeatherViewModel } from './weather-presentation.ts'

export const searchWeatherForCity = async (
  cityName: string,
): Promise<ApiResult<WeatherViewModel>> => {
  if (!cityName.trim()) {
    return { status: 'error', error: 'invalid-parameters' }
  }

  const locationResult = await searchLocation(cityName)
  if (locationResult.status === 'error') {
    return { status: 'error', error: locationResult.error }
  }

  const weatherResult = await fetchCurrentWeather(locationResult.data)
  if (weatherResult.status === 'error') {
    return { status: 'error', error: weatherResult.error }
  }

  const viewModel = createWeatherViewModel(
    locationResult.data,
    weatherResult.data,
  )
  if (!viewModel) {
    return { status: 'error', error: 'invalid-response' }
  }

  return { status: 'success', data: viewModel }
}
