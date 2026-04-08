# Unicode Fonts for PDF Reports

Place `.ttf` font files in this directory to enable non-Latin script rendering
(Bengali, Hindi, Tamil, Telugu, Marathi) in generated PDF reports.

## Recommended Fonts

Download **Noto Sans** from [Google Fonts](https://fonts.google.com/noto):

| Font Family | Scripts Covered |
|---|---|
| Noto Sans | Latin (English) |
| Noto Sans Bengali | Bengali (বাংলা) |
| Noto Sans Devanagari | Hindi, Marathi (हिन्दी, मराठी) |
| Noto Sans Tamil | Tamil (தமிழ்) |
| Noto Sans Telugu | Telugu (తెలుగు) |

## Setup

1. Download the font families above.
2. Copy the `.ttf` files (Regular + Bold) into this directory.
3. The report generator will auto-detect and register them on startup.

If no Unicode fonts are found, the PDF falls back to Helvetica (Latin only)
and non-Latin text will show a fallback notice.
