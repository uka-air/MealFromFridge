import type { IngredientDraft } from '@/types/ingredient';
import type { RecipeDraft } from '@/types/recipe';
import { getTodayDateInputValue } from '@/utils/date';

function formatDateWithOffset(daysFromToday: number, today = new Date()) {
  const date = new Date(today);
  date.setDate(date.getDate() + daysFromToday);

  return getTodayDateInputValue(date);
}

export function createDevelopmentIngredientDrafts(today = new Date()): IngredientDraft[] {
  const purchasedAt = getTodayDateInputValue(today);

  return [
    {
      name: 'อกไก่บด',
      category: 'protein',
      quantity: 598,
      unit: 'g',
      purchasedAt,
      expiresAt: formatDateWithOffset(2, today),
    },
    {
      name: 'เห็ดแชมปิญอง',
      category: 'produce',
      quantity: 200,
      unit: 'g',
      purchasedAt,
      expiresAt: formatDateWithOffset(1, today),
    },
    {
      name: 'คอตเทจชีส',
      category: 'dairy',
      quantity: 150,
      unit: 'g',
      purchasedAt,
      expiresAt: formatDateWithOffset(3, today),
    },
    {
      name: 'ไข่ไก่',
      category: 'protein',
      quantity: 10,
      unit: 'item',
      purchasedAt,
      expiresAt: formatDateWithOffset(10, today),
    },
    {
      name: 'ฟักทอง',
      category: 'produce',
      quantity: 500,
      unit: 'g',
      purchasedAt,
      expiresAt: formatDateWithOffset(5, today),
    },
    {
      name: 'มันหวาน',
      category: 'produce',
      quantity: 225,
      unit: 'g',
      purchasedAt,
      expiresAt: formatDateWithOffset(7, today),
    },
    {
      name: 'ข้าวกล้อง',
      category: 'grains',
      quantity: 1000,
      unit: 'g',
      purchasedAt,
      expiresAt: null,
    },
  ];
}

export function createDevelopmentRecipeDrafts(): RecipeDraft[] {
  return [
    {
      name: 'อกไก่ยัดไส้เห็ดคอตเทจชีส',
      isFavorite: false,
      description: 'เมนูโปรตีนสูงที่ช่วยใช้เห็ดและคอตเทจชีสที่ใกล้หมดอายุได้พร้อมกัน',
      ingredients: [
        {
          ingredientName: 'อกไก่บด',
          quantity: 300,
          unit: 'g',
        },
        {
          ingredientName: 'เห็ดแชมปิญอง',
          quantity: 120,
          unit: 'g',
        },
        {
          ingredientName: 'คอตเทจชีส',
          quantity: 80,
          unit: 'g',
        },
        {
          ingredientName: 'ไข่ไก่',
          quantity: 1,
          unit: 'item',
          optional: true,
        },
      ],
      instructions: [
        'ผสมอกไก่บดกับไข่ไก่เล็กน้อยเพื่อให้เนื้อจับตัวง่าย',
        'ผัดเห็ดแชมปิญองให้สุกนุ่ม แล้วคลุกกับคอตเทจชีสเป็นไส้',
        'ปั้นหรือขึ้นรูปอกไก่ ใส่ไส้ตรงกลาง แล้วอบหรือทอดลมร้อนจนสุกทั่ว',
      ],
      prepMinutes: 10,
      cookMinutes: 18,
      servings: 2,
      tags: ['คลีน', 'โปรตีนสูง', 'หม้อทอด', 'เด็กกินได้'],
      notes: 'ทำเป็นชิ้นเล็กได้เพื่อเสิร์ฟเด็กหรือเตรียมเป็น meal prep',
    },
    {
      name: 'ลูกชิ้นอกไก่คลีน',
      isFavorite: false,
      description: 'ลูกชิ้นอกไก่แบบทำง่าย ใช้วัตถุดิบน้อยและเหมาะกับหม้อทอด',
      ingredients: [
        {
          ingredientName: 'อกไก่บด',
          quantity: 250,
          unit: 'g',
        },
        {
          ingredientName: 'ไข่ไก่',
          quantity: 1,
          unit: 'item',
        },
        {
          ingredientName: 'เห็ดแชมปิญอง',
          quantity: 60,
          unit: 'g',
          optional: true,
        },
      ],
      instructions: [
        'คลุกอกไก่บดกับไข่ไก่ให้เข้ากัน และใส่เห็ดสับถ้าต้องการเพิ่มความชุ่ม',
        'ปั้นเป็นลูกขนาดพอดีคำเรียงลงถาด',
        'อบในหม้อทอดจนสุกทั่วและผิวด้านนอกเริ่มแน่น',
      ],
      prepMinutes: 8,
      cookMinutes: 12,
      servings: 2,
      tags: ['คลีน', 'โปรตีนสูง', 'หม้อทอด', 'เด็กกินได้', 'ทำง่าย'],
      notes: 'เก็บแช่เย็นไว้กินคู่ข้าวกล้องหรือฟักทองได้',
    },
    {
      name: 'ไข่ตุ๋น',
      isFavorite: false,
      description: 'เมนูนุ่ม กินง่าย ใช้ไข่เป็นหลักและเติมเห็ดหรือชีสได้ตามของที่มี',
      ingredients: [
        {
          ingredientName: 'ไข่ไก่',
          quantity: 2,
          unit: 'item',
        },
        {
          ingredientName: 'คอตเทจชีส',
          quantity: 40,
          unit: 'g',
          optional: true,
        },
        {
          ingredientName: 'เห็ดแชมปิญอง',
          quantity: 40,
          unit: 'g',
          optional: true,
        },
      ],
      instructions: [
        'ตีไข่ไก่ให้เข้ากันแล้วกรองเพื่อให้เนื้อเนียน',
        'เติมเห็ดหรือคอตเทจชีสลงถ้วยถ้าต้องการเพิ่มโปรตีน',
        'นึ่งหรืออบจนไข่เซ็ตตัวนุ่ม',
      ],
      prepMinutes: 5,
      cookMinutes: 10,
      servings: 2,
      tags: ['เด็กกินได้', 'มื้อเบา', 'ไม่เผ็ด', 'ทำง่าย'],
      notes: 'ถ้าต้องการเนื้อเนียนมากขึ้นให้เติมน้ำอุ่นเล็กน้อยก่อนนึ่ง',
    },
    {
      name: 'ฟักทองอบหม้อทอด',
      isFavorite: false,
      description: 'เมนูง่ายมาก ใช้ฟักทองชิ้นเดียวก็ทำได้ เหมาะเป็นมื้อเบาหรือของกินเล่น',
      ingredients: [
        {
          ingredientName: 'ฟักทอง',
          quantity: 300,
          unit: 'g',
        },
      ],
      instructions: [
        'หั่นฟักทองเป็นชิ้นพอดีคำ',
        'เรียงลงตะกร้าหม้อทอดโดยไม่ซ้อนกันแน่นเกินไป',
        'อบจนเนื้อสุกนุ่มและขอบเริ่มเกรียมนิด ๆ',
      ],
      prepMinutes: 5,
      cookMinutes: 15,
      servings: 2,
      tags: ['หม้อทอด', 'คลีน', 'เด็กกินได้', 'ทำง่าย'],
      notes: 'กินเปล่า ๆ หรือกินคู่คอตเทจชีสก็ได้',
    },
    {
      name: 'แพนเค้กโปรตีน',
      isFavorite: false,
      description: 'แพนเค้กเนื้อนุ่มจากไข่ คอตเทจชีส และมันหวาน เหมาะเป็นมื้อเช้าหรือของว่าง',
      ingredients: [
        {
          ingredientName: 'ไข่ไก่',
          quantity: 2,
          unit: 'item',
        },
        {
          ingredientName: 'คอตเทจชีส',
          quantity: 100,
          unit: 'g',
        },
        {
          ingredientName: 'มันหวาน',
          quantity: 120,
          unit: 'g',
        },
      ],
      instructions: [
        'นึ่งหรือเวฟมันหวานให้สุกแล้วบดละเอียด',
        'ผสมมันหวานกับไข่และคอตเทจชีสจนได้แป้งข้น',
        'หยอดลงกระทะหรือหม้อทอดแบบถาดแบนแล้วทำจนสุกทั้งสองด้าน',
      ],
      prepMinutes: 8,
      cookMinutes: 12,
      servings: 2,
      tags: ['คลีน', 'โปรตีนสูง', 'เด็กกินได้', 'ทำง่าย'],
      notes: 'ถ้าชอบหวานธรรมชาติสามารถเสิร์ฟคู่ฟักทองอบได้',
    },
    {
      name: 'ข้าวต้มอกไก่',
      isFavorite: false,
      description: 'ข้าวต้มอ่อน ๆ ใช้ข้าวกล้องกับอกไก่บด ทำง่ายและเหมาะกับมื้อเบา',
      ingredients: [
        {
          ingredientName: 'ข้าวกล้อง',
          quantity: 150,
          unit: 'g',
        },
        {
          ingredientName: 'อกไก่บด',
          quantity: 150,
          unit: 'g',
        },
        {
          ingredientName: 'ไข่ไก่',
          quantity: 1,
          unit: 'item',
          optional: true,
        },
        {
          ingredientName: 'เห็ดแชมปิญอง',
          quantity: 50,
          unit: 'g',
          optional: true,
        },
      ],
      instructions: [
        'ต้มข้าวกล้องกับน้ำจนเม็ดเริ่มนุ่ม',
        'ใส่อกไก่บดลงต้มให้สุกกระจายตัว จากนั้นเติมเห็ดถ้ามี',
        'ตอกไข่ลงไปคนเบา ๆ ก่อนปิดไฟแล้วเสิร์ฟร้อน ๆ',
      ],
      prepMinutes: 5,
      cookMinutes: 15,
      servings: 2,
      tags: ['เด็กกินได้', 'มื้อเบา', 'ไม่เผ็ด', 'ทำง่าย'],
      notes: 'เหมาะกับวันที่อยากกินอะไรอุ่น ๆ และย่อยง่าย',
    },
  ];
}
