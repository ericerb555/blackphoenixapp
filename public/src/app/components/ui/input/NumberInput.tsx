import React from 'react';

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
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
   * Label for the input (optional, can be handled externally)
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
   * Unit or prefix to display (e.g., "$", "kg", "%")
   */
  unit?: string;
  
  /**
   * Position of the unit
   * @default 'right'
   */
  unitPosition?: 'left' | 'right';
  
  /**
   * Show increment/decrement buttons
   * @default false
   */
  showButtons?: boolean;
  
  /**
   * Callback when increment button is clicked
   */
  onIncrement?: () => void;
  
  /**
   * Callback when decrement button is clicked
   */
  onDecrement?: () => void;
}

/**
 * NumberInput Component
 * 
 * A flexible number input component with optional increment/decrement buttons,
 * unit display, and all standard input features.
 * 
 * @example
 * // Simple number input
 * <NumberInput placeholder="Enter amount" />
 * 
 * @example
 * // With unit
 * <NumberInput 
 *   label="Price" 
 *   unit="$" 
 *   unitPosition="left"
 *   step="0.01"
 * />
 * 
 * @example
 * // With increment/decrement buttons
 * <NumberInput 
 *   label="Quantity"
 *   value={quantity}
 *   onChange={(e) => setQuantity(Number(e.target.value))}
 *   showButtons
 *   min={0}
 * />
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      variant = 'dark',
      error = false,
      errorMessage,
      helperText,
      label,
      required,
      size = 'md',
      unit,
      unitPosition = 'right',
      showButtons = false,
      onIncrement,
      onDecrement,
      className = '',
      disabled,
      min,
      max,
      step = 1,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    
    React.useImperativeHandle(ref, () => inputRef.current!);
    
    const handleIncrement = () => {
      if (disabled) return;
      
      if (onIncrement) {
        onIncrement();
      } else if (inputRef.current && onChange) {
        const currentValue = Number(inputRef.current.value) || 0;
        const stepValue = Number(step);
        let newValue = currentValue + stepValue;
        
        if (max !== undefined) {
          newValue = Math.min(newValue, Number(max));
        }
        
        const event = {
          target: { ...inputRef.current, value: String(newValue) }
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(event);
      }
    };
    
    const handleDecrement = () => {
      if (disabled) return;
      
      if (onDecrement) {
        onDecrement();
      } else if (inputRef.current && onChange) {
        const currentValue = Number(inputRef.current.value) || 0;
        const stepValue = Number(step);
        let newValue = currentValue - stepValue;
        
        if (min !== undefined) {
          newValue = Math.max(newValue, Number(min));
        }
        
        const event = {
          target: { ...inputRef.current, value: String(newValue) }
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(event);
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
      sm: unit || showButtons ? 'py-1.5 text-sm' : 'px-3 py-1.5 text-sm',
      md: unit || showButtons ? 'py-2.5 text-base' : 'px-4 py-2.5 text-base',
      lg: unit || showButtons ? 'py-3 text-lg' : 'px-5 py-3 text-lg'
    };
    
    const paddingStyles = {
      sm: {
        left: unit && unitPosition === 'left' ? 'pl-10' : showButtons ? 'pl-3' : '',
        right: unit && unitPosition === 'right' ? 'pr-10' : showButtons ? 'pr-16' : ''
      },
      md: {
        left: unit && unitPosition === 'left' ? 'pl-12' : showButtons ? 'pl-4' : '',
        right: unit && unitPosition === 'right' ? 'pr-12' : showButtons ? 'pr-20' : ''
      },
      lg: {
        left: unit && unitPosition === 'left' ? 'pl-14' : showButtons ? 'pl-5' : '',
        right: unit && unitPosition === 'right' ? 'pr-14' : showButtons ? 'pr-24' : ''
      }
    };
    
    const buttonSizeStyles = {
      sm: 'w-7 text-xs',
      md: 'w-9 text-sm',
      lg: 'w-11 text-base'
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
          {unit && unitPosition === 'left' && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
              } font-medium pointer-events-none`}
            >
              {unit}
            </div>
          )}
          
          <input
            ref={inputRef}
            type="number"
            disabled={disabled}
            required={required}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            aria-invalid={error}
            aria-describedby={
              errorMessage ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            className={`
              ${baseStyles}
              ${variantStyles[variant]}
              ${sizeStyles[size]}
              ${paddingStyles[size].left}
              ${paddingStyles[size].right}
              ${className}
            `.replace(/\s+/g, ' ').trim()}
            {...props}
          />
          
          {unit && unitPosition === 'right' && (
            <div
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                variant === 'dark' ? 'text-gray-400' : 'text-gray-500'
              } font-medium pointer-events-none ${showButtons ? 'mr-16' : ''}`}
            >
              {unit}
            </div>
          )}
          
          {showButtons && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
              <button
                type="button"
                onClick={handleIncrement}
                disabled={disabled || (max !== undefined && Number(value) >= Number(max))}
                className={`
                  ${buttonSizeStyles[size]}
                  h-[calc(50%-2px)]
                  flex items-center justify-center
                  ${variant === 'dark' ? 'bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                  rounded
                  transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-1 focus:ring-orange-500
                `}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleDecrement}
                disabled={disabled || (min !== undefined && Number(value) <= Number(min))}
                className={`
                  ${buttonSizeStyles[size]}
                  h-[calc(50%-2px)]
                  flex items-center justify-center
                  ${variant === 'dark' ? 'bg-[#1A1A1A] hover:bg-[#2A2A2A] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
                  rounded
                  transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-1 focus:ring-orange-500
                `}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
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

NumberInput.displayName = 'NumberInput';
