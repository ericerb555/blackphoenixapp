import React from "react";
import { Toaster as Sonner } from "sonner@2.0.3";
import type { ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "#1A1A1A",
          "--normal-text": "#FFFFFF",
          "--normal-border": "#2A2A2A",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
