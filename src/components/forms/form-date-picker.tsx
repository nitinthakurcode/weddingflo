'use client';

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
import type { DatePickerOptions } from '@/types/forms';

export interface FormDatePickerProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: DatePickerOptions;
  className?: string;
}

export function FormDatePicker<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  options,
  className,
}: FormDatePickerProps<TFieldValues>) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  // Convert date to YYYY-MM-DD format for input
  const formatDateForInput = (value: any): string => {
    if (!value) return '';
    try {
      const date = new Date(value);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

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
          type="date"
          value={formatDateForInput(field.value)}
          onChange={(e) => {
            const dateValue = e.target.value;
            field.onChange(dateValue ? new Date(dateValue).toISOString() : '');
          }}
          disabled={disabled}
          min={options?.minDate ? formatDateForInput(options.minDate) : undefined}
          max={options?.maxDate ? formatDateForInput(options.maxDate) : undefined}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
        />
      </FormControl>
      {description && <FormDescription id={`${name}-description`}>{description}</FormDescription>}
      <FormMessage id={`${name}-error`} />
    </FormItem>
  );
}
