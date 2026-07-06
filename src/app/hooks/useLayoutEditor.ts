/**
 * useLayoutEditor Hook
 * 
 * Custom hook to enable layout editing on any page
 * Automatically manages layout state and persistence
 */

import { useState, useEffect } from 'react';

interface LayoutElement {
  id: string;
  type: string;
  name: string;
  properties: any;
  children?: LayoutElement[];
  locked?: boolean;
}

interface UseLayoutEditorOptions {
  pageName: string;
  defaultElements?: LayoutElement[];
  autoSave?: boolean;
}

export function useLayoutEditor({ 
  pageName, 
  defaultElements = [],
  autoSave = true 
}: UseLayoutEditorOptions) {
  const [elements, setElements] = useState<LayoutElement[]>(defaultElements);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved layout from localStorage
  useEffect(() => {
    const savedLayout = localStorage.getItem(`layout-${pageName}`);
    if (savedLayout) {
      try {
        const parsed = JSON.parse(savedLayout);
        setElements(parsed);
      } catch (error) {
        console.error('Failed to load saved layout:', error);
      }
    }
    setIsLoaded(true);
  }, [pageName]);

  // Auto-save layout
  useEffect(() => {
    if (isLoaded && autoSave && elements.length > 0) {
      const timer = setTimeout(() => {
        localStorage.setItem(`layout-${pageName}`, JSON.stringify(elements));
      }, 1000); // Debounce saves

      return () => clearTimeout(timer);
    }
  }, [elements, isLoaded, autoSave, pageName]);

  // Save layout manually
  const saveLayout = (newElements: LayoutElement[]) => {
    setElements(newElements);
    localStorage.setItem(`layout-${pageName}`, JSON.stringify(newElements));
  };

  // Reset to default
  const resetLayout = () => {
    setElements(defaultElements);
    localStorage.removeItem(`layout-${pageName}`);
  };

  // Export layout
  const exportLayout = () => {
    return JSON.stringify(elements, null, 2);
  };

  // Import layout
  const importLayout = (layoutJson: string) => {
    try {
      const parsed = JSON.parse(layoutJson);
      setElements(parsed);
      localStorage.setItem(`layout-${pageName}`, layoutJson);
      return true;
    } catch (error) {
      console.error('Failed to import layout:', error);
      return false;
    }
  };

  // Get element by ID
  const getElement = (id: string): LayoutElement | undefined => {
    return elements.find(el => el.id === id);
  };

  // Check if element exists
  const hasElement = (id: string): boolean => {
    return elements.some(el => el.id === id);
  };

  // Apply element styles to component
  const getElementStyles = (id: string) => {
    const element = getElement(id);
    if (!element) return {};

    return {
      width: element.properties.width,
      height: element.properties.height,
      backgroundColor: element.properties.backgroundColor,
      color: element.properties.textColor,
      padding: element.properties.padding,
      margin: element.properties.margin,
      borderRadius: element.properties.borderRadius,
      fontSize: element.properties.fontSize,
      fontWeight: element.properties.fontWeight,
      textAlign: element.properties.textAlign,
      display: element.properties.visible === false ? 'none' : undefined
    };
  };

  // Get element text content
  const getElementText = (id: string, fallback: string = '') => {
    const element = getElement(id);
    return element?.properties?.text || fallback;
  };

  return {
    elements,
    saveLayout,
    resetLayout,
    exportLayout,
    importLayout,
    getElement,
    hasElement,
    getElementStyles,
    getElementText,
    isLoaded
  };
}
