using System.Text.RegularExpressions;

namespace DevSheet.Application.Career;

/// <param name="Code">ISO 3166-1 alpha-2, lower case (the form Europass uses).</param>
/// <param name="Dialing">International calling code, digits only (no +).</param>
public record Country(string Code, string Name, string Dialing);

/// <summary>A phone number split the way Europass stores it: the calling code and the rest of the digits.</summary>
public record PhoneParts(string Dialing, string Number);

/// <summary>
/// Countries with their calling codes, for the profile's country and phone. Kosovo uses the user-assigned code "xk".
/// Territories that share a calling code (for example the +1 area) keep the shared code.
/// </summary>
public static class Countries
{
    public static readonly IReadOnlyList<Country> All = Parse("""
        af Afghanistan 93; ax Åland Islands 358; al Albania 355; dz Algeria 213; as American Samoa 1; ad Andorra 376;
        ao Angola 244; ai Anguilla 1; ag Antigua and Barbuda 1; ar Argentina 54; am Armenia 374; aw Aruba 297;
        au Australia 61; at Austria 43; az Azerbaijan 994; bs Bahamas 1; bh Bahrain 973; bd Bangladesh 880;
        bb Barbados 1; by Belarus 375; be Belgium 32; bz Belize 501; bj Benin 229; bm Bermuda 1; bt Bhutan 975;
        bo Bolivia 591; ba Bosnia and Herzegovina 387; bw Botswana 267; br Brazil 55; io British Indian Ocean Territory 246;
        vg British Virgin Islands 1; bn Brunei 673; bg Bulgaria 359; bf Burkina Faso 226; bi Burundi 257;
        cv Cabo Verde 238; kh Cambodia 855; cm Cameroon 237; ca Canada 1; bq Caribbean Netherlands 599;
        ky Cayman Islands 1; cf Central African Republic 236; td Chad 235; cl Chile 56; cn China 86;
        cx Christmas Island 61; cc Cocos (Keeling) Islands 61; co Colombia 57; km Comoros 269; cg Congo 242;
        cd Congo (DRC) 243; ck Cook Islands 682; cr Costa Rica 506; ci Côte d'Ivoire 225; hr Croatia 385; cu Cuba 53;
        cw Curaçao 599; cy Cyprus 357; cz Czechia 420; dk Denmark 45; dj Djibouti 253; dm Dominica 1;
        do Dominican Republic 1; ec Ecuador 593; eg Egypt 20; sv El Salvador 503; gq Equatorial Guinea 240;
        er Eritrea 291; ee Estonia 372; sz Eswatini 268; et Ethiopia 251; fk Falkland Islands 500; fo Faroe Islands 298;
        fj Fiji 679; fi Finland 358; fr France 33; gf French Guiana 594; pf French Polynesia 689; ga Gabon 241;
        gm Gambia 220; ge Georgia 995; de Germany 49; gh Ghana 233; gi Gibraltar 350; gr Greece 30; gl Greenland 299;
        gd Grenada 1; gp Guadeloupe 590; gu Guam 1; gt Guatemala 502; gg Guernsey 44; gn Guinea 224;
        gw Guinea-Bissau 245; gy Guyana 592; ht Haiti 509; hn Honduras 504; hk Hong Kong 852; hu Hungary 36;
        is Iceland 354; in India 91; id Indonesia 62; ir Iran 98; iq Iraq 964; ie Ireland 353; im Isle of Man 44;
        il Israel 972; it Italy 39; jm Jamaica 1; jp Japan 81; je Jersey 44; jo Jordan 962; kz Kazakhstan 7;
        ke Kenya 254; ki Kiribati 686; xk Kosovo 383; kw Kuwait 965; kg Kyrgyzstan 996; la Laos 856; lv Latvia 371;
        lb Lebanon 961; ls Lesotho 266; lr Liberia 231; ly Libya 218; li Liechtenstein 423; lt Lithuania 370;
        lu Luxembourg 352; mo Macao 853; mg Madagascar 261; mw Malawi 265; my Malaysia 60; mv Maldives 960;
        ml Mali 223; mt Malta 356; mh Marshall Islands 692; mq Martinique 596; mr Mauritania 222; mu Mauritius 230;
        yt Mayotte 262; mx Mexico 52; fm Micronesia 691; md Moldova 373; mc Monaco 377; mn Mongolia 976;
        me Montenegro 382; ms Montserrat 1; ma Morocco 212; mz Mozambique 258; mm Myanmar 95; na Namibia 264;
        nr Nauru 674; np Nepal 977; nl Netherlands 31; nc New Caledonia 687; nz New Zealand 64; ni Nicaragua 505;
        ne Niger 227; ng Nigeria 234; nu Niue 683; nf Norfolk Island 672; kp North Korea 850; mk North Macedonia 389;
        mp Northern Mariana Islands 1; no Norway 47; om Oman 968; pk Pakistan 92; pw Palau 680; ps Palestine 970;
        pa Panama 507; pg Papua New Guinea 675; py Paraguay 595; pe Peru 51; ph Philippines 63; pn Pitcairn Islands 64;
        pl Poland 48; pt Portugal 351; pr Puerto Rico 1; qa Qatar 974; re Réunion 262; ro Romania 40; ru Russia 7;
        rw Rwanda 250; bl Saint Barthélemy 590; sh Saint Helena 290; kn Saint Kitts and Nevis 1; lc Saint Lucia 1;
        mf Saint Martin 590; pm Saint Pierre and Miquelon 508; vc Saint Vincent and the Grenadines 1; ws Samoa 685;
        sm San Marino 378; st São Tomé and Príncipe 239; sa Saudi Arabia 966; sn Senegal 221; rs Serbia 381;
        sc Seychelles 248; sl Sierra Leone 232; sg Singapore 65; sx Sint Maarten 1; sk Slovakia 421; si Slovenia 386;
        sb Solomon Islands 677; so Somalia 252; za South Africa 27; gs South Georgia 500; kr South Korea 82;
        ss South Sudan 211; es Spain 34; lk Sri Lanka 94; sd Sudan 249; sr Suriname 597; sj Svalbard and Jan Mayen 47;
        se Sweden 46; ch Switzerland 41; sy Syria 963; tw Taiwan 886; tj Tajikistan 992; tz Tanzania 255;
        th Thailand 66; tl Timor-Leste 670; tg Togo 228; tk Tokelau 690; to Tonga 676; tt Trinidad and Tobago 1;
        tn Tunisia 216; tr Türkiye 90; tm Turkmenistan 993; tc Turks and Caicos Islands 1; tv Tuvalu 688;
        vi U.S. Virgin Islands 1; ug Uganda 256; ua Ukraine 380; ae United Arab Emirates 971; gb United Kingdom 44;
        us United States 1; uy Uruguay 598; uz Uzbekistan 998; vu Vanuatu 678; va Vatican City 39; ve Venezuela 58;
        vn Vietnam 84; wf Wallis and Futuna 681; eh Western Sahara 212; ye Yemen 967; zm Zambia 260; zw Zimbabwe 263
        """);

    private static readonly Dictionary<string, Country> ByCode = All.ToDictionary(c => c.Code);

    // Calling codes are prefix-free (no code starts another), so the first match from the shortest is the only one.
    private static readonly HashSet<string> DialingCodes = All.Select(c => c.Dialing).ToHashSet();

    private static readonly Regex PhoneShape = new(@"^\+[0-9][0-9 ()./-]*$", RegexOptions.Compiled);

    public const int PhoneMax = 30;

    // Where several countries share a calling code, the one a number with that code most likely belongs to.
    private static readonly Dictionary<string, string> MainCountryForDialing = new()
    {
        ["1"] = "us", ["7"] = "ru", ["44"] = "gb", ["39"] = "it", ["47"] = "no", ["61"] = "au", ["64"] = "nz",
        ["212"] = "ma", ["262"] = "re", ["358"] = "fi", ["500"] = "fk", ["590"] = "gp", ["599"] = "cw",
    };

    /// <summary>
    /// The country a phone number belongs to: the profile's country when its calling code matches, otherwise the
    /// country that owns the code. Europass flags a phone without a country as an invalid prefix.
    /// </summary>
    public static Country? ForPhone(PhoneParts phone, string? profileCountry)
    {
        if (Find(profileCountry) is { } c && c.Dialing == phone.Dialing) return c;
        if (MainCountryForDialing.TryGetValue(phone.Dialing, out var main)) return Find(main);
        return All.FirstOrDefault(x => x.Dialing == phone.Dialing);
    }

    public static Country? Find(string? code) =>
        code is null ? null : ByCode.GetValueOrDefault(code.Trim().ToLowerInvariant());

    /// <summary>
    /// "+359 88 123 4567" -> ("359", "881234567"). Null when it is not an international number with a known calling
    /// code and 8 to 15 digits in all (the E.164 limit).
    /// </summary>
    public static PhoneParts? SplitPhone(string? phone)
    {
        var p = phone?.Trim() ?? "";
        if (p.Length > PhoneMax || !PhoneShape.IsMatch(p)) return null;
        var digits = new string(p.Where(char.IsAsciiDigit).ToArray());
        if (digits.Length is < 8 or > 15) return null;
        for (var n = 1; n <= 3; n++)
            if (DialingCodes.Contains(digits[..n])) return new PhoneParts(digits[..n], digits[n..]);
        return null;
    }

    private static List<Country> Parse(string table) =>
        table.Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(entry =>
            {
                var flat = string.Join(' ', entry.Split((char[])[' ', '\r', '\n'], StringSplitOptions.RemoveEmptyEntries));
                var first = flat.IndexOf(' ');
                var last = flat.LastIndexOf(' ');
                return new Country(flat[..first], flat[(first + 1)..last], flat[(last + 1)..]);
            })
            .OrderBy(c => c.Name, StringComparer.InvariantCulture)
            .ToList();
}
