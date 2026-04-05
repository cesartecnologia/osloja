import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200',
        className
      )}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export { Input };
