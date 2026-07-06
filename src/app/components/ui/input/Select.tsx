import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Visual variant of the select
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
   * Helper text to display below select
   */
  helperText?: string;
  
  /**
   * Label for the select (optional, can be handled externally)
   */
  label?: string;
  
  /**
   * Whether the field is required
   */
  required?: boolean;
  
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Options for the select (alternative to children)
   */
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

/**
 * Select Component
 * 
 * A flexible select dropdown component with multiple variants and sizes.
 * Supports options as prop or children, error states, and helper text.
 * 
 * @example
 * // Dark variant (default) with options prop
 * <Select 
 *   options={[
 *     { value: 'option1', label: 'Option 1' },
 *     { value: 'option2', label: 'Option 2' }
 *   ]}
 * />
 * 
 * @example
 * // With label and required
 * <Select label="Country" required>
 *   <option value="">Select a country</option>
 *   <option value="us">United States</option>
 *   <option value="ca">Canada</option>
 * </Select>
 * 
 * @example
 * // With error state
 * <Select 
 *   error 
 *   errorMessage="Please select an option"
 *   value={value}
 *   onChange={handleChange}
 * >
 *   <option value="">Choose...</option>
 *   <option value="1">Option 1</option>
 * </Select>
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      variant = 'dark',
      error = false,
      errorMessage,
      helperText,
      label,
      required,
      size = 'md',
      options,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = 'w-full rounded-xl transition-all outline-none appearance-none cursor-pointer';
    
    // Variant styles
    const variantStyles = {
      dark: `
        bg-[#0A0A0A] 
        border border-[#2A2A2A] 
        text-white 
        focus:ring-2 focus:ring-orange-500/50 
        focus:border-orange-500/50
        ${error ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      light: `
        bg-white 
        border border-gray-300 
        text-gray-900
        focus:ring-2 focus:ring-blue-500
        focus:border-transparent
        ${error ? 'border-red-500 focus:ring-red-500' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100
      `
    };
    
    // Size styles (with padding for chevron icon)
    const sizeStyles = {
      sm: 'px-3 py-1.5 pr-8 text-sm',
      md: 'px-4 py-2.5 pr-10 text-base',
      lg: 'px-5 py-3 pr-12 text-lg'
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
          <select
            ref={ref}
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
              ${className}
            `.replace(/\s+/g, ' ').trim()}
            {...props}
          >
            {options
              ? options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))
              : children}
          </select>
          
          {/* Chevron Icon */}
          <div
            className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
              variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            <svg
              className={size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
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

Select.displayName = 'Select';
