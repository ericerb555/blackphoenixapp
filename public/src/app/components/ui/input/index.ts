/**
 * Input Component Library
 * 
 * A comprehensive collection of form input components for the enterprise application.
 * All components support dark/light variants and follow the app's design system.
 * 
 * Theme: Deep Orange Dark (#ea580c primary, #0A0A0A ultra-dark backgrounds)
 */

// Core Input Components
export { TextInput } from './TextInput';
export type { TextInputProps } from './TextInput';

export { TextArea } from './TextArea';
export type { TextAreaProps } from './TextArea';

export { Select } from './Select';
export type { SelectProps } from './Select';

export { Checkbox } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { ToggleSwitch } from './ToggleSwitch';
export type { ToggleSwitchProps } from './ToggleSwitch';

export { NumberInput } from './NumberInput';
export type { NumberInputProps } from './NumberInput';

/**
 * Usage Examples:
 * 
 * @example TextInput - Basic text input
 * import { TextInput } from './components/ui/input';
 * <TextInput label="Email" type="email" required />
 * 
 * @example TextArea - Multi-line text
 * import { TextArea } from './components/ui/input';
 * <TextArea label="Description" rows={5} />
 * 
 * @example Select - Dropdown select
 * import { Select } from './components/ui/input';
 * <Select label="Country" options={[
 *   { value: 'us', label: 'United States' },
 *   { value: 'ca', label: 'Canada' }
 * ]} />
 * 
 * @example Checkbox - Standard checkbox
 * import { Checkbox } from './components/ui/input';
 * <Checkbox label="I agree to the terms" />
 * 
 * @example ToggleSwitch - iOS-style toggle
 * import { ToggleSwitch } from './components/ui/input';
 * <ToggleSwitch 
 *   label="Enable notifications"
 *   description="Receive email alerts"
 * />
 * 
 * @example NumberInput - Number input with controls
 * import { NumberInput } from './components/ui/input';
 * <NumberInput 
 *   label="Quantity" 
 *   showButtons 
 *   min={0} 
 * />
 */
