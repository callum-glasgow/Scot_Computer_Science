# SQA Past Papers — Computing Science

A web-based tool for browsing SQA Computing Science past paper questions, organised by level, course section, subsection, and year.

## 🚀 Open the App

👉 **[Launch Past Papers Browser](https://callum-glasgow.github.io/Scot_Computer_Science/web/)**

> To run locally: open a terminal in this folder and run `python3 -m http.server 8000`, then visit `http://localhost:8000/web/`

> [!NOTE]
> For the best performance, it is recommended to clone this repository and run it locally. GitHub Pages may experience slower loading times due to API rate limits or network latency with multiple data requests.

---

## 📁 Folder Structure

```
.
├── README.md
├── web/                          ← Web interface
│   ├── index.html
│   ├── style.css
│   └── app.js
└── computer_science/             ← Data & PDFs
    ├── QPmap/                    ← JSON question maps
    │   ├── N5_2025.json
    │   ├── N5_2024.json
    │   ├── higher_2025.json
    │   ├── AH_2025.json
    │   └── ...                   (15 files total)
    └── Single_Qestions/          ← Individual question & marking PDFs
        ├── N5/
        │   ├── 2025/
        │   │   ├── Q1.pdf        ← Question paper for Q1
        │   │   ├── Q2.pdf
        │   │   ├── MI_Q1/        ← Marking instructions for Q1
        │   │   │   ├── MI_Q1_1(a).pdf
        │   │   │   └── MI_Q1_1(b).pdf
        │   │   ├── MI_Q2/
        │   │   │   └── MI_Q2_2.pdf
        │   │   └── ...
        │   ├── 2024/
        │   ├── 2023/
        │   ├── 2022/
        │   └── specimen/
        ├── higher/
        │   ├── 2025/
        │   ├── 2024/
        │   └── ...
        └── AH/
            ├── 2025/
            ├── 2024/
            └── ...
```

---

## 📄 JSON Question Map Format

Each JSON file in `computer_science/QPmap/` maps a single exam paper. Files are named `{level}_{year}.json` (e.g. `N5_2025.json`, `higher_2024.json`, `AH_specimen.json`).

### Schema

```json
{
  "schema_version": "1.0",
  "paper_id": "X816/75/01",
  "paper_name": "National Qualifications 2025 Computing Science",
  "file": "X8167501.pdf",
  "course_spec_file": "National-5-Computing-Science-Course-Specification.pdf",
  "question_map": [
    {
      "question": "3",
      "subquestions": [
        {
          "id": "3(a)",
          "exam_section": "SECTION 1 — SOFTWARE DESIGN AND DEVELOPMENT...",
          "course_section": "Software design and development",
          "course_subsection": "Implementation (computational constructs)",
          "description": "State the result of an arithmetic operation..."
        },
        {
          "id": "3(b)",
          "exam_section": "...",
          "course_section": "Software design and development",
          "course_subsection": "Evaluation",
          "description": "State a technique used to improve readability..."
        }
      ]
    }
  ]
}
```

### Field Descriptions

| Field | Description |
|-------|-------------|
| `paper_id` | SQA paper reference code |
| `paper_name` | Full title of the exam paper |
| `question` | Top-level question number (e.g. `"3"`) |
| `id` | Subquestion identifier (e.g. `"3(a)"`, `"9(c)(ii)"`) — used to locate the matching PDF |
| `exam_section` | Which section of the exam the question appears in |
| `course_section` | SQA course area (e.g. "Software design and development", "Computer systems") |
| `course_subsection` | Specific topic within the course section (e.g. "Evaluation", "Data representation") |
| `description` | Plain-English summary of what the question asks |

### How PDFs Map to JSON

For a subquestion with `question: "3"` and `id: "3(b)"` in the N5 2025 paper:

- **Question Paper** → `Single_Qestions/N5/2025/Q3.pdf`
- **Marking Instructions** → `Single_Qestions/N5/2025/MI_Q3/MI_Q3_3(b).pdf`

### Coverage

| Level | Years |
|-------|-------|
| National 5 (`N5`) | 2022, 2023, 2024, 2025, specimen |
| Higher (`higher`) | 2022, 2023, 2024, 2025, specimen |
| Advanced Higher (`AH`) | 2022, 2023, 2024, 2025, specimen |
