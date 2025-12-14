import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Rect, Path, Defs, LinearGradient, Stop, G, Circle, Text as SvgText } from "react-native-svg";

interface CalendarIllustrationProps {
  size?: number;
  animated?: boolean;
}

export default function CalendarIllustration({ size = 200, animated = true }: CalendarIllustrationProps) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -4,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Check animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(checkAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(checkAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animated, checkAnim, floatAnim]);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="calendarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="100%" stopColor="#f1f5f9" />
            </LinearGradient>
            <LinearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#667eea" />
              <Stop offset="100%" stopColor="#764ba2" />
            </LinearGradient>
            <LinearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#10b981" />
              <Stop offset="100%" stopColor="#34d399" />
            </LinearGradient>
            <LinearGradient id="todayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4facfe" />
              <Stop offset="100%" stopColor="#00f2fe" />
            </LinearGradient>
          </Defs>

          {/* Calendar shadow */}
          <Rect
            x="17"
            y="22"
            width="66"
            height="62"
            rx="8"
            fill="#000000"
            opacity={0.1}
          />

          {/* Calendar body */}
          <Rect
            x="15"
            y="18"
            width="66"
            height="62"
            rx="8"
            fill="url(#calendarGradient)"
          />

          {/* Calendar header */}
          <Path
            d="M15 26 L15 24 Q15 18 23 18 L73 18 Q81 18 81 24 L81 32 L15 32 Z"
            fill="url(#headerGradient)"
          />

          {/* Calendar hooks */}
          <Rect x="28" y="14" width="4" height="10" rx="2" fill="#475569" />
          <Rect x="64" y="14" width="4" height="10" rx="2" fill="#475569" />

          {/* Month text placeholder */}
          <SvgText
            x="48"
            y="27"
            fontSize="8"
            fontWeight="bold"
            fill="#ffffff"
            textAnchor="middle"
          >
            DECEMBER
          </SvgText>

          {/* Day grid */}
          <G>
            {/* Row 1 */}
            <Circle cx="26" cy="42" r="4" fill="#e2e8f0" />
            <Circle cx="38" cy="42" r="4" fill="#e2e8f0" />
            <Circle cx="50" cy="42" r="4" fill="url(#checkGradient)" />
            <Path d="M47 42 L49 44 L53 40" stroke="#ffffff" strokeWidth="1.5" fill="none" />
            <Circle cx="62" cy="42" r="4" fill="url(#checkGradient)" />
            <Path d="M59 42 L61 44 L65 40" stroke="#ffffff" strokeWidth="1.5" fill="none" />
            <Circle cx="74" cy="42" r="4" fill="#e2e8f0" />

            {/* Row 2 */}
            <Circle cx="26" cy="54" r="4" fill="url(#checkGradient)" />
            <Path d="M23 54 L25 56 L29 52" stroke="#ffffff" strokeWidth="1.5" fill="none" />
            <Circle cx="38" cy="54" r="4" fill="#e2e8f0" />
            <Circle cx="50" cy="54" r="4" fill="url(#todayGradient)" />
            <Circle cx="62" cy="54" r="4" fill="#e2e8f0" />
            <Circle cx="74" cy="54" r="4" fill="#e2e8f0" />

            {/* Row 3 */}
            <Circle cx="26" cy="66" r="4" fill="#e2e8f0" />
            <Circle cx="38" cy="66" r="4" fill="#e2e8f0" />
            <Circle cx="50" cy="66" r="4" fill="#e2e8f0" />
            <Circle cx="62" cy="66" r="4" fill="#fbbf24" opacity={0.3} />
            <Circle cx="74" cy="66" r="4" fill="#e2e8f0" />
          </G>

          {/* Decorative elements */}
          <Circle cx="88" cy="30" r="2" fill="#f093fb" opacity={0.7} />
          <Circle cx="8" cy="45" r="1.5" fill="#667eea" opacity={0.6} />
          <Circle cx="90" cy="60" r="2.5" fill="#4facfe" opacity={0.7} />
          <Circle cx="10" cy="70" r="2" fill="#764ba2" opacity={0.5} />

          {/* Star decoration */}
          <Path
            d="M85 18 L86 21 L89 21 L87 23 L88 26 L85 24 L82 26 L83 23 L81 21 L84 21 Z"
            fill="#fbbf24"
            opacity={0.8}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}




