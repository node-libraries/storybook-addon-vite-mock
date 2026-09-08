import React from "react";
import "./button.css";
import { Test } from "./test";

/**
 * Primary UI component for user interaction
 */
export const Button = ({ primary, backgroundColor, size, label, ...props }) => {
  const mode = primary
    ? "storybook-button--primary"
    : "storybook-button--secondary";
  const test = Test();
  return (
    <button
      type="button"
      className={["storybook-button", `storybook-button--${size}`, mode].join(
        " "
      )}
      style={backgroundColor && { backgroundColor }}
      {...props}
      onClick={() => {
        props.onClick();
      }}
    >
      {label}
      {test}
    </button>
  );
};
