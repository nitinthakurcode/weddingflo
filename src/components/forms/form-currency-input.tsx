'use client';

import { forwardRef, useState } from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CurrencyInputOptions } from '@/types/forms';

export interface FormCurrencyInputProps<TFieldValues extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type' | 'onChange'> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: CurrencyInputOptions;
  className?: string;
}

function formatCurrency(
  value: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

function parseCurrency(value: string): number {
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

function FormCurrencyInputInner<TFieldValues extends FieldValues>(
  {
    control,
    name,
    label,
    description,
    placeholder = '0.00',
    required,
    disabled,
    options,
    className,
    ...props
  }: FormCurrencyInputProps<TFieldValues>,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  const [displayValue, setDisplayValue] = useState<string>(
    field.value ? String(field.value) : ''
  );
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(field.value ? String(field.value) : '');
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numericValue = parseCurrency(displayValue);
    field.onChange(numericValue);
    setDisplayValue(numericValue ? String(numericValue) : '');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow negative if specified
    if (!options?.allowNegative && value.startsWith('-')) {
      return;
    }

    // Only allow numbers, one decimal point, and optional minus sign
    const regex = options?.allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (regex.test(value) || value === '') {
      setDisplayValue(value);
    }
  };

  const displayValueFormatted = isFocused
    ? displayValue
    : field.value
    ? formatCurrency(field.value, options?.currency, options?.locale)
    : '';

  return (
    <FormItem className={cn(className)}>
      {label && (
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
      )}
      <FormControl>
        <Input
          {...props}
          ref={ref}
          type="text"
          value={displayValueFormatted}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
        />
      </FormControl>
      {description && <FormDescription id={`${name}-description`}>{description}</FormDescription>}
      <FormMessage id={`${name}-error`} />
    </FormItem>
  );
}

export const FormCurrencyInput = forwardRef(FormCurrencyInputInner) as <TFieldValues extends FieldValues>(
  props: FormCurrencyInputProps<TFieldValues> & { ref?: React.ForwardedRef<HTMLInputElement> }
) => ReturnType<typeof FormCurrencyInputInner>;
