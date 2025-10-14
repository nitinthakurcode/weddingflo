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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface FormTextareaProps<TFieldValues extends FieldValues>
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  className?: string;
}

function FormTextareaInner<TFieldValues extends FieldValues>(
  {
    control,
    name,
    label,
    description,
    placeholder,
    required,
    disabled,
    rows = 3,
    className,
    ...props
  }: FormTextareaProps<TFieldValues>,
  ref: React.ForwardedRef<HTMLTextAreaElement>
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
        <Textarea
          {...field}
          {...props}
          ref={ref}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
        />
      </FormControl>
      {description && <FormDescription id={`${name}-description`}>{description}</FormDescription>}
      <FormMessage id={`${name}-error`} />
    </FormItem>
  );
}

export const FormTextarea = forwardRef(FormTextareaInner) as <TFieldValues extends FieldValues>(
  props: FormTextareaProps<TFieldValues> & { ref?: React.ForwardedRef<HTMLTextAreaElement> }
) => ReturnType<typeof FormTextareaInner>;
