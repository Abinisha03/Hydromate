import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

// Floating water drop particle
function WaterDrop({ 
  index, 
  size, 
  x, 
  startY, 
  duration, 
  delay,
  opacity 
}: {
  index: number;
  size: number;
  x: number;
  startY: number;
  duration: number;
  delay: number;
  opacity: number;
}) {
  const y = useRef(new Animated.Value(startY)).current;
  const scale = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      y.setValue(startY);
      scale.setValue(0.7);
      fadeAnim.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, {
            toValue: -height * 0.15,
            duration: duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: opacity,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: opacity,
              duration: duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.1,
              duration: duration * 0.5,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.8,
              duration: duration * 0.5,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, []);

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          width: size,
          height: size * 1.3,
          borderRadius: size / 2,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          left: x,
          top: startY,
          opacity: fadeAnim,
          transform: [
            { translateY: y },
            { scale },
            { rotate: '180deg' },
          ],
        },
      ]}
    />
  );
}

// Ripple effect circle
function Ripple({ 
  x, 
  y: yPos, 
  delay, 
  maxSize 
}: { 
  x: number; 
  y: number; 
  delay: number; 
  maxSize: number; 
}) {
  const size = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      size.setValue(0);
      opacity.setValue(0);

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(size, {
            toValue: maxSize,
            duration: 3500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false, // size cannot use native driver
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.12,
              duration: 500,
              useNativeDriver: false,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: false,
            }),
          ]),
        ]),
      ]).start(() => animate());
    };

    animate();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: Animated.divide(size, 2) as any,
        borderWidth: 1.5,
        borderColor: '#2EC4B6',
        left: x,
        top: yPos,
        opacity,
        transform: [
          { translateX: Animated.multiply(size, -0.5) as any },
          { translateY: Animated.multiply(size, -0.5) as any },
        ],
      }}
    />
  );
}

export default function WaterAnimation() {
  const drops = [
    { size: 8, x: width * 0.1, startY: height * 0.6, duration: 6000, delay: 0, opacity: 0.5 },
    { size: 6, x: width * 0.25, startY: height * 0.75, duration: 8000, delay: 1500, opacity: 0.4 },
    { size: 10, x: width * 0.45, startY: height * 0.55, duration: 7000, delay: 800, opacity: 0.55 },
    { size: 7, x: width * 0.65, startY: height * 0.8, duration: 9000, delay: 2500, opacity: 0.35 },
    { size: 9, x: width * 0.8, startY: height * 0.65, duration: 6500, delay: 400, opacity: 0.45 },
    { size: 5, x: width * 0.35, startY: height * 0.7, duration: 10000, delay: 3000, opacity: 0.3 },
    { size: 11, x: width * 0.55, startY: height * 0.85, duration: 7500, delay: 1200, opacity: 0.4 },
    { size: 6, x: width * 0.9, startY: height * 0.5, duration: 8500, delay: 2000, opacity: 0.35 },
  ];

  const ripples = [
    { x: width * 0.15, y: height * 0.35, delay: 0, maxSize: 120 },
    { x: width * 0.75, y: height * 0.55, delay: 2000, maxSize: 90 },
    { x: width * 0.45, y: height * 0.8, delay: 4000, maxSize: 100 },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {ripples.map((r, i) => (
        <Ripple key={`ripple-${i}`} {...r} />
      ))}
      {drops.map((d, i) => (
        <WaterDrop key={`drop-${i}`} index={i} {...d} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
    backgroundColor: '#2EC4B6',
  },
});
