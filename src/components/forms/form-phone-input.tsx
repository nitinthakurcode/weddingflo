'use client';

import { forwardRef } from 'react';
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
import type { PhoneInputOptions } from '@/types/forms';

export interface FormPhoneInputProps<TFieldValues extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type' | 'onChange'> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: PhoneInputOptions;
  className?: string;
}

// Simple phone formatter (US format for now - can be extended)
function formatPhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  } else {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
}

function FormPhoneInputInner<TFieldValues extends FieldValues>(
  {
    control,
    name,
    label,
    description,
    placeholder = '(555) 123-4567',
    required,
    disabled,
    options,
    className,
    ...props
  }: FormPhoneInputProps<TFieldValues>,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    field.onChange(formatted);
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
          {...props}
          ref={ref}
          type="tel"
          value={field.value || ''}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={14} // (555) 123-4567
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
        />
      </FormControl>
      {description && <FormDescription id={`${name}-description`}>{description}</FormDescription>}
      <FormMessage id={`${name}-error`} />
    </FormItem>
  );
}

export const FormPhoneInput = forwardRef(FormPhoneInputInner) as <TFieldValues extends FieldValues>(
  props: FormPhoneInputProps<TFieldValues> & { ref?: React.ForwardedRef<HTMLInputElement> }
) => ReturnType<typeof FormPhoneInputInner>;
