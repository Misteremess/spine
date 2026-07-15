/**
 * Animaciones de entrada reutilizables para toda la app. Usan el API Animated
 * nativo de React Native (sin dependencias extra) con el driver nativo, así que
 * son fluidas y no bloquean el hilo de JS.
 */
import { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

/** Aparece con un leve ascenso. `delay` permite escalonar listas. */
export function FadeInUp({
  children,
  delay = 0,
  distance = 12,
  duration = 420,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: ViewStyle;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [v, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            {
              translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Escala + fundido suave, ideal para tarjetas y cifras destacadas. */
export function PopIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(v, {
      toValue: 1,
      delay,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [v, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
