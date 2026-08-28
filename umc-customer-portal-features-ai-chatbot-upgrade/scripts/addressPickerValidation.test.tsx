import assert from "node:assert/strict";
import test, { after } from "node:test";
import React from "react";
import ReactDOM from "react-dom";
import { act, Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import { createForm } from "@formily/core";
import { Field, FormProvider } from "@formily/react";
import { FormItem } from "@formily/antd";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import AddressPicker from "../src/components/designable/src/components/AddressPicker/AddressPicker.tsx";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
});

Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  SVGElement: dom.window.SVGElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(callback, 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

dom.window.matchMedia = () =>
  ({
    matches: false,
    addListener() {},
    removeListener() {},
  }) as MediaQueryList;

after(() => dom.window.close());

test("clears an existing AddressPicker validation error as soon as the address becomes valid", async () => {
  await i18next.use(initReactI18next).init({
    lng: "en",
    resources: {
      en: {
        translation: {
          "AddressPicker.validation.required": "This field is required",
        },
      },
    },
  });

  const form = createForm({
    values: {
      addressPicker: {
        emirateId: 1,
        regionId: 10,
        areaId: 100,
        street: "",
      },
    },
  });
  const container = document.createElement("div");
  document.body.appendChild(container);

  await act(async () => {
    ReactDOM.render(
      <FormProvider form={form}>
        <Field
          name="addressPicker"
          decorator={[FormItem]}
          component={[AddressPicker, { showMap: false }]}
        />
      </FormProvider>,
      container,
    );
  });

  await assert.rejects(form.validate());
  const field = form.query("addressPicker").take();
  assert.equal(field?.selfInvalid, true);
  assert.match(container.textContent || "", /This field is required/);

  const streetInput = container.querySelector("textarea");
  assert.ok(streetInput);

  await act(async () => {
    Simulate.change(streetInput, { target: { value: "Street" } });
    await Promise.resolve();
  });

  const result = {
    value: field?.value.street,
    selfInvalid: field?.selfInvalid,
    errors: field?.errors,
    hasRequiredError: (container.textContent || "").includes(
      "This field is required",
    ),
  };

  ReactDOM.unmountComponentAtNode(container);
  container.remove();

  assert.equal(result.value, "Street");
  assert.equal(result.selfInvalid, false);
  assert.deepEqual(result.errors, []);
  assert.equal(result.hasRequiredError, false);
});
