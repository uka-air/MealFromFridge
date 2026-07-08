import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Screen } from '@/components/screen';
import { SectionCard } from '@/components/section-card';
import { palette, radius, spacing } from '@/constants/theme';
import { useRecipeImportStore } from '@/store/useRecipeImportStore';
import { parseRecipeText } from '@/utils/recipe-text-parser';

const SAMPLE_PLACEHOLDER = `ข้าวต้มอกไก่

ส่วนผสม
- อกไก่บด 150 g
- ข้าวกล้อง 150 g
- ไข่ไก่ 1 ฟอง (optional)

วิธีทำ
1. ต้มข้าวกับน้ำจนเริ่มนุ่ม
2. ใส่อกไก่ลงไปจนสุก
3. ตอกไข่ลงไปคนเบา ๆ แล้วเสิร์ฟ`;

export default function PasteRecipeScreen() {
  const router = useRouter();
  const setImportedRecipe = useRecipeImportStore((state) => state.setImportedRecipe);
  const [recipeText, setRecipeText] = useState('');

  const handleImport = () => {
    const trimmedText = recipeText.trim();
    if (!trimmedText) {
      Alert.alert('Missing recipe text', 'Paste a recipe before importing.');
      return;
    }

    const parsedRecipe = parseRecipeText(trimmedText);
    setImportedRecipe(parsedRecipe);

    router.push({
      pathname: '/recipes/recipe-form',
      params: { source: 'paste' },
    });
  };

  return (
    <Screen
      title="Paste recipe"
      subtitle="Paste plain text from notes, messages, or websites and review the parsed result before saving.">
      <SectionCard
        title="Recipe text"
        subtitle="The parser detects the title, ingredients, and steps from Thai or English text.">
        <Text style={styles.label}>Paste recipe</Text>
        <TextInput
          autoCapitalize="sentences"
          multiline
          onChangeText={setRecipeText}
          placeholder={SAMPLE_PLACEHOLDER}
          placeholderTextColor={palette.textMuted}
          style={styles.textarea}
          textAlignVertical="top"
          value={recipeText}
        />
        <Text style={styles.helperText}>
          Blank lines are ignored. Quantities and units are optional, so ingredients still import even when text is messy.
        </Text>
      </SectionCard>

      <View style={styles.actionsStack}>
        <AppButton label="Import recipe" onPress={handleImport} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: palette.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  textarea: {
    minHeight: 280,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    color: palette.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 15,
    lineHeight: 22,
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  actionsStack: {
    gap: spacing.sm,
  },
});
