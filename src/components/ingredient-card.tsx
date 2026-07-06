import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { palette, radius, shadow, spacing } from '@/constants/theme';
import type { Ingredient } from '@/types/ingredient';
import { formatDate, getExpiryLabel, isExpired, isExpiringSoon } from '@/utils/date';

interface IngredientCardProps {
  ingredient: Ingredient;
  onEdit: () => void;
  onDelete: () => void;
}

export function IngredientCard({ ingredient, onEdit, onDelete }: IngredientCardProps) {
  const expired = isExpired(ingredient.expiresAt);
  const expiringSoon = isExpiringSoon(ingredient.expiresAt);

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

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{ingredient.name}</Text>
          <Text style={styles.meta}>
            {ingredient.quantity} {ingredient.unit} • {ingredient.category}
          </Text>
        </View>
        <View style={[styles.badge, badgeStyle]}>
          <Text style={[styles.badgeText, badgeTextStyle]}>{getExpiryLabel(ingredient.expiresAt)}</Text>
        </View>
      </View>

      <Text style={styles.detail}>
        {ingredient.expiresAt ? `Expiry: ${formatDate(ingredient.expiresAt)}` : 'Expiry date not set'}
      </Text>

      {ingredient.notes ? <Text style={styles.notes}>{ingredient.notes}</Text> : null}

      <View style={styles.actionsRow}>
        <AppButton label="Edit" onPress={onEdit} style={styles.actionButton} variant="secondary" />
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
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
