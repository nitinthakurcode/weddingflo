'use client';

import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { SelectOption } from '@/types/forms';

export interface FormSelectProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options: SelectOption[];
  className?: string;
}

export function FormSelect<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = 'Select an option',
  required,
  disabled,
  options,
  className,
}: FormSelectProps<TFieldValues>) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  return (
    <FormItem className={cn(className)}>
      {label && (
        <FormLabel>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FormLabel>
      )}
      <Select
        onValueChange={field.onChange}
        value={field.value}
        disabled={disabled}
      >
        <FormControl>
          <SelectTrigger
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FormDescription id={`${name}-description`}>{description}</FormDescription>}
      <FormMessage id={`${name}-error`} />
    </FormItem>
  );
}
