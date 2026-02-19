/**
 * PremiumGate — PASSTHROUGH
 *
 * The app is now fully free. This component previously blocked access
 * to premium features; it now renders its children unconditionally.
 */
const PremiumGate = ({ children }) => {
  return children || null;
};

export default PremiumGate;
