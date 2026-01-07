'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Utensils, Loader2, Leaf, CircleSlash, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface DietaryStats {
  total: number
  vegetarian: number
  vegan: number
  nonVegetarian: number
  jain: number
  glutenFree: number
  nutFree: number
  other: number
  restrictions: { name: string; count: number }[]
}

interface DietaryMatrixViewProps {
  data: DietaryStats | null | undefined
  isLoading: boolean
}

export function DietaryMatrixView({ data, isLoading }: DietaryMatrixViewProps) {
  const t = useTranslations('guests')

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{t('noDietaryData') || 'No dietary data available'}</p>
        </CardContent>
      </Card>
    )
  }

  const mealPreferences = [
    {
      label: t('vegetarian') || 'Vegetarian',
      count: data.vegetarian,
      icon: <Leaf className="w-4 h-4" />,
      color: 'bg-sage-100 text-sage-700 border-sage-200',
    },
    {
      label: t('vegan') || 'Vegan',
      count: data.vegan,
      icon: <Leaf className="w-4 h-4" />,
      color: 'bg-teal-100 text-teal-700 border-teal-200',
    },
    {
      label: t('nonVegetarian') || 'Non-Vegetarian',
      count: data.nonVegetarian,
      icon: <Utensils className="w-4 h-4" />,
      color: 'bg-rose-100 text-rose-700 border-rose-200',
    },
    {
      label: t('jain') || 'Jain',
      count: data.jain,
      icon: <CircleSlash className="w-4 h-4" />,
      color: 'bg-gold-100 text-gold-700 border-gold-200',
    },
  ]

  const restrictions = [
    {
      label: t('glutenFree') || 'Gluten-Free',
      count: data.glutenFree,
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      label: t('nutFree') || 'Nut-Free',
      count: data.nutFree,
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      label: t('other') || 'Other',
      count: data.other,
      icon: <Utensils className="w-4 h-4" />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="w-5 h-5 text-primary" />
            {t('dietaryOverview') || 'Dietary Overview'}
          </CardTitle>
          <CardDescription>
            {t('totalGuests') || 'Total Guests'}: {data.total}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Meal Preferences Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {mealPreferences.map((pref) => (
              <div
                key={pref.label}
                className={`p-4 rounded-xl border-2 ${pref.color} transition-all hover:shadow-sm`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {pref.icon}
                  <span className="font-medium text-sm">{pref.label}</span>
                </div>
                <p className="text-2xl font-bold">{pref.count}</p>
                <p className="text-xs opacity-70">
                  {data.total > 0 ? Math.round((pref.count / data.total) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>

          {/* Dietary Restrictions */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 text-sm text-muted-foreground">
              {t('dietaryRestrictions') || 'Dietary Restrictions'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {restrictions.map((restriction) => (
                <Badge
                  key={restriction.label}
                  variant="outline"
                  className="flex items-center gap-1.5 px-3 py-1.5"
                >
                  {restriction.icon}
                  <span>{restriction.label}</span>
                  <span className="ml-1 font-bold">{restriction.count}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Restrictions List */}
          {data.restrictions && data.restrictions.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold mb-3 text-sm text-muted-foreground">
                {t('specificRestrictions') || 'Specific Restrictions'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {data.restrictions.map((restriction) => (
                  <Badge
                    key={restriction.name}
                    variant="secondary"
                    className="flex items-center gap-1.5"
                  >
                    <span>{restriction.name}</span>
                    <span className="ml-1 font-bold text-primary">{restriction.count}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visual Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('mealDistribution') || 'Meal Distribution'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-8 rounded-full overflow-hidden flex bg-muted">
            {data.vegetarian > 0 && (
              <div
                className="bg-sage-500 transition-all"
                style={{ width: `${(data.vegetarian / data.total) * 100}%` }}
                title={`${t('vegetarian') || 'Vegetarian'}: ${data.vegetarian}`}
              />
            )}
            {data.vegan > 0 && (
              <div
                className="bg-teal-500 transition-all"
                style={{ width: `${(data.vegan / data.total) * 100}%` }}
                title={`${t('vegan') || 'Vegan'}: ${data.vegan}`}
              />
            )}
            {data.nonVegetarian > 0 && (
              <div
                className="bg-rose-500 transition-all"
                style={{ width: `${(data.nonVegetarian / data.total) * 100}%` }}
                title={`${t('nonVegetarian') || 'Non-Vegetarian'}: ${data.nonVegetarian}`}
              />
            )}
            {data.jain > 0 && (
              <div
                className="bg-gold-500 transition-all"
                style={{ width: `${(data.jain / data.total) * 100}%` }}
                title={`${t('jain') || 'Jain'}: ${data.jain}`}
              />
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-sage-500" />
              <span>{t('vegetarian') || 'Vegetarian'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-teal-500" />
              <span>{t('vegan') || 'Vegan'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span>{t('nonVegetarian') || 'Non-Vegetarian'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full bg-gold-500" />
              <span>{t('jain') || 'Jain'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
