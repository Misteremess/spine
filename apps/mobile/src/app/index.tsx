import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { authClient } from "../lib/auth";
import { colors } from "../lib/theme";

export default function Gate() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.tinta }}>
        <ActivityIndicator color={colors.ambar} size="large" />
      </View>
    );
  }

  return session ? <Redirect href="/library" /> : <Redirect href="/login" />;
}
