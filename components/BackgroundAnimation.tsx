import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const DROP_COUNT = 18;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function BackgroundAnimation() {
  const drops = useRef(
    [...Array(DROP_COUNT)].map(() => ({
      x:        randomBetween(0, width),
      y:        new Animated.Value(randomBetween(-height, -20)),
      w:        randomBetween(2, 5),
      h:        randomBetween(14, 32),
      opacity:  randomBetween(0.06, 0.22),
      duration: randomBetween(1600, 3800),
      delay:    randomBetween(0, 3000),
    }))
  ).current;

  useEffect(() => {
    drops.forEach((drop) => {
      const animate = () => {
        drop.y.setValue(randomBetween(-60, -20));
        Animated.timing(drop.y, {
          toValue:  height + 40,
          duration: drop.duration,
          delay:    drop.delay,
          easing:   Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          drop.delay = 0; // only delay on first run
          animate();
        });
      };
      animate();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((drop, i) => (
        <Animated.View
          key={i}
          style={[
            styles.drop,
            {
              left:    drop.x,
              width:   drop.w,
              height:  drop.h,
              opacity: drop.opacity,
              borderRadius: drop.w / 2,
              transform: [{ translateY: drop.y }],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  drop: {
    position:        'absolute',
    backgroundColor: '#2EC4B6',
    // Teardrop: rounded top, pointed-ish bottom via borderRadius asymmetry
    borderTopLeftRadius:     50,
    borderTopRightRadius:    50,
    borderBottomLeftRadius:  2,
    borderBottomRightRadius: 2,
  },
});
