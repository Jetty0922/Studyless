import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, G, Circle, Rect } from "react-native-svg";

interface NotificationIllustrationProps {
  size?: number;
  animated?: boolean;
}

export default function NotificationIllustration({ size = 200, animated = true }: NotificationIllustrationProps) {
  const ringAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    // Ring/shake animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(ringAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
      ])
    ).start();

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animated]);

  const rotation = ringAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-5deg", "0deg", "5deg"],
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }, { rotate: rotation }] }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="bellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#667eea" />
              <Stop offset="50%" stopColor="#764ba2" />
              <Stop offset="100%" stopColor="#f093fb" />
            </LinearGradient>
            <LinearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="100%" stopColor="#f1f5f9" />
            </LinearGradient>
            <LinearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ef4444" />
              <Stop offset="100%" stopColor="#f87171" />
            </LinearGradient>
            <LinearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4facfe" />
              <Stop offset="100%" stopColor="#00f2fe" />
            </LinearGradient>
          </Defs>

          {/* Sound waves */}
          <G opacity={0.4}>
            <Path
              d="M20 35 Q15 50 20 65"
              stroke="url(#waveGradient)"
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M12 30 Q5 50 12 70"
              stroke="url(#waveGradient)"
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M80 35 Q85 50 80 65"
              stroke="url(#waveGradient)"
              strokeWidth="2"
              fill="none"
            />
            <Path
              d="M88 30 Q95 50 88 70"
              stroke="url(#waveGradient)"
              strokeWidth="2"
              fill="none"
            />
          </G>

          {/* Bell body */}
          <G transform="translate(50, 50)">
            {/* Bell shadow */}
            <Path
              d="M-22 5 C-22 -15 -15 -28 0 -28 C15 -28 22 -15 22 5 L25 5 C25 10 -25 10 -25 5 Z"
              fill="#000000"
              opacity={0.1}
              transform="translate(2, 3)"
            />
            
            {/* Main bell */}
            <Path
              d="M-22 5 C-22 -15 -15 -28 0 -28 C15 -28 22 -15 22 5 L25 5 C25 10 -25 10 -25 5 Z"
              fill="url(#bellGradient)"
            />
            
            {/* Bell highlight */}
            <Path
              d="M-15 -5 C-15 -18 -8 -24 0 -24"
              stroke="#ffffff"
              strokeWidth="3"
              fill="none"
              opacity={0.4}
              strokeLinecap="round"
            />
            
            {/* Bell clapper */}
            <Circle cx="0" cy="15" r="5" fill="#475569" />
            
            {/* Bell top */}
            <Circle cx="0" cy="-28" r="4" fill="url(#bellGradient)" />
          </G>

          {/* Clock overlay */}
          <G transform="translate(65, 30)">
            <Circle cx="0" cy="0" r="14" fill="url(#clockGradient)" />
            <Circle cx="0" cy="0" r="12" fill="none" stroke="#667eea" strokeWidth="1.5" />
            {/* Clock hands */}
            <Path d="M0 0 L0 -7" stroke="#667eea" strokeWidth="2" strokeLinecap="round" />
            <Path d="M0 0 L5 2" stroke="#764ba2" strokeWidth="1.5" strokeLinecap="round" />
            <Circle cx="0" cy="0" r="1.5" fill="#667eea" />
            
            {/* Hour markers */}
            <Circle cx="0" cy="-9" r="1" fill="#94a3b8" />
            <Circle cx="9" cy="0" r="1" fill="#94a3b8" />
            <Circle cx="0" cy="9" r="1" fill="#94a3b8" />
            <Circle cx="-9" cy="0" r="1" fill="#94a3b8" />
          </G>

          {/* Notification badge */}
          <G transform="translate(30, 28)">
            <Circle cx="0" cy="0" r="8" fill="url(#badgeGradient)" />
            <Path
              d="M-3 0 L-1 2 L4 -3"
              stroke="#ffffff"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </G>

          {/* Decorative sparkles */}
          <Circle cx="25" cy="80" r="2" fill="#f093fb" opacity={0.7} />
          <Circle cx="75" cy="78" r="1.5" fill="#667eea" opacity={0.6} />
          <Circle cx="15" cy="50" r="2" fill="#4facfe" opacity={0.5} />
          <Circle cx="85" cy="55" r="1.5" fill="#764ba2" opacity={0.6} />

          {/* Stars */}
          <Path
            d="M82 82 L83 85 L86 85 L84 87 L85 90 L82 88 L79 90 L80 87 L78 85 L81 85 Z"
            fill="#fbbf24"
            opacity={0.8}
          />
          <Path
            d="M18 18 L19 20 L21 20 L20 21 L20.5 23 L18 22 L15.5 23 L16 21 L15 20 L17 20 Z"
            fill="#fbbf24"
            opacity={0.6}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}




