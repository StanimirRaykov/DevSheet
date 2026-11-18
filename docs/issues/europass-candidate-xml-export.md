**Branch:** `<issue-number>-europass-candidate-xml`  |  **Depends on:** #5 (languages and certifications), the XSD bundle downloaded by the project owner into `europassXSDschema/`

## Goal
Export the user's data as a Europass CV in the **Europass2 `Candidate` XML format** (ECV schema v3.0.0, 2020, HR-Open based), so the user can import it into the Europass online editor. Background, schema comparison and open questions: `docs/EUROPASS.md`.

## Not in scope
A PDF that only looks like Europass (exists as "Europass-style" and will be removed later). The old `SkillsPassport` format (archived, different schema).

## Prerequisites (before any code)
- [x] No official `Candidate.xsd` exists. Use the unofficial XSD and examples from https://github.com/J0ker98/europass-cv (CC-BY-4.0, kept in git-ignored `europassXSDschema/j0ker98-europass-cv/`). If it is copied into our repo, keep the licence and attribution. See `docs/EUROPASS.md`.
- [ ] Confirm the format with the live editor: upload the repo's `examples/minimal.xml` (fictional data) and see it import; then export a small CV from the editor and compare its XML (embedded in the PDF as `attachment.xml`) with the repo's reference.
- [ ] Do not send real personal data to the Europass importer while testing; use fictional data.
- [ ] Add the schema files to the test project (or reference them from `europassXSDschema/` and skip validation tests when absent, with a clear message). Check the redistribution terms before committing any schema file.

## Data gaps to close first
- **Name:** the schema wants given name and family name; `Profile.FullName` is one field. Add two fields (or a documented split) and migrate the forms.
- **Writing:** the schema has two writing dimensions (`CEF-Writing-Interaction`, `CEF-Writing-Production`); `Language` has one `Writing` level. Either store two levels or copy one value to both and document it.
- **Language codes:** must come from the official ECV-06 language list; decide what happens for a language that is not in the list.
- **Contact and address:** phone number, country code (ISO 3166-1 alpha-2) and address are not stored; decide which are exported and which are left out.
- **Education and work history:** check which elements are mandatory (education level/field, employer/position structure) and add missing fields.

## Design
- `ICvXmlExporter` in Application, implemented in Infrastructure, built on the same privacy-filtered `CvModel`/`CvDataService` as the PDFs (visible projects, confirmed skills only). The exporter never touches the database.
- Generate with `System.Xml.Linq` and the exact namespaces from the schema; no string concatenation. Escape and normalize text, enforce length limits from the schema, format dates as the schema requires.
- Endpoint `GET /api/me/cv.xml` (login required, `application/xml`, download file name), dashboard button "Export for Europass".
- Optional later: embed the XML in a PDF ("PDF + Europass XML").

## Tests
- Generated XML for a full profile validates against the official XSD.
- Generated XML for an empty profile and for a minimal profile validates (or fails with a clear, intentional error if a field is mandatory).
- Only visible projects and confirmed skills appear; another user's data never appears.
- Special characters and Cyrillic survive a round trip; XML-significant characters are escaped.
- Unknown language code and missing optional fields are handled without producing invalid XML.
- Anonymous request returns 401.

## Manual acceptance (project owner)
- [ ] Upload the exported file to the live Europass CV editor. It imports without errors and the sections (personal details, education, work experience, languages with levels, certifications, skills) match DevSheet.
- [ ] Record the result, date and screenshot in the pull request.

## Definition of done
Tests above pass in CI, manual import succeeded and is documented, `docs/EUROPASS.md` updated with the final mapping.
