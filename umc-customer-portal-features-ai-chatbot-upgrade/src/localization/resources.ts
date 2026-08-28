import resourceManifest from "./resourceManifest.json";

type Language = "en" | "ar";
type TranslationResource = Record<string, unknown>;

const resourceModules = {
  ...import.meta.glob<TranslationResource>("./**/en.json", {
    eager: true,
    import: "default",
  }),
  ...import.meta.glob<TranslationResource>("./**/ar.json", {
    eager: true,
    import: "default",
  }),
};

export const buildTranslationResources = (
  language: Language,
): TranslationResource =>
  resourceManifest.reduce<TranslationResource>((translation, entry) => {
    const modulePath = `./${entry.path}/${language}.json`;
    const resource = resourceModules[modulePath];

    if (!resource) {
      throw new Error(`Missing i18n resource: ${modulePath}`);
    }

    if (entry.mount) {
      translation[entry.mount] = resource;
    } else {
      Object.assign(translation, resource);
    }

    return translation;
  }, {});
