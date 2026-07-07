import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /**
   * Visual variant of the checkbox
   * @default 'dark'
   */
  variant?: 'dark' | 'light';
  
  /**
   * Label text for the checkbox
   */
  label?: React.ReactNode;
  
  /**
   * Description text below the label
   */
  description?: string;
  
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Error state
   */
  error?: boolean;
  
  /**
   * Error message to display
   */
  errorMessage?: string;
}

/**
 * Checkbox Component
 * 
 * A flexible checkbox component with label, description, and multiple variants.
 * Supports dark and light themes, different sizes, and error states.
 * 
 * @example
 * // Simple checkbox
 * <Checkbox label="I agree to the terms" />
 * 
 * @example
 * // With description
 * <Checkbox 
 *   label="Send notifications"
 *   description="Receive email alerts for important updates"
 * />
 * 
 * @example
 * // Controlled with error
 * <Checkbox 
 *   checked={checked}
 *   onChange={(e) => setChecked(e.target.checked)}
 *   label="Required field"
 *   error={!checked}
 *   errorMessage="You must accept this"
 * />
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      variant = 'dark',
      label,
      description,
      size = 'md',
      error = false,
      errorMessage,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = 'rounded border transition-all cursor-pointer focus:ring-2 focus:ring-offset-0';
    
    // Variant styles
    const variantStyles = {
      dark: `
        bg-[#0A0A0A] 
        border-[#2A2A2A]
        text-orange-600
        focus:ring-orange-500/50
        checked:bg-orange-600
        checked:border-orange-600
        ${error ? 'border-red-500' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed
      `,
      light: `
        bg-white
        border-gray-300
        text-blue-600
        focus:ring-blue-500
        checked:bg-blue-600
        checked:border-blue-600
        ${error ? 'border-red-500' : ''}
        disabled:opacity-50 disabled:cursor-not-allowed
      `
    };
    
    // Size styles
    const sizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6'
    };
    
    const labelSizeStyles = {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg'
    };
    
    const descriptionSizeStyles = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };
    
    const checkboxId = props.id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;
    
    const CheckboxInput = (
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        disabled={disabled}
        aria-invalid={error}
        aria-describedby={errorMessage ? `${checkboxId}-error` : undefined}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `.replace(/\s+/g, ' ').trim()}
        {...props}
      />
    );
    
    if (!label && !description) {
      return (
        <div>
          {CheckboxInput}
          {errorMessage && (
            <p
              id={`${checkboxId}-error`}
              className="mt-1.5 text-sm text-red-500"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </div>
      );
    }
    
    return (
      <div>
        <label
          htmlFor={checkboxId}
          className={`flex items-start gap-3 cursor-pointer ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="flex items-center h-5 mt-0.5">
            {CheckboxInput}
          </div>
          
          {(label || description) && (
            <div className="flex-1">
              {label && (
                <div
                  className={`font-medium ${labelSizeStyles[size]} ${
                    variant === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {label}
                </div>
              )}
              {description && (
                <div
                  className={`${descriptionSizeStyles[size]} mt-0.5 ${
                    variant === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {description}
                </div>
              )}
            </div>
          )}
        </label>
        
        {errorMessage && (
          <p
            id={`${checkboxId}-error`}
            className="mt-1.5 text-sm text-red-500 ml-8"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
