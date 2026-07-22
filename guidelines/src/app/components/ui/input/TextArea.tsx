import React from 'react';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Visual variant of the textarea
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
   * Helper text to display below textarea
   */
  helperText?: string;
  
  /**
   * Label for the textarea (optional, can be handled externally)
   */
  label?: string;
  
  /**
   * Whether the field is required
   */
  required?: boolean;
  
  /**
   * Whether to allow resizing
   * @default 'vertical'
   */
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

/**
 * TextArea Component
 * 
 * A flexible textarea component for multi-line text input.
 * Supports multiple variants, error states, and helper text.
 * 
 * @example
 * // Dark variant (default)
 * <TextArea placeholder="Enter description" rows={4} />
 * 
 * @example
 * // With label and required
 * <TextArea 
 *   label="Description" 
 *   required 
 *   rows={5}
 * />
 * 
 * @example
 * // With error state
 * <TextArea 
 *   error 
 *   errorMessage="Description is required"
 *   value={value}
 *   onChange={handleChange}
 * />
 */
export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      variant = 'dark',
      error = false,
      errorMessage,
      helperText,
      label,
      required,
      resize = 'vertical',
      className = '',
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
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
    
    // Resize styles
    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize'
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
        
        <textarea
          ref={ref}
          disabled={disabled}
          required={required}
          rows={rows}
          aria-invalid={error}
          aria-describedby={
            errorMessage ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
          }
          className={`
            ${baseStyles}
            ${variantStyles[variant]}
            ${resizeStyles[resize]}
            px-4 py-3 text-base
            ${className}
          `.replace(/\s+/g, ' ').trim()}
          {...props}
        />
        
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

TextArea.displayName = 'TextArea';
