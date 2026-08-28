# MobileNumberInput

A portable mobile number input component package that provides dedicated Form and standalone components. Both share local dialing code data, local country icons, a 30-character input limit, an AntD Form Rule based on `libphonenumber-js`, and standalone validation utilities.

## Dependencies

- React 17+
- Ant Design 4.22+
- `@ant-design/icons`
- `libphonenumber-js`

## Recommended Usage

The package exposes two public components:

- `FormMobileNumberInput`: binds to an Ant Design Form through `formFields`, with the Form as the single source of truth.
- `StandaloneMobileNumberInput`: works independently through `countryCode`, `phoneNumber`, and their corresponding change callbacks, and also supports uncontrolled state.

Both public components share the same internal input control, so dialing code selection, mobile number input, character limits, and change notifications use one implementation.

`FormMobileNumberInput` obtains the current Form through `Form.useFormInstance()`. It registers fields, receives `rules`, and subscribes to Form updates through internal hidden `Form.Item` components. The component updates flattened fields directly with `setFieldValue()`, so `initialValues`, `getFieldsValue()`, and `onFinish` all retain the data structure required by the backend.

In Form-bound mode, place the component directly inside `<Form>`. The component already registers its fields internally, so it does not need to be wrapped in an outer `Form.Item`.

## AntD Form Split-Field Mode

Split-field mode is the default. The country dialing code and local mobile number are stored as separate top-level Form fields.

```tsx
import { Form } from "antd";
import {
  createMobileNumberFormRule,
  FormMobileNumberInput,
} from "@/components/common/MobileNumberInput";

interface FormValues {
  countryCode: string;
  mobileNumber: string;
  email: string;
}

const phoneFields = {
  countryCode: "countryCode",
  phoneNumber: "mobileNumber",
} as const;
const [form] = Form.useForm<FormValues>();

<Form<FormValues>
  form={form}
  initialValues={{
    countryCode: "+971",
    mobileNumber: "",
    email: "user@example.com",
  }}
  onFinish={submit}
>
  <FormMobileNumberInput
    formFields={phoneFields}
    rules={[
      createMobileNumberFormRule({
        countryCodeField: phoneFields.countryCode,
      }),
    ]}
    placeholder="Enter mobile number"
    searchPlaceholder="Search country or code"
    emptyText="No results"
  />
</Form>;
```

`rules` is passed to the internal `Form.Item` corresponding to `formFields.phoneNumber`. `createMobileNumberFormRule()` returns a standard AntD Rule and reads the country dialing code field to validate the combined number. Both `form.validateFields()` and Form submission run this rule, and the error message is displayed below the component.

To preserve compatibility with unchanged legacy values, use `shouldValidate` to control when the rule runs:

```tsx
const initialPhone = {
  countryCode: "+971",
  mobileNumber: "legacy phone value",
};

<FormMobileNumberInput
  formFields={phoneFields}
  rules={[
    createMobileNumberFormRule({
      countryCodeField: phoneFields.countryCode,
      shouldValidate: (value) => {
        if (!value || typeof value === "string") {
          return true;
        }

        return (
          value.countryCode !== initialPhone.countryCode ||
          value.phoneNumber !== initialPhone.mobileNumber
        );
      },
    }),
  ]}
/>;
```

Submitted values remain flattened:

```ts
{
  countryCode: "+971",
  mobileNumber: "501234567",
  email: "user@example.com",
}
```

`formFields` supports AntD `NamePath` values and can therefore be used with nested fields or `Form.List`:

```tsx
<FormMobileNumberInput
  formFields={{
    countryCode: ["contact", "countryCode"],
    phoneNumber: ["contact", "mobileNumber"],
  }}
/>;
```

## AntD Form Single-Field Mode

Single-field mode registers only the field specified by `formFields.phoneNumber`. Its value is an international number string that includes the country dialing code.

```tsx
<Form
  initialValues={{
    mobileNumber: "+971501234567",
  }}
  onFinish={(values) => submit(values)}
>
  <FormMobileNumberInput
    singlePhoneField
    formFields={{
      phoneNumber: "mobileNumber",
    }}
    rules={[createMobileNumberFormRule()]}
  />
</Form>;
```

When the local number is empty, single-field mode stores an intermediate dialing-code-only value such as `+971`, preserving the user's current dialing code selection. Complete validity is determined during submission validation.

## Standalone Controlled Split-Field Mode

```tsx
import { StandaloneMobileNumberInput } from "@/components/common/MobileNumberInput";

const [countryCode, setCountryCode] = useState("+971");
const [phoneNumber, setPhoneNumber] = useState("");

<StandaloneMobileNumberInput
  countryCode={countryCode}
  phoneNumber={phoneNumber}
  onCountryCodeChange={setCountryCode}
  onPhoneNumberChange={setPhoneNumber}
/>;
```

## Standalone Controlled Single-Field Mode

In single-field mode, only the complete `phoneNumber` string needs to be controlled. The dialing code is parsed from that string.

```tsx
const [phoneNumber, setPhoneNumber] = useState("+971501234567");

<StandaloneMobileNumberInput
  singlePhoneField
  phoneNumber={phoneNumber}
  onPhoneNumberChange={setPhoneNumber}
/>;
```

## Standalone Uncontrolled Split-Field Mode

When `countryCode` and `phoneNumber` are omitted, the component uses internal state. `defaultCountryCode` and `defaultPhoneNumber` set only the initial values.

```tsx
<StandaloneMobileNumberInput
  defaultCountryCode="+971"
  defaultPhoneNumber=""
  onCountryCodeChange={(countryCode) => console.log(countryCode)}
  onPhoneNumberChange={(phoneNumber) => console.log(phoneNumber)}
/>;
```

## Standalone Uncontrolled Single-Field Mode

```tsx
<StandaloneMobileNumberInput
  singlePhoneField
  defaultPhoneNumber="+971501234567"
  onPhoneNumberChange={(phoneNumber) => console.log(phoneNumber)}
/>;
```

## Change Callbacks

Programmatic Form updates made through `setFieldValue()` do not trigger the Form's `onValuesChange`. Use the component's field callbacks to receive change notifications:

- `onCountryCodeChange`: triggered when a country dialing code is selected.
- `onPhoneNumberChange`: triggered when the mobile number is entered; also triggered when the dialing code changes in single-field mode.
- In split-field mode, `onPhoneNumberChange` returns the local mobile number.
- In single-field mode, `onPhoneNumberChange` returns the complete international number or the intermediate dialing-code-only value.

## Form Rule Validation

In split-field mode, point `countryCodeField` to the country dialing code field. In single-field mode and object-value mode, call the no-argument version directly:

```tsx
<FormMobileNumberInput
  formFields={phoneFields}
  rules={[
    createMobileNumberFormRule({
      countryCodeField: phoneFields.countryCode,
      messageOverrides: {
        TOO_SHORT: "The mobile number needs more digits",
      },
    }),
  ]}
  validateFirst
/>;
```

`rules` may also contain other standard AntD Rules. The component runs the rules after the user changes the mobile number, and revalidates when the dialing code changes if a mobile number or an existing error is present.

`createMobileNumberFormRule()` options:

| Option | Type | Description |
| --- | --- | --- |
| `countryCodeField` | `NamePath` | Country dialing code field in split-field mode; omit in single-field and object-value modes |
| `messageOverrides` | `Partial<MobileNumberValidationMessages>` | Overrides default messages by error code |
| `shouldValidate` | `(value, form) => boolean` | Skips the rule when it returns `false`; useful for preserving unchanged legacy values |

## Standalone Validation Utilities

```ts
import {
  isValidMobileNumber,
  isValidSingleMobileNumber,
  validateMobileNumber,
} from "@/components/common/MobileNumberInput";

isValidMobileNumber("+971", "501234567");
isValidSingleMobileNumber("+971501234567");

validateMobileNumber({
  countryCode: "+971",
  phoneNumber: "501234567",
});
validateMobileNumber(
  "+971501234567",
  {
    TOO_SHORT: "The mobile number needs more digits",
    INVALID_FORMAT: "The mobile number format is unsupported",
  },
);
```

`validateMobileNumber` shares the same underlying validation logic as the Form Rule. It supports both split values and complete number strings, and returns `{ isValid, errorCode, message }`. On success, `errorCode` is `null` and `message` is an empty string; on failure, it returns a specific error code and the corresponding message.

| `errorCode` | Meaning |
| --- | --- |
| `REQUIRED` | The mobile number is empty; a single-field value containing only a dialing code also falls into this category |
| `INVALID_COUNTRY` | The country dialing code is invalid, or a single-field number lacks a valid country dialing code |
| `NOT_A_NUMBER` | The input cannot be recognized as a telephone number |
| `TOO_SHORT` | The number is shorter than the length permitted by that country's numbering rules |
| `TOO_LONG` | The number is longer than the length permitted by that country's numbering rules |
| `INVALID_LENGTH` | The length is within the minimum and maximum range but is not one of the specific lengths permitted for that country |
| `INVALID_FORMAT` | The length is valid, but the number range or format does not comply with that country's rules |

The second argument supports overriding messages by error code. Error codes without an override continue to use the default English messages in `DEFAULT_MOBILE_NUMBER_VALIDATION_MESSAGES`.

The input accepts arbitrary characters, with newly entered input limited to 30 characters. Existing controlled values are displayed as-is, and values longer than 30 characters are not truncated during rendering. The current mobile number is preserved when the country dialing code changes.

When `rules` is provided, `FormMobileNumberInput` participates in the AntD validation lifecycle. `StandaloneMobileNumberInput` remains a pure input component; callers invoke the standalone validation utilities on submission or at another business-defined point.

## Dialing Code Data

```ts
import {
  COUNTRY_DIAL_CODE_OPTIONS,
  COUNTRY_DIAL_CODE_OPTIONS_MAP,
  findCountryDialCodeOption,
} from "@/components/common/MobileNumberInput";

COUNTRY_DIAL_CODE_OPTIONS;
COUNTRY_DIAL_CODE_OPTIONS_MAP.get("+971");
findCountryDialCodeOption("+971");
```

Each option contains an English `label` and an Arabic `labelAr`. The dialing code selector uses `react-i18next` to observe the current language. It displays `labelAr` when the language code starts with `ar`, and `label` for other languages. Search matches both languages, country codes, and country dialing codes.

`COUNTRY_DIAL_CODE_OPTIONS_MAP` is created once when the module initializes. When multiple countries share the same dialing code, the Map retains the first country option in the dialing code list.

## Common Props

| Prop | Component | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `singlePhoneField` | Both | `boolean` | `false` | Selects split-field or single-field mode |
| `formFields` | Form | `{ countryCode, phoneNumber }` | - | Form field paths; pass only `phoneNumber` in single-field mode |
| `rules` | Form | `Rule[]` | - | Passed to the internal `Form.Item` for the mobile number field |
| `validateFirst` | Form | `boolean \| "parallel"` | - | Corresponds to the AntD Form.Item prop of the same name |
| `countryCode` | Standalone | `string` | - | Controlled dialing code in split-field mode |
| `phoneNumber` | Standalone | `string` | - | Controlled mobile number; its format depends on the mode |
| `defaultCountryCode` | Both | `string` | Empty string | Default dialing code explicitly supplied by the caller for creation flows |
| `defaultPhoneNumber` | Standalone | `string` | - | Initial uncontrolled mobile number; its format depends on the mode |
| `onCountryCodeChange` | Both | `(value: string) => void` | - | Dialing code change notification |
| `onPhoneNumberChange` | Both | `(value: string) => void` | - | Mobile number change notification |
| `placeholder` | Both | `string` | - | Mobile number input placeholder |
| `searchPlaceholder` | Both | `string` | `Search country or code` | Country dialing code search placeholder |
| `emptyText` | Both | `string` | `No results` | Text shown when dialing code search has no results |
| `hasError` | Both | `boolean` | `false` | Controls the component's error-state styling |
