import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { palette, radius, shadow, spacing } from '@/constants/theme';
import type { Ingredient } from '@/types/ingredient';
import {
  formatDate,
  getExpiryLabel,
  isExpired,
  isExpiringSoon,
  toDateInputValue,
} from '@/utils/date';

interface IngredientCardProps {
  ingredient: Ingredient;
  onPress: () => void;
  onDelete: () => void;
}

export function IngredientCard({ ingredient, onPress, onDelete }: IngredientCardProps) {
  const expired = isExpired(ingredient.expiresAt);
  const expiringSoon = isExpiringSoon(ingredient.expiresAt);
  const purchasedAt = toDateInputValue(ingredient.purchasedAt);

  const badgeStyle = expired
    ? styles.badgeDanger
    : expiringSoon
      ? styles.badgeWarning
      : styles.badgeNeutral;
  const badgeTextStyle = expired
    ? styles.badgeTextDanger
    : expiringSoon
      ? styles.badgeTextWarning
      : styles.badgeTextNeutral;
  const cardHighlightStyle = expired
    ? styles.cardExpired
    : expiringSoon
      ? styles.cardExpiring
      : undefined;

  return (
    <View style={[styles.card, cardHighlightStyle]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.content, pressed && styles.pressed]}>
        <View style={styles.headerRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{ingredient.name}</Text>
            <Text style={styles.meta}>
              {ingredient.quantity} {ingredient.unit} • {ingredient.category}
            </Text>
          </View>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeText, badgeTextStyle]}>
              {getExpiryLabel(ingredient.expiresAt)}
            </Text>
          </View>
        </View>

        <Text style={styles.detail}>
          {ingredient.expiresAt ? `Expiry: ${formatDate(ingredient.expiresAt)}` : 'Expiry date not set'}
        </Text>
        <Text style={styles.detail}>
          Purchased: {purchasedAt || 'Not set'}
        </Text>

        {ingredient.note ? <Text style={styles.notes}>{ingredient.note}</Text> : null}
      </Pressable>

      <View style={styles.actionsRow}>
        <AppButton label="Delete" onPress={onDelete} style={styles.actionButton} variant="danger" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  cardExpiring: {
    borderColor: palette.warning,
    backgroundColor: '#FFFDF8',
  },
  cardExpired: {
    borderColor: palette.danger,
    backgroundColor: '#FFF8F8',
  },
  content: {
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  headerRow: {
    gap: spacing.md,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  title: {
    color: palette.text,
    fontSize: 18,
    fontWeight: '700',
  },
  meta: {
    color: palette.textMuted,
    fontSize: 14,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  badgeNeutral: {
    backgroundColor: palette.infoSoft,
  },
  badgeWarning: {
    backgroundColor: palette.warningSoft,
  },
  badgeDanger: {
    backgroundColor: palette.dangerSoft,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextNeutral: {
    color: palette.info,
  },
  badgeTextWarning: {
    color: palette.warning,
  },
  badgeTextDanger: {
    color: palette.danger,
  },
  detail: {
    color: palette.textMuted,
    fontSize: 14,
  },
  notes: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    alignItems: 'flex-end',
  },
  actionButton: {
    minWidth: 120,
  },
});
