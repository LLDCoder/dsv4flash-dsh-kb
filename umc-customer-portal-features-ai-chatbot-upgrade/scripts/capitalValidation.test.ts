import assert from "node:assert/strict";
import test from "node:test";
import { validate } from "@formily/validator";
import { normalizeCapitalValidation } from "../src/components/common/FormliyView/capitalValidation.ts";

const createCapitalSchema = () => ({
  type: "object",
  properties: {
    section: {
      type: "void",
      properties: {
        Capital: {
          name: "Capital",
          uniqueValue: "Capital",
          "x-validator": [
            {
              triggerType: "onBlur",
              format: "number",
              pattern: "^[1-9]\\d*$",
            },
          ],
        },
      },
    },
  },
});

const getCapitalValidator = () => {
  const result = normalizeCapitalValidation(
    createCapitalSchema(),
    "The field value is invalid.",
  ) as ReturnType<typeof createCapitalSchema>;

  return result.properties.section.properties.Capital["x-validator"][0];
};

test("uses one onInput positive-integer rule for Capital", () => {
  const validator = getCapitalValidator();

  assert.deepEqual(validator, {
    triggerType: "onInput",
    pattern: "^[1-9]\\d*$",
    message: "The field value is invalid.",
  });
});

test("returns only required feedback for empty Capital", async () => {
  const result = await validate(
    "",
    [
      {
        required: true,
        message: "This field is required.",
      },
      getCapitalValidator(),
    ],
    { triggerType: "onInput" },
  );

  assert.deepEqual(result.error, ["This field is required."]);
});

test("returns one invalid feedback for non-empty invalid Capital", async () => {
  const result = await validate(
    "00000",
    [
      {
        required: true,
        message: "This field is required.",
      },
      getCapitalValidator(),
    ],
    { triggerType: "onInput" },
  );

  assert.deepEqual(result.error, ["The field value is invalid."]);
});

test("accepts a positive-integer Capital value", async () => {
  const result = await validate(
    "123",
    [
      {
        required: true,
        message: "This field is required.",
      },
      getCapitalValidator(),
    ],
    { triggerType: "onInput" },
  );

  assert.deepEqual(result.error, []);
});

test("does not change unrelated numeric fields", () => {
  const schema = {
    type: "object",
    properties: {
      Amount: {
        name: "Amount",
        "x-validator": [
          {
            triggerType: "onBlur",
            format: "number",
            pattern: "^\\d+$",
          },
        ],
      },
    },
  };

  assert.deepEqual(
    normalizeCapitalValidation(schema, "The field value is invalid."),
    schema,
  );
});
