import React from 'react';

export interface ToggleSwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /**
   * Label text for the toggle
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
   * Color when checked
   * @default 'orange'
   */
  color?: 'orange' | 'blue' | 'green';
  
  /**
   * Label position
   * @default 'left'
   */
  labelPosition?: 'left' | 'right';
}

/**
 * ToggleSwitch Component
 * 
 * A toggle switch component (iOS-style) with label and description.
 * Uses the custom orange toggle pattern found throughout the app.
 * 
 * @example
 * // Simple toggle
 * <ToggleSwitch label="Enable notifications" />
 * 
 * @example
 * // With description
 * <ToggleSwitch 
 *   label="Email Alerts"
 *   description="Receive email alerts for payments"
 * />
 * 
 * @example
 * // Controlled toggle
 * <ToggleSwitch 
 *   checked={enabled}
 *   onChange={(e) => setEnabled(e.target.checked)}
 *   label="Auto backup"
 *   description="Every day at 3:00 AM"
 * />
 */
export const ToggleSwitch = React.forwardRef<HTMLInputElement, ToggleSwitchProps>(
  (
    {
      label,
      description,
      size = 'md',
      color = 'orange',
      labelPosition = 'left',
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const toggleId = props.id || `toggle-${Math.random().toString(36).substring(2, 9)}`;
    
    // Size configurations
    const sizeConfig = {
      sm: {
        switch: 'w-9 h-5',
        thumb: 'h-4 w-4',
        label: 'text-sm',
        description: 'text-xs'
      },
      md: {
        switch: 'w-11 h-6',
        thumb: 'h-5 w-5',
        label: 'text-base',
        description: 'text-sm'
      },
      lg: {
        switch: 'w-14 h-7',
        thumb: 'h-6 w-6',
        label: 'text-lg',
        description: 'text-base'
      }
    };
    
    // Color configurations
    const colorConfig = {
      orange: 'peer-checked:bg-orange-600',
      blue: 'peer-checked:bg-blue-600',
      green: 'peer-checked:bg-green-600'
    };
    
    const ToggleElement = (
      <label
        htmlFor={toggleId}
        className={`relative inline-flex items-center ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <input
          ref={ref}
          type="checkbox"
          id={toggleId}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div
          className={`
            ${sizeConfig[size].switch}
            bg-[#2A2A2A]
            peer-focus:outline-none
            peer-focus:ring-2
            peer-focus:ring-orange-500/50
            rounded-full
            peer
            peer-checked:after:translate-x-full
            peer-checked:after:border-white
            after:content-['']
            after:absolute
            after:top-[2px]
            after:left-[2px]
            after:bg-white
            after:rounded-full
            ${sizeConfig[size].thumb}
            after:transition-all
            ${colorConfig[color]}
            transition-colors
          `.replace(/\s+/g, ' ').trim()}
        />
      </label>
    );
    
    if (!label && !description) {
      return ToggleElement;
    }
    
    return (
      <div
        className={`flex items-center ${
          labelPosition === 'right' ? 'flex-row-reverse' : ''
        } gap-3 ${className}`}
      >
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <div className={`font-medium ${sizeConfig[size].label} text-white`}>
                {label}
              </div>
            )}
            {description && (
              <div className={`${sizeConfig[size].description} mt-0.5 text-gray-400`}>
                {description}
              </div>
            )}
          </div>
        )}
        
        {ToggleElement}
      </div>
    );
  }
);

ToggleSwitch.displayName = 'ToggleSwitch';
