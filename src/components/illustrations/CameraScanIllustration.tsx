import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Rect, Path, Defs, LinearGradient, Stop, G, Circle, Line } from "react-native-svg";

interface CameraScanIllustrationProps {
  size?: number;
  animated?: boolean;
}

export default function CameraScanIllustration({ size = 200, animated = true }: CameraScanIllustrationProps) {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    // Scanning line animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Float animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -5,
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

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="phoneGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#1e293b" />
              <Stop offset="100%" stopColor="#334155" />
            </LinearGradient>
            <LinearGradient id="screenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#667eea" />
              <Stop offset="100%" stopColor="#764ba2" />
            </LinearGradient>
            <LinearGradient id="docGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="100%" stopColor="#f1f5f9" />
            </LinearGradient>
            <LinearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4facfe" />
              <Stop offset="100%" stopColor="#00f2fe" />
            </LinearGradient>
          </Defs>

          {/* Document behind */}
          <G transform="translate(55, 55) rotate(10)">
            <Rect
              x="-18"
              y="-22"
              width="36"
              height="44"
              rx="3"
              fill="url(#docGradient)"
            />
            {/* Document lines */}
            <Line x1="-12" y1="-14" x2="12" y2="-14" stroke="#cbd5e1" strokeWidth="2" />
            <Line x1="-12" y1="-8" x2="8" y2="-8" stroke="#cbd5e1" strokeWidth="2" />
            <Line x1="-12" y1="-2" x2="10" y2="-2" stroke="#cbd5e1" strokeWidth="2" />
            <Line x1="-12" y1="4" x2="6" y2="4" stroke="#cbd5e1" strokeWidth="2" />
            <Line x1="-12" y1="10" x2="12" y2="10" stroke="#cbd5e1" strokeWidth="2" />
            <Line x1="-12" y1="16" x2="4" y2="16" stroke="#cbd5e1" strokeWidth="2" />
          </G>

          {/* Phone */}
          <G transform="translate(35, 40)">
            {/* Phone body */}
            <Rect
              x="-20"
              y="-30"
              width="40"
              height="60"
              rx="6"
              fill="url(#phoneGradient)"
            />
            {/* Screen */}
            <Rect
              x="-17"
              y="-26"
              width="34"
              height="52"
              rx="3"
              fill="url(#screenGradient)"
              opacity={0.3}
            />
            {/* Camera lens */}
            <Circle cx="0" cy="-23" r="3" fill="#1e293b" />
            <Circle cx="0" cy="-23" r="2" fill="#60a5fa" opacity={0.8} />
            
            {/* Scan corners */}
            <G stroke="#4facfe" strokeWidth="2" fill="none">
              <Path d="M-14 -18 L-14 -12 M-14 -18 L-8 -18" />
              <Path d="M14 -18 L14 -12 M14 -18 L8 -18" />
              <Path d="M-14 18 L-14 12 M-14 18 L-8 18" />
              <Path d="M14 18 L14 12 M14 18 L8 18" />
            </G>
          </G>

          {/* AI Particles */}
          <G>
            <Circle cx="70" cy="25" r="3" fill="url(#aiGradient)" opacity={0.9} />
            <Circle cx="80" cy="35" r="2" fill="url(#aiGradient)" opacity={0.7} />
            <Circle cx="75" cy="45" r="2.5" fill="url(#aiGradient)" opacity={0.8} />
            <Circle cx="85" cy="50" r="1.5" fill="url(#aiGradient)" opacity={0.6} />
            <Circle cx="78" cy="60" r="2" fill="url(#aiGradient)" opacity={0.7} />
            
            {/* Sparkle paths */}
            <Path
              d="M72 30 L75 28 L78 30 L75 32 Z"
              fill="#ffffff"
              opacity={0.8}
            />
            <Path
              d="M82 42 L84 40 L86 42 L84 44 Z"
              fill="#ffffff"
              opacity={0.6}
            />
          </G>

          {/* Magic sparkles around phone */}
          <Circle cx="18" cy="20" r="1.5" fill="#f093fb" opacity={0.7} />
          <Circle cx="12" cy="55" r="2" fill="#667eea" opacity={0.6} />
          <Circle cx="58" cy="75" r="1.5" fill="#4facfe" opacity={0.7} />
        </Svg>
      </Animated.View>
    </View>
  );
}




