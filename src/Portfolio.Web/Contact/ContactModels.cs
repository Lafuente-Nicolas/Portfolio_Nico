namespace Portfolio.Web.Contact;

/// <summary>Données envoyées par le formulaire de contact.</summary>
/// <param name="Website">Champ piège invisible : un humain le laisse vide, un robot le remplit.</param>
public sealed record ContactRequest(string? Name, string? Email, string? Message, string? Website);

/// <summary>Message validé, tel qu'il est enregistré.</summary>
public sealed record ContactMessage(
    Guid Id,
    DateTimeOffset ReceivedAt,
    string Name,
    string Email,
    string Message,
    string? IpAddress);
