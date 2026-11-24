# Europass: research notes and decision

First researched 2026-11-17 for issue #5; **corrected 2026-11-18** (the first version mixed up two different schemas).
Goal of the project: export a CV as **Europass XML that can be imported into the Europass online editor**
(a look-alike PDF is not the goal).

## Two different schemas (do not mix them up)

| | Old Europass (2013-2015) | Europass2 / ECV (2020) |
|---|---|---|
| Name | Europass XML Schema V3.0 ... V3.4.0 | "EUROPASS2 CV XML Schema", version 3.0.0, released 17/02/2020 |
| Root element | `SkillsPassport` (with `LearnerInfo`) | `Candidate` (with `CandidatePerson`, `CandidateProfile`) |
| Based on | Europass' own vocabulary | HR-Open / HR-XML, aligned with EURES |
| Namespaces | `EuropassSchema_V3.0` | `http://www.europass.eu/1.0`, `hr` = `http://www.hr-xml.org/3`, `oa` = `http://www.openapplications.org/oagis/9` |
| Status | Archived on [Joinup](https://interoperable-europe.ec.europa.eu/collection/employment-and-working-conditions/solution/europass-xml-schema-v30/release-0) | The format described as used for CV exchange in the Europass e-portfolio |
| Documentation | [v3.4.0 PDF](https://europass.europa.eu/system/files/2020-07/europass-xml-schema-doc-v3.4.0_0.pdf) (98 pages, cover dated Spring 2015) | [v3.0.0 PDF](https://europass.europa.eu/system/files/2020-08/ECV_Schema_Documentation_v3.0.0_20200602.pdf) (160 pages) |

**The target for DevSheet is the 2020 `Candidate` format.** The three files from the Joinup page
(`EuropassSchema_V3.0.xsd`, `EuropassLearnerInformation_V3.0.xsd`, `EuropassPrintingPreferences_V3.0.xsd`) belong to the
old format and are not what we need.

## What is known

- **The online editor imports XML.** The [Europass CV editor](https://europa.eu/europass/eportfolio/screen/cv-editor) lists the accepted
  upload formats for an existing CV as *Europass XML* and *Adobe PDF + Europass XML* (20 MB limit). The
  [FAQ](https://europass.europa.eu/en/faq?page=1) says Word/ODF/other PDFs cannot be imported. A PDF that only looks like Europass
  cannot be imported. *Which schema version the 2026 editor accepts is not stated on the pages I could read.*
- **The 2020 schema ships as a bundle of XSDs.** The documentation says the entry file is `Candidate.xsd` in a `Nouns` folder
  (`org_europass/1.0/Developer/Nouns`), with `Components.xsd`, `Fields.xsd`, `Codelists.xsd` and `Meta.xsd` in a `Common` folder,
  importing HR-Open and OAGIS schemas. Code lists (languages, countries, ...) are separate files; the language list is the
  "ECV-06 Languages" sheet. The bundle is **not** in the PDFs.
- **Where to get the bundle:** a search result states that the official ePortfolio interoperability page offers an XML schema zip
  ("v4.0.1", described as the latest) and a sample CV. **Unverified:** that page answers "Access denied"/403 to automated fetches
  and to the in-app browser, so it has to be opened by a person. Try europass.europa.eu, *Stakeholders*, *Interoperability*
  (`https://europa.eu/europass/en/eportfolio-interoperability`). The documentation PDF here is v3.0.0, so check which version the zip contains
  and which one the editor accepts.
- **Working source (2026-11-18): [J0ker98/europass-cv](https://github.com/J0ker98/europass-cv)** (CC-BY-4.0, last push 2026-09-18). The European
  Commission publishes **no** `Candidate.xsd` (the repo's `how-it-was-derived.md` says the file named in `xsi:schemaLocation` is not downloadable
  anywhere). The repo contains an **unofficial XSD** (`schema/`, 4 files) written from real editor exports and from probing the editor's importer,
  an element-by-element reference (`docs/format.md`) and two example CVs that validate against it (checked here with `xmllint`).
  Copy kept in `europassXSDschema/j0ker98-europass-cv/` (git-ignored). **Third-party, not official: the live editor stays the final judge.**
  Facts from it that matter for us: the current editor **rejects the old `SkillsPassport` XML** ("old format"); namespaces are `europass.eu/1.0`,
  `hr-xml.org/3`, `openapplications.org/oagis/9` and `europass_eures.eu/1.0`; `PersonName` (given + family) is mandatory; a telephone needs
  `CountryDialing`; the language skill has **five** CEFR dimensions in the observed exports (no `Writing-Interaction`); languages use ISO 639-2
  three-letter codes (`eng`), not two-letter; without `RenderingInformation/Design/SectionsOrder` only personal data is shown after import;
  `Certifications` were only seen empty (children ignored), so certificates need a custom section (`Others`) or may not import.
- The old [github.com/europass](https://github.com/europass) organisation has parsers and samples for the old format
  (`europasscv-parser-js`, `sample-tools-java`, `sample-tools-php`, REST examples); none is described as containing the 2020 XSD.

## Final mapping (issue #25, built 2026-11-24)

`GET /api/me/cv.xml` (login required) returns `<slug>-cv-europass.xml`, built by `EuropassXmlExporter` from the same
privacy-filtered `CvModel` as the PDFs: only visible projects and confirmed skills, never another user's data. The
dashboard's CV page has an "Export for Europass" button with the steps to import it.

| Europass element | DevSheet source | Notes |
| --- | --- | --- |
| `CandidatePerson/PersonName` (`oa:GivenName`, `hr:FamilyName`) | `Profile.FullName` (or the display name) | **Split at the first space**: "Maria de la Cruz" -> Maria / de la Cruz. One word: the family name stays empty and is fixed in the editor. No database change |
| `Communication` Email | `Profile.Email` | |
| `Communication` Telephone (`UseCode` mobile, `CountryDialing`, `oa:DialNumber`, `CountryCode`) | `Profile.Phone` (new), `Profile.CountryCode` | Stored in international form (`+359 88 123 4567`). The calling code is found from the country list (`Countries`), so `CountryDialing` (mandatory for the importer) is always a real code. `CountryCode` is always written too (the profile country when its calling code matches, else the code's owner): without it the editor flags "Should be valid prefix". A number that does not split is left out |
| `Communication` Web | GitHub connection | `https://github.com/<login>` |
| `Communication` Address (`oa:CityName`, `CountryCode`) | `Profile.Location` (city), `Profile.CountryCode` (new) | ISO 3166-1 alpha-2, lower case. **Written only when there is a country**: a city without a country crashes the live importer (HTTP 500, empty body) |
| `PrimaryLanguageCode` | native languages | ISO 639-1 (`bg`) -> ISO 639-2 (`bul`) through .NET culture data; unknown or missing code: `name="FREE_TEXT"` with the language name |
| `hr:ExecutiveSummary` | headline (bold) + summary | Escaped HTML; blank lines are paragraphs |
| `EmploymentHistory/EmployerHistory` | work experience | One per position, `YYYY-MM` dates, `CurrentIndicator` true without an end date. Always an empty `OrganizationContact/Communication/Address`: the editor's preview reads the company address without a null check and stops drawing the CV at the first job without one |
| `EducationHistory/EducationOrganizationAttendance` | education | `Ongoing` true when there is a start and no end (same reading as the PDFs). No EQF level or field of study: not stored, optional in Europass |
| `PersonQualifications/PersonCompetency` | foreign languages | Five dimensions; DevSheet's single `Writing` level is `CEF-Writing-Production` (the editor has no writing-interaction skill) |
| `Skills/PersonCompetency` (`Digital_Skill`) | confirmed skills | Duplicates (case-insensitive) dropped: the editor rejects them |
| `Others` "Projects" | visible projects | One `Others` per entry (the importer keeps one entry per `Others` and merges equal titles). Description, confirmed skills, repository link |
| `Others` "Certifications" | certifications | The `Certifications` element is ignored by the importer, so a custom section. Issue month as start date, issuer, link |
| `RenderingInformation/Design/SectionsOrder` | sections that have content | Without it the editor shows only personal data |
| `CandidateProfile/@languageCode` | `en` | DevSheet's texts are English |

**Privacy.** Phone has its own opt-in (`ShowPhonePublicly`); the country goes with the location switch. The owner's own
exports (PDF and XML) always include them; the public page and the visitor CV download only when switched on.

**Validation.** `api/tests/DevSheet.Tests/Europass/` holds a copy of the unofficial XSD (CC-BY-4.0, credit in
`NOTICE.md` there). `EuropassXmlTests` validates the exported bytes for a full CV, a CV with only a name and a CV without
any name, and checks Cyrillic, escaping of user markup, free-text languages, duplicate skills and the phone split.

**Checked against the live importer (2026-11-24, fictional data only).** Files were posted from the editor page
itself (its own CSRF token) to `api/eprofile/europass-cv`, changing one thing at a time:

| Variant | Result |
| --- | --- |
| Home address with a city and no country | **HTTP 500, empty body** ("The file is not Europass compliant"). Fixed: no address without a country |
| Home address with a country (with or without city), or no address | 200, no errors |
| Telephone without `CountryCode` | 200 with "Should be valid prefix". Fixed: the country is always written |
| Job without `OrganizationContact` | Imports, but the **preview stops after the "Work experience" heading** (the preview code reads `organisationAddress.addressPart1` unguarded). Fixed: an empty `Address` imports as an address with no fields |
| Schools without `OrganizationContact`, no `hr:ID`, `encoding="utf-8"` in lower case, custom entry without a description | Not the cause: 200 once the address was fixed |

**Document name.** After an import the editor asks for the CV's name ("firstname_lastname_cv"). That is the title
of the document in the Europass account, not the person's name: the import response has no field for it (the
uploaded file name is not used either), so it cannot be set from the XML.

**Still manual (project owner):** upload an export made from fictional data to the live editor and record the result.

## Research notes: how the 2020 documentation models our data (superseded by the final mapping above)

| Europass2 element | DevSheet today | Gap |
|---|---|---|
| `/Candidate/CandidatePerson/PersonName` | `Profile.FullName` | needs given name and family name separately |
| `/CandidatePerson/Communication` (email, phone, web) | `Profile.Email`, GitHub URL | phone not stored |
| `/CandidateProfile/EducationHistory/EducationOrganizationAttendance` | `Education` | check level/field requirements |
| `/CandidateProfile/EmploymentHistory` | `WorkExperience` | check position/employer structure |
| `/CandidateProfile/PersonQualifications/PersonCompetency` + `CompetencyDimension` | `Language` | **six CEFR dimensions**: `CEF-Understanding-Listening`, `CEF-Understanding-Reading`, `CEF-Speaking-Interaction`, `CEF-Speaking-Production`, `CEF-Writing-Interaction`, `CEF-Writing-Production`. We store one `Writing` level, so it would have to be copied to both or split into two fields |
| language codes (ECV-06 list) | `Language.IsoCode` (optional) | must be a code from the official list; unknown languages need handling |
| `/CandidateProfile/Certifications` | `Certification` | read section 3.16 before mapping |
| `/CandidateProfile/DigitalSkills`, `Projects`, `Others` | confirmed skills, projects | free-text sections, to be decided |
| country codes | `Profile.Location` is free text | ISO 3166-1 alpha-2 needed for addresses |

## Decisions

1. **Official export is the real deliverable.** It is tracked as its own issue (see below). It needs the XSD bundle, so work on it starts
   once the files are in `europassXSDschema/` (git-ignored, downloaded by the project owner).
2. **Issue #5 delivers the data model for it** (languages with per-skill CEFR levels, certifications, with forms and tests) **and keeps the
   "Europass-style" PDF for now.** The PDF is labelled "Europass-style" and says "not an official Europass document"; it cannot be imported
   into Europass and is expected to be removed later.
3. **Acceptance for the XML export** is: valid against the XSD in automated tests, **and** accepted by the live Europass editor
   (manual check by the project owner, who has the login).

## Caveats

- Everything above about element names comes from the documentation, not from the XSD or a real import.
- The documentation and the XSD may differ from what the live editor accepts today. The live upload is the real test.

## Follow-up issue (create on GitHub)

The full text is in [`docs/issues/europass-candidate-xml-export.md`](issues/europass-candidate-xml-export.md). Create it with:

```bash
gh issue create --title "CV export: Europass Candidate XML (importable into the Europass editor)" --label feature --milestone "M2 Later" --body-file docs/issues/europass-candidate-xml-export.md
```
