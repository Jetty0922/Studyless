import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import Svg, { Circle, Path, Defs, LinearGradient, Stop, G } from "react-native-svg";

interface BrainIllustrationProps {
  size?: number;
  animated?: boolean;
}

export default function BrainIllustration({ size = 280, animated = true }: BrainIllustrationProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!animated) return;

    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.7,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animated, glowAnim, pulseAnim]);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Glow effect */}
      <Animated.View
        style={{
          position: "absolute",
          width: size * 0.8,
          height: size * 0.8,
          borderRadius: size * 0.4,
          backgroundColor: "#667eea",
          opacity: glowAnim,
        }}
      />
      
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="brainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#667eea" />
              <Stop offset="50%" stopColor="#764ba2" />
              <Stop offset="100%" stopColor="#f093fb" />
            </LinearGradient>
            <LinearGradient id="sparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#4facfe" />
              <Stop offset="100%" stopColor="#00f2fe" />
            </LinearGradient>
            <LinearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#ffffff" />
              <Stop offset="100%" stopColor="#e0e7ff" />
            </LinearGradient>
          </Defs>

          {/* Brain outline */}
          <G>
            {/* Left hemisphere */}
            <Path
              d="M25 50 C25 30 35 20 50 20 C50 20 45 25 45 35 C45 40 48 45 48 50 C48 55 45 60 45 65 C45 75 50 80 50 80 C35 80 25 70 25 50"
              fill="url(#brainGradient)"
              opacity={0.9}
            />
            {/* Right hemisphere */}
            <Path
              d="M75 50 C75 30 65 20 50 20 C50 20 55 25 55 35 C55 40 52 45 52 50 C52 55 55 60 55 65 C55 75 50 80 50 80 C65 80 75 70 75 50"
              fill="url(#brainGradient)"
              opacity={0.9}
            />
            
            {/* Brain folds - left */}
            <Path
              d="M30 40 Q35 38 40 42"
              stroke="#ffffff"
              strokeWidth={1.5}
              fill="none"
              opacity={0.6}
            />
            <Path
              d="M28 55 Q35 52 42 56"
              stroke="#ffffff"
              strokeWidth={1.5}
              fill="none"
              opacity={0.6}
            />
            <Path
              d="M32 68 Q38 65 44 68"
              stroke="#ffffff"
              strokeWidth={1.5}
              fill="none"
              opacity={0.6}
            />
            
            {/* Brain folds - right */}
            <Path
              d="M70 40 Q65 38 60 42"
              stroke="#ffffff"
              strokeWidth={1.5}
              fill="none"
              opacity={0.6}
            />
            <Path
              d="M72 55 Q65 52 58 56"
              stroke="#ffffff"
              strokeWidth={1.5}
              fill="none"
              opacity={0.6}
            />
            <Path
              d="M68 68 Q62 65 56 68"
              stroke="#ffffff"
              strokeWidth={1.5}
              fill="none"
              opacity={0.6}
            />
          </G>

          {/* Neural connections */}
          <G opacity={0.8}>
            <Circle cx="35" cy="35" r="2" fill="url(#nodeGradient)" />
            <Circle cx="65" cy="35" r="2" fill="url(#nodeGradient)" />
            <Circle cx="50" cy="50" r="2.5" fill="url(#nodeGradient)" />
            <Circle cx="38" cy="60" r="2" fill="url(#nodeGradient)" />
            <Circle cx="62" cy="60" r="2" fill="url(#nodeGradient)" />
            <Circle cx="50" cy="70" r="2" fill="url(#nodeGradient)" />
            
            {/* Connection lines */}
            <Path d="M35 35 L50 50" stroke="#ffffff" strokeWidth={0.8} opacity={0.5} />
            <Path d="M65 35 L50 50" stroke="#ffffff" strokeWidth={0.8} opacity={0.5} />
            <Path d="M50 50 L38 60" stroke="#ffffff" strokeWidth={0.8} opacity={0.5} />
            <Path d="M50 50 L62 60" stroke="#ffffff" strokeWidth={0.8} opacity={0.5} />
            <Path d="M38 60 L50 70" stroke="#ffffff" strokeWidth={0.8} opacity={0.5} />
            <Path d="M62 60 L50 70" stroke="#ffffff" strokeWidth={0.8} opacity={0.5} />
          </G>

          {/* Sparkles */}
          <G>
            <Circle cx="20" cy="25" r="2" fill="url(#sparkleGradient)" opacity={0.8} />
            <Circle cx="80" cy="25" r="1.5" fill="url(#sparkleGradient)" opacity={0.7} />
            <Circle cx="15" cy="60" r="1.5" fill="url(#sparkleGradient)" opacity={0.6} />
            <Circle cx="85" cy="55" r="2" fill="url(#sparkleGradient)" opacity={0.8} />
            <Circle cx="25" cy="85" r="1.5" fill="url(#sparkleGradient)" opacity={0.7} />
            <Circle cx="75" cy="85" r="1.5" fill="url(#sparkleGradient)" opacity={0.6} />
            <Circle cx="50" cy="10" r="2" fill="url(#sparkleGradient)" opacity={0.8} />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}




