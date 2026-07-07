import React, { useState } from 'react';
import { Search, Mail, Lock, DollarSign } from 'lucide-react';
import {
  TextInput,
  TextArea,
  Select,
  Checkbox,
  ToggleSwitch,
  NumberInput
} from './index';
import { PrimaryButton, SecondaryButton } from '../button';

/**
 * InputComponentShowcase
 * 
 * Visual demonstration of all input components with different variants and states.
 * Use this component to test and preview all input components in isolation.
 * 
 * To use: Import this component into any page for testing
 */
export function InputComponentShowcase() {
  const [textValue, setTextValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [toggleValue, setToggleValue] = useState(true);
  const [numberValue, setNumberValue] = useState(5);
  const [priceValue, setPriceValue] = useState(99.99);

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-3">
            Input Component Showcase
          </h1>
          <p className="text-gray-400">
            Visual demonstration of all input components with dark and light variants
          </p>
        </div>

        {/* TextInput Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white border-b border-[#2A2A2A] pb-2">
            TextInput
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Basic</h3>
              <TextInput 
                placeholder="Enter text..."
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
              />
            </div>

            {/* With Label */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Label</h3>
              <TextInput 
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>

            {/* With Start Icon */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Start Icon</h3>
              <TextInput 
                startIcon={<Search className="w-4 h-4" />}
                placeholder="Search..."
              />
            </div>

            {/* With End Icon */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With End Icon</h3>
              <TextInput 
                type="email"
                endIcon={<Mail className="w-4 h-4" />}
                placeholder="Email address"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
              />
            </div>

            {/* With Error */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Error</h3>
              <TextInput 
                label="Password"
                type="password"
                error
                errorMessage="Password must be at least 8 characters"
                startIcon={<Lock className="w-4 h-4" />}
              />
            </div>

            {/* With Helper Text */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Helper Text</h3>
              <TextInput 
                label="Username"
                helperText="Only letters, numbers, and underscores"
                placeholder="johndoe"
              />
            </div>

            {/* Small Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Small Size</h3>
              <TextInput 
                size="sm"
                placeholder="Small input"
              />
            </div>

            {/* Large Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Large Size</h3>
              <TextInput 
                size="lg"
                placeholder="Large input"
              />
            </div>

            {/* Light Variant */}
            <div className="bg-white p-4 rounded-xl">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Light Variant</h3>
              <TextInput 
                variant="light"
                placeholder="Light theme input"
              />
            </div>

            {/* Disabled */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Disabled</h3>
              <TextInput 
                placeholder="Disabled input"
                disabled
                value="Cannot edit"
              />
            </div>
          </div>
        </section>

        {/* TextArea Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white border-b border-[#2A2A2A] pb-2">
            TextArea
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Basic</h3>
              <TextArea 
                placeholder="Enter description..."
                rows={4}
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
              />
            </div>

            {/* With Label */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Label & Required</h3>
              <TextArea 
                label="Project Description"
                required
                rows={4}
                placeholder="Describe your project..."
              />
            </div>

            {/* With Error */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Error</h3>
              <TextArea 
                label="Notes"
                error
                errorMessage="This field is required"
                rows={4}
              />
            </div>

            {/* With Character Count */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Character Count</h3>
              <TextArea 
                label="Bio"
                helperText={`${textareaValue.length}/500 characters`}
                rows={4}
                value={textareaValue}
                onChange={(e) => setTextareaValue(e.target.value)}
              />
            </div>

            {/* No Resize */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">No Resize</h3>
              <TextArea 
                resize="none"
                rows={3}
                placeholder="Cannot resize this textarea"
              />
            </div>

            {/* Light Variant */}
            <div className="bg-white p-4 rounded-xl">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Light Variant</h3>
              <TextArea 
                variant="light"
                rows={3}
                placeholder="Light theme textarea"
              />
            </div>
          </div>
        </section>

        {/* Select Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white border-b border-[#2A2A2A] pb-2">
            Select
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic with Options Prop */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Basic (Options Prop)</h3>
              <Select 
                options={[
                  { value: '', label: 'Select an option' },
                  { value: 'option1', label: 'Option 1' },
                  { value: 'option2', label: 'Option 2' },
                  { value: 'option3', label: 'Option 3' }
                ]}
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
              />
            </div>

            {/* With Children */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Children</h3>
              <Select>
                <option value="">Choose...</option>
                <option value="us">United States</option>
                <option value="ca">Canada</option>
                <option value="uk">United Kingdom</option>
              </Select>
            </div>

            {/* With Label */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Label & Required</h3>
              <Select 
                label="Country"
                required
              >
                <option value="">Select a country</option>
                <option value="us">United States</option>
                <option value="ca">Canada</option>
              </Select>
            </div>

            {/* With Error */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Error</h3>
              <Select 
                label="Status"
                error
                errorMessage="Please select a status"
              >
                <option value="">Select status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>

            {/* Small Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Small Size</h3>
              <Select 
                size="sm"
                options={[
                  { value: '1', label: 'Small Option 1' },
                  { value: '2', label: 'Small Option 2' }
                ]}
              />
            </div>

            {/* Large Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Large Size</h3>
              <Select 
                size="lg"
                options={[
                  { value: '1', label: 'Large Option 1' },
                  { value: '2', label: 'Large Option 2' }
                ]}
              />
            </div>

            {/* Light Variant */}
            <div className="bg-white p-4 rounded-xl">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Light Variant</h3>
              <Select 
                variant="light"
              >
                <option value="">Select...</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
              </Select>
            </div>

            {/* Disabled */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Disabled</h3>
              <Select disabled>
                <option value="">Cannot select</option>
              </Select>
            </div>
          </div>
        </section>

        {/* Checkbox Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white border-b border-[#2A2A2A] pb-2">
            Checkbox
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Basic</h3>
              <Checkbox />
            </div>

            {/* With Label */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Label</h3>
              <Checkbox 
                label="I agree to the terms and conditions"
                checked={checkboxValue}
                onChange={(e) => setCheckboxValue(e.target.checked)}
              />
            </div>

            {/* With Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Description</h3>
              <Checkbox 
                label="Email Notifications"
                description="Receive email alerts for important updates and announcements"
              />
            </div>

            {/* With Error */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Error</h3>
              <Checkbox 
                label="Required field"
                error
                errorMessage="You must accept this to continue"
              />
            </div>

            {/* Small Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Small Size</h3>
              <Checkbox 
                size="sm"
                label="Small checkbox"
              />
            </div>

            {/* Large Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Large Size</h3>
              <Checkbox 
                size="lg"
                label="Large checkbox"
              />
            </div>

            {/* Light Variant */}
            <div className="bg-white p-4 rounded-xl">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Light Variant</h3>
              <Checkbox 
                variant="light"
                label="Light theme checkbox"
              />
            </div>

            {/* Disabled */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Disabled</h3>
              <Checkbox 
                label="Disabled checkbox"
                disabled
                checked
              />
            </div>
          </div>
        </section>

        {/* ToggleSwitch Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white border-b border-[#2A2A2A] pb-2">
            ToggleSwitch
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Basic</h3>
              <ToggleSwitch 
                checked={toggleValue}
                onChange={(e) => setToggleValue(e.target.checked)}
              />
            </div>

            {/* With Label */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Label</h3>
              <ToggleSwitch 
                label="Enable notifications"
              />
            </div>

            {/* With Description */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Description</h3>
              <ToggleSwitch 
                label="Auto Backup"
                description="Automatically backup your data every day at 3:00 AM"
                defaultChecked
              />
            </div>

            {/* Label on Right */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Label on Right</h3>
              <ToggleSwitch 
                label="Notifications"
                labelPosition="right"
              />
            </div>

            {/* Small Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Small Size</h3>
              <ToggleSwitch 
                size="sm"
                label="Small toggle"
              />
            </div>

            {/* Large Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Large Size</h3>
              <ToggleSwitch 
                size="lg"
                label="Large toggle"
              />
            </div>

            {/* Blue Color */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Blue Color</h3>
              <ToggleSwitch 
                color="blue"
                label="Blue toggle"
                defaultChecked
              />
            </div>

            {/* Green Color */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Green Color</h3>
              <ToggleSwitch 
                color="green"
                label="Green toggle"
                defaultChecked
              />
            </div>

            {/* Disabled */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Disabled</h3>
              <ToggleSwitch 
                label="Disabled toggle"
                disabled
                checked
              />
            </div>
          </div>
        </section>

        {/* NumberInput Examples */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white border-b border-[#2A2A2A] pb-2">
            NumberInput
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Basic</h3>
              <NumberInput 
                placeholder="Enter number"
              />
            </div>

            {/* With Label */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Label & Min/Max</h3>
              <NumberInput 
                label="Age"
                min={0}
                max={120}
              />
            </div>

            {/* With Buttons */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Buttons</h3>
              <NumberInput 
                label="Quantity"
                showButtons
                min={0}
                value={numberValue}
                onChange={(e) => setNumberValue(Number(e.target.value))}
              />
            </div>

            {/* With Unit (Left) */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Unit (Left)</h3>
              <NumberInput 
                label="Price"
                unit="$"
                unitPosition="left"
                step={0.01}
                value={priceValue}
                onChange={(e) => setPriceValue(Number(e.target.value))}
              />
            </div>

            {/* With Unit (Right) */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Unit (Right)</h3>
              <NumberInput 
                label="Weight"
                unit="kg"
                unitPosition="right"
                step={0.1}
              />
            </div>

            {/* Percentage */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Percentage</h3>
              <NumberInput 
                label="Discount"
                unit="%"
                unitPosition="right"
                min={0}
                max={100}
                step={1}
              />
            </div>

            {/* Small Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Small Size</h3>
              <NumberInput 
                size="sm"
                showButtons
                value={5}
              />
            </div>

            {/* Large Size */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">Large Size</h3>
              <NumberInput 
                size="lg"
                showButtons
                value={10}
              />
            </div>

            {/* With Error */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">With Error</h3>
              <NumberInput 
                label="Amount"
                error
                errorMessage="Value must be positive"
                unit="$"
                unitPosition="left"
              />
            </div>

            {/* Light Variant */}
            <div className="bg-white p-4 rounded-xl">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Light Variant</h3>
              <NumberInput 
                variant="light"
                showButtons
                value={5}
              />
            </div>
          </div>
        </section>

        {/* Form Example */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white border-b border-[#2A2A2A] pb-2">
            Complete Form Example
          </h2>
          
          <div className="bg-[#1A1A1A] p-8 rounded-2xl border border-[#2A2A2A] max-w-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Contact Information</h3>
            
            <div className="space-y-5">
              <TextInput 
                label="Full Name"
                required
                placeholder="John Doe"
              />
              
              <TextInput 
                label="Email Address"
                type="email"
                required
                endIcon={<Mail className="w-4 h-4" />}
                placeholder="john@example.com"
              />
              
              <Select 
                label="Country"
                required
              >
                <option value="">Select a country</option>
                <option value="us">United States</option>
                <option value="ca">Canada</option>
                <option value="uk">United Kingdom</option>
              </Select>
              
              <NumberInput 
                label="Phone Number"
                placeholder="(555) 123-4567"
              />
              
              <TextArea 
                label="Message"
                required
                rows={5}
                placeholder="How can we help you?"
              />
              
              <Checkbox 
                label="Subscribe to newsletter"
                description="Receive updates about new features and products"
              />
              
              <ToggleSwitch 
                label="Send me promotional emails"
                description="Get special offers and discounts"
              />
              
              <div className="flex gap-3 pt-4">
                <PrimaryButton size="lg">
                  Submit
                </PrimaryButton>
                <SecondaryButton size="lg">
                  Cancel
                </SecondaryButton>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default InputComponentShowcase;
