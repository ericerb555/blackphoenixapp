import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    hint, 
    icon, 
    iconPosition = 'left',
    fullWidth = true,
    className = '',
    ...props 
  }, ref) => {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-semibold text-gray-300 mb-2">
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            className={`
              w-full px-4 py-3 text-sm
              bg-[#0A0A0A] border rounded-xl text-white placeholder-gray-500
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#0A0A0A]
              disabled:opacity-50 disabled:cursor-not-allowed
              ${icon && iconPosition === 'left' ? 'pl-10' : ''}
              ${icon && iconPosition === 'right' ? 'pr-10' : ''}
              ${error 
                ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' 
                : 'border-[#2A2A2A] focus:border-orange-500/50 focus:ring-orange-500/50 hover:border-[#3A3A3A]'
              }
              ${className}
            `}
            {...props}
          />
          
          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {icon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {hint && !error && (
          <p className="mt-2 text-sm text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
