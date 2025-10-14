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

export interface FormInputProps<TFieldValues extends FieldValues>
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

function FormInputInner<TFieldValues extends FieldValues>(
  {
    control,
    name,
    label,
    description,
    placeholder,
    required,
    disabled,
    className,
    ...props
  }: FormInputProps<TFieldValues>,
  ref: React.ForwardedRef<HTMLInputElement>
) {
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
      <FormControl>
        <Input
          {...field}
          {...props}
          ref={ref}
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

export const FormInput = forwardRef(FormInputInner) as <TFieldValues extends FieldValues>(
  props: FormInputProps<TFieldValues> & { ref?: React.ForwardedRef<HTMLInputElement> }
) => ReturnType<typeof FormInputInner>;
