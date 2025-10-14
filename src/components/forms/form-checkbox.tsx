'use client';

import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface FormCheckboxProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function FormCheckbox<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: FormCheckboxProps<TFieldValues>) {
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  return (
    <FormItem
      className={cn(
        'flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4',
        className
      )}
    >
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        {label && <FormLabel>{label}</FormLabel>}
        {description && <FormDescription id={`${name}-description`}>{description}</FormDescription>}
        <FormMessage id={`${name}-error`} />
      </div>
    </FormItem>
  );
}
