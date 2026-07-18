/**
 * Button Component Exports
 * 
 * Central export point for all button components
 * 
 * @example
 * import { PrimaryButton, SecondaryButton, DangerButton, IconButton } from '@/components/ui/button';
 */

export { PrimaryButton } from './PrimaryButton';
export type { PrimaryButtonProps } from './PrimaryButton';

export { SecondaryButton } from './SecondaryButton';
export type { SecondaryButtonProps } from './SecondaryButton';

export { DangerButton } from './DangerButton';
export type { DangerButtonProps } from './DangerButton';

export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';

export { StandardButton } from './StandardButton';
export type { StandardButtonProps } from './StandardButton';

// Re-export for convenience
export { PrimaryButton as Primary } from './PrimaryButton';
export { SecondaryButton as Secondary } from './SecondaryButton';
export { DangerButton as Danger } from './DangerButton';
export { IconButton as Icon } from './IconButton';

// Backwards compatibility - generic Button defaults to PrimaryButton
export { PrimaryButton as Button } from './PrimaryButton';
