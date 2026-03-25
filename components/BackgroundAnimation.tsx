import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function BackgroundAnimation() {
  const bubbles = useRef([...Array(6)].map(() => ({
    x: new Animated.Value(Math.random() * width),
    y: new Animated.Value(height + Math.random() * 100),
    size: Math.random() * 100 + 50,
    opacity: Math.random() * 0.15 + 0.05,
    duration: Math.random() * 8000 + 4000,
  }))).current;

  useEffect(() => {
    bubbles.forEach((bubble) => {
      const animate = () => {
        bubble.y.setValue(height + 100);
        Animated.timing(bubble.y, {
          toValue: -150,
          duration: bubble.duration,
          useNativeDriver: true,
        }).start(() => animate());
      };
      animate();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bubbles.map((bubble, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bubble,
            {
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.size / 2,
              opacity: bubble.opacity,
              transform: [
                { translateX: bubble.x },
                { translateY: bubble.y },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    backgroundColor: '#2EC4B6',
  },
});
