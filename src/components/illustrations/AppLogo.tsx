import React from "react";
import { View } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, G, Circle } from "react-native-svg";

interface AppLogoProps {
  size?: number;
  showText?: boolean;
}

export default function AppLogo({ size = 80 }: AppLogoProps) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#667eea" />
            <Stop offset="50%" stopColor="#764ba2" />
            <Stop offset="100%" stopColor="#f093fb" />
          </LinearGradient>
          <LinearGradient id="logoGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#4facfe" />
            <Stop offset="100%" stopColor="#00f2fe" />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx="50"
          cy="50"
          r="45"
          fill="url(#logoGradient)"
        />

        {/* Inner glow */}
        <Circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          opacity={0.3}
        />

        {/* Stylized S with brain/learning motif */}
        <G transform="translate(50, 50)">
          {/* Main S curve */}
          <Path
            d="M12 -22 
               C-5 -22 -18 -15 -18 -5
               C-18 5 -5 8 5 10
               C15 12 18 15 18 22
               C18 30 5 35 -12 32"
            stroke="#ffffff"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* Neural dots on S */}
          <Circle cx="8" cy="-18" r="3" fill="#ffffff" opacity={0.9} />
          <Circle cx="-10" cy="-8" r="2.5" fill="#ffffff" opacity={0.8} />
          <Circle cx="0" cy="5" r="3" fill="#ffffff" opacity={0.9} />
          <Circle cx="12" cy="18" r="2.5" fill="#ffffff" opacity={0.8} />
          <Circle cx="-5" cy="28" r="3" fill="#ffffff" opacity={0.9} />
          
          {/* Connection lines */}
          <Path
            d="M8 -18 L-10 -8"
            stroke="#ffffff"
            strokeWidth="1"
            opacity={0.5}
          />
          <Path
            d="M-10 -8 L0 5"
            stroke="#ffffff"
            strokeWidth="1"
            opacity={0.5}
          />
          <Path
            d="M0 5 L12 18"
            stroke="#ffffff"
            strokeWidth="1"
            opacity={0.5}
          />
          <Path
            d="M12 18 L-5 28"
            stroke="#ffffff"
            strokeWidth="1"
            opacity={0.5}
          />
        </G>

        {/* Sparkle accents */}
        <Circle cx="78" cy="25" r="3" fill="url(#logoGlow)" />
        <Circle cx="22" cy="75" r="2.5" fill="url(#logoGlow)" />
        <Circle cx="80" cy="70" r="2" fill="#ffffff" opacity={0.6} />
      </Svg>
    </View>
  );
}




