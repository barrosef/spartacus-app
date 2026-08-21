import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require("../../../assets/logo.png");

/**
 * Tela cheia mostrada entre "o Firebase autenticou" e "a timeline abriu".
 *
 * Esse intervalo existe porque o RootNavigator ainda precisa chamar
 * `/auth/me` para saber o estado da conta. Sem nada em tela, a pessoa voltava
 * do OAuth do Google e via a tela de login intacta, com o botão habilitado —
 * parecia travado, e a reação natural era clicar de novo.
 *
 * Bloqueia por construção: cobre a tela inteira e não repassa toques.
 */
export function SigningInOverlay({ message = "Entrando…" }: { message?: string }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    spinLoop.start();
    pulseLoop.start();
    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [spin, pulse]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });
  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.badge}>
        {/* Anel dourado girando em volta do logo pulsando */}
        <Animated.View style={[styles.ring, { transform: [{ rotate }] }]} />
        <Animated.Image
          source={logo}
          style={[styles.logo, { transform: [{ scale: logoScale }] }]}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.message}>{message}</Text>
      <Text style={styles.hint}>Preparando sua timeline</Text>
    </View>
  );
}

const RING = 148;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    zIndex: 10,
  },
  badge: {
    width: RING,
    height: RING,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: "rgba(198,163,78,0.18)",
    // Só um arco pintado: é o que dá a leitura de giro.
    borderTopColor: colors.primary,
  },
  logo: {
    // O logo é uma arte retangular com fundo próprio; dentro do anel ele pede
    // folga e canto arredondado, senão lê como "quadrado espremido no círculo".
    width: RING * 0.44,
    height: RING * 0.44,
    borderRadius: radius.md,
  },
  message: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 20,
  },
  hint: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
});
