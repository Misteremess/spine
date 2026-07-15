/**
 * Vídeo de fondo a pantalla completa con velo, para landing y login/registro.
 * Silenciado y en bucle: arranca solo y se reanuda si el sistema lo pausa
 * (llamadas entrantes, cambio de app, etc.).
 */
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect } from "react";
import { AppState, StyleSheet, View } from "react-native";

const HERO_VIDEO = require("../../assets/videos/hero-book-water.mp4");

export default function VideoBackdrop({ scrim = "rgba(20,18,15,0.62)" }: { scrim?: string }) {
  const player = useVideoPlayer(HERO_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEventListener(player, "statusChange", ({ status }) => {
    if (status === "readyToPlay" && !player.playing) player.play();
  });

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && !player.playing) player.play();
    });
    return () => sub.remove();
  }, [player]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: scrim }]} />
    </View>
  );
}
