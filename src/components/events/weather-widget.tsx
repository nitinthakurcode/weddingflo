'use client';

import { WeatherData } from '@/types/event';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Wind, Droplets, AlertCircle } from 'lucide-react';

interface WeatherWidgetProps {
  weather: WeatherData | undefined;
  eventDate: number;
  city: string;
}

export function WeatherWidget({ weather, eventDate, city }: WeatherWidgetProps) {
  const getWeatherIcon = (condition?: string) => {
    if (!condition) return Sun;

    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain')) return CloudRain;
    if (lowerCondition.includes('cloud')) return Cloud;
    return Sun;
  };

  const WeatherIcon = getWeatherIcon(weather?.condition);

  // Check if event is too far in future (more than 7 days)
  const daysUntilEvent = Math.ceil((eventDate - Date.now()) / (1000 * 60 * 60 * 24));
  const isForecastAvailable = daysUntilEvent <= 7;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <WeatherIcon className="h-5 w-5" />
          Weather Forecast
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isForecastAvailable ? (
          <div className="text-center py-6 text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Weather forecast available 7 days before event</p>
            <p className="text-xs text-gray-400 mt-1">
              {daysUntilEvent} days until event
            </p>
          </div>
        ) : !weather ? (
          <div className="text-center py-6 text-gray-500">
            <Cloud className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Weather data not available</p>
            <p className="text-xs text-gray-400 mt-1">Location: {city}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{weather.temperature}°</p>
                <p className="text-sm text-muted-foreground capitalize">{weather.condition}</p>
              </div>
              <WeatherIcon className="h-12 w-12 text-gray-400" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              {weather.humidity !== undefined && (
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Humidity</p>
                    <p className="font-medium">{weather.humidity}%</p>
                  </div>
                </div>
              )}

              {weather.wind_speed !== undefined && (
                <div className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Wind</p>
                    <p className="font-medium">{weather.wind_speed} mph</p>
                  </div>
                </div>
              )}

              {weather.precipitation_chance !== undefined && (
                <div className="flex items-center gap-2">
                  <CloudRain className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rain Chance</p>
                    <p className="font-medium">{weather.precipitation_chance}%</p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 text-center pt-2">
              Forecast for {city}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
