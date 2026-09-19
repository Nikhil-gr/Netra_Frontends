import { forwardRef } from "react";

const GlassButton = forwardRef(function GlassButton(
  {
    as: Component = "button",
    variant = "default",
    active = false,
    className = "",
    children,
    ...props
  },
  ref,
) {
  const classes = [
    "netra-glass-btn",
    variant !== "default" ? `netra-glass-btn--${variant}` : "",
    active ? "is-active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component ref={ref} type={Component === "button" ? "button" : undefined} className={classes} {...props}>
      {children}
    </Component>
  );
});

export default GlassButton;
