import type { IngredientUnit } from '@/types/ingredient';
import type {
  ParsedRecipe,
  ParsedRecipeIngredient,
  RecipeTextParser,
} from '@/types/recipe-import';

const DEFAULT_IMPORTED_RECIPE_NAME = 'Imported recipe';

const INGREDIENT_HEADING_PATTERNS = [
  /^ingredients?$/i,
  /^ingredient list$/i,
  /^what you'll need$/i,
  /^ส่วนผสม$/u,
  /^ส่วนผสมทั้งหมด$/u,
  /^วัตถุดิบ$/u,
  /^เครื่องปรุง$/u,
];

const STEP_HEADING_PATTERNS = [
  /^steps?$/i,
  /^instructions?$/i,
  /^method$/i,
  /^directions?$/i,
  /^preparation$/i,
  /^วิธีทำ$/u,
  /^ขั้นตอน$/u,
  /^ขั้นตอนการทำ$/u,
  /^วิธีปรุง$/u,
];

const TITLE_PREFIX_PATTERNS = [
  /^(recipe|title|name)\s*[:\-]\s*(.+)$/i,
  /^(ชื่อเมนู|ชื่อสูตร|เมนู)\s*[:\-]\s*(.+)$/u,
];

const BULLET_PREFIX_PATTERN = /^(?:[-*•◦▪‣●]\s*)+/u;
const NUMBERED_STEP_PREFIX_PATTERN = /^(?:step\s*)?\d+[\.\):-]\s*/i;
const THAI_NUMBERED_STEP_PREFIX_PATTERN = /^(?:ขั้นตอนที่|ขั้นที่)\s*\d+\s*[:.\-)]?\s*/u;
const GENERIC_LIST_PREFIX_PATTERN =
  /^(?:[-*•◦▪‣●]|\d+[\.\)]|(?:step\s*)?\d+[:\-]?)\s*/iu;
const QUANTITY_PATTERN_SOURCE = String.raw`\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?`;
const UNIT_TOKEN_PATTERN_SOURCE = String.raw`[a-zA-Zก-๙]+`;
const LEADING_ATTACHED_QUANTITY_PATTERN = new RegExp(
  `^(${QUANTITY_PATTERN_SOURCE})(${UNIT_TOKEN_PATTERN_SOURCE})\\s+(.+)$`,
  'u'
);
const LEADING_QUANTITY_PATTERN = new RegExp(
  `^(${QUANTITY_PATTERN_SOURCE})\\s+(\\S+)(?:\\s+(.+))?$`,
  'u'
);
const TRAILING_ATTACHED_QUANTITY_PATTERN = new RegExp(
  `^(.+?)\\s+(${QUANTITY_PATTERN_SOURCE})(${UNIT_TOKEN_PATTERN_SOURCE})$`,
  'u'
);
const TRAILING_QUANTITY_PATTERN = new RegExp(
  `^(.+?)\\s+(${QUANTITY_PATTERN_SOURCE})\\s+(\\S+)$`,
  'u'
);
const TRAILING_QUANTITY_ONLY_PATTERN = new RegExp(
  `^(.+?)\\s+(${QUANTITY_PATTERN_SOURCE})$`,
  'u'
);

const OPTIONAL_PATTERNS = [
  /\(\s*optional\s*\)/iu,
  /\boptional\b/iu,
  /\bfor serving\b/iu,
  /\bto serve\b/iu,
  /ตามชอบ/u,
  /ไม่ใส่ก็ได้/u,
  /ถ้ามี/u,
];

const UNIT_ALIASES: Array<{ unit: IngredientUnit; values: string[] }> = [
  {
    unit: 'g',
    values: ['g', 'gram', 'grams', 'กรัม'],
  },
  {
    unit: 'kg',
    values: ['kg', 'kgs', 'kilogram', 'kilograms', 'กก', 'กิโล', 'กิโลกรัม'],
  },
  {
    unit: 'ml',
    values: ['ml', 'milliliter', 'milliliters', 'มล', 'มิลลิลิตร'],
  },
  {
    unit: 'l',
    values: ['l', 'liter', 'liters', 'litre', 'litres', 'ลิตร'],
  },
  {
    unit: 'cup',
    values: ['cup', 'cups', 'ถ้วย'],
  },
  {
    unit: 'tbsp',
    values: ['tbsp', 'tablespoon', 'tablespoons', 'ช้อนโต๊ะ'],
  },
  {
    unit: 'tsp',
    values: ['tsp', 'teaspoon', 'teaspoons', 'ช้อนชา'],
  },
  {
    unit: 'oz',
    values: ['oz', 'ounce', 'ounces'],
  },
  {
    unit: 'lb',
    values: ['lb', 'lbs', 'pound', 'pounds'],
  },
  {
    unit: 'pack',
    values: ['pack', 'packs', 'packet', 'packets', 'package', 'packages', 'ซอง', 'แพ็ก'],
  },
  {
    unit: 'item',
    values: ['item', 'items', 'piece', 'pieces', 'egg', 'eggs', 'ฟอง', 'ชิ้น', 'ลูก', 'ใบ', 'หัว', 'กลีบ'],
  },
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeThaiDigits(value: string) {
  return value.replace(/[๐-๙]/g, (digit) => String(digit.charCodeAt(0) - 3664));
}

function isIngredientHeading(line: string) {
  return INGREDIENT_HEADING_PATTERNS.some((pattern) => pattern.test(line));
}

function isStepHeading(line: string) {
  return STEP_HEADING_PATTERNS.some((pattern) => pattern.test(line));
}

function isNumberedStepLine(line: string) {
  return (
    NUMBERED_STEP_PREFIX_PATTERN.test(line) ||
    THAI_NUMBERED_STEP_PREFIX_PATTERN.test(line)
  );
}

function isBulletLine(line: string) {
  return BULLET_PREFIX_PATTERN.test(line);
}

function stripTitlePrefix(line: string) {
  for (const pattern of TITLE_PREFIX_PATTERNS) {
    const match = line.match(pattern);
    if (match?.[2]) {
      return normalizeWhitespace(match[2]);
    }
  }

  return normalizeWhitespace(line);
}

function stripListPrefix(line: string) {
  return normalizeWhitespace(
    line
      .replace(THAI_NUMBERED_STEP_PREFIX_PATTERN, '')
      .replace(NUMBERED_STEP_PREFIX_PATTERN, '')
      .replace(BULLET_PREFIX_PATTERN, '')
      .replace(GENERIC_LIST_PREFIX_PATTERN, '')
  );
}

function parseQuantityToken(value: string) {
  const normalizedValue = normalizeThaiDigits(value).replace(',', '.');

  const mixedFractionMatch = normalizedValue.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedFractionMatch) {
    const whole = Number(mixedFractionMatch[1]);
    const numerator = Number(mixedFractionMatch[2]);
    const denominator = Number(mixedFractionMatch[3]);

    if (denominator !== 0) {
      return whole + numerator / denominator;
    }
  }

  const fractionMatch = normalizedValue.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    if (denominator !== 0) {
      return numerator / denominator;
    }
  }

  const quantity = Number(normalizedValue);
  return Number.isFinite(quantity) ? quantity : undefined;
}

function parseUnitToken(value?: string) {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value
    .toLowerCase()
    .replace(/[(),.;:]/g, '')
    .trim();

  for (const unitAlias of UNIT_ALIASES) {
    if (unitAlias.values.includes(normalizedValue)) {
      return unitAlias.unit;
    }
  }

  return undefined;
}
function extractQuantityAndUnit(line: string) {
  const normalizedLine = normalizeThaiDigits(line);
  const leadingAttachedMatch = normalizedLine.match(LEADING_ATTACHED_QUANTITY_PATTERN);
  if (leadingAttachedMatch) {
    const quantity = parseQuantityToken(leadingAttachedMatch[1]);
    const unit = parseUnitToken(leadingAttachedMatch[2]);

    if (quantity !== undefined && unit) {
      return {
        quantity,
        unit,
        name: normalizeWhitespace(leadingAttachedMatch[3]),
      };
    }
  }

  const leadingQuantityMatch = normalizedLine.match(LEADING_QUANTITY_PATTERN);
  if (leadingQuantityMatch) {
    const quantity = parseQuantityToken(leadingQuantityMatch[1]);
    const unit = parseUnitToken(leadingQuantityMatch[2]);
    const trailingName = normalizeWhitespace(leadingQuantityMatch[3] ?? '');

    if (quantity !== undefined) {
      if (unit) {
        return {
          quantity,
          unit,
          name: trailingName || normalizeWhitespace(leadingQuantityMatch[2]),
        };
      }

      return {
        quantity,
        unit: undefined,
        name: normalizeWhitespace([leadingQuantityMatch[2], trailingName].filter(Boolean).join(' ')),
      };
    }
  }

  const trailingAttachedMatch = normalizedLine.match(TRAILING_ATTACHED_QUANTITY_PATTERN);
  if (trailingAttachedMatch) {
    const quantity = parseQuantityToken(trailingAttachedMatch[2]);
    const unit = parseUnitToken(trailingAttachedMatch[3]);

    if (quantity !== undefined && unit) {
      return {
        quantity,
        unit,
        name: normalizeWhitespace(trailingAttachedMatch[1]),
      };
    }
  }

  const trailingQuantityMatch = normalizedLine.match(TRAILING_QUANTITY_PATTERN);
  if (trailingQuantityMatch) {
    const quantity = parseQuantityToken(trailingQuantityMatch[2]);
    const unit = parseUnitToken(trailingQuantityMatch[3]);

    if (quantity !== undefined) {
      if (unit) {
        return {
          quantity,
          unit,
          name: normalizeWhitespace(trailingQuantityMatch[1]),
        };
      }

      return {
        quantity,
        unit: undefined,
        name: normalizeWhitespace(
          `${trailingQuantityMatch[1]} ${trailingQuantityMatch[3]}`
        ),
      };
    }
  }

  const trailingQuantityOnlyMatch = normalizedLine.match(TRAILING_QUANTITY_ONLY_PATTERN);
  if (trailingQuantityOnlyMatch) {
    const quantity = parseQuantityToken(trailingQuantityOnlyMatch[2]);

    if (quantity !== undefined) {
      return {
        quantity,
        unit: undefined,
        name: normalizeWhitespace(trailingQuantityOnlyMatch[1]),
      };
    }
  }

  return {
    quantity: undefined,
    unit: undefined,
    name: normalizeWhitespace(line),
  };
}

function parseIngredientLine(line: string): ParsedRecipeIngredient | null {
  const rawText = normalizeWhitespace(line);
  if (!rawText) {
    return null;
  }

  let optional = false;
  let workingLine = rawText;

  OPTIONAL_PATTERNS.forEach((pattern) => {
    if (pattern.test(workingLine)) {
      optional = true;
      workingLine = normalizeWhitespace(workingLine.replace(pattern, ''));
    }
  });

  workingLine = stripListPrefix(workingLine);
  if (!workingLine) {
    return null;
  }

  const { quantity, unit, name } = extractQuantityAndUnit(workingLine);
  const parsedName = name || workingLine;

  return {
    name: parsedName,
    quantity,
    unit,
    optional: optional || undefined,
    rawText,
  };
}

function pushStep(steps: string[], line: string) {
  const cleanedLine = stripListPrefix(line);
  if (!cleanedLine) {
    return;
  }

  steps.push(cleanedLine);
}

function appendStepContinuation(steps: string[], line: string) {
  const cleanedLine = normalizeWhitespace(line);
  if (!cleanedLine) {
    return;
  }

  if (!steps.length) {
    steps.push(cleanedLine);
    return;
  }

  steps[steps.length - 1] = `${steps[steps.length - 1]} ${cleanedLine}`.trim();
}

function findStepSectionStartIndex(lines: string[]) {
  const explicitHeadingIndex = lines.findIndex((line) => isStepHeading(line));
  if (explicitHeadingIndex >= 0) {
    return explicitHeadingIndex;
  }

  return lines.findIndex((line) => isNumberedStepLine(line));
}

function findIngredientSectionStartIndex(lines: string[]) {
  const explicitHeadingIndex = lines.findIndex((line) => isIngredientHeading(line));
  return explicitHeadingIndex >= 0 ? explicitHeadingIndex : -1;
}

export const heuristicRecipeTextParser: RecipeTextParser = {
  parse(text: string): ParsedRecipe {
    const lines = text
      .split(/\r?\n/u)
      .map((line) => normalizeWhitespace(line))
      .filter((line) => line.length > 0);

    if (!lines.length) {
      return {
        name: DEFAULT_IMPORTED_RECIPE_NAME,
        ingredients: [],
        steps: [],
      };
    }

    const firstLine = lines[0];
    const titleIsHeading = isIngredientHeading(firstLine) || isStepHeading(firstLine);
    const name = titleIsHeading ? DEFAULT_IMPORTED_RECIPE_NAME : stripTitlePrefix(firstLine);
    const bodyLines = titleIsHeading ? lines : lines.slice(1);

    const ingredientHeadingIndex = findIngredientSectionStartIndex(bodyLines);
    const stepSectionIndex = findStepSectionStartIndex(bodyLines);

    const ingredientStartIndex = ingredientHeadingIndex >= 0 ? ingredientHeadingIndex + 1 : 0;
    const ingredientEndIndex =
      stepSectionIndex >= 0 ? stepSectionIndex : bodyLines.length;

    const ingredientLines = bodyLines.slice(
      Math.min(ingredientStartIndex, ingredientEndIndex),
      ingredientEndIndex
    );
    const stepLines =
      stepSectionIndex >= 0 ? bodyLines.slice(stepSectionIndex + (isStepHeading(bodyLines[stepSectionIndex]) ? 1 : 0)) : [];

    const ingredients = ingredientLines
      .filter((line) => !isIngredientHeading(line) && !isStepHeading(line))
      .map(parseIngredientLine)
      .filter((ingredient): ingredient is ParsedRecipeIngredient => ingredient !== null);

    const steps: string[] = [];
    stepLines.forEach((line) => {
      if (isIngredientHeading(line) || isStepHeading(line)) {
        return;
      }

      if (isNumberedStepLine(line) || isBulletLine(line)) {
        pushStep(steps, line);
        return;
      }

      appendStepContinuation(steps, line);
    });

    return {
      name: name || DEFAULT_IMPORTED_RECIPE_NAME,
      ingredients,
      steps,
    };
  },
};

export function parseRecipeText(
  text: string,
  parser: RecipeTextParser = heuristicRecipeTextParser
) {
  return parser.parse(text);
}
