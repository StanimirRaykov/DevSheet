# Europass: research notes and decision

Researched 2026-11-17 for issue #5. Question: does Europass offer a machine-readable format we can export,
or can we only produce a CV that looks like Europass?

## Findings

- **An official machine-readable format exists.** The European Commission/Cedefop published the Europass CV XML schema
  ("ECV", root element `SkillsPassport`). Documentation: [v3.0.0](https://europass.europa.eu/system/files/2020-08/ECV_Schema_Documentation_v3.0.0_20200602.pdf)
  (160 pages) and [v3.4.0 with change-log from v3.3.0](https://europass.europa.eu/system/files/2020-07/europass-xml-schema-doc-v3.4.0_0.pdf)
  (98 pages; the cover is dated Spring 2015, so this schema family is old). Both were read for this issue.
- **The online editor imports it.** The [Europass CV editor](https://europa.eu/europass/eportfolio/screen/cv-editor) lists the accepted
  upload formats for an existing CV as *Europass XML* and *Adobe PDF + Europass XML* (20 MB limit).
- **A plain PDF cannot be imported.** The [Europass FAQ](https://europass.europa.eu/en/faq?page=1) says only Europass-generated
  PDF/XML files can be imported; Word, ODF and other PDFs cannot. A PDF that only looks like Europass is a visual document only.
- **The XSD files could not be downloaded.** The archived [Joinup release page](https://interoperable-europe.ec.europa.eu/collection/employment-and-working-conditions/solution/europass-xml-schema-v30/release-0)
  ("Europass XML Schema V3.0 - FINAL", marked *Archived*, no version above 3.0 mentioned) links `EuropassSchema_V3.0.xsd`,
  `EuropassLearnerInformation_V3.0.xsd` and `EuropassPrintingPreferences_V3.0.xsd` at `europass.cedefop.europa.eu/xml/...`.
  Those URLs now redirect to an HTML page (`europass.europa.eu/en/stakeholders/interoperability-europass`), which only has general text.
  The schema also includes/imports nine more XSDs (ISO countries, ISO languages, nationalities, ISCO, address formats, NACE, ISCED97,
  EU driving licence, EQF) that would be needed to validate a document. No file was saved from these URLs.
- **GitHub organisation [github.com/europass](https://github.com/europass)** (11 repos, newest update Feb 2025) has parsers and samples:
  `europasscv-parser-js` (parse Europass PDF/XML, MIT), `sample-tools-java` and `sample-tools-php` (parse a Europass document into a DB),
  REST API examples (`rest-examples-java/js/php`), and the deprecated `europass2spreadsheet`. None is described as containing the XSD;
  the sample tools may bundle one (not checked). They are the best lead for a schema copy and for sample files.
- The current Europass site describes interoperability in general terms and links an "information for developers" page that has not
  been read yet; I could not confirm what the 2026 editor accepts beyond the editor page above.

## What the schema contains (read from the v3.4.0 documentation)

| Europass XML | Notes | DevSheet today |
|---|---|---|
| `Identification/PersonName` | `Title`, **`FirstName`, `Surname` separately** | `Profile.FullName` (single field) |
| `Identification/ContactInfo` | Address, Email, TelephoneList, WebsiteList | `Profile.Email`, `Location`, GitHub URL |
| `Headline` | desired job / headline | `Profile.Headline` |
| `WorkExperience` | `Period` (From, To or `Current`), `Position`, `Activities`, `Employer` | `WorkExperience` |
| `Education` | `Period`, `Title`, `Organisation`, `Level`, `Field`, `Activities` | `Education` (no level/field) |
| `Skills/Linguistic/MotherTongue` | language `Code` (ISO 639-1 from an enumeration) + `Label` | **new: `Language.IsMotherTongue`, `IsoCode`** |
| `Skills/Linguistic/ForeignLanguage` | `ProficiencyLevel` with **five** CEFR values: `Listening`, `Reading`, `SpokenInteraction`, `SpokenProduction`, `Writing` (A1-C2); `VerifiedBy` certificates | **new: `Language` with five levels** |
| `Certificate` | `Title` (required), `AwardingBody`, `Date`, `Level` | **new: `Certification`** |
| `Skills/Computer` | free-text `Description`, DIGCOMP levels A/B/C in 5 areas, certificates | confirmed skills (ESCO mapping: issue #9) |
| `Skills/Communication`, `Organisational`, `JobRelated`, `Other` | free text | not modelled |

## Decision

1. **Issue #5 delivers a "Europass-style" PDF** (the Europass section layout filled from DevSheet data). It is labelled
   **"Europass-style"** in the UI, README and thesis. We do not claim official Europass export.
2. **Languages store the five CEFR levels** (not a single level), because the official format and the Europass language table use them.
   The UI offers an "overall level" shortcut that fills all five. `IsoCode` (optional, two letters) is stored now so the later XML
   export does not need a data change. `Certification` keeps the schema fields (title, issuer, date) plus an optional URL for the portfolio.
3. **Official export is a separate follow-up issue:** generate Europass XML per the schema, validate it against the XSDs in tests,
   and confirm manually that the Europass online editor accepts the file. Prerequisites: obtain the XSDs (check `sample-tools-java`
   first, or an archived copy of the original URLs), split `FullName` into first name and surname, add education level/field.
   Optionally embed the XML in the PDF ("PDF + Europass XML").
4. The reference PDFs live in `europassXSDschema/` locally and are git-ignored (7.5 MB, redistribution terms not checked);
   the links above are the source of record.

## Caveats

- The schema documents are from 2013-2015 (the v3.0.0 file name is dated 2020-06-02). I found no page confirming that the current
  editor still accepts exactly these files. **Verify by uploading a generated file to the live editor before claiming support.**
- Mapping above comes from the documentation, not from the XSD; check field names and cardinality against the XSD once obtained.

## Follow-up issue (create on GitHub)

```bash
gh issue create --title "CV export: official Europass XML (and PDF with attached XML)" --label feature --milestone "M2 Later" --body "Generate Europass CV XML per the official schema (see docs/EUROPASS.md): map profile, experience, education, languages (CEFR), certifications and skills; obtain the XSDs (github.com/europass sample-tools-java or an archived copy); validate against the XSDs in tests; verify the live Europass editor accepts the file; optionally embed the XML in the PDF. Prerequisites: split FullName into first name and surname, add education level/field. Depends on #5 and #9."
```
