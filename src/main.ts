import './style.css'
import type { ApiError, WeatherViewModel } from './types'
import { searchWeatherForCity } from './weather-search'

type PageState = 'empty' | 'loading' | 'error' | 'result'

const getElement = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Elemento obrigatório não encontrado: ${selector}`)
  }
  return element
}

const searchForm = getElement<HTMLFormElement>('#search-form')
const cityInput = getElement<HTMLInputElement>('#city-input')
const searchButton = getElement<HTMLButtonElement>('#search-button')
const mainContent = getElement<HTMLElement>('main')
const searchStatus = getElement<HTMLParagraphElement>('#search-status')
const emptyState = getElement<HTMLElement>('#empty-state')
const loadingState = getElement<HTMLElement>('#loading-state')
const errorState = getElement<HTMLElement>('#error-state')
const errorMessage = getElement<HTMLParagraphElement>('#error-message')
const resultState = getElement<HTMLElement>('#weather-result')

const resultFields = {
  cityName: getElement<HTMLElement>('#city-name'),
  countryCode: getElement<HTMLElement>('#country-code'),
  temperature: getElement<HTMLElement>('#temperature'),
  temperatureUnit: getElement<HTMLElement>('#temperature-unit'),
  localDate: getElement<HTMLElement>('#local-date'),
  dayPeriod: getElement<HTMLElement>('#day-period'),
  weatherDescription: getElement<HTMLElement>('#weather-description'),
  relativeHumidity: getElement<HTMLElement>('#relative-humidity'),
  relativeHumidityUnit: getElement<HTMLElement>('#relative-humidity-unit'),
  apparentTemperature: getElement<HTMLElement>('#apparent-temperature'),
  apparentTemperatureUnit: getElement<HTMLElement>(
    '#apparent-temperature-unit',
  ),
  precipitationProbability: getElement<HTMLElement>(
    '#precipitation-probability',
  ),
  precipitationProbabilityUnit: getElement<HTMLElement>(
    '#precipitation-probability-unit',
  ),
  windSpeed: getElement<HTMLElement>('#wind-speed'),
  windSpeedUnit: getElement<HTMLElement>('#wind-speed-unit'),
  windDirection: getElement<HTMLElement>('#wind-direction'),
  windDirectionUnit: getElement<HTMLElement>('#wind-direction-unit'),
}

const setPageState = (state: PageState): void => {
  emptyState.hidden = state !== 'empty'
  loadingState.hidden = state !== 'loading'
  errorState.hidden = state !== 'error'
  resultState.hidden = state !== 'result'
  mainContent.setAttribute('aria-busy', String(state === 'loading'))
}

const setFieldText = (weather: WeatherViewModel): void => {
  resultFields.cityName.textContent = weather.cityName
  resultFields.countryCode.textContent = weather.countryCode
  resultFields.temperature.textContent = weather.temperature
  resultFields.temperatureUnit.textContent = weather.temperatureUnit
  resultFields.localDate.textContent = weather.localDate
  resultFields.dayPeriod.textContent = weather.dayPeriod
  resultFields.weatherDescription.textContent = weather.weatherDescription
  resultFields.relativeHumidity.textContent = weather.relativeHumidity
  resultFields.relativeHumidityUnit.textContent = weather.relativeHumidityUnit
  resultFields.apparentTemperature.textContent = weather.apparentTemperature
  resultFields.apparentTemperatureUnit.textContent =
    weather.apparentTemperatureUnit
  resultFields.precipitationProbability.textContent =
    weather.precipitationProbability
  resultFields.precipitationProbabilityUnit.textContent =
    weather.precipitationProbabilityUnit
  resultFields.windSpeed.textContent = weather.windSpeed
  resultFields.windSpeedUnit.textContent = weather.windSpeedUnit
  resultFields.windDirection.textContent = weather.windDirection
  resultFields.windDirectionUnit.textContent = weather.windDirectionUnit
}

const getErrorMessage = (error: ApiError): string => {
  switch (error) {
    case 'not-found':
      return 'Não encontramos essa cidade. Confira o nome e tente novamente.'
    case 'network-error':
    case 'http-error':
      return 'Não foi possível consultar o clima agora. Tente novamente.'
    case 'invalid-parameters':
    case 'invalid-json':
    case 'invalid-response':
      return 'Não recebemos dados válidos para essa cidade. Tente novamente.'
  }
}

const showError = (message: string): void => {
  errorMessage.textContent = message
  searchStatus.textContent = message
  setPageState('error')
}

let isLoading = false

searchForm.addEventListener('submit', async (event: SubmitEvent) => {
  event.preventDefault()
  const cityName = cityInput.value.trim()

  if (!cityName) {
    searchStatus.textContent = 'Digite o nome de uma cidade para pesquisar.'
    cityInput.focus()
    return
  }

  if (isLoading) {
    return
  }

  isLoading = true
  searchButton.disabled = true
  cityInput.disabled = true
  searchStatus.textContent = `Buscando o clima de ${cityName}.`
  setPageState('loading')

  try {
    const result = await searchWeatherForCity(cityName)
    if (result.status === 'error') {
      showError(getErrorMessage(result.error))
      return
    }

    setFieldText(result.data)
    searchStatus.textContent = `Clima atualizado para ${result.data.cityName}.`
    setPageState('result')
  } catch (error) {
    console.error('Erro inesperado durante a consulta do clima.', error)
    showError('Não foi possível consultar o clima agora. Tente novamente.')
  } finally {
    isLoading = false
    searchButton.disabled = false
    cityInput.disabled = false
  }
})
