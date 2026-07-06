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
              title: "Inventory",
            }}
          />
          <Stack.Screen
            name="inventory/ingredient-form"
            options={{
              title: "Ingredient",
            }}
          />
          <Stack.Screen
            name="recipes/index"
            options={{
              title: "Recipes",
            }}
          />
          <Stack.Screen
            name="recipes/[id]"
            options={{
              title: "Recipe",
            }}
          />
          <Stack.Screen
            name="recipes/recipe-form"
            options={{
              title: "Recipe",
            }}
          />
          <Stack.Screen
            name="suggestions"
            options={{
              title: "Suggestions",
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
