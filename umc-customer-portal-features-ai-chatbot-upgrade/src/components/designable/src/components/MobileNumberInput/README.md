# Dynamic Mobile Number Runtime

Dynamic form hosts provide creation defaults once through
`MobileNumberRuntimeProvider`. A field-level `defaultCountryCode` always takes
precedence, including an explicit empty string for edit or review behavior.

```tsx
<MobileNumberRuntimeProvider
  config={{ defaultCountryCode: DEFAULT_COUNTRY_DIAL_CODE }}
>
  <FormProvider form={form}>{children}</FormProvider>
</MobileNumberRuntimeProvider>
```

New dynamic components should use `CompositeMobileNumberField` for stored
full/country/local field triples. Components with a custom layout can consume
the same default through `useResolvedMobileNumberDefaultCountryCode`.

```tsx
const defaultCountryCode =
  useResolvedMobileNumberDefaultCountryCode(props.defaultCountryCode);
```

The runtime default is display-only while the local number is empty. This keeps
an unused default calling code out of form values and API requests. Once the
user edits the number, the component writes all three fields.

Before persisting or submitting dynamic form values, call
`normalizeDynamicMobileNumberFormValues(values, schema)`. It supports explicit
field mappings from `MobileNumberInput` schema nodes and automatically detects
future `nameCountryCode` plus `nameLocalNumber` pairs.
