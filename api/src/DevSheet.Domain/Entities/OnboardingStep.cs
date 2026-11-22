using System.Text.Json.Serialization;

namespace DevSheet.Domain.Entities;

/// <summary>The steps of the welcome flow, in order. Stored as a number; sent to the web app by name.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OnboardingStep { About = 0, Github = 1, Sync = 2, Review = 3, Done = 4 }
