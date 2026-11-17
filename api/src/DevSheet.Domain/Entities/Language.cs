namespace DevSheet.Domain.Entities;

/// <summary>Common European Framework of Reference for Languages. Values are stored as integers 1-6.</summary>
public enum CefrLevel { A1 = 1, A2 = 2, B1 = 3, B2 = 4, C1 = 5, C2 = 6 }

/// <summary>
/// A language the user speaks. Mirrors the Europass language table: a native language has no levels,
/// a foreign language is self-assessed in five skills (each optional).
/// </summary>
public class Language
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = "";
    /// <summary>Optional ISO 639-1 code (two lower-case letters, e.g. "bg"); kept so a later Europass XML export needs no data change.</summary>
    public string? IsoCode { get; set; }
    public bool IsMotherTongue { get; set; }
    public CefrLevel? Listening { get; set; }
    public CefrLevel? Reading { get; set; }
    public CefrLevel? SpokenInteraction { get; set; }
    public CefrLevel? SpokenProduction { get; set; }
    public CefrLevel? Writing { get; set; }
}
