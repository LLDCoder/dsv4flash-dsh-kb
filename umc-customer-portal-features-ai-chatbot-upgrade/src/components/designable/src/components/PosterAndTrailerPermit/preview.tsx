import * as React from "react";
import { createBehavior, createResource } from "@designable/core";
import type { DnFC } from "@designable/react";
import { AllLocales } from "../../locales";
import { AllSchemas } from "../../schemas";
import { PosterAndTrailerPermitField } from "./PosterAndTrailerPermitField";

export const PosterAndTrailerPermit: DnFC<
  React.ComponentProps<typeof PosterAndTrailerPermitField>
> = PosterAndTrailerPermitField;

PosterAndTrailerPermit.Behavior = createBehavior({
  name: "PosterAndTrailerPermit",
  extends: ["Field"],
  selector: (node) => node.props?.["x-component"] === "PosterAndTrailerPermit",
  designerProps: {
    defaultProps: {
      name: "posterAndTrailerPermit",
      "x-component-props": {
        posterTitleEn: "Film Poster",
        posterTitleAr: "Film Poster",
        trailerTitleEn: "Film Trailer",
        trailerTitleAr: "Film Trailer",
        posterMaxCount: 4,
        trailerMaxCount: 3,
      },
    },
    propsSchema: AllSchemas.PosterAndTrailerPermit,
  },
  designerLocales: AllLocales.PosterAndTrailerPermit,
});

PosterAndTrailerPermit.Resource = createResource({
  title: {
    "en-US": "Poster & Trailer",
    "ar-AE": "Poster & Trailer",
  },
  icon: "CardSource",
  elements: [
    {
      componentName: "Field",
      props: {
        name: "posterAndTrailerPermit",
        "x-decorator": "FormItem",
        "x-component": "PosterAndTrailerPermit",
        "x-component-props": {
          posterTitleEn: "Film Poster",
          posterTitleAr: "Film Poster",
          trailerTitleEn: "Film Trailer",
          trailerTitleAr: "Film Trailer",
          posterMaxCount: 4,
          trailerMaxCount: 3,
        },
      },
    },
  ],
});

export default PosterAndTrailerPermit;
