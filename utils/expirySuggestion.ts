import type { IngredientCategory } from '@/types/ingredient';
import type { ParsedReceiptItem } from '@/types/receipt';
import { addDaysToDateInputValue, getTodayDateInputValue } from '@/utils/date';

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function inferExpiryWindowDays(item: Pick<ParsedReceiptItem, 'name' | 'category'>) {
  const normalizedName = normalize(item.name);
  const category = item.category;

  if (
    category === 'frozen' ||
    /แช่แข็ง|frozen/.test(normalizedName)
  ) {
    return 30;
  }

  if (/กุ้ง|ปลา|แซลมอน|ปลาหมึก|seafood|shrimp|salmon|fish|tuna/.test(normalizedName)) {
    return 2;
  }

  if (
    category === 'protein' ||
    /ไก่|หมู|เนื้อ|อกไก่|หมูสับ|ไข่|เต้าหู้|meat|beef|pork|chicken|egg|tofu/.test(
      normalizedName
    )
  ) {
    return 3;
  }

  if (
    category === 'produce' &&
    /แอปเปิล|กล้วย|ส้ม|องุ่น|fruit|apple|banana|orange|grape/.test(normalizedName)
  ) {
    return 5;
  }

  if (
    category === 'produce' ||
    /ผัก|เห็ด|ฟักทอง|มันหวาน|แครอท|คะน้า|กะหล่ำ|vegetable|mushroom|pumpkin|sweet potato|carrot/.test(
      normalizedName
    )
  ) {
    return 5;
  }

  if (
    category === 'dairy' ||
    /นม|โยเกิร์ต|ชีส|คอตเทจ|milk|yogurt|cheese|cottage/.test(normalizedName)
  ) {
    return 7;
  }

  if (
    category === 'grains' ||
    category === 'pantry' ||
    category === 'spices' ||
    category === 'other'
  ) {
    return null;
  }

  return null;
}

export function suggestExpiryDate(
  item: Pick<ParsedReceiptItem, 'name' | 'category'>,
  purchasedAt?: string
) {
  const windowDays = inferExpiryWindowDays(item);
  if (windowDays === null) {
    return null;
  }

  return addDaysToDateInputValue(
    purchasedAt?.trim() || getTodayDateInputValue(),
    windowDays
  );
}

export function guessCategoryFromReceiptItemName(name: string): IngredientCategory {
  const normalizedName = normalize(name);

  if (/แช่แข็ง|frozen/.test(normalizedName)) {
    return 'frozen';
  }

  if (/ไก่|หมู|เนื้อ|ปลา|กุ้ง|ปลาหมึก|ไข่|เต้าหู้|ทูน่า|chicken|pork|beef|fish|shrimp|egg|tofu|tuna/.test(normalizedName)) {
    return 'protein';
  }

  if (/นม|โยเกิร์ต|ชีส|คอตเทจ|butter|milk|yogurt|cheese|cottage/.test(normalizedName)) {
    return 'dairy';
  }

  if (/ข้าว|โอ๊ต|พาสต้า|เส้น|bread|rice|oat|oats|pasta|noodle/.test(normalizedName)) {
    return 'grains';
  }

  if (/ซอส|น้ำปลา|ซีอิ๊ว|เครื่องปรุง|เกลือ|พริกไทย|spice|seasoning|sauce/.test(normalizedName)) {
    return 'spices';
  }

  if (/ผัก|เห็ด|ผลไม้|ฟักทอง|มันหวาน|แครอท|กล้วย|แอปเปิล|orange|apple|banana|vegetable|mushroom|pumpkin|carrot/.test(normalizedName)) {
    return 'produce';
  }

  if (/กระป๋อง|canned|oil|flour|sugar|beans/.test(normalizedName)) {
    return 'pantry';
  }

  return 'other';
}
