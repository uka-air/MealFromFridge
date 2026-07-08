import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/app-button";
import { ChipSelect, type SelectOption } from "@/components/chip-select";
import { FavoriteButton } from "@/components/favorite-button";
import { FormField } from "@/components/form-field";
import { Screen } from "@/components/screen";
import { SectionCard } from "@/components/section-card";
import { ToggleChip } from "@/components/toggle-chip";
import { palette, radius, spacing } from "@/constants/theme";
import { useRecipeImportStore } from "@/store/useRecipeImportStore";
import { useRecipeStore } from "@/store/useRecipeStore";
import { INGREDIENT_UNITS, type IngredientUnit } from "@/types/ingredient";
import { createId } from "@/utils/id";

interface IngredientLine {
  id: string;
  name: string;
  quantity: string;
  unit: IngredientUnit;
  optional: boolean;
  matchAnyOf?: string[];
}

const unitOptions: SelectOption<IngredientUnit>[] = INGREDIENT_UNITS.map(
  (value) => ({
    label: value.toUpperCase(),
    value,
  }),
);

function createIngredientLine(): IngredientLine {
  return {
    id: createId("draft-ingredient"),
    name: "",
    quantity: "",
    unit: "item",
    optional: false,
  };
}

export default function RecipeFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; source?: string }>();
  const recipeId = typeof params.id === "string" ? params.id : undefined;
  const importSource = params.source === "paste";

  const recipes = useRecipeStore((state) => state.recipes);
  const addRecipe = useRecipeStore((state) => state.addRecipe);
  const updateRecipe = useRecipeStore((state) => state.updateRecipe);
  const removeRecipe = useRecipeStore((state) => state.removeRecipe);
  const importedRecipe = useRecipeImportStore((state) => state.importedRecipe);
  const clearImportedRecipe = useRecipeImportStore(
    (state) => state.clearImportedRecipe,
  );

  const existingRecipe = recipes.find((recipe) => recipe.id === recipeId);

  const [name, setName] = useState("");
  const [cookMinutes, setCookMinutes] = useState("15");
  const [tagsText, setTagsText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [ingredientLines, setIngredientLines] = useState<IngredientLine[]>([
    createIngredientLine(),
  ]);

  useEffect(() => {
    if (existingRecipe) {
      setName(existingRecipe.name);
      setCookMinutes(String(existingRecipe.cookMinutes));
      setTagsText(existingRecipe.tags.join(", "));
      setStepsText(existingRecipe.instructions.join("\n"));
      setIsFavorite(existingRecipe.isFavorite);
      setIngredientLines(
        existingRecipe.ingredients.length
          ? existingRecipe.ingredients.map((ingredient) => ({
              id: ingredient.id,
              name: ingredient.ingredientName,
              quantity: ingredient.quantity ? String(ingredient.quantity) : "",
              unit: ingredient.unit ?? "item",
              optional: !!ingredient.optional,
              matchAnyOf: ingredient.matchAnyOf
                ? [...ingredient.matchAnyOf]
                : undefined,
            }))
          : [createIngredientLine()],
      );
      return;
    }

    if (importSource && importedRecipe) {
      setName(importedRecipe.name);
      setCookMinutes("15");
      setTagsText("");
      setStepsText(importedRecipe.steps.join("\n"));
      setIsFavorite(false);
      setIngredientLines(
        importedRecipe.ingredients.length
          ? importedRecipe.ingredients.map((ingredient) => ({
              id: createId("draft-ingredient"),
              name: ingredient.name,
              quantity:
                ingredient.quantity !== undefined
                  ? String(ingredient.quantity)
                  : "",
              unit: ingredient.unit ?? "item",
              optional: !!ingredient.optional,
            }))
          : [createIngredientLine()],
      );
      return;
    }

    if (!existingRecipe) {
      setName("");
      setCookMinutes("15");
      setTagsText("");
      setStepsText("");
      setIsFavorite(false);
      setIngredientLines([createIngredientLine()]);
      return;
    }
  }, [existingRecipe, importSource, importedRecipe]);

  const updateIngredientLine = (
    id: string,
    updates: Partial<IngredientLine>,
  ) => {
    setIngredientLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...updates } : line)),
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("ขาดชื่ออาหาร", "กรุณาใส่ชื่ออาหารก่อนบันทึก");
      return;
    }

    const parsedCookMinutes = Number(cookMinutes);
    if (!Number.isFinite(parsedCookMinutes) || parsedCookMinutes < 0) {
      Alert.alert(
        "เวาลาการทำอาหารไม่ถูกต้อง",
        "เวลาทำอาหารควรเป็นตัวเลขและมากกว่าหรือเท่ากับศูนย์",
      );
      return;
    }

    let hasInvalidIngredientQuantity = false;

    const ingredients = ingredientLines.reduce<
      {
        ingredientName: string;
        quantity?: number;
        unit?: IngredientUnit;
        optional?: boolean;
        matchAnyOf?: string[];
      }[]
    >((accumulator, line) => {
      const ingredientName = line.name.trim();
      if (!ingredientName) {
        return accumulator;
      }

      const quantityValue = line.quantity.trim();
      let parsedQuantity: number | undefined;
      if (quantityValue) {
        parsedQuantity = Number(quantityValue);
        if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
          hasInvalidIngredientQuantity = true;
          return accumulator;
        }
      }

      accumulator.push({
        ingredientName,
        quantity: parsedQuantity,
        unit: line.unit,
        optional: line.optional || undefined,
        matchAnyOf: line.matchAnyOf ? [...line.matchAnyOf] : undefined,
      });

      return accumulator;
    }, []);

    if (hasInvalidIngredientQuantity) {
      Alert.alert(
        "จำนวนวัตถุดิบไม่ถูกต้อง",
        "จำนวนวัตถุดิบควรเป็นตัวเลขและมากกว่าศูนย์",
      );
      return;
    }

    if (!ingredients.length) {
      Alert.alert(
        "ขาดวัตถุดิบ",
        "เพิ่มบรรทัดวัตถุดิบอย่างน้อยหนึ่งบรรทัดสำหรับสูตรอาหาร",
      );
      return;
    }

    const steps = stepsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!steps.length) {
      Alert.alert(
        "ขาดขั้นตอนการทำอาหาร",
        "กรุณาเพิ่มขั้นตอนการทำอาหารอย่างน้อยหนึ่งขั้นตอน",
      );
      return;
    }

    const draft = {
      name: name.trim(),
      isFavorite,
      description: existingRecipe?.description ?? "",
      prepMinutes: existingRecipe?.prepMinutes ?? 0,
      cookMinutes: parsedCookMinutes,
      servings: existingRecipe?.servings ?? 1,
      ingredients,
      instructions: steps,
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      notes: existingRecipe?.notes,
    };

    if (recipeId && existingRecipe) {
      updateRecipe(recipeId, draft);
    } else {
      addRecipe(draft);
    }

    if (importSource) {
      clearImportedRecipe();
    }

    router.back();
  };

  const handleDelete = () => {
    if (!recipeId || !existingRecipe) {
      return;
    }

    Alert.alert(
      "ต้องการลบสูตรอาหาร?",
      `ลบ ${existingRecipe.name} จากสูตรอาหารที่บันทึก?`,
      [
        {
          text: "ยกเลิก",
          style: "cancel",
        },
        {
          text: "ลบ",
          style: "destructive",
          onPress: () => {
            removeRecipe(recipeId);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <Screen
      title={existingRecipe ? "แก้ไขสูตรอาหาร" : "เพิ่มสูตรอาหาร"}
      subtitle="ทำให้สั้นและกระชับ แต่ชัดเจนพอที่จะบันทึกและใช้ซ้ำได้"
    >
      <SectionCard title="รายละเอียดสูตรอาหาร">
        <FormField
          autoCapitalize="words"
          label="ชื่อสูตรอาหาร"
          onChangeText={setName}
          placeholder="กระเพราไก่"
          value={name}
        />
        <FormField
          keyboardType="number-pad"
          label="เวลาทำอาหาร (นาที)"
          onChangeText={setCookMinutes}
          placeholder="15"
          value={cookMinutes}
        />
        <FormField
          autoCapitalize="none"
          label="Tags"
          onChangeText={setTagsText}
          placeholder="เผ็ด, อาหารเย็น, ทำง่าย"
          value={tagsText}
        />
        <FavoriteButton
          label="ถูกใจ"
          onChange={setIsFavorite}
          value={isFavorite}
        />
      </SectionCard>

      <SectionCard
        title="วัตถุดิบ"
        subtitle="เพิ่มวัตถุดิบหลักที่คุณต้องการ รายการทางเลือกจะไม่บล็อกการแนะนำ"
      >
        <View style={styles.listGroup}>
          {ingredientLines.map((line, index) => (
            <View key={line.id} style={styles.embeddedCard}>
              <FormField
                autoCapitalize="words"
                label={`วัตถุดิบ ${index + 1}`}
                onChangeText={(value) =>
                  updateIngredientLine(line.id, {
                    name: value,
                    matchAnyOf: undefined,
                  })
                }
                placeholder="อกไก่"
                value={line.name}
              />

              <View style={styles.inlineFields}>
                <View style={styles.inlineField}>
                  <FormField
                    keyboardType="decimal-pad"
                    label="ปริมาณ"
                    onChangeText={(value) =>
                      updateIngredientLine(line.id, { quantity: value })
                    }
                    placeholder="1"
                    value={line.quantity}
                  />
                </View>
                <View style={styles.inlineField}>
                  <ChipSelect
                    label="หน่วย"
                    onChange={(value) =>
                      updateIngredientLine(line.id, { unit: value })
                    }
                    options={unitOptions}
                    value={line.unit}
                  />
                </View>
              </View>

              <ToggleChip
                activeLabel="ทางเลือก"
                inactiveLabel="จำเป็น"
                label="ประเภทวัตถุดิบ"
                onChange={(value) =>
                  updateIngredientLine(line.id, { optional: value })
                }
                value={line.optional}
              />

              {ingredientLines.length > 1 ? (
                <AppButton
                  label="ลบวัตถุดิบ"
                  onPress={() =>
                    setIngredientLines((current) =>
                      current.filter((item) => item.id !== line.id),
                    )
                  }
                  variant="ghost"
                />
              ) : null}
            </View>
          ))}
        </View>

        <AppButton
          label="เพิ่มวัตถุดิบ"
          onPress={() =>
            setIngredientLines((current) => [
              ...current,
              createIngredientLine(),
            ])
          }
          variant="secondary"
        />
      </SectionCard>

      <SectionCard
        title="ขั้นตอน"
        subtitle="เขียนขั้นตอนละหนึ่งบรรทัด เพื่อให้สูตรทำอาหารง่ายต่อการสแกนในภายหลัง"
      >
        <FormField
          label="ขั้นตอนการทำอาหาร"
          multiline
          onChangeText={setStepsText}
          placeholder={
            "1. เตรียมวัตถุดิบ\n2. ทำให้กระทะร้อน\n3. ทำให้สุกและปรุงรส"
          }
          value={stepsText}
        />
      </SectionCard>

      <View style={styles.actionsStack}>
        <AppButton
          label={existingRecipe ? "บันทึกการเปลี่ยนแปลง" : "บันทึกสูตร"}
          onPress={handleSave}
        />
        {existingRecipe ? (
          <AppButton label="ลบสูตร" onPress={handleDelete} variant="danger" />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inlineFields: {
    flexDirection: "row",
    gap: spacing.md,
  },
  inlineField: {
    flex: 1,
  },
  listGroup: {
    gap: spacing.md,
  },
  embeddedCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    backgroundColor: palette.surfaceMuted,
    padding: spacing.md,
    gap: spacing.md,
  },
  helperText: {
    marginTop: -spacing.md,
    color: palette.textMuted,
    fontSize: 13,
  },
  actionsStack: {
    gap: spacing.sm,
  },
});
