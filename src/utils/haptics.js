export const haptics = {
  light: () => navigator.vibrate?.(10),
  medium: () => navigator.vibrate?.(25),
  heavy: () => navigator.vibrate?.(40),
  swipeRight: () => navigator.vibrate?.(15),
  match: () => navigator.vibrate?.([50, 30, 50]),
  shakeUp: () => navigator.vibrate?.([20, 15, 20, 15, 40]),
  lockIn: () => navigator.vibrate?.([30, 50, 30, 50, 80]),
  thresholdCross: () => navigator.vibrate?.(8),
};
