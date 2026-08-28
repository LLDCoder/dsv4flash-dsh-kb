---
name: modal-shell-scrollbar
description: Standardize Ant Design 4 modal shells in the UMC Customer Portal. Use when adding or fixing a centered modal, moving modal width into CSS, enforcing max-height such as 85vh, adding SimpleBar-based internal scrolling, keeping modal footers fixed, preventing scrollbars from overlapping form controls, or aligning a modal with the existing TermsConditions/MediaContentStandards shell pattern.
---

# Modal Shell Scrollbar

Use the existing AntD 4 `Modal` plus the local `SimpleBar` wrapper. Do not hand-roll scrollbars or add new dependencies.

## Required Pattern

1. Keep AntD 4 props: `visible`, `onCancel`, `centered`, `className`, `wrapClassName`.
2. Put modal width in a scoped CSS class, not the `width` prop.
3. Put actions in the AntD `footer` prop so they stay outside the scrollable body.
4. Wrap only the body content with `SimpleBar`.
5. Scope all modal shell rules under a modal-specific class, not only `wrapClassName`, because multiple modals may share the same wrapper.

```tsx
import SimpleBar from "@/components/SimpleBar";

<Modal
  visible={visible}
  onCancel={onCancel}
  centered
  className="feature-modal"
  wrapClassName="feature-modal-root"
  footer={
    <div className="formily-modal-footer feature-modal__footer">
      <CustomButton variant="outline" onClick={onCancel}>
        {cancelText}
      </CustomButton>
      <CustomButton variant="primary" onClick={onConfirm}>
        {confirmText}
      </CustomButton>
    </div>
  }
>
  <SimpleBar className="feature-modal__scroll">
    <div className="feature-modal__content">{children}</div>
  </SimpleBar>
</Modal>
```

## CSS Shell

Follow the TermsConditions-style shell: content has `max-height: 85vh`, header/footer are fixed, body is the scroll host.

```less
.feature-modal-root {
  .feature-modal {
    width: 900px !important;

    .custom-simplebar .simplebar-track.simplebar-vertical {
      right: 0 !important;
      left: auto !important;
    }

    .ant-modal-content {
      display: flex;
      flex-direction: column;
      max-height: 85vh;
    }

    .ant-modal-header,
    .ant-modal-footer {
      flex: 0 0 auto;
    }

    .ant-modal-footer {
      padding: 0 24px 24px;
      border-top: 0;
    }

    .ant-modal-body {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
      padding: 0;
    }

    .feature-modal__scroll {
      flex: 1 1 auto;
      min-height: 0;
    }

    .feature-modal__content {
      padding: 24px;
    }
  }
}

html[dir="rtl"] .feature-modal-root {
  .feature-modal {
    .custom-simplebar .simplebar-track.simplebar-vertical {
      right: auto !important;
      left: 0 !important;
    }
  }
}
```

## Guardrails

- Do not style `.ant-modal-*` globally.
- Do not scope shell rules only to `wrapClassName` when another modal reuses it.
- Do not put the footer inside `SimpleBar`; buttons must remain visible while body content scrolls.
- Do not let the vertical scrollbar overlap form controls; keep content padding and the SimpleBar track inside the modal shell.
- When changing AntD props, also use `.agents/skills/antd-4-compatibility`.

## Verification

Use a 1920x1080 viewport for browser checks unless the task says otherwise.

Verify:

- Modal width comes from CSS.
- Modal content height equals the target max height, for example `85vh` is `918px` at 1080px.
- Center delta is `{ x: 0, y: 0 }` or visually centered within rounding tolerance.
- SimpleBar wrapper has `overflow-y: scroll` when content exceeds the body.
- Footer remains visible after scrolling to the bottom.
- The scrollbar track does not overlap key fields such as Select or TextArea.
