import { Dimensions, Platform, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard iPhone SE (375x667)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 667;

/**
 * Scales a size based on screen width.
 * Best for: font sizes, horizontal margins, paddings, icon sizes.
 */
export const scale = (size: number) => {
  const factor = Math.min(SCREEN_WIDTH / guidelineBaseWidth, 1.18); 
  return factor * size;
};

/**
 * Scales a size based on screen height.
 * Best for: vertical margins, paddings, heights.
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Moderate scale with a factor to control how aggressive the scaling is.
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Use this for absolute pixel values if needed (e.g. border width).
 */
export const pixelScale = (size: number) => {
  const newSize = (SCREEN_WIDTH / guidelineBaseWidth) * size;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};
