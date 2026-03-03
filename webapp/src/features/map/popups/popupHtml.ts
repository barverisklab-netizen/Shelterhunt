interface PopupSectionOptions {
  titleHtml: string;
  contentHtml: string;
  descriptionHtml?: string;
}

interface PopupBodyOptions {
  lineHeight?: string;
}

const POPUP_CARD_STYLE =
  "background: rgba(255, 255, 255, 0.85); border-radius: 8px; min-width: 220px; color: #000;";
const POPUP_SECTION_STYLE = "padding: 12px;";
const POPUP_TITLE_STYLE = "font-weight:700; margin-bottom:6px; font-size:14px;";
const POPUP_DESCRIPTION_STYLE = "opacity:0.9; font-size:12px; margin-bottom:8px;";
const POPUP_BODY_STYLE = "font-size:12px;";
const POPUP_DIVIDER_STYLE =
  "height:1px; background: rgba(22, 21, 21, 0.2); margin: 0 12px;";

export function buildPopupSectionHtml({
  titleHtml,
  contentHtml,
  descriptionHtml,
}: PopupSectionOptions): string {
  return `
    <div style="${POPUP_SECTION_STYLE}">
      <div style="${POPUP_TITLE_STYLE}">
        ${titleHtml}
      </div>
      ${
        descriptionHtml
          ? `<div style="${POPUP_DESCRIPTION_STYLE}">${descriptionHtml}</div>`
          : ""
      }
      ${contentHtml}
    </div>
  `;
}

export function buildPopupCardHtml(sectionHtml: string[]): string {
  return `
    <div style="${POPUP_CARD_STYLE}">
      ${sectionHtml.join(`<div style="${POPUP_DIVIDER_STYLE}"></div>`)}
    </div>
  `;
}

export function buildPopupBodyHtml(
  contentHtml: string,
  options?: PopupBodyOptions,
): string {
  const lineHeightStyle = options?.lineHeight
    ? ` line-height:${options.lineHeight};`
    : "";
  return `<div style="${POPUP_BODY_STYLE}${lineHeightStyle}">${contentHtml}</div>`;
}
