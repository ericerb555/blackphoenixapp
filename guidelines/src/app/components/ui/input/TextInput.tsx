import React from 'react';

export interface TextInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'onChange'> {
  /**
   * Visual variant of the input
   * @default 'dark'
   */
  variant?: 'dark' | 'light';
  
  /**
   * Error state
   */
  error?: boolean;
  
  /**
   * Error message to display
   */
  errorMessage?: string;
  
  /**
   * Helper text to display below input
   */
  helperText?: string;
  
  /**
   * Icon to display at the start of input
   */
  startIcon?: React.ReactNode;
  
  /**
   * Icon to display at the end of input
   */
  endIcon?: React.ReactNode;
  
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Label for the input (optional, can be handled externally)
   */
  label?: string;
  
  /**
   * Whether the field is required
   */
  required?: boolean;

  /**
   * Change handler - receives the value directly instead of event
   */
  onChange?: (value: string) => void;
}

/**
 * TextInput Component
 * 
 * A flexible text input component with multiple variants, sizes, and states.
 * Supports icons, error states, and helper text.
 * 
 * @example
 * // Dark variant (default)
 * <TextInput placeholder="Enter text" />
 * 
 * @example
 * // With label and required
 * <TextInput label="Email" type="email" required />
 * 
 * @example
 * // With icons
 * <TextInput 
 *   startIcon={<Search className="w-4 h-4" />}
 *   placeholder="Search..."
 * />
 * 
 * @example
 * // With error state
 * <TextInput 
 *   error 
 *   errorMessage="This field is required"
 *   value={value}
 *   onChange={handleChange}
 * />
 */
export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      variant = 'dark',
      error = false,
      errorMessage,
      helperText,
      startIcon,
      endIcon,
      size = 'md',
      label,
      required,
      className = '',
      disabled,
      type = 'text',
      onChange,
      ...props
    },
    ref
  ) => {
    // Handle onChange to extract value from event
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e.target.value);
      }
    };

    // Base styles
    const baseStyles = 'w-full rounded-xl transition-all outline-none';
    
    // Variant styles
    const variantStyles = {
      dark: `
        bg-[#0A0A0A] 
        border border-[#2A2A2A] 
        text-white 
        placeholder:text-gray-500
        focus:ring-2 focus:ring-orange-500/50 
        focus:border-orange-500/50
        ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      light: `
        bg-white 
        border border-gray-300 
        text-gray-900
        placeholder:text-gray-400
        focus:ring-2 focus:ring-blue-500
        focus:border-transparent
        ${error ? 'border-red-500 focus:ring-red-500' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100
      `
    };
    
    // Size styles
    const sizeStyles = {
      sm: startIcon || endIcon ? 'py-1.5 text-sm' : 'px-3 py-1.5 text-sm',
      md: startIcon || endIcon ? 'py-2.5 text-base' : 'px-4 py-2.5 text-base',
      lg: startIcon || endIcon ? 'py-3 text-lg' : 'px-5 py-3 text-lg'
    };
    
    const iconPadding = {
      sm: { left: startIcon ? 'pl-9' : '', right: endIcon ? 'pr-9' : '' },
      md: { left: startIcon ? 'pl-11' : '', right: endIcon ? 'pr-11' : '' },
      lg: { left: startIcon ? 'pl-12' : '', right: endIcon ? 'pr-12' : '' }
    };
    
    const iconSize = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };
    
    const iconPosition = {
      sm: { left: 'left-3', right: 'right-3' },
      md: { left: 'left-3.5', right: 'right-3.5' },
      lg: { left: 'left-4', right: 'right-4' }
    };
    
    const labelId = label ? `${props.id || Math.random().toString(36)}-label` : undefined;
    
    return (
      <div className="w-full">
        {label && (
          <label
            id={labelId}
            htmlFor={props.id}
            className={`block text-sm font-medium mb-2 ${
              variant === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {startIcon && (
            <div
              className={`absolute ${iconPosition[size].left} top-1/2 -translate-y-1/2 ${iconSize[size]} ${
                variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
              } pointer-events-none flex items-center justify-center`}
            >
              {startIcon}
            </div>
          )}
          
          <input
            ref={ref}
            type={type}
            disabled={disabled}
            required={required}
            aria-invalid={error}
            aria-describedby={
              errorMessage ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            className={`
              ${baseStyles}
              ${variantStyles[variant]}
              ${sizeStyles[size]}
              ${iconPadding[size].left}
              ${iconPadding[size].right}
              ${className}
            `.replace(/\s+/g, ' ').trim()}
            onChange={handleChange}
            {...props}
          />
          
          {endIcon && (
            <div
              className={`absolute ${iconPosition[size].right} top-1/2 -translate-y-1/2 ${iconSize[size]} ${
                variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
              } pointer-events-none flex items-center justify-center`}
            >
              {endIcon}
            </div>
          )}
        </div>
        
        {errorMessage && (
          <p
            id={`${props.id}-error`}
            className="mt-1.5 text-sm text-red-500"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        
        {helperText && !errorMessage && (
          <p
            id={`${props.id}-helper`}
            className={`mt-1.5 text-sm ${
              variant === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';