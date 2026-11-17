using DevSheet.Application.Cv;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace DevSheet.Infrastructure.Cv;

/// <summary>"Modern IT" template: single column, accent headings, skills up front. Renders a CvModel to PDF bytes.</summary>
public static class ModernCvRenderer
{
    private const string Accent = "#0f766e";
    private const string Muted = "#525252";

    static ModernCvRenderer()
    {
        // QuestPDF Community License: free for individuals/learning/small organisations. Re-check the terms
        // (https://www.questpdf.com/license) before any commercial launch.
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Render(CvModel cv) => Build(cv).GeneratePdf();

    internal static Document Build(CvModel cv) =>
        Document.Create(doc => doc.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(36);
            page.DefaultTextStyle(t => t.FontSize(10).FontColor("#171717"));

            page.Content().Column(col =>
            {
                col.Spacing(10);
                Header(col, cv);

                if (!string.IsNullOrWhiteSpace(cv.Summary))
                    Section(col, "Summary", c => c.Item().Text(cv.Summary.Trim()));

                if (cv.Skills.Count > 0)
                    Section(col, "Skills", c => c.Item().Text(string.Join("  ·  ", cv.Skills)));

                if (cv.Experience.Count > 0)
                    Section(col, "Experience", c =>
                    {
                        foreach (var x in cv.Experience)
                            c.Item().EnsureSpace(60).Column(item =>
                            {
                                item.Item().Row(r =>
                                {
                                    r.RelativeItem().Text($"{x.Title} · {x.Company}").SemiBold();
                                    r.AutoItem().Text(CvFormat.Range(x.Start, x.End)).FontColor(Muted).FontSize(9);
                                });
                                if (!string.IsNullOrWhiteSpace(x.Description))
                                    item.Item().PaddingTop(2).Text(x.Description.Trim());
                            });
                    });

                if (cv.Projects.Count > 0)
                    Section(col, "Projects", c =>
                    {
                        foreach (var p in cv.Projects)
                            c.Item().EnsureSpace(50).Column(item =>
                            {
                                item.Item().Text(t =>
                                {
                                    t.Span(p.Title).SemiBold();
                                    t.Span("  ");
                                    t.Hyperlink(p.Url, p.Url).FontSize(8).FontColor(Accent).Underline();
                                });
                                if (!string.IsNullOrWhiteSpace(p.Description))
                                    item.Item().Text(p.Description.Trim());
                                if (p.Skills.Count > 0)
                                    item.Item().Text(string.Join(", ", p.Skills)).FontSize(9).FontColor(Muted);
                            });
                    });

                if (cv.Education.Count > 0)
                    Section(col, "Education", c =>
                    {
                        foreach (var e in cv.Education)
                            c.Item().EnsureSpace(30).Row(r =>
                            {
                                var title = string.IsNullOrWhiteSpace(e.Degree) ? e.Institution : $"{e.Institution} · {e.Degree}";
                                r.RelativeItem().Text(title).SemiBold();
                                r.AutoItem().Text(CvFormat.Range(e.Start, e.End)).FontColor(Muted).FontSize(9);
                            });
                    });
            });
        }));

    private static void Header(ColumnDescriptor col, CvModel cv)
    {
        col.Item().Text(cv.Name).FontSize(24).Bold().FontColor(Accent);
        if (!string.IsNullOrWhiteSpace(cv.Headline))
            col.Item().Text(cv.Headline).FontSize(12).FontColor(Muted);

        var contact = new[] { cv.Email, cv.Location, cv.GithubUrl }.Where(s => !string.IsNullOrWhiteSpace(s));
        col.Item().Text(string.Join("  ·  ", contact)).FontSize(9).FontColor(Muted);
    }

    private static void Section(ColumnDescriptor col, string title, Action<ColumnDescriptor> body) =>
        col.Item().Column(c =>
        {
            c.Spacing(5);
            c.Item().BorderBottom(1).BorderColor(Accent).PaddingBottom(2)
                .Text(title.ToUpperInvariant()).FontSize(10).Bold().FontColor(Accent);
            body(c);
        });
}
