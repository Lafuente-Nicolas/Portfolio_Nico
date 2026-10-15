using System.Net.Mail;

namespace Portfolio.Web.Contact;

public static class ContactValidator
{
    public const int NameMin = 2, NameMax = 80;
    public const int MessageMin = 10, MessageMax = 3000;

    public static Dictionary<string, string[]> Validate(ContactRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        var name = request.Name?.Trim() ?? string.Empty;
        var email = request.Email?.Trim() ?? string.Empty;
        var message = request.Message?.Trim() ?? string.Empty;

        if (name.Length is < NameMin or > NameMax)
            errors["name"] = new[] { $"Indiquez votre nom ({NameMin} à {NameMax} caractères)." };

        if (!IsValidEmail(email))
            errors["email"] = new[] { "Cette adresse email ne semble pas valide." };

        if (message.Length is < MessageMin or > MessageMax)
            errors["message"] = new[] { $"Votre message doit faire entre {MessageMin} et {MessageMax} caractères." };

        return errors;
    }

    private static bool IsValidEmail(string email)
    {
        if (email.Length is 0 or > 254 || !email.Contains('@'))
            return false;

        return MailAddress.TryCreate(email, out var address)
            && string.Equals(address.Address, email, StringComparison.OrdinalIgnoreCase);
    }
}
