# AMF-PDM Analyser

A survey data quality monitoring tool built for eHealth Africa's Against Malaria Foundation (AMF) Post-Distribution Monitoring (PDM) programmed.

All data processing happens entirely in the browser — no data is uploaded to any server.

---

## What It Does

| Tab | Purpose |
|-----|---------|
| **Data Comparison** | Compares main survey responses against revisit data for 5 key variables, calculates similarity rates per LGA |
| **Data Quality Check** | Runs 8 automated quality checks on uploaded survey data and flags problematic records |
| **Pivot Table** | Summarises survey counts by any combination of fields |
| **Frequency Analysis** | Shows value distributions for any column in the dataset |

### The 8 Quality Checks

1. **Basic Check** — Household not found, no adult present, consent not given
2. **Duration Check** — Interview shorter than 10 minutes or longer than 30 minutes
3. **GPS Check** — Missing or zero GPS coordinates
4. **Precision Check** — GPS accuracy greater than 10 metres
5. **Stackpoint Check** — Multiple households recorded at the exact same GPS point
6. **Proximity Check** — Households recorded within 20–30 metres of each other
7. **Duplicate Check** — Same household ID appears more than once
8. **Interview Gap Check** — Less than 15 minutes between consecutive surveys by the same enumerator

---

## Getting Started

### Requirements

- [Node.js](https://nodejs.org/) version 18 or higher
- npm (comes with Node.js)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/eHealthAfrica/amf-pdm-analyser.git
cd amf-pdm-analyser

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Then open your browser and go to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` folder. You can host them on any static file server.

---

## Login

| Field | Value |
|-------|-------|
| Username | `amf_pdm` |
| Password | `admin` |

---

## How to Use

### Data Quality Check

1. Click the **Data Quality Check** tab
2. Upload your PDM survey Excel file (`.xlsx`)
3. The tool will run all 8 checks automatically
4. Use the filters to view flagged records by LGA, ward, or check type
5. Open the **Enumerator Reports** sub-tab to see individual enumerator scorecards
6. Download the enumerator report as HTML for sharing

### Data Comparison

1. Click the **Data Comparison** tab
2. Upload the **main survey** file first, then the **revisit survey** file
3. The tool will match households by ID and compare these 5 variables:
   - Number of people in household
   - Sleeping spaces
   - Campaign nets hung
   - Campaign nets not hung
   - Nets used correctly
4. Filter by LGA to focus on specific areas

---

## Expected Excel Column Names

The tool auto-detects most columns, but your data should contain these key fields:

| Purpose | Column Name |
|---------|-------------|
| Household ID | `calc_household_id` |
| Enumerator | `username` |
| Survey start time | `calc_first_visit_last_change` |
| Survey end time | `end` |
| GPS Latitude | `calc_gps_latitude` |
| GPS Longitude | `calc_gps_longitude` |
| LGA | `calc_l4_name` |
| Village | `calc_village_name` |

---

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **SheetJS (xlsx)** (Excel file parsing)
- **Leaflet** (GPS maps)
- **Zustand** (state management)

---

## Project Structure

```
src/
├── components/
│   ├── AppHeader.tsx          # Navigation tabs
│   ├── LoginPage.tsx          # Login screen
│   ├── DataComparison/        # Similarity analysis tab
│   ├── DataQuality/           # Quality checks tab
│   │   ├── index.tsx          # Main quality check view
│   │   ├── ValidationMap.tsx  # GPS map view
│   │   └── EnumeratorReports.tsx  # Enumerator scorecards
│   ├── PivotTable/            # Pivot table tab
│   └── FrequencyAnalysis/     # Frequency analysis tab
├── utils/
│   ├── dataValidation.ts      # All 8 quality check logic
│   ├── enumeratorUtils.ts     # Enumerator stats calculation
│   ├── similarity.ts          # Data comparison logic
│   └── excelUtils.ts          # Excel file parsing
└── types/                     # TypeScript type definitions
```

---

## Enumerator Performance Categories

| Category | Quality Score |
|----------|--------------|
| 🌟 Very Good | 96% and above |
| ⚠️ Needs Improvement | 71% – 95% |
| 📚 Requires Training | 40% – 70% |
| ❌ Recommended for Dismissal | Below 40% |

---

## Notes

- The tool works entirely offline after the page loads — no internet connection needed during analysis
- Excel files are never sent to any server; all processing is done in your browser
- For large datasets (50,000+ rows), processing may take a few seconds

---

*Built by eHealth Africa for the AMF PDM Programme.*
