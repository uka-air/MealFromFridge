import type { RecipeDraft, RecipeIngredientRequirement } from '@/types/recipe';

interface RecipeTemplate {
  name: string;
  category: string;
  required: string[];
  optional: string[];
  proteinOptions: string[];
  carbOptions: string[];
  tags: string[];
}

const VEGETABLE_MATCH_OPTIONS = [
  'ผัก',
  'ผักรวม',
  'คะน้า',
  'กวางตุ้ง',
  'กะหล่ำปลี',
  'กะหล่ำดอก',
  'บรอกโคลี',
  'ผักกาดขาว',
  'ผักบุ้ง',
  'ถั่วฝักยาว',
  'แครอท',
  'เห็ด',
  'มะเขือเทศ',
  'หอมใหญ่',
  'ต้นหอม',
  'ผักชี',
  'ขึ้นฉ่าย',
  'ข้าวโพดอ่อน',
  'ใบกะเพรา',
  'สาหร่าย',
] as const;

const BROTH_MATCH_OPTIONS = ['น้ำซุป', 'ซุปก้อน', 'ผงซุป', 'น้ำสต๊อก'] as const;
const SAUCE_MATCH_OPTIONS = [
  'ซอส',
  'ซอสปรุงรส',
  'ซอสหอยนางรม',
  'น้ำมันหอย',
  'ซีอิ๊ว',
  'เต้าเจี้ยว',
] as const;
const SPICY_DRESSING_MATCH_OPTIONS = ['น้ำยำ', 'น้ำปลา', 'มะนาว', 'พริก'] as const;

export const recipeTemplates = [
  {
    name: 'ผัดกะเพรา',
    category: 'ผัดจานเดียว',
    required: ['เนื้อสัตว์', 'กระเทียม', 'พริก', 'ใบกะเพรา'],
    optional: ['ไข่ดาว', 'ถั่วฝักยาว', 'หอมใหญ่'],
    proteinOptions: ['หมูสับ', 'ไก่สับ', 'อกไก่', 'เนื้อสับ', 'กุ้ง', 'เต้าหู้'],
    carbOptions: ['ข้าวสวย', 'ข้าวกล้อง', 'เส้นใหญ่'],
    tags: ['เร็ว', 'เผ็ด', 'จานเดียว', 'ใช้เนื้อสับ'],
  },
  {
    name: 'ผัดผักรวมใส่เนื้อสัตว์',
    category: 'ผัดผัก',
    required: ['ผัก', 'เนื้อสัตว์', 'กระเทียม'],
    optional: ['เห็ด', 'แครอท', 'น้ำมันหอย', 'ซีอิ๊ว'],
    proteinOptions: ['หมู', 'ไก่', 'กุ้ง', 'ไข่', 'เต้าหู้'],
    carbOptions: ['ข้าวสวย', 'ข้าวกล้อง'],
    tags: ['เคลียร์ผัก', 'สุขภาพ', 'เร็ว'],
  },
  {
    name: 'แกงจืดเต้าหู้หมูสับ',
    category: 'ต้ม/ซุป',
    required: ['หมูสับ', 'เต้าหู้', 'ผัก', 'น้ำซุป'],
    optional: ['วุ้นเส้น', 'สาหร่าย', 'ต้นหอม', 'ผักชี'],
    proteinOptions: ['หมูสับ', 'ไก่สับ', 'กุ้ง', 'ไข่'],
    carbOptions: ['ข้าวสวย', 'ข้าวกล้อง'],
    tags: ['เด็กกินได้', 'เบา', 'ซุป', 'ไม่เผ็ด'],
  },
  {
    name: 'สุกี้น้ำ',
    category: 'สุกี้',
    required: ['ผัก', 'ไข่', 'วุ้นเส้น', 'น้ำจิ้มสุกี้'],
    optional: ['เห็ด', 'ขึ้นฉ่าย', 'ผักกาดขาว'],
    proteinOptions: ['หมู', 'ไก่', 'กุ้ง', 'ปลาหมึก', 'เต้าหู้'],
    carbOptions: ['วุ้นเส้น', 'เส้นแก้ว', 'ไม่ใส่เส้น'],
    tags: ['เคลียร์ตู้เย็น', 'ผักเยอะ', 'มื้อเบา'],
  },
  {
    name: 'สุกี้แห้ง',
    category: 'สุกี้',
    required: ['ผัก', 'ไข่', 'วุ้นเส้น', 'น้ำจิ้มสุกี้'],
    optional: ['กระเทียม', 'ขึ้นฉ่าย', 'เห็ด'],
    proteinOptions: ['หมู', 'ไก่', 'กุ้ง', 'เต้าหู้'],
    carbOptions: ['วุ้นเส้น', 'เส้นแก้ว', 'ไม่ใส่เส้น'],
    tags: ['จานเดียว', 'ผักเยอะ', 'เร็ว'],
  },
  {
    name: 'ข้าวผัด',
    category: 'ข้าว',
    required: ['ข้าวเย็น', 'ไข่', 'กระเทียม'],
    optional: ['แครอท', 'ต้นหอม', 'หอมใหญ่', 'ผักรวม'],
    proteinOptions: ['หมู', 'ไก่', 'กุ้ง', 'แฮม', 'ทูน่า'],
    carbOptions: ['ข้าวสวย', 'ข้าวกล้อง'],
    tags: ['ใช้ข้าวเหลือ', 'จานเดียว', 'เด็กกินได้'],
  },
  {
    name: 'ไข่เจียวทรงเครื่อง',
    category: 'ไข่',
    required: ['ไข่'],
    optional: ['หมูสับ', 'หอมใหญ่', 'แครอท', 'ต้นหอม', 'พริก'],
    proteinOptions: ['หมูสับ', 'ไก่สับ', 'กุ้งสับ', 'เต้าหู้ไข่'],
    carbOptions: ['ข้าวสวย', 'ข้าวกล้อง'],
    tags: ['เร็วมาก', 'ของน้อย', 'เด็กกินได้'],
  },
  {
    name: 'ข้าวต้ม',
    category: 'ข้าว/ซุป',
    required: ['ข้าว', 'น้ำซุป', 'เนื้อสัตว์'],
    optional: ['ขิง', 'ต้นหอม', 'ผักชี', 'ไข่'],
    proteinOptions: ['หมูสับ', 'ไก่', 'ปลา', 'กุ้ง'],
    carbOptions: ['ข้าวสวย', 'ข้าวกล้อง'],
    tags: ['เบา', 'มื้อเช้า', 'ไม่เผ็ด'],
  },
  {
    name: 'ยำวุ้นเส้น',
    category: 'ยำ',
    required: ['วุ้นเส้น', 'น้ำยำ', 'เนื้อสัตว์'],
    optional: ['หอมใหญ่', 'ขึ้นฉ่าย', 'มะเขือเทศ', 'ถั่วลิสง'],
    proteinOptions: ['หมูสับ', 'กุ้ง', 'ปลาหมึก', 'ไก่ฉีก'],
    carbOptions: ['วุ้นเส้น'],
    tags: ['เผ็ดเปรี้ยว', 'ใช้ของเหลือ', 'มื้อเบา'],
  },
  {
    name: 'เต้าหู้ทรงเครื่อง',
    category: 'เต้าหู้',
    required: ['เต้าหู้', 'เนื้อสัตว์หรือเห็ด', 'ซอส'],
    optional: ['แครอท', 'ต้นหอม', 'ข้าวโพดอ่อน'],
    proteinOptions: ['หมูสับ', 'ไก่สับ', 'กุ้ง', 'เห็ด'],
    carbOptions: ['ข้าวสวย', 'ข้าวกล้อง'],
    tags: ['นุ่ม', 'เด็กกินได้', 'โปรตีน'],
  },
] as const satisfies readonly RecipeTemplate[];

export const recipeTags = [
  'เร็ว',
  'ทำง่าย',
  'เด็กกินได้',
  'ไม่เผ็ด',
  'เผ็ด',
  'คลีน',
  'โปรตีนสูง',
  'ผักเยอะ',
  'คาร์บน้อย',
  'ใช้ข้าวเหลือ',
  'ใช้ผักใกล้เสีย',
  'ใช้เนื้อสับ',
  'ใช้ไข่',
  'หม้อทอด',
  'ต้ม',
  'ผัด',
  'จานเดียว',
  'มื้อเบา',
  'เคลียร์ตู้เย็น',
] as const;

const recipeInstructions: Record<RecipeTemplate['name'], string[]> = {
  ผัดกะเพรา: [
    'เตรียมเนื้อสัตว์ กระเทียม พริก และใบกะเพราให้พร้อม',
    'ผัดกระเทียมกับพริกให้หอม ใส่โปรตีนลงผัดจนสุก แล้วปรุงรสตามชอบ',
    'ใส่ใบกะเพราท้ายสุด ผัดพอสลด แล้วเสิร์ฟคู่คาร์บที่มี',
  ],
  ผัดผักรวมใส่เนื้อสัตว์: [
    'หั่นผักและเตรียมโปรตีนที่มีในตู้เย็นให้พร้อม',
    'ผัดกระเทียมให้หอม ใส่โปรตีนลงไปก่อน แล้วตามด้วยผักที่สุกยาก',
    'ปรุงรสด้วยซอสที่มี ผัดจนผักสุกกรอบ แล้วเสิร์ฟกับข้าว',
  ],
  แกงจืดเต้าหู้หมูสับ: [
    'ต้มน้ำซุปให้ร้อน ปั้นหมูสับหรือเตรียมโปรตีนที่ใช้ไว้',
    'ใส่โปรตีนลงต้มจนสุก แล้วตามด้วยเต้าหู้และผัก',
    'ปรุงรสอ่อน ๆ ใส่วุ้นเส้นหรือสาหร่ายเพิ่มได้ แล้วปิดไฟ',
  ],
  สุกี้น้ำ: [
    'เตรียมผัก ไข่ วุ้นเส้น และน้ำจิ้มสุกี้ให้พร้อม',
    'ต้มน้ำหรือน้ำซุป ใส่โปรตีน ผัก และวุ้นเส้นจนสุก',
    'ตอกไข่ลงหม้อ คนเบา ๆ แล้วเสิร์ฟพร้อมน้ำจิ้มสุกี้',
  ],
  สุกี้แห้ง: [
    'ลวกวุ้นเส้นและเตรียมผัก ไข่ และโปรตีนที่มีไว้ให้พร้อม',
    'ผัดกระเทียมเล็กน้อย ใส่โปรตีน ผัก และวุ้นเส้นลงผัดรวมกัน',
    'ปรุงด้วยน้ำจิ้มสุกี้ ใส่ไข่คลุกให้เข้ากัน แล้วเสิร์ฟทันที',
  ],
  ข้าวผัด: [
    'เตรียมข้าวเย็น ไข่ กระเทียม และเครื่องที่อยากใส่เพิ่ม',
    'ผัดกระเทียมให้หอม ใส่ไข่ลงยี แล้วตามด้วยข้าวและโปรตีนที่มี',
    'ปรุงรส ผัดจนข้าวร่วนดี แล้วโรยต้นหอมหรือผักเพิ่มก่อนเสิร์ฟ',
  ],
  ไข่เจียวทรงเครื่อง: [
    'ตีไข่ให้เข้ากัน แล้วเติมเครื่องที่มี เช่น หมูสับ หอมใหญ่ หรือแครอท',
    'ปรุงรสเล็กน้อย จากนั้นตั้งน้ำมันให้ร้อน',
    'ทอดจนฟูและสุกเหลือง แล้วเสิร์ฟกับข้าวร้อน ๆ',
  ],
  ข้าวต้ม: [
    'ต้มน้ำซุปให้เดือด เตรียมข้าวและโปรตีนที่มีไว้ให้พร้อม',
    'ใส่โปรตีนลงต้มจนสุก แล้วเติมข้าวลงไปเคี่ยวให้นุ่ม',
    'โรยขิง ต้นหอม หรือผักชีตามชอบ แล้วเสิร์ฟร้อน ๆ',
  ],
  ยำวุ้นเส้น: [
    'ลวกวุ้นเส้นและโปรตีนที่ใช้ จากนั้นพักให้สะเด็ดน้ำ',
    'คลุกน้ำยำกับวุ้นเส้น โปรตีน และผักที่มีให้เข้ากัน',
    'ชิมรสให้เปรี้ยวเค็มหวานสมดุล แล้วเสิร์ฟทันที',
  ],
  เต้าหู้ทรงเครื่อง: [
    'ทอดหรือนึ่งเต้าหู้ให้พร้อม แล้วเตรียมโปรตีนหรือเห็ดสำหรับหน้าราด',
    'ผัดโปรตีนกับซอสและผักหั่นเต๋าจนเข้ากัน',
    'ราดซอสลงบนเต้าหู้ แล้วเสิร์ฟกับข้าวร้อน ๆ',
  ],
};

function unique(values: readonly string[]) {
  return [...new Set(values)];
}

function buildMatchAnyOf(template: RecipeTemplate, ingredientName: string) {
  if (ingredientName === 'กระเทียม') {
    return unique([ingredientName, 'กระเทียมสับ']);
  }

  if (ingredientName === 'พริก') {
    return unique([ingredientName, 'พริกแดง', 'พริกขี้หนู']);
  }

  if (ingredientName === 'ใบกะเพรา') {
    return unique([ingredientName, 'กะเพรา']);
  }

  if (ingredientName === 'ไข่') {
    return unique([ingredientName, 'ไข่ไก่']);
  }

  if (ingredientName === 'ข้าวเย็น') {
    return unique([ingredientName, 'ข้าวสวย', 'ข้าวสวยเย็น', 'ข้าวกล้อง']);
  }

  if (ingredientName === 'เต้าหู้') {
    return unique([ingredientName, 'เต้าหู้ไข่']);
  }

  if (ingredientName === 'น้ำจิ้มสุกี้') {
    return unique([ingredientName, 'ซอสสุกี้']);
  }

  if (ingredientName === 'หมูสับ') {
    return unique([ingredientName, 'หมูบด']);
  }

  if (ingredientName === 'ผัก') {
    return unique([...VEGETABLE_MATCH_OPTIONS]);
  }

  if (ingredientName === 'เนื้อสัตว์') {
    return unique(template.proteinOptions);
  }

  if (ingredientName === 'เนื้อสัตว์หรือเห็ด') {
    return unique([...template.proteinOptions, 'เห็ด']);
  }

  if (ingredientName === 'ข้าว') {
    return unique([ingredientName, 'ข้าวสวย', 'ข้าวกล้อง', 'ข้าวเย็น']);
  }

  if (ingredientName === 'น้ำซุป') {
    return unique([...BROTH_MATCH_OPTIONS]);
  }

  if (ingredientName === 'ซอส') {
    return unique([...SAUCE_MATCH_OPTIONS]);
  }

  if (ingredientName === 'น้ำยำ') {
    return unique([...SPICY_DRESSING_MATCH_OPTIONS]);
  }

  return undefined;
}

function createIngredientRequirement(
  template: RecipeTemplate,
  ingredientName: string,
  optional = false
): Omit<RecipeIngredientRequirement, 'id'> {
  const matchAnyOf = buildMatchAnyOf(template, ingredientName);

  return {
    ingredientName,
    optional: optional || undefined,
    matchAnyOf: matchAnyOf?.length ? matchAnyOf : undefined,
  };
}

function buildDescription(template: RecipeTemplate) {
  return `เมนู${template.category}ที่ยืดหยุ่นตามวัตถุดิบในตู้เย็น เลือกโปรตีนและเครื่องเคียงได้ตามของที่มี`;
}

function buildNotes(template: RecipeTemplate) {
  return [
    `หมวดหมู่: ${template.category}`,
    `วัตถุดิบเสริม: ${template.optional.join(', ')}`,
    `โปรตีนที่ใช้แทนกันได้: ${template.proteinOptions.join(', ')}`,
    `คาร์บที่เข้ากัน: ${template.carbOptions.join(', ')}`,
  ].join('\n');
}

function createSeedRecipeDraft(template: RecipeTemplate): RecipeDraft {
  return {
    name: template.name,
    isFavorite: false,
    description: buildDescription(template),
    ingredients: [
      ...template.required.map((ingredientName) =>
        createIngredientRequirement(template, ingredientName)
      ),
      ...template.optional.map((ingredientName) =>
        createIngredientRequirement(template, ingredientName, true)
      ),
    ],
    instructions: recipeInstructions[template.name],
    prepMinutes: 10,
    cookMinutes: 15,
    servings: 2,
    tags: unique([template.category, ...template.tags]),
    notes: buildNotes(template),
  };
}

export function createSeedRecipeDrafts() {
  return recipeTemplates.map((template) => createSeedRecipeDraft(template));
}
