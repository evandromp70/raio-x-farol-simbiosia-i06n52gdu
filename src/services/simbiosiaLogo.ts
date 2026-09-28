// Official Simbiosia logo adapted for jsPDF's RGB PNG decoder.
// Cropped to alpha bounds and composited on white; no glyph is redrawn.
export const SIMBIOSIA_PDF_LOGO_WIDTH = 320
export const SIMBIOSIA_PDF_LOGO_HEIGHT = 71
export const SIMBIOSIA_PDF_LOGO_DATA = [
  'iVBORw0KGgoAAAANSUhEUgAAAUAAAABHCAIAAACcFSVjAAAgAElEQVR4nOydC5wcVZ0/8O+3z2k2',
  '2z6k3ZJV0pY0hQ0QwqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpQpQqgqKioKCiKQKpP2D4JkYAAAAAElFTkSuQmCC',
] as const
export function getSimbiosiaPdfLogo(): string {
  return 'data:image/png;base64,' + SIMBIOSIA_PDF_LOGO_DATA.join('')
}
