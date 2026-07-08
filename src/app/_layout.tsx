import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { palette } from "@/constants/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: palette.background,
            },
            headerTintColor: palette.text,
            headerTitleStyle: {
              color: palette.text,
              fontWeight: "700",
            },
            contentStyle: {
              backgroundColor: palette.background,
            },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: "Meal From Fridge",
            }}
          />
          <Stack.Screen
            name="inventory/index"
            options={{
              title: "สต็อกวัตถุดิบ",
            }}
          />
          <Stack.Screen
            name="inventory/ingredient-form"
            options={{
              title: "วัตถุดิบ",
            }}
          />
          <Stack.Screen
            name="recipes/index"
            options={{
              title: "อาหาร",
            }}
          />
          <Stack.Screen
            name="recipes/paste-recipe"
            options={{
              title: "วางสูตรอาหาร",
            }}
          />
          <Stack.Screen
            name="recipes/[id]"
            options={{
              title: "อาหาร",
            }}
          />
          <Stack.Screen
            name="recipes/cook-confirmation"
            options={{
              title: "ทำเมนูนี้",
            }}
          />
          <Stack.Screen
            name="recipes/recipe-form"
            options={{
              title: "เมนูอาหาร",
            }}
          />
          <Stack.Screen
            name="suggestions"
            options={{
              title: "แนะนำเมนูอาหาร",
            }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
