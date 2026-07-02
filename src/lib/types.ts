// Domain types for the app, plus the slices of the NWS API response shapes we read.
// NWS API docs: https://www.weather.gov/documentation/services-web-api

// ---------- Raw NWS API response slices ----------

export interface NwsQuantitative {
  unitCode: string;
  value: number | null;
  qualityControl?: string;
}

export interface NwsPointProperties {
  gridId: string;
  gridX: number;
  gridY: number;
  forecast: string;
  forecastHourly: string;
  forecastGridData: string;
  observationStations: string;
  relativeLocation: {
    properties: {
      city: string;
      state: string;
    };
  };
  timeZone: string;
}

export interface NwsPointResponse {
  properties: NwsPointProperties;
}

export interface NwsForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend: string | null;
  probabilityOfPrecipitation: NwsQuantitative;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface NwsForecastResponse {
  properties: {
    updated?: string;
    generatedAt?: string;
    periods: NwsForecastPeriod[];
  };
}

export interface NwsObservationProperties {
  timestamp: string;
  textDescription: string | null;
  temperature: NwsQuantitative;
  dewpoint: NwsQuantitative;
  relativeHumidity: NwsQuantitative;
  windSpeed: NwsQuantitative;
  windDirection: NwsQuantitative;
  barometricPressure: NwsQuantitative;
  visibility: NwsQuantitative;
  heatIndex: NwsQuantitative;
  windChill: NwsQuantitative;
  icon: string | null;
}

export interface NwsObservationResponse {
  properties: NwsObservationProperties;
}

export interface NwsStationFeature {
  properties: {
    stationIdentifier: string;
    name: string;
  };
}

export interface NwsStationsResponse {
  features: NwsStationFeature[];
}

export interface NwsAlertProperties {
  id?: string;
  event: string;
  severity: AlertSeverity | string;
  certainty: string;
  urgency: string;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  areaDesc: string | null;
  onset: string | null;
  expires: string | null;
}

export interface NwsAlertFeature {
  properties: NwsAlertProperties;
}

export interface NwsAlertsResponse {
  features: NwsAlertFeature[];
}

// ---------- Normalized domain types used by the UI ----------

export type AlertSeverity =
  | 'Extreme'
  | 'Severe'
  | 'Moderate'
  | 'Minor'
  | 'Unknown';

export interface Location {
  lat: number;
  lon: number;
  city: string;
  state: string;
  /** NWS forecast office id, e.g. "STO" */
  gridId: string;
  gridX: number;
  gridY: number;
  forecastUrl: string;
  hourlyUrl: string;
  stationsUrl: string;
  timeZone: string;
}

export interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  /** Temperature in degrees Fahrenheit (normalized). */
  temperatureF: number;
  temperatureTrend: string | null;
  /** Probability of precipitation as an integer percent 0..100, or null. */
  precipPercent: number | null;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
}

export interface HourlyPeriod {
  number: number;
  /** ISO 8601 start time of this hour, carrying the location's UTC offset. */
  startTime: string;
  /** ISO 8601 end time of this hour; used to drop hours that have elapsed. */
  endTime: string;
  isDaytime: boolean;
  /** Temperature in degrees Fahrenheit (normalized). */
  temperatureF: number;
  /** Probability of precipitation as an integer percent 0..100, or null. */
  precipPercent: number | null;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
}

export interface CurrentConditions {
  stationId: string;
  stationName: string;
  timestamp: string;
  description: string;
  /** Fahrenheit, normalized from the API's degC. */
  temperatureF: number | null;
  /** Fahrenheit. */
  dewpointF: number | null;
  humidityPercent: number | null;
  /** Miles per hour, normalized from the API's km/h. */
  windSpeedMph: number | null;
  windDirectionDeg: number | null;
  /** Cardinal direction derived from windDirectionDeg, e.g. "NE". */
  windCardinal: string | null;
  heatIndexF: number | null;
  windChillF: number | null;
  icon: string | null;
}

export interface WeatherAlert {
  id: string;
  event: string;
  severity: AlertSeverity;
  headline: string;
  description: string;
  instruction: string | null;
  areaDesc: string;
  onset: string | null;
  expires: string | null;
}
