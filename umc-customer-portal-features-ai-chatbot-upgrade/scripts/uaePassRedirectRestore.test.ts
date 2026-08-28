import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import { useUaePassRedirectLoading } from "../src/hooks/useUaePassRedirectLoading.ts";
import { registerUaePassRedirectRestore } from "../src/utils/uaePassLoginFlow.ts";

test("resets UAE PASS redirect loading when browser history restores the page", () => {
  const target = new EventTarget();
  let loading = true;
  const cleanup = registerUaePassRedirectRestore(() => {
    loading = false;
  }, target);

  target.dispatchEvent(new Event("pageshow"));
  assert.equal(loading, false);

  loading = true;
  cleanup();
  target.dispatchEvent(new Event("pageshow"));
  assert.equal(loading, true);
});

test("restores reusable React redirect loading after every browser history return", () => {
  const dom = new JSDOM("<div id=\"root\"></div>", {
    url: "http://localhost/login",
  });
  const root = dom.window.document.getElementById("root");
  assert.ok(root);

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = dom.window as unknown as Window & typeof globalThis;
  globalThis.document = dom.window.document;

  let pageShowAdds = 0;
  let pageShowRemoves = 0;
  const originalAddEventListener = dom.window.addEventListener.bind(dom.window);
  const originalRemoveEventListener =
    dom.window.removeEventListener.bind(dom.window);
  dom.window.addEventListener = ((type, listener, options) => {
    if (type === "pageshow") pageShowAdds += 1;
    originalAddEventListener(type, listener, options);
  }) as typeof dom.window.addEventListener;
  dom.window.removeEventListener = ((type, listener, options) => {
    if (type === "pageshow") pageShowRemoves += 1;
    originalRemoveEventListener(type, listener, options);
  }) as typeof dom.window.removeEventListener;

  const Probe = () => {
    const [loading, setLoading] = useUaePassRedirectLoading();
    return React.createElement(
      "button",
      { onClick: () => setLoading(true) },
      loading ? "loading" : "idle",
    );
  };

  try {
    act(() => {
      ReactDOM.render(React.createElement(Probe), root);
    });
    const button = root.querySelector("button");
    assert.ok(button);
    assert.equal(pageShowAdds, 1);

    for (let cycle = 0; cycle < 2; cycle += 1) {
      act(() => {
        button.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        );
      });
      assert.equal(button.textContent, "loading");

      act(() => {
        dom.window.dispatchEvent(new dom.window.Event("pageshow"));
      });
      assert.equal(button.textContent, "idle");
    }

    act(() => {
      ReactDOM.unmountComponentAtNode(root);
    });
    assert.equal(pageShowRemoves, 1);
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    dom.window.close();
  }
});
